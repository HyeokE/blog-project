import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PARTICIPANT_HUES,YOU_HUE,SURFACES,contrastRatio,participantColor,colorDistance} from '../src/features/when-we-meet/participant-palette.mjs';
import {projectWeeklyTimeline} from '../src/features/when-we-meet/weekly-timeline.mjs';
import {makeSlots} from '../src/features/when-we-meet/domain.mjs';

const tokens=readFileSync(new URL('../src/app/craft/design-system.css',import.meta.url),'utf8');
const block=selector=>tokens.slice(tokens.indexOf(`${selector}{`)).split('}')[0];

test('eight named earthy hues, no stock Tailwind blues/indigos',()=>{
 assert.deepEqual(PARTICIPANT_HUES.map(hue=>hue.name),['clay','olive','ochre','slate-green','plum-brown','lavender','moss','steel']);
 const stock=['#2563eb','#4f46e5','#dc2626','#059669','#9333ea','#b45309','#0891b2','#be185d'];
 for(const hue of [...PARTICIPANT_HUES,YOU_HUE])for(const value of [hue.light,hue.dark])assert.ok(!stock.includes(value.toLowerCase()),`${hue.name} ${value}`);
});
test('every hue (and You) is at least 3:1 against the calendar surface in both themes',()=>{
 for(const hue of [...PARTICIPANT_HUES,YOU_HUE]){
  assert.ok(contrastRatio(hue.light,SURFACES.light)>=3,`${hue.name} light ${contrastRatio(hue.light,SURFACES.light)}`);
  assert.ok(contrastRatio(hue.dark,SURFACES.dark)>=3,`${hue.name} dark ${contrastRatio(hue.dark,SURFACES.dark)}`);
 }
 assert.equal(contrastRatio('#000000','#ffffff').toFixed(0),'21');
});
test('design tokens carry exactly these values for light and dark',()=>{
 const light=block(':root[data-craft]'),dark=block(":root[data-craft][data-mode='dark']");
 PARTICIPANT_HUES.forEach((hue,index)=>{
  assert.match(light,new RegExp(`--craft-person-${index+1}:${hue.light};`));
  assert.match(dark,new RegExp(`--craft-person-${index+1}:${hue.dark};`));
 });
 assert.match(light,new RegExp(`--craft-person-you:${YOU_HUE.light};`));
 assert.match(dark,new RegExp(`--craft-person-you:${YOU_HUE.dark};`));
 assert.match(light,new RegExp(`--craft-surface:${SURFACES.light};`));
 assert.match(dark,new RegExp(`--craft-surface:${SURFACES.dark};`));
});
test('colour is a token, stable per user id, and You always gets the You hue',()=>{
 assert.equal(participantColor('a','a'),'var(--craft-person-you)');
 assert.match(participantColor('a','b'),/^var\(--craft-person-[1-8]\)$/);
 assert.equal(participantColor('user-42','me'),participantColor('user-42','someone-else'));
 const seen=new Set(Array.from({length:64},(_,i)=>participantColor(`user-${i}`,'me')));
 assert.ok(seen.size>=6,'ids spread across the ramp');
});
test('the timeline projection uses the same tokens: You row matches the Availability own colour',()=>{
 const slots=makeSlots({title:'x',startDate:'2026-09-01',endDate:'2026-09-01',startTime:'09:00',endTime:'10:00',timezone:'UTC'});
 const rows=projectWeeklyTimeline({slots,responses:[{userId:'me',displayName:'Me',slots:[]},{userId:'other',displayName:'Other',slots:[]}],currentUserId:'me'}).rows;
 assert.equal(rows.find(row=>row.isCurrentUser).color,'var(--craft-person-you)');
 assert.equal(rows.find(row=>!row.isCurrentUser).color,participantColor('other','me'));
 const weekly=readFileSync(new URL('../src/features/when-we-meet/WeeklyAvailability.tsx',import.meta.url),'utf8');
 assert.match(weekly,/color:'var\(--craft-person-you\)'/);
 assert.doesNotMatch(weekly,/#76654b/);
});

test('every participant hue is clearly distinct from You and from each other in both themes',()=>{
 for(const theme of ['light','dark']){
  for(const hue of PARTICIPANT_HUES)assert.ok(colorDistance(hue[theme],YOU_HUE[theme])>=20,`${hue.name} too close to You in ${theme}: ${colorDistance(hue[theme],YOU_HUE[theme]).toFixed(1)}`);
  for(let i=0;i<PARTICIPANT_HUES.length;i++)for(let j=i+1;j<PARTICIPANT_HUES.length;j++){
   const a=PARTICIPANT_HUES[i],b=PARTICIPANT_HUES[j],d=colorDistance(a[theme],b[theme]);
   assert.ok(d>=15,`${a.name}/${b.name} too close in ${theme}: ${d.toFixed(1)}`);
  }
  for(const hue of PARTICIPANT_HUES)assert.ok(contrastRatio(hue[theme],SURFACES[theme])>=4,`${hue.name} ${theme} contrast`);
 }
 assert.ok(colorDistance('#000000','#ffffff')>99);
});
