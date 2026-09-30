import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve('src');
const Module = require('node:module');
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function(request, parent, ...rest) {
  if (request.startsWith('@/')) request = path.join(root, request.slice(2));
  return originalResolve.call(this, request, parent, ...rest);
};
for (const extension of ['.tsx', '.ts']) {
  require.extensions[extension] = (module, filename) => {
    const source = fs.readFileSync(filename, 'utf8');
    module._compile(ts.transpileModule(source, { compilerOptions: {
      module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022, esModuleInterop: true,
    } }).outputText, filename);
  };
}
require.extensions['.css'] = () => {};
const originalLoad = Module._load;
Module._load = function(request, parent, ...rest) {
  if (request === '@/container/light-wall/WallPageShell') {
    return { __esModule: true, default: ({ children }) => React.createElement('div', { 'data-shell': 'wall' }, children) };
  }
  return originalLoad.call(this, request, parent, ...rest);
};

const load = (file) => require(path.join(root, file)).default;
test('404 renders a useful heading and a home destination in wall shell', () => {
  const html = renderToStaticMarkup(React.createElement(load('app/not-found.tsx')));
  assert.match(html, /data-shell="wall"/);
  assert.match(html, /404/);
  assert.match(html, /href="\/"/);
  assert.doesNotMatch(html, /다시 시도/);
});
test('route error provides retry and home without revealing thrown details', () => {
  const html = renderToStaticMarkup(React.createElement(load('app/error.tsx'), {
    error: Object.assign(new Error('PRIVATE_STACK_SECRET'), { digest: 'PRIVATE_DIGEST_SECRET' }), reset: () => {},
  }));
  assert.match(html, /500/);
  assert.match(html, /다시 시도/);
  assert.match(html, /href="\/"/);
  assert.doesNotMatch(html, /PRIVATE_(STACK|DIGEST)_SECRET/);
  const reset = () => {};
  const tree = load('app/error.tsx')({ error: new Error('hidden'), reset });
  assert.equal(tree.props.children.props.retry.props.onClick, reset);
});
test('global error supplies its own document and provider-free recovery', () => {
  const html = renderToStaticMarkup(React.createElement(load('app/global-error.tsx'), {
    error: new Error('PRIVATE_STACK_SECRET'), reset: () => {},
  }));
  assert.match(html, /^<html/);
  assert.match(html, /<body/);
  assert.match(html, /500/);
  assert.match(html, /href="\/"/);
  assert.match(html, /다시 시도/);
  assert.doesNotMatch(html, /PRIVATE_STACK_SECRET/);
});
test('Craft 404/500 render English Craft copy inside the Craft layout; the blog pages keep Korean', () => {
  const missing = renderToStaticMarkup(React.createElement(load('app/craft/not-found.tsx')));
  assert.match(missing, /Page not found/);
  assert.match(missing, /href="\/craft"/);
  assert.match(missing, /class="craft-page craft-error"/);
  assert.doesNotMatch(missing, /[가-힣]/);
  assert.doesNotMatch(missing, /Try again/);
  const reset = () => {};
  const failed = renderToStaticMarkup(React.createElement(load('app/craft/error.tsx'), {
    error: Object.assign(new Error('PRIVATE_STACK_SECRET'), { digest: 'PRIVATE_DIGEST_SECRET' }), reset,
  }));
  assert.match(failed, /Something went wrong/);
  assert.match(failed, /Try again/);
  assert.match(failed, /href="\/craft"/);
  assert.doesNotMatch(failed, /[가-힣]|PRIVATE_(STACK|DIGEST)_SECRET/);
  assert.equal(load('app/craft/error.tsx')({ error: new Error('x'), reset }).props.onRetry, reset);
  // Unmatched /craft/** URLs reach the Craft 404 through a catch-all that only calls notFound().
  const catchAll = fs.readFileSync(path.join(root, 'app/craft/[...missing]/page.tsx'), 'utf8');
  assert.match(catchAll, /notFound\(\)/);
  assert.match(renderToStaticMarkup(React.createElement(load('app/not-found.tsx'))), /페이지를 찾을 수 없어요/);
});
