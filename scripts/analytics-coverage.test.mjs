import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const relative = (file) => path.relative(root, file).split(path.sep).join('/');

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(file);
    return /\.[cm]?[jt]sx?$/.test(entry.name) && !entry.name.endsWith('.d.ts') ? [file] : [];
  });
}

const sources = sourceFiles(path.join(root, 'src'))
  .sort()
  .map((file) => ({
    file: relative(file),
    ast: ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true),
  }));

function walk(node, visitor) {
  visitor(node);
  ts.forEachChild(node, (child) => walk(child, visitor));
}

function attributes(node) {
  return new Map(
    node.attributes.properties
      .filter(ts.isJsxAttribute)
      .map((attribute) => [attribute.name.getText(), attribute]),
  );
}

function expression(attribute) {
  return attribute?.initializer && ts.isJsxExpression(attribute.initializer)
    ? attribute.initializer.expression
    : attribute?.initializer;
}

function location(file, ast, node) {
  return `${file}:${ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1}`;
}

const constantsFile = 'src/constants/analytics.ts';
const constants = sources.find(({ file }) => file === constantsFile);
assert.ok(constants, 'Analytics constants must remain in src/constants/analytics.ts');
const elementKeys = new Set();
const eventAndActionNames = new Set();
walk(constants.ast, (node) => {
  if (!ts.isVariableDeclaration(node) || !ts.isIdentifier(node.name)) return;
  const destination =
    node.name.text === 'ANALYTICS_ELEMENTS'
      ? elementKeys
      : ['ANALYTICS_EVENTS', 'ANALYTICS_ACTIONS'].includes(node.name.text)
        ? eventAndActionNames
        : null;
  if (!destination) return;
  let value = node.initializer;
  while (value && (ts.isAsExpression(value) || ts.isParenthesizedExpression(value)))
    value = value.expression;
  assert.ok(
    value && ts.isObjectLiteralExpression(value),
    `${node.name.text} must be a constant object`,
  );
  for (const property of value.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    if (destination === elementKeys) destination.add(property.name.getText());
    else if (ts.isStringLiteral(property.initializer)) destination.add(property.initializer.text);
  }
});

// Only decorative icon instances can omit their own label: their surrounding control owns it.
const optionalIconLabels = new Set(['src/assets/MenuIcon.tsx', 'src/assets/SearchIcon.tsx']);
function isConstantLabel(node, file) {
  if (!node) return false;
  if (ts.isParenthesizedExpression(node)) return isConstantLabel(node.expression, file);
  if (ts.isPropertyAccessExpression(node)) {
    return node.expression.getText() === 'ANALYTICS_ELEMENTS' && elementKeys.has(node.name.text);
  }
  if (ts.isConditionalExpression(node)) {
    return isConstantLabel(node.whenTrue, file) && isConstantLabel(node.whenFalse, file);
  }
  return optionalIconLabels.has(file) && ts.isIdentifier(node) && node.text === 'undefined';
}

function onlyStopsPropagation(attribute) {
  const handler = expression(attribute);
  if (!handler || !(ts.isArrowFunction(handler) || ts.isFunctionExpression(handler))) return false;
  let body = handler.body;
  if (ts.isBlock(body)) {
    if (body.statements.length !== 1 || !ts.isExpressionStatement(body.statements[0])) return false;
    body = body.statements[0].expression;
  }
  return (
    ts.isCallExpression(body) &&
    body.arguments.length === 0 &&
    ts.isPropertyAccessExpression(body.expression) &&
    body.expression.name.text === 'stopPropagation' &&
    handler.parameters.length === 1 &&
    body.expression.expression.getText() === handler.parameters[0].name.getText()
  );
}

function knownForwarder(file, node) {
  // ThemedLink transforms only href; all data attributes are forwarded through ...props.
  return (
    file === 'src/components/ThemedLink.tsx' &&
    node.tagName.getText() === 'Link' &&
    node.attributes.properties.some(
      (property) => ts.isJsxSpreadAttribute(property) && property.expression.getText() === 'props',
    )
  );
}

function knownOwnedChild(file, node) {
  // The mobile Dock's MenuIcon lives inside the instrumented menu toggle. The icon's
  // own implementation is scanned too, so this cannot exempt an uninstrumented DOM root.
  if (file !== 'src/components/Dock.tsx' || node.tagName.getText() !== 'MenuIcon') return false;
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (!ts.isJsxElement(parent)) continue;
    const opening = parent.openingElement;
    if (opening.tagName.getText() === 'motion.button') {
      const label = expression(attributes(opening).get('data-analytics-label'));
      return (
        isConstantLabel(label, file) &&
        label.getText().includes('ANALYTICS_ELEMENTS.MENU_OPEN') &&
        label.getText().includes('ANALYTICS_ELEMENTS.MENU_CLOSE')
      );
    }
  }
  return false;
}

