import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import test from 'node:test';

const root=fileURLToPath(new URL('..',import.meta.url));
registerHooks({resolve(specifier,context,next){
 if(specifier==='@/i18n/wwm.mjs')return {url:pathToFileURL(`${root}src/i18n/wwm.mjs`).href,shortCircuit:true};
 return next(specifier,context);
}});
const {inviteShareText}=await import(pathToFileURL(`${root}src/features/when-we-meet/invite-share.ts`).href);
const link='https://hyeok.dev/craft/when-we-meet/room?invite=token';

test('copied invitation follows the sharer\'s language: one sentence, a blank line, then the link',()=>{
 assert.equal(inviteShareText(link,'Jason','en'),`Jason invited you to this When We Meet. Open the link and plan a time together!\n\n${link}`);
 assert.equal(inviteShareText(link,'Jason','ko'),`Jason님이 이 When We Meet에 초대했어요. 링크에 접속해서 같이 일정을 정해보세요!\n\n${link}`);
});

test('a missing or blank name drops the name instead of printing an empty one',()=>{
 for(const name of [undefined,null,'','   ']){
  assert.equal(inviteShareText(link,name,'en'),`You're invited to this When We Meet. Open the link and plan a time together!\n\n${link}`);
  assert.equal(inviteShareText(link,name,'ko'),`이 When We Meet에 초대했어요. 링크에 접속해서 같이 일정을 정해보세요!\n\n${link}`);
 }
});

test('an unknown locale falls back to English; very long names are cut',()=>{
 assert.match(inviteShareText(link,'Jason','fr'),/^Jason invited you/);
 assert.ok(inviteShareText(link,'a'.repeat(200),'en').split('\n')[0].length<120);
});
