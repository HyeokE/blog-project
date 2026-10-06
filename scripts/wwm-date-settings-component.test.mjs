import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { load } from './wwm-date-room-harness.mjs';
import { validateDateSettings } from '../src/features/when-we-meet/date-settings.mjs';
import { todayInTimezone } from '../src/features/when-we-meet/creation-validation.mjs';
import { rawDateVersion } from '../src/features/when-we-meet/date-normalize.mjs';
import * as range from '../src/features/when-we-meet/range.mjs';
import * as displayDate from '../src/features/when-we-meet/display-date.mjs';

// Indexed hooks persist across renders. Primitive descriptors do not certify DOM,
// portal positioning, keyboard interaction or browser focus trapping.
const componentPath = new URL('../src/features/when-we-meet/DateRoomSettings.tsx', import.meta.url);
const primitive = name => Object.assign(() => null, { displayName: name });
const names = ['Dialog', 'DialogContent', 'DialogHeader', 'DialogTitle', 'DialogDescription', 'DialogFooter', 'Input', 'Button', 'RequiredFieldLabel', 'DateRangePicker', 'TimezoneCombobox'];
const primitives = Object.fromEntries(names.map(name => [name, primitive(name)]));
function mount(overrides = {}) {
  const slots = []; let cursor = 0; let effects = []; let tree; const calls = []; const closes = []; const focused = [];
  let props = {
    room: { id: 'room-a', title: 'Meeting', ownerId: 'user-a', role: 'ADMIN', scheduleMode: 'date', startDate: '2026-10-07', endDate: '2026-10-10', timezone: 'UTC', startTime: null, endTime: null },
    userId: 'user-a', name: 'Alice', authorized: true, authLoading: false, open: true, session: 1,
    now: () => new Date('2026-10-07T12:00:00Z'),
    onOpenChange: value => closes.push(value), onSubmit: (draft, operation) => { calls.push({ draft, operation }); }, ...overrides,
  };
  const React = {
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; },
    useId() { const i = cursor++; return slots[i] ??= `settings-${i}`; },
    useEffect(fn, deps) { const i = cursor++; const old = slots[i]; if (!old || deps.some((v, j) => !Object.is(v, old.deps[j]))) { effects.push(() => { old?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; }); } },
  };
  const imports = {
    react: React, '@/components/ui/dialog': primitives, '@/components/ui/input': primitives,
    '@/components/ui/button': primitives, '@/components/craft/RequiredFieldLabel': primitives,
    './DateRangePicker': primitives, './TimezoneCombobox': primitives,
    './date-normalize.mjs': { rawDateVersion },
    './date-settings.mjs': { validateDateSettings }, './creation-validation.mjs': { todayInTimezone },
    './i18n/WwmI18nProvider': { useWwmCopy: () => ({ t: key => key }) },
  };
  const { DateRoomSettings } = load('DateRoomSettings.tsx', imports);
  assert.equal(typeof DateRoomSettings, 'function', 'DateRoomSettings staged component is missing');
  function render(next = {}) { props = { ...props, ...next }; cursor = 0; tree = DateRoomSettings(props); effects.splice(0).forEach(fn => fn()); return tree; }
  function nodes() { const list = []; function visit(node) { if (Array.isArray(node)) node.forEach(visit); else if (node && typeof node === 'object' && node.props) { list.push(node); visit(node.props.children); } } visit(tree); return list; }
  function find(name) { return nodes().find(n => n.type === primitives[name] || n.type === name); }
  function input(field) { return nodes().find(n => n.type === primitives.Input && n.props.name === field); }
  function edit(field, value) { const node = input(field); assert.ok(node); node.props.onChange({ target: { value } }); render(); }
  function submit() { return find('form').props.onSubmit({ preventDefault() {} }); }
  render();
  const form = () => find('form');
  function attachForm(expanded = false) { form().props.ref.current = { querySelector: selector => selector.includes('aria-expanded') ? (expanded ? {} : null) : { focus: () => focused.push(selector) } }; }
  return { render, find, nodes, input, edit, submit, calls, closes, focused, attachForm, props: () => props, unmount: () => slots.forEach(s => s?.cleanup?.()) };
}
const reviewResponses = [
  { userId:'user-a', displayName:'Alice', availableDates:['2026-10-07','2026-10-08'], updatedAt:'2026-10-07T12:00:00.000001Z' },
  { userId:'user-b', displayName:'Bob', availableDates:['2026-10-07'], updatedAt:'2026-10-07T12:00:00.000001Z' },
];
function reviewMount(extra={}) { return mount({responses:reviewResponses,people:null,ownDraftDates:['2026-10-07','2026-10-09'],...extra}); }
function button(h, copy) { return h.nodes().find(n=>n.type===primitives.Button && n.props.children===copy); }
function shrinkForm(h) { h.find('DateRangePicker').props.onChange('2026-10-08','2026-10-10');h.render(); }
function clickReview(h) { const b=button(h,'dateSettings.reviewDates');assert.ok(b,'explicit review action missing');b.props.onClick();h.render(); }
function consent(h) { const b=button(h,'dateSettings.consent');assert.ok(b,'separate consent missing');b.props.onClick();h.render(); }
test('G4 immutable per-user impact separates unsaved own dates and unknown roster',async()=>{
 const h=reviewMount();shrinkForm(h);await h.submit();assert.equal(h.calls.length,0);clickReview(h);
 assert.equal(h.calls.length,0);assert.ok(h.nodes().some(n=>n.props['data-saved-removals']===2));
 assert.ok(h.nodes().some(n=>n.props['data-affected-people']===2));assert.ok(h.nodes().some(n=>n.props['data-own-removals']===1));
 assert.ok(h.nodes().some(n=>n.props.children==='dateSettings.rosterUnavailable'));consent(h);assert.equal(h.calls.length,0);
 await h.submit();assert.equal(h.calls.length,1);const {operation,draft}=h.calls[0];assert.equal(typeof operation.hasReviewedShrink,'function');
});
test('G4 frozen preview clones names and dates; changed source cannot authorize Save',async()=>{
 const responses=reviewResponses.map(r=>({...r,availableDates:[...r.availableDates]}));const h=reviewMount({responses});shrinkForm(h);clickReview(h);consent(h);
 responses[0].displayName='Changed';responses[0].availableDates.length=0;
 assert.ok(h.nodes().some(n=>n.type==='li' && Array.isArray(n.props.children) && n.props.children[0]==='Alice'));
 await h.submit();assert.equal(h.calls.length,0);
});
test('G4 zero saved removals still needs review and separate consent',async()=>{
 const h=reviewMount({responses:[],ownDraftDates:[]});shrinkForm(h);await h.submit();assert.equal(h.calls.length,0);clickReview(h);await h.submit();assert.equal(h.calls.length,0);consent(h);await h.submit();assert.equal(h.calls.length,1);
});
for(const kind of ['sparse','inherited','invalid-date','duplicates','unknown'])test(`G4 malformed ${kind} preview fails closed`,async()=>{
 const response={...reviewResponses[0]};let responses=[response];
 if(kind==='sparse')responses=new Array(1);if(kind==='inherited')responses=[Object.create(response)];if(kind==='invalid-date')response.availableDates=['bad'];if(kind==='duplicates')response.availableDates=['2026-10-07','2026-10-07'];if(kind==='unknown')responses=null;
 const h=reviewMount({responses});shrinkForm(h);clickReview(h);assert.equal(button(h,'dateSettings.consent'),undefined);await h.submit();assert.equal(h.calls.length,0);
});
test('G4 raw database timestamp versions preserve valid space-separated microseconds',async()=>{
 const h=reviewMount({responses:[{...reviewResponses[0],updatedAt:'2026-10-07 12:00:00.000001+00:00'}]});shrinkForm(h);clickReview(h);consent(h);await h.submit();assert.equal(h.calls.length,1);
});
test('G4 timezone-less response version blocks preview instead of inventing consent',async()=>{
 const h=reviewMount({responses:[{...reviewResponses[0],updatedAt:'2026-10-07T12:00'}]});shrinkForm(h);clickReview(h);assert.equal(button(h,'dateSettings.consent'),undefined);await h.submit();assert.equal(h.calls.length,0);
});
for(const kind of ['edit-undo','response-ABA','own-ABA','roster-ABA','auth-ABA','session-ABA'])test(`G4 old review consent and Save revoked after ${kind}`,async()=>{
 const h=reviewMount();shrinkForm(h);const oldReview=button(h,'dateSettings.reviewDates')?.props.onClick;assert.ok(oldReview);clickReview(h);const oldConsent=button(h,'dateSettings.consent').props.onClick;consent(h);const oldSave=h.find('form').props.onSubmit;
 if(kind==='edit-undo'){h.edit('name','Other');h.edit('name','Alice');}
 if(kind==='response-ABA'){h.render({responses:[{...reviewResponses[0],updatedAt:'2026-10-07T12:00:00.000002Z'}]});h.render({responses:reviewResponses});}
 if(kind==='own-ABA'){h.render({ownDraftDates:[]});h.render({ownDraftDates:['2026-10-07','2026-10-09']});}
 if(kind==='roster-ABA'){h.render({people:[]});h.render({people:null});}
 if(kind==='auth-ABA'){h.render({authLoading:true});h.render({authLoading:false});}
 if(kind==='session-ABA'){h.render({session:2});h.render({session:1});shrinkForm(h);}
 oldReview();oldConsent();await oldSave({preventDefault(){}});h.render();await h.submit();assert.equal(h.calls.length,0);
 clickReview(h);consent(h);await h.submit();assert.equal(h.calls.length,1);
});
test('G4 previously retained approved Save cannot borrow a later review of the same draft',async()=>{
 const h=reviewMount();shrinkForm(h);clickReview(h);consent(h);const oldSave=h.find('form').props.onSubmit;
 clickReview(h);consent(h);await oldSave({preventDefault(){}});assert.equal(h.calls.length,0);await h.submit();assert.equal(h.calls.length,1);
});
test('G4 previously retained Review cannot replace a newer frozen preview',async()=>{
 const h=reviewMount();shrinkForm(h);const oldReview=button(h,'dateSettings.reviewDates').props.onClick;clickReview(h);consent(h);oldReview();h.render();await h.submit();assert.equal(h.calls.length,1,'stale review must not revoke or replace the new approval');
});
test('G4 remote matching staged value still requires an explicit conflict decision',async()=>{
 const h=mount();h.edit('title','Local');h.render({room:{...h.props().room,title:'Local'}});await h.submit();assert.equal(h.calls.length,0);assert.ok(h.nodes().find(n=>n.props['data-conflict-group']==='title'));
});
test('G4 grouped schedule Keep my changes adopts only remote schedule baseline',async()=>{
 const h=reviewMount();h.edit('title','Local title');h.edit('name','Local name');h.find('DateRangePicker').props.onChange('2026-10-07','2026-10-12');h.render();h.find('TimezoneCombobox').props.onChange('Asia/Seoul');h.render();
 h.render({room:{...h.props().room,endDate:'2026-10-11',timezone:'Europe/London'}});const oldSave=h.find('form').props.onSubmit;
 const group=h.nodes().find(n=>n.props['data-conflict-group']==='schedule');assert.ok(group);
 const controls=h.nodes().filter(n=>n.type===primitives.Button && n.props.children==='dateSettings.keepChanges');controls[0].props.onClick();h.render();
 assert.equal(h.input('title').props.value,'Local title');assert.equal(h.input('name').props.value,'Local name');assert.equal(h.find('DateRangePicker').props.end,'2026-10-12');assert.equal(h.find('TimezoneCombobox').props.value,'Asia/Seoul');
 await oldSave({preventDefault(){}});assert.equal(h.calls.length,0);await h.submit();assert.equal(h.calls.length,1);
});
test('G4 resolving a field never dismisses coordinator whole external conflict',async()=>{
 let cleared=0;const h=mount({externalConflict:true,onUseLatest:()=>cleared++});h.edit('title','Local');h.render({room:{...h.props().room,title:'Remote'}});
 button(h,'dateSettings.keepChanges').props.onClick();h.render();assert.equal(cleared,0);await h.submit();assert.equal(h.calls.length,0);
 button(h,'dateSettings.useLatest').props.onClick();h.render({externalConflict:false});assert.equal(cleared,1);await h.submit();assert.equal(h.calls.length,1);
});
test('G4 timezone-only edit has interpretation warning and never requires date-removal consent',async()=>{
 const h=reviewMount();h.find('TimezoneCombobox').props.onChange('Asia/Seoul');h.render();assert.equal(h.find('DateRangePicker').props.start,'2026-10-07');assert.equal(button(h,'dateSettings.reviewDates'),undefined);
 assert.ok(h.nodes().some(n=>Array.isArray(n.props.children) && n.props.children.includes('dateSettings.timezoneWarning')));await h.submit();assert.equal(h.calls.length,1);
});
test('G4 per-field Keep my changes resolves only title and leaves name conflict',async()=>{
 const h=mount();h.edit('title','Local');h.edit('name','Local name');h.render({room:{...h.props().room,title:'Remote'},name:'Remote name'});
 const group=h.nodes().find(n=>n.props['data-conflict-group']==='title');assert.ok(group,'title conflict group missing');
 function descend(n){return [n,...(Array.isArray(n?.props?.children)?n.props.children.flatMap(descend):n?.props?.children?[...descend(n.props.children)]:[])];}
 descend(group).find(n=>n.props?.children==='dateSettings.keepChanges').props.onClick();h.render();assert.equal(h.input('title').props.value,'Local');await h.submit();assert.equal(h.calls.length,0);
 const nameGroup=h.nodes().find(n=>n.props['data-conflict-group']==='name');descend(nameGroup).find(n=>n.props?.children==='dateSettings.useLatest').props.onClick();h.render();assert.equal(h.input('name').props.value,'Remote name');await h.submit();assert.equal(h.calls.length,1);
});
test('G4 impact and conflict layout stays in the existing native scrolling body',()=>{
 const css=fs.readFileSync(new URL('../src/features/when-we-meet/date-settings.css',import.meta.url),'utf8');
 assert.match(css,/\.wwm-date-settings-actions\s*\{[^}]*flex-wrap:\s*wrap/s);
 assert.match(css,/\.wwm-date-settings-impact\s*\{[^}]*overflow-wrap:\s*anywhere/s);
});
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };

