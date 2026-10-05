import assert from 'node:assert/strict';
import test from 'node:test';
import nextConfig, {SECURITY_HEADERS} from '../next.config.mjs';

const byKey=Object.fromEntries(SECURITY_HEADERS.map(h=>[h.key,h.value]));

test('every route gets the security headers',async()=>{
 const rules=await nextConfig.headers();
 const all=rules.find(rule=>rule.source==='/:path*');
 assert.ok(all,'a catch-all header rule exists');
 assert.deepEqual(all.headers,SECURITY_HEADERS);
});

test('framing is refused twice over, sniffing is off, and powerful features are disabled',()=>{
 assert.equal(byKey['X-Frame-Options'],'DENY');
 assert.match(byKey['Content-Security-Policy'],/frame-ancestors 'none'/);
 assert.match(byKey['Content-Security-Policy'],/object-src 'none'/);
 assert.equal(byKey['X-Content-Type-Options'],'nosniff');
 assert.equal(byKey['Referrer-Policy'],'strict-origin-when-cross-origin');
 for(const feature of ['camera','microphone','geolocation','payment'])assert.match(byKey['Permissions-Policy'],new RegExp(`${feature}=\\(\\)`));
});

test('the policy never blocks scripts or styles (inline bootstrap, Analytics and Notion embeds depend on them)',()=>{
 assert.doesNotMatch(byKey['Content-Security-Policy'],/script-src|style-src|default-src|connect-src/);
});

test('the long-lived gallery cache rule is kept',async()=>{
 const rules=await nextConfig.headers();
 assert.ok(rules.some(rule=>rule.source==='/_gallery/:path*'&&rule.headers.some(h=>h.key==='Cache-Control'&&/immutable/.test(h.value))));
});
