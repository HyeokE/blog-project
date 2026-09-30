import test from 'node:test';
import assert from 'node:assert/strict';
import {trustedOrigins,requestOrigin,isSameOrigin} from '../src/lib/request-origin.mjs';

const h=values=>new Headers(values);
const vercel={NEXT_PUBLIC_SITE_URL:'https://hyeok.dev',VERCEL_URL:'hyeok-dev-v2-abc123-hyeokes-projects.vercel.app',VERCEL_BRANCH_URL:'hyeok-dev-v2-git-wip-hyeokes-projects.vercel.app',VERCEL_PROJECT_PRODUCTION_URL:'hyeok.dev'};

test('local and tailnet origins keep working without any env',()=>{
 assert.equal(requestOrigin(h({host:'localhost:3002'}),{}),'http://localhost:3002');
 assert.equal(requestOrigin(h({'x-forwarded-host':'macmini-home.taile6a871.ts.net'}),{}),'https://macmini-home.taile6a871.ts.net:8446');
 assert.equal(requestOrigin(h({'x-forwarded-host':'macmini-home.taile6a871.ts.net:8446'}),{}),'https://macmini-home.taile6a871.ts.net:8446');
});

test('production and Vercel preview hosts resolve to their https origin',()=>{
 assert.equal(requestOrigin(h({'x-forwarded-host':'hyeok.dev'}),vercel),'https://hyeok.dev');
 assert.equal(requestOrigin(h({'x-forwarded-host':vercel.VERCEL_URL}),vercel),`https://${vercel.VERCEL_URL}`);
 assert.equal(requestOrigin(h({host:vercel.VERCEL_BRANCH_URL}),vercel),`https://${vercel.VERCEL_BRANCH_URL}`);
 assert.ok(trustedOrigins(vercel).includes('https://hyeok.dev'));
});

test('unknown hosts are not trusted',()=>{
 assert.equal(requestOrigin(h({host:'evil.example'}),vercel),null);
 assert.equal(requestOrigin(h({host:'hyeok.dev'}),{}),null,'production host needs its env');
});

test('same-origin requires the Origin header to equal the resolved request origin',()=>{
 assert.equal(isSameOrigin(h({'x-forwarded-host':'hyeok.dev',origin:'https://hyeok.dev'}),vercel),true);
 assert.equal(isSameOrigin(h({'x-forwarded-host':'hyeok.dev',origin:'https://evil.example'}),vercel),false);
 assert.equal(isSameOrigin(h({'x-forwarded-host':'hyeok.dev'}),vercel),false,'missing Origin is rejected');
 assert.equal(isSameOrigin(h({host:'evil.example',origin:'https://evil.example'}),vercel),false);
 assert.equal(isSameOrigin(h({host:'localhost:3002',origin:'http://localhost:3002'}),{}),true);
});