test('scoped CSS specifies bounded body, compact footer, tokens and opacity-only reduced motion', () => {
  const cssPath = new URL('../src/features/when-we-meet/date-settings.css', import.meta.url);
  assert.ok(fs.existsSync(cssPath), 'Settings scoped CSS is missing');
  const css = fs.readFileSync(cssPath, 'utf8');
  assert.match(css, /\.wwm-date-settings-body[^}]*overflow-y:\s*auto/s);
  assert.match(css, /\.wwm-date-settings-footer[^}]*flex-direction:\s*row/s);
  assert.match(css, /\.wwm-date-settings-control\s*>\s*\.wwm-date-settings-error[^}]*margin:\s*4px 0 0/s);
  assert.match(css, /prefers-reduced-motion/); assert.match(css, /data-mode=['"]dark/);
  assert.match(css, /--craft-radius:\s*4px/); assert.doesNotMatch(css, /translateY|scale\(/);
  assert.match(css, /@keyframes wwm-date-settings-in\s*\{\s*from\s*\{\s*opacity:\s*0/);
});
test('new owned locale keys are English in en and ko without translating authored values', () => {
  const en = JSON.parse(fs.readFileSync(new URL('../src/i18n/locales/wwm/en.json', import.meta.url), 'utf8'));
  const ko = JSON.parse(fs.readFileSync(new URL('../src/i18n/locales/wwm/ko.json', import.meta.url), 'utf8'));
  assert.ok(en.dateSettings, 'Date Settings copy is missing'); assert.deepEqual(ko.dateSettings, en.dateSettings);
  const source = fs.readFileSync(componentPath, 'utf8');
  for (const key of [...source.matchAll(/'dateSettings\.([A-Za-z]+)'/g)].map(match => match[1])) assert.equal(typeof en.dateSettings[key], 'string', key);
  for (const key of ['titleError', 'nameError', 'timezoneError']) assert.equal(typeof en.dateSettings[key], 'string');
});

test('displayed date errors revalidate on clock and remote baseline render', async () => {
  let now = new Date('2026-10-09T12:00:00Z'); const h = mount({ now: () => now });
  h.find('DateRangePicker').props.onChange('2026-10-08', '2026-10-10'); h.render(); await h.submit(); h.render(); assert.ok(h.find('DateRangePicker').props.error);
  now = new Date('2026-10-08T12:00:00Z'); h.render(); assert.equal(h.find('DateRangePicker').props.error, undefined);
  h.edit('title', ' '); await h.submit(); h.render(); assert.equal(h.input('title').props['aria-invalid'], true);
  h.render({ room: { ...h.props().room, title: 'Remote title' } });
  h.nodes().find(n => n.type === primitives.Button && n.props.children === 'dateSettings.useLatest').props.onClick(); h.render(); assert.equal(h.input('title').props['aria-invalid'], false);
});
test('name error stays through invalid-to-invalid then clears without removing other errors', async () => {
  const h = mount(); h.edit('name', ' '); h.edit('title', ' '); await h.submit(); h.render(); h.edit('name', 'a\u0001'); assert.equal(h.input('name').props['aria-invalid'], true); h.edit('name', 'Bob'); assert.equal(h.input('name').props['aria-invalid'], false); assert.equal(h.input('title').props['aria-invalid'], true);
});
test('member invalid focus targets name without considering hidden invalid metadata', async () => {
  const h = mount({ room: { id: 'room-a', ownerId: 'owner', role: 'MEMBER', title: '', startDate: 'bad', endDate: 'bad', timezone: '+09' } }); h.attachForm(); h.edit('name', ' '); await h.submit(); h.render(); assert.deepEqual(h.focused, [`[id="${h.input('name').props.id}"]`]);
});
test('stale picker and Cancel callbacks cannot mutate or close a later edit session', () => {
  const h = mount(); const range = h.find('DateRangePicker').props.onChange; const zone = h.find('TimezoneCombobox').props.onChange; const close = h.find('Dialog').props.onOpenChange;
  h.edit('title', 'Local'); range('2026-10-09', '2026-10-10'); zone('Asia/Seoul'); close(false); h.render(); assert.equal(h.find('DateRangePicker').props.start, '2026-10-07'); assert.equal(h.find('TimezoneCombobox').props.value, 'UTC'); assert.deepEqual(h.closes, []);
});

test('range opening interaction refreshes timezone today without mutating staged values', () => {
  let now = new Date('2026-10-07T12:00:00Z'); const h = mount({ now: () => now });
  h.render({ room: { ...h.props().room, startDate: '2026-10-20', endDate: '2026-10-22' } });
  assert.equal(h.find('DateRangePicker').props.minDate, '2026-10-07');
  const group = h.nodes().find(n => n.props.className === 'wwm-date-settings-control' && n.props.children?.[0]?.type === primitives.DateRangePicker);
  now = new Date('2026-10-08T12:00:00Z');
  assert.equal(typeof group.props.onPointerDownCapture, 'function', 'range opening must refresh clock'); group.props.onPointerDownCapture(); h.render();
  assert.equal(h.find('DateRangePicker').props.minDate, '2026-10-08'); assert.equal(h.calls.length, 0); assert.equal(h.find('DateRangePicker').props.start, '2026-10-20');
  now = new Date('2026-10-09T12:00:00Z'); assert.equal(typeof group.props.onKeyDownCapture, 'function', 'keyboard opening must refresh clock'); group.props.onKeyDownCapture(); h.render(); assert.equal(h.find('DateRangePicker').props.minDate, '2026-10-09');
});
test('actual reused range picker two-click commit stages settings, never submits', () => {
  const h = mount(); const slots = []; let cursor = 0; let tree;
  const p = Object.fromEntries(['Calendar', 'FieldTrigger', 'Popover', 'PopoverContent', 'PopoverTrigger'].map(name => [name, primitive(name)]));
  const hooks = { useRef(value) { const i = cursor++; return slots[i] ??= { current: value }; }, useState(value) { const i = cursor++; if (!(i in slots)) slots[i] = typeof value === 'function' ? value() : value; return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; } };
  const { DateRangePicker } = load('DateRangePicker.tsx', {
    react: hooks, '@/constants/analytics': { ANALYTICS_ELEMENTS: {} }, 'lucide-react': { CalendarDays: primitive('CalendarDays') },
    '@/components/ui/calendar': p, '@/components/ui/field-trigger': p, '@/components/ui/popover': p,
    '@/components/ui/layer': { useFloatingLayer: () => 'dialog' }, '@/components/craft/RequiredFieldLabel': primitives,
    './range.mjs': range, './display-date.mjs': displayDate, 'react-day-picker/locale': { ko: {} },
    './i18n/WwmI18nProvider': { useWwmCopy: () => ({ t: key => key, locale: 'en' }) }, './use-media-query': { useMediaQuery: () => false },
  });
  function render() { cursor = 0; tree = DateRangePicker(h.find('DateRangePicker').props); }
  function find(type) { const values = []; function visit(n) { if (Array.isArray(n)) n.forEach(visit); else if (n?.props) { values.push(n); visit(n.props.children); } } visit(tree); return values.find(n => n.type === type); }
  render(); find(p.Popover).props.onOpenChange(true); render();
  find(p.Calendar).props.onSelect(undefined, new Date('2026-10-09T12:00:00')); render(); assert.equal(h.calls.length, 0); assert.equal(h.find('DateRangePicker').props.start, '2026-10-07');
  find(p.Calendar).props.onSelect(undefined, new Date('2026-10-10T12:00:00')); h.render(); render();
  assert.equal(h.find('DateRangePicker').props.start, '2026-10-09'); assert.equal(h.find('DateRangePicker').props.end, '2026-10-10'); assert.equal(h.calls.length, 0); assert.equal(find(p.Popover).props.open, false);
});

test('component exists before integration', () => assert.ok(fs.existsSync(componentPath), 'DateRoomSettings staged component is missing'));
test('owner fields follow title, range, timezone, name; uses modal and no native validation', () => {
  const h = mount(); assert.deepEqual(h.nodes().filter(n => [primitives.Input, primitives.DateRangePicker, primitives.TimezoneCombobox].includes(n.type)).map(n => n.props.name || n.type.displayName), ['title', 'DateRangePicker', 'TimezoneCombobox', 'name']);
  assert.equal(h.find('DialogContent').props.mobilePresentation, 'modal'); assert.equal(h.find('form').props.noValidate, true);
  assert.equal(h.input('title').props.maxLength, 100); assert.equal(h.input('name').props.maxLength, 50);
});
test('member sees only own name even with invalid hidden room metadata', async () => {
  const h = mount({ room: { id: 'room-a', ownerId: 'owner', role: 'MEMBER', title: '', startDate: 'bad', endDate: 'bad', timezone: '+09' } });
  assert.equal(h.input('title'), undefined); assert.equal(h.find('DateRangePicker'), undefined); h.edit('name', ' Bob '); await h.submit(); assert.equal(h.calls.length, 1); assert.equal(h.calls[0].draft.name, 'Bob'); assert.equal(h.calls[0].draft.timezone, '+09');
});
test('typing and Cancel make no submit calls; reopening adopts actual baseline', () => {
  const h = mount(); h.edit('name', 'Staged'); h.find('Dialog').props.onOpenChange(false); assert.deepEqual(h.closes, [false]); assert.equal(h.calls.length, 0);
  h.render({ open: false }); h.render({ open: true }); assert.equal(h.input('name').props.value, 'Alice');
});
test('valid Save normalizes and freezes snapshot; parent alone owns closing', async () => {
  const h = mount(); h.edit('title', '  Team  '); h.edit('name', ' Bob '); await h.submit(); assert.equal(h.calls.length, 1);
  assert.deepEqual({ ...h.calls[0].draft }, { title: 'Team', name: 'Bob', startDate: '2026-10-07', endDate: '2026-10-10', timezone: 'UTC' });
  assert.equal(Object.isFrozen(h.calls[0].draft), true); assert.equal(Object.isFrozen(h.calls[0].operation), true); assert.deepEqual(h.closes, []);
});
for (const [field, value] of [['title', '   '], ['title', 'x'.repeat(101)], ['title', 'a\u0001b'], ['name', ' '], ['name', 'x'.repeat(51)], ['name', 'a\u007fb']]) {
  test(`inline ${field} invalid ${JSON.stringify(value).slice(0, 25)}`, async () => { const h = mount(); h.edit(field, value); await h.submit(); h.render(); assert.equal(h.calls.length, 0); assert.equal(h.input(field).props['aria-invalid'], true); assert.ok(h.input(field).props['aria-describedby']); });
}
for (const [start, end, allowed] of [['2026-10-07', '2026-11-03', true], ['2026-10-07', '2026-11-04', false], ['2026-10-05', '2026-10-10', false]]) {
  test(`range ${start} through ${end} allowed=${allowed}`, async () => { const h = mount(); h.find('DateRangePicker').props.onChange(start, end); h.render(); await h.submit(); h.render(); assert.equal(h.calls.length, allowed ? 1 : 0); assert.equal(Boolean(h.find('DateRangePicker').props.error), !allowed); });
}
test('exact historical current start allowed; picker min intentionally cannot express exact exception', async () => {
  const h = mount(); h.render({ room: { ...h.props().room, startDate: '2026-10-01' } }); assert.equal(h.find('DateRangePicker').props.minDate, '2026-10-01');
  await h.submit(); assert.equal(h.calls.length, 1); h.find('DateRangePicker').props.onChange('2026-10-02', '2026-10-10'); h.render(); await h.submit(); assert.equal(h.calls.length, 1);
});
for (const zone of ['+09', ' UTC', 'GMT+09']) test(`strict timezone rejects ${zone}`, async () => { const h = mount(); h.find('TimezoneCombobox').props.onChange(zone); h.render(); await h.submit(); h.render(); assert.equal(h.calls.length, 0); assert.ok(h.find('TimezoneCombobox').props.error); });
test('displayed errors survive another invalid value and clear only on valid correction', async () => {
  const h = mount(); h.edit('title', ' '); h.edit('name', ' '); await h.submit(); h.render(); h.edit('title', '\u0001'); assert.equal(h.input('title').props['aria-invalid'], true);
  h.edit('title', 'Valid'); assert.equal(h.input('title').props['aria-invalid'], false); assert.equal(h.input('name').props['aria-invalid'], true);
});
test('first invalid focus intent follows owner field order; IDs and errors are associated', async () => {
  const h = mount(); h.attachForm(); h.edit('title', ' '); h.edit('name', ' '); await h.submit(); h.render(); assert.deepEqual(h.focused, [`[id="${h.input('title').props.id}"]`]);
  const errors = h.nodes().filter(n => n.props.role === 'alert'); assert.ok(errors.some(n => n.props.id === h.input('title').props['aria-describedby']));
  assert.notEqual(h.input('title').props.id, h.input('name').props.id); assert.equal(h.input('name').props.required, true);
});
test('range and timezone invalid focus intents target reused trigger IDs', async () => {
  const h = mount(); h.attachForm(); h.find('DateRangePicker').props.onChange('bad', 'bad'); h.render(); await h.submit(); assert.deepEqual(h.focused, [`[id="${h.find('DateRangePicker').props.id}-trigger"]`]);
  h.find('DateRangePicker').props.onChange('2026-10-07', '2026-10-10'); h.render(); h.find('TimezoneCombobox').props.onChange('+09'); h.render(); await h.submit(); assert.equal(h.focused.at(-1), `[id="${h.find('TimezoneCombobox').props.id}"]`);
});
test('timezone adapter uses selected civil start; today revalidates against injected clock', async () => {
  let now = new Date('2026-10-07T23:30:00Z'); const h = mount({ now: () => now });
  h.find('DateRangePicker').props.onChange('2026-10-08', '2026-10-10'); h.render(); assert.equal(h.find('TimezoneCombobox').props.referenceDate, '2026-10-08');
  now = new Date('2026-10-09T00:30:00Z'); await h.submit(); h.render(); assert.equal(h.calls.length, 0); assert.ok(h.find('DateRangePicker').props.error);
});
test('held Save rejects duplicate, retained edits and busy dismissal synchronously', async () => {
  const pending = deferred(); let writes = 0; const h = mount({ onSubmit: () => { writes++; return pending.promise; } });
  const edit = h.input('name').props.onChange; const close = h.find('Dialog').props.onOpenChange; const save = h.find('form').props.onSubmit;
  const first = save({ preventDefault() {} }); await save({ preventDefault() {} }); edit({ target: { value: 'Wrong' } }); close(false); h.render(); assert.equal(writes, 1); assert.equal(h.input('name').props.value, 'Alice'); assert.deepEqual(h.closes, []); assert.equal(h.find('fieldset').props.disabled, true);
  pending.resolve(); await first; h.render(); assert.equal(h.find('fieldset').props.disabled, false);
});
test('rejected callback preserves draft and allows retry without auto close', async () => {
  const h = mount({ onSubmit: () => Promise.reject(new Error('transport')) }); h.edit('name', 'Retained'); await h.submit(); h.render(); assert.equal(h.input('name').props.value, 'Retained'); assert.equal(h.find('fieldset').props.disabled, false); assert.ok(h.nodes().some(n => n.props.role === 'alert')); assert.deepEqual(h.closes, []);
});
test('open nested picker vetoes Save until dismissed', async () => { const h = mount(); h.attachForm(true); await h.submit(); assert.equal(h.calls.length, 0); h.attachForm(false); await h.submit(); assert.equal(h.calls.length, 1); });
for (const scenario of ['edit-undo', 'session-ABA', 'role-ABA', 'auth-ABA', 'user-ABA', 'metadata-ABA']) {
  test(`retained Save cannot borrow current draft after ${scenario}`, async () => {
    const h = mount(); const save = h.find('form').props.onSubmit;
    if (scenario === 'edit-undo') { h.edit('title', 'Other'); h.edit('title', 'Meeting'); }
    if (scenario === 'session-ABA') { h.render({ session: 2 }); h.render({ session: 1 }); }
    if (scenario === 'role-ABA') { const room = h.props().room; h.render({ room: { ...room, role: 'MEMBER', ownerId: 'other' } }); h.render({ room }); }
    if (scenario === 'auth-ABA') { h.render({ authLoading: true }); h.render({ authLoading: false }); }
    if (scenario === 'user-ABA') { h.render({ userId: 'other' }); h.render({ userId: 'user-a' }); }
    if (scenario === 'metadata-ABA') { const room = h.props().room; h.render({ room: { ...room, title: 'External' } }); h.render({ room }); }
    await save({ preventDefault() {} }); assert.equal(h.calls.length, 0); await h.submit(); assert.equal(h.calls.length, 1);
  });
}
test('role loss hides controls; current member Save replaces hidden staged owner values', async () => {
  const h = mount(); h.edit('title', 'Staged owner'); const stale = h.find('form').props.onSubmit;
  h.render({ room: { ...h.props().room, role: 'MEMBER', ownerId: 'other', title: 'Authoritative' } }); assert.equal(h.input('title'), undefined);
  await stale({ preventDefault() {} }); assert.equal(h.calls.length, 0); h.edit('name', 'Bob'); await h.submit(); assert.equal(h.calls[0].draft.title, 'Authoritative'); assert.equal(h.calls[0].operation.owner, false);
});
test('authorization and loading hide private form and revoke retained callbacks', async () => { const h = mount(); const save = h.find('form').props.onSubmit; assert.equal(h.render({ authorized: false }), null); await save({ preventDefault() {} }); assert.equal(h.calls.length, 0); assert.equal(h.render({ authorized: true, authLoading: true }), null); });
test('untouched external fields adopt latest while dirty remote field blocks Save until explicit Use latest', async () => {
  const h = mount(); h.edit('title', 'Local'); h.render({ room: { ...h.props().room, title: 'Remote', timezone: 'Asia/Seoul' }, name: 'Remote Alice' });
  assert.equal(h.input('title').props.value, 'Local'); assert.equal(h.input('name').props.value, 'Remote Alice'); assert.equal(h.find('TimezoneCombobox').props.value, 'Asia/Seoul'); await h.submit(); assert.equal(h.calls.length, 0);
  const latest = h.nodes().find(n => n.type === primitives.Button && n.props.children === 'dateSettings.useLatest'); assert.ok(latest); latest.props.onClick(); h.render(); assert.equal(h.input('title').props.value, 'Remote'); await h.submit(); assert.equal(h.calls.length, 1);
});
test('schedule conflict preserves grouped start/end/timezone', async () => {
  const h = mount(); h.find('DateRangePicker').props.onChange('2026-10-08', '2026-10-11'); h.render(); h.render({ room: { ...h.props().room, timezone: 'Asia/Seoul' } }); assert.equal(h.find('DateRangePicker').props.start, '2026-10-08'); assert.equal(h.find('TimezoneCombobox').props.value, 'UTC'); await h.submit(); assert.equal(h.calls.length, 0);
});
test('old operation finally cannot clear a new scope pending; operation predicate revokes on unmount', async () => {
  const a = deferred(), b = deferred(); const operations = []; let n = 0;
  const h = mount({ onSubmit: (_draft, operation) => { operations.push(operation); return n++ === 0 ? a.promise : b.promise; } });
  const first = h.submit(); h.render({ session: 2 }); const second = h.submit(); assert.equal(operations[0].isCurrent(), false); a.resolve(); await first; h.render(); assert.equal(h.find('fieldset').props.disabled, true);
  h.unmount(); assert.equal(operations[1].isCurrent(), false); b.resolve(); await second;
});
test('external saving and blocking reason prevent dispatch and dismissal while saving', async () => {
  const h = mount({ saving: true }); await h.submit(); h.find('Dialog').props.onOpenChange(false); assert.equal(h.calls.length, 0); assert.deepEqual(h.closes, []);
  h.render({ saving: false, blockedReason: 'Review changed dates before saving.' }); await h.submit(); assert.equal(h.calls.length, 0);
});