function knownReportingDelegate(file, node) {
  // This exact capture handler reports result counts for an already labeled result.
  // It neither activates a separate control nor navigates by itself.
  if (file !== 'src/components/Command.tsx' || node.tagName.getText() !== 'CommandPrimitive') {
    return false;
  }
  const props = attributes(node);
  if (props.has('onClick')) return false;
  const handler = expression(props.get('onClickCapture'));
  if (!handler || !ts.isArrowFunction(handler) || !ts.isBlock(handler.body)) return false;
  if (handler.body.statements.length !== 1) return false;
  const condition = handler.body.statements[0];
  if (!ts.isIfStatement(condition) || condition.elseStatement) return false;
  const match = condition.expression;
  if (
    !ts.isCallExpression(match) ||
    !ts.isPropertyAccessExpression(match.expression) ||
    match.expression.name.text !== 'closest' ||
    match.arguments.length !== 1 ||
    !match.arguments[0].getText().includes('ANALYTICS_ELEMENTS.SEARCH_RESULT')
  )
    return false;
  const body = condition.thenStatement;
  if (
    !ts.isBlock(body) ||
    body.statements.length !== 1 ||
    !ts.isExpressionStatement(body.statements[0])
  )
    return false;
  const report = body.statements[0].expression;
  return (
    ts.isCallExpression(report) &&
    report.expression.getText() === 'reportSearchResults' &&
    report.arguments.length === 0
  );
}

const semanticTags = new Set([
  'a',
  'area',
  'Link',
  'ThemedLink',
  'button',
  'input',
  'textarea',
  'select',
  'summary',
  'form',
  'CommandPrimitive.Input',
  'CommandPrimitive.Item',
]);

test('every authored interactive JSX root has a constant analytics label', (context) => {
  const misses = [];
  let labeled = 0;
  let forwarded = 0;
  let blockers = 0;
  let ownedChildren = 0;
  let reportingDelegates = 0;
  for (const { file, ast } of sources) {
    walk(ast, (node) => {
      if (!(ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node))) return;
      const tag = node.tagName.getText();
      const props = attributes(node);
      const semantic =
        semanticTags.has(tag) ||
        (/^(motion|m)\./.test(tag) && semanticTags.has(tag.split('.')[1])) ||
        (['audio', 'video'].includes(tag) && props.has('controls'));
      const click = props.get('onClick') ?? props.get('onClickCapture');
      if (!semantic && click && onlyStopsPropagation(click)) {
        blockers++;
        return;
      }
      if (!semantic && !click) return;
      const label = expression(props.get('data-analytics-label'));
      if (isConstantLabel(label, file)) {
        labeled++;
        return;
      }
      if (knownForwarder(file, node)) {
        forwarded++;
        return;
      }
      if (knownOwnedChild(file, node)) {
        ownedChildren++;
        return;
      }
      if (knownReportingDelegate(file, node)) {
        reportingDelegates++;
        return;
      }
      misses.push(
        `${location(file, ast, node)} <${tag}>: add data-analytics-label={ANALYTICS_ELEMENTS.KEY}`,
      );
    });
  }
  context.diagnostic(
    `${labeled} labeled roots; ${forwarded} ThemedLink forwarder; ${ownedChildren} exact owned children; ${reportingDelegates} reporting-only delegates; ${blockers} stopPropagation-only blockers`,
  );
  assert.ok(labeled > 0, 'Coverage scan must discover authored controls');
  assert.deepEqual(
    misses,
    [],
    `Uninstrumented or non-constant interactive roots:\n${misses.join('\n')}`,
  );
});

test('custom event and action names are declared only in the analytics constants file', () => {
  const misses = [];
  for (const { file, ast } of sources) {
    if (file === constantsFile) continue;
    walk(ast, (node) => {
      if (
        (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) &&
        eventAndActionNames.has(node.text)
      ) {
        misses.push(
          `${location(file, ast, node)}: replace ${JSON.stringify(node.text)} with its analytics constant`,
        );
      }
      if (
        ts.isCallExpression(node) &&
        ['trackEvent', 'trackInteraction'].includes(node.expression.getText())
      ) {
        const argument = node.arguments[0];
        if (
          argument &&
          (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument))
        ) {
          misses.push(`${location(file, ast, node)}: do not pass a literal event/action name`);
        }
      }
    });
  }
  assert.deepEqual(misses, [], misses.join('\n'));
});

test('the coverage report includes every authored page route', () => {
  const report = fs.readFileSync(path.join(root, 'docs/analytics-coverage.md'), 'utf8');
  const routes = sources
    .filter(({ file }) => /^src\/app\/(?:.*\/)?page\.[jt]sx?$/.test(file))
    .map(({ file }) => '/' + file.replace(/^src\/app\//, '').replace(/(?:\/)?page\.[jt]sx?$/, ''));
  assert.ok(routes.length > 0);
  const missing = routes.filter((route) => !report.includes('`' + route + '`'));
  assert.deepEqual(missing, [], `Document new page routes: ${missing.join(', ')}`);
});
