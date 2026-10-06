import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
import { normalizeDatePeople } from '../src/features/when-we-meet/date-confirm-ui.mjs';
import test from 'node:test';
import { load } from './wwm-date-room-harness.mjs';
import { validateDateSettings } from '../src/features/when-we-meet/date-settings.mjs';
import { todayInTimezone } from '../src/features/when-we-meet/creation-validation.mjs';
import * as range from '../src/features/when-we-meet/range.mjs';
import * as dateAvailability from '../src/features/when-we-meet/date-availability.mjs';
import { datesInRange } from '../src/features/when-we-meet/date-availability.mjs';
import * as dateCalendar from '../src/features/when-we-meet/date-calendar.mjs';
import { normalizeDateRoom, rawDateVersion } from '../src/features/when-we-meet/date-normalize.mjs';
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
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };


test('coordinator-owned exact title ACK rebind remains current across its own prop update', async () => {
  const held = deferred(); let op; const h = mount({ onSubmit: (_, operation) => { op = operation; return held.promise; } });
  h.edit('title', 'New title'); const pending = h.submit();
  assert.equal(typeof op.acceptAcknowledgement, 'function', 'expected ACK handshake missing');
  assert.equal(op.acceptAcknowledgement({ title: 'New title' }), true);
  h.render({ room: { ...h.props().room, title: 'New title' } });
  assert.equal(op.isCurrent(), true, 'own ACK must not self-revoke');
  held.resolve(); await pending;
});
test('ACK handshake rejects malformed or non-group atomic schedule patches', async () => {
  const held = deferred(); let op; const h = mount({ onSubmit: (_, operation) => { op = operation; return held.promise; } });
  const pending = h.submit();
  assert.equal(typeof op.acceptAcknowledgement, 'function', 'expected ACK handshake missing');
  for (const patch of [{ title: ' ' }, { name: 'a\u0001' }, { startDate: '2026-10-08' }, { startDate: 'bad', endDate: 'bad', timezone: 'UTC' }, { timezone: '+09', startDate: '2026-10-07', endDate: '2026-10-10' }, { title: 'OK', name: 'Bob' }]) {
    assert.equal(op.acceptAcknowledgement(patch), false);
  }
  assert.equal(op.isCurrent(), true); held.resolve(); await pending;
});
test('ACK rebind does not authorize unexpected metadata or auth ABA', async () => {
  for (const kind of ['unexpected-title', 'auth-ABA']) {
    const held = deferred(); let op; const h = mount({ onSubmit: (_, operation) => { op = operation; return held.promise; } });
    const pending = h.submit(); assert.equal(typeof op.acceptAcknowledgement, 'function', 'expected ACK handshake missing');
    assert.equal(op.acceptAcknowledgement({ title: 'Expected' }), true);
    h.render({ room: { ...h.props().room, title: kind === 'unexpected-title' ? 'Other' : 'Expected' } });
    if (kind === 'auth-ABA') { h.render({ authLoading: true }); h.render({ authLoading: false }); }
    assert.equal(op.isCurrent(), false); assert.equal(op.acceptAcknowledgement({ name: 'Bob' }), false);
    held.resolve(); await pending;
  }
});
test('owner ACK commits field baseline so failure retry does not report its own success as conflict', async () => {
  let first = true; let accepted = false; const h = mount({ onSubmit: (_, op) => {
    if (first) { first = false; accepted = op.acceptAcknowledgement?.({ title: 'Saved title' }) === true; throw new Error('schedule failed'); }
  } });
  h.edit('title', 'Saved title'); h.edit('name', 'Staged name'); await h.submit();
  assert.equal(accepted, true, 'expected ACK handshake missing');
  h.render({ room: { ...h.props().room, title: 'Saved title' } });
  assert.equal(h.input('title').props.value, 'Saved title'); assert.equal(h.input('name').props.value, 'Staged name');
  assert.equal(h.nodes().some(n => n.props.children === 'dateSettings.conflict'), false);
  await h.submit();
});
test('atomic schedule ACK and own name ACK retain the same operation', async () => {
  const held = deferred(); let op; const h = mount({ onSubmit: (_, operation) => { op = operation; return held.promise; } });
  const pending = h.submit(); assert.equal(typeof op.acceptAcknowledgement, 'function', 'expected ACK handshake missing');
  assert.equal(op.acceptAcknowledgement({ startDate: '2026-10-07', endDate: '2026-10-12', timezone: 'Asia/Seoul' }), true);
  h.render({ room: { ...h.props().room, endDate: '2026-10-12', timezone: 'Asia/Seoul' } }); assert.equal(op.isCurrent(), true);
  assert.equal(op.acceptAcknowledgement({ name: 'Bob' }), true); h.render({ name: 'Bob' }); assert.equal(op.isCurrent(), true);
  held.resolve(); await pending; assert.equal(op.isCurrent(), false); assert.equal(op.acceptAcknowledgement({ title: 'Too late' }), false);
});

test('parent Settings is mounted and inline name input is removed', () => {
  const h = parentProbe({ user: { id: 'user-a' }, loading: false }, true);
  const out = []; const visit = n => { if (Array.isArray(n)) n.forEach(visit); else if (n?.props) { out.push(n); visit(n.props.children); } }; visit(h.render());
  assert.equal(out.some(n => n.type === 'Input'), false);
  assert.equal(out.some(n => n.type === 'DateRoomSettings'), true);
});

function parentProbe(account, direct = false) {
  let guards; const edits = [];
  const slots = []; let cursor = 0;
  const hooks = {
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useEffect() { cursor++; }, useMemo(fn) { cursor++; return fn(); }, useCallback(fn) { cursor++; return fn; },
  };
  const imports = {
    react: hooks, '@/app/craft/CraftAccount': { useCraftAccount: () => account },
    './useDateAvailabilitySync': { useDateAvailabilitySync: (_, __, ___, options) => { guards = options; return { draft: { name: 'Alice', availableDates: [] }, baseline: { name: 'Alice', availableDates: [] }, receive() {}, save() {}, edit(value) { edits.push(value); } }; } },
    './date-availability.mjs': { aggregateDateAvailability: () => ({ dates: [] }) },
    './i18n/WwmI18nProvider': { useWwmCopy: () => ({ t: key => key }) },
    '@/components/ui/input': { Input: 'Input' }, '@/components/ui/button': { Button: 'Button' }, '@/components/ui/tabs': { Tabs: 'Tabs', TabsList: 'TabsList', TabsTrigger: 'TabsTrigger', TabsContent: 'TabsContent' },
    './DateAvailabilityCalendar': { DateAvailabilityCalendar: 'DateAvailabilityCalendar' },
    './DateRoomSettings': { DateRoomSettings: 'DateRoomSettings' },
  };
  const module = load('DateWhenWeMeet.tsx', imports);
  const props = { initialRoom: { room: { id: 'room-a', title: 'Private', ownerId: 'user-a', role: 'ADMIN', scheduleMode: 'date', startDate: '2026-10-07', endDate: '2026-10-10', timezone: 'UTC' }, userId: 'user-a' }, responsesPromise: Promise.resolve({ responses: [] }) };
  const render = next => { account = next ?? account; cursor = 0; return direct ? module.DateRoomContent({ ...props, accountState: { userId: account.user?.id ?? null, loading: account.loading } }) : module.default(props); };
  return { render, guards: () => guards, edits };
}
for (const direct of [false, true]) test(`known-other-user loading private tree hidden immediately (direct=${direct})`, () => {
  const h = parentProbe({ user: { id: 'other' }, loading: true }, direct);
  assert.equal(h.render(), null);
});
test('initial unknown loading SSR is read-only and hook write/timer gates revoke before effects', () => {
  const h = parentProbe({ user: null, loading: true }, true);
  assert.notEqual(h.render(), null);
  assert.equal(typeof h.guards()?.canMutate, 'function', 'parent hook mutation boundary missing');
  assert.equal(h.guards().canMutate(), false); assert.equal(h.guards().canAutosave(), false);
  h.render({ user: { id: 'user-a' }, loading: false }); const retained = h.guards();
  assert.equal(retained.canMutate(), true); assert.equal(retained.canAutosave(), true);
  h.render({ user: { id: 'user-a' }, loading: true });
  assert.equal(retained.canMutate(), false); assert.equal(retained.canAutosave(), false);
  h.render({ user: null, loading: false }); assert.equal(retained.canMutate(), false);
});

test('read-only auth render disables availability and retained changes do not edit its draft', () => {
  const h = parentProbe({ user: { id: 'user-a' }, loading: false }, true);
  const walk = tree => { const out = []; const visit = n => { if (Array.isArray(n)) n.forEach(visit); else if (n?.props) { out.push(n); visit(n.props.children); } }; visit(tree); return out; };
  const oldCalendar = walk(h.render()).find(n => n.type === 'DateAvailabilityCalendar');
  const current = walk(h.render({ user: null, loading: true })).find(n => n.type === 'DateAvailabilityCalendar');
  assert.equal(current.props.disabled, true);
  oldCalendar.props.onChange(['2026-10-07']); current.props.onChange(['2026-10-08']);
  assert.equal(h.edits.length, 0);
});

function localParent(imports, globals) {
 const module={exports:{}};const require=createRequire(import.meta.url);
 const source=fs.readFileSync(new URL('../src/features/when-we-meet/DateWhenWeMeet.tsx',import.meta.url),'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInNewContext(`(function(require,module,exports){${code}})`,{AbortController,...globals})(key=>imports[key]??(key==='react/jsx-runtime'?require(key):{}),module,module.exports);
 return module.exports;
}
function pipeline(overrides = {}) {
 const room = { id:'room-a', title:'Meeting', ownerId:'user-a', role:'ADMIN', scheduleMode:'date', startDate:'2026-10-07', endDate:'2026-10-10', timezone:'UTC', startTime:null,endTime:null, ...overrides.room };
 const response = {userId:'user-a',displayName:'Alice',availableDates:['2026-10-08'],updatedAt:'2026-10-07T12:00:00.000001Z',...overrides.response};
 const slots=[]; let cursor=0, tree, child, account={userId:'user-a',loading:false}; const calls=[], toasts=[], effects=[];let initialUser='user-a';const timers=new Map();let timerSerial=0;const wrapperScope={current:{binding:'initial',generation:0}};
 let model={draft:{name:'Alice',availableDates:['2026-10-09']},baseline:{name:'Alice',availableDates:['2026-10-08']},saving:false,dirty:true,rangeChanged:false,
 receive(value){model.baseline=value;}, edit(){calls.push('edit');},save(){calls.push('save');},acknowledgeRange(){model.rangeChanged=false;},
 async rename(name){calls.push('name'); if(overrides.name) return overrides.name(name); model.baseline={...model.baseline,name}; return {ok:true,value:{...model.baseline,name}};}};
 let guards;
 const hooks={useRef(v){const i=cursor++;return slots[i]??={current:v};},useState(v){const i=cursor++;if(!(i in slots))slots[i]=typeof v==='function'?v():v;return [slots[i],n=>{slots[i]=typeof n==='function'?n(slots[i]):n;}];},useEffect(){cursor++;},useCallback(f){cursor++;return f;},useMemo(f){cursor++;return f();}};
 if(overrides.parentEffects)hooks.useEffect=(fn,deps)=>{const i=cursor++;const old=slots[i];if(!old || deps.some((v,j)=>v!==old.deps[j]))effects.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()};});};
 const hookReact={...hooks,useEffect(fn,deps){const i=cursor++;const old=slots[i];if(!old || deps.some((v,j)=>v!==old.deps[j])){effects.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()};});}}};
 const {useDateAvailabilitySync:realSync}=load('useDateAvailabilitySync.ts',{react:hookReact,'./date-calendar.mjs':dateCalendar,'./date-availability.mjs':dateAvailability,'./date-normalize.mjs':{rawDateVersion},'./date-api':{async saveDateResponse(id,name,availableDates){calls.push('name');if(overrides.realName)return overrides.realName(name,availableDates);return {saved:true,value:{name,availableDates,version:'2026-10-07T12:00:00.000002Z'}};}}});
 const imports={react:hooks,'./DateRoomSettings':{DateRoomSettings:'Settings'},'./RoomChrome':{RoomHeader:'Header'},'./Notice':{Notice:'Notice'},'@/components/ui/button':{Button:'Button'},'./DateRoomResponseLoader':{DateRoomResponseLoader:'Loader'},'./DateAvailabilityCalendar':{DateAvailabilityCalendar:'Calendar'},
 './useDateAvailabilitySync':{useDateAvailabilitySync(...args){guards=args[3];if(overrides.realHook)model=realSync(...args);return model;}},'./date-availability.mjs':{aggregateDateAvailability:()=>({dates:[]}),datesInRange},
 './date-calendar.mjs':dateCalendar,'./date-settings.mjs':{validateDateSettings},'./date-normalize.mjs':{rawDateVersion},'./date-confirm-ui.mjs':{normalizeDatePeople},
 './api':{async renameRoom(id,title){calls.push('title');reconcile();return overrides.title?overrides.title(title):{title};}},
 './date-api':{async updateDateRoomSchedule(id,schedule){calls.push('schedule');reconcile();return overrides.schedule?overrides.schedule(schedule):{schedule,removedDates:0};},async loadDateRoom(){calls.push('load');reconcile();return overrides.load?overrides.load():{room:{...room,title:'New',endDate:'2026-10-12',timezone:'Asia/Seoul'},userId:'user-a',responses:[response]};}},
 sonner:{toast:{success:v=>toasts.push(v)}},'./i18n/WwmI18nProvider':{useWwmCopy:()=>({t:k=>k})}};
 const {DateRoomContent}=overrides.parentEffects?localParent(imports,{setTimeout(fn){const id=++timerSerial;timers.set(id,fn);return id;},clearTimeout(id){timers.delete(id);},fetch:overrides.roster??(()=>Promise.resolve({ok:true,json:async()=>({people:[]})}))}):load('DateWhenWeMeet.tsx',imports);
 function render(next){if(next)account=next;cursor=0;tree=DateRoomContent({initialRoom:{room,userId:initialUser},responsesPromise:Promise.resolve({}),accountState:account,shareScope:wrapperScope});effects.splice(0).forEach(fn=>fn());return tree;}
 function reconcile(){render();child?.render(find('Settings').props);}
 function nodes(){const out=[];const visit=n=>{if(Array.isArray(n))n.forEach(visit);else if(n?.props){out.push(n);visit(n.props.children);}};visit(tree);return out;}
 function find(type){return nodes().find(n=>n.type===type);}
 render();const loader=find('Loader');loader.props.onReady({error:true});render();const poll=find('Notice').props.action.props.onClick;loader.props.onReady({responses:[response]});render();
 const draft={title:'New',startDate:room.startDate,endDate:'2026-10-12',timezone:'Asia/Seoul',name:'Bob'};
 function submit(value=draft){const node=find('Settings');assert.ok(node,'mounted Settings missing');return node.props.onSubmit(value,{roomId:room.id,userId:'user-a',owner:room.role==='ADMIN',isCurrent:()=>true,acceptAcknowledgement:()=>true});}
 return {render,find,calls,toasts,get model(){return model;},guards:()=>guards,submit,draft,room,link(value){child=value;},reconcile,poll,timers,people:()=>slots[2],setResponses(value){slots[1]=value;render();},async tick(){const [id,fn]=timers.entries().next().value??[];if(fn){timers.delete(id);await fn();}},revokeWrapper(){wrapperScope.current.generation++;},remote(change){slots[0]={...slots[0],...change};render();},identity(value){initialUser=value;render();}};
}

function normalizedSettingsRoom(timezone, owner = false) {
 const userId = '11111111-1111-4111-8111-111111111111';
 return normalizeDateRoom({ id:'22222222-2222-4222-8222-222222222222', owner_id:owner?userId:'33333333-3333-4333-8333-333333333333', title:'Meeting', schedule_mode:'date', start_date:'2026-10-07', end_date:'2026-10-10', timezone, start_time:null, end_time:null }, userId);
}
function mountedSettingsPipeline(room) {
 const h = pipeline({ realHook:true, room });
 h.find('Header').props.onSettings(); h.render();
 const form = mount(h.find('Settings').props); h.link(form);
 return { h, form };
}
for (const timezone of ['+09:00', 'UTC']) test(`normalized member ${timezone} mounted name-only save commits and closes exactly once`, async () => {
 const room = normalizedSettingsRoom(timezone);
 assert.equal(room.role, 'MEMBER'); assert.equal(room.timezone, timezone);
 assert.equal(Boolean(validateDateSettings({ ...room, name:'Bob' }, { room }).timezone), timezone === '+09:00');
 const { h, form } = mountedSettingsPipeline(room);
 assert.equal(form.input('title'), undefined); assert.equal(form.find('TimezoneCombobox'), undefined);
 assert.equal(h.model.baseline.name, 'Alice'); form.edit('name', 'Bob');
 await form.submit(); h.reconcile();
 assert.deepEqual(h.calls, ['name'], 'member name-only preflight must ignore hidden metadata');
 assert.equal(h.model.baseline.name, 'Bob'); assert.equal(h.model.draft.name, 'Bob');
 assert.equal(h.toasts.length, 1); assert.equal(h.find('Settings').props.open, false);
 assert.equal(h.find('Settings').props.submitError, ''); assert.equal(h.room.timezone, timezone);
});
test('normalized owner fixed-offset timezone retains full validation and zero writes', async () => {
 const room = { ...normalizedSettingsRoom('+09:00', true), ownerId:'user-a' };
 const { h, form } = mountedSettingsPipeline(room);
 form.edit('title', 'Staged title'); form.edit('name', 'Bob');
 await form.submit(); h.reconcile();
 assert.deepEqual(h.calls, []); assert.equal(h.toasts.length, 0); assert.equal(h.model.baseline.name, 'Alice');
 assert.equal(form.find('TimezoneCombobox').props.error, 'dateSettings.timezoneError');
 assert.ok(form.nodes().some(n => n.props.role === 'alert' && n.props.children === 'dateSettings.timezoneError'));
 assert.equal(form.input('title').props.value, 'Staged title'); assert.equal(form.input('name').props.value, 'Bob');
 assert.equal(h.find('Settings').props.open, true);
 await h.submit({ ...room, title:'Staged title', name:'Bob' });
 assert.deepEqual(h.calls, [], 'owner parent preflight must also reject invalid timezone');
});
test('normalized member invalid name retains specific visible error and draft without writes', async () => {
 const { h, form } = mountedSettingsPipeline(normalizedSettingsRoom('+09:00'));
 const invalidName = 'Bad\u0001name'; form.edit('name', invalidName);
 await form.submit(); h.reconcile();
 assert.deepEqual(h.calls, []); assert.equal(h.toasts.length, 0); assert.equal(h.model.baseline.name, 'Alice');
 assert.equal(form.input('name').props.value, invalidName); assert.equal(form.input('name').props['aria-invalid'], true);
 assert.ok(form.nodes().some(n => n.props.role === 'alert' && n.props.children === 'dateSettings.nameError'));
 assert.equal(h.find('Settings').props.open, true);
 await h.submit({ ...h.room, name:invalidName }); assert.deepEqual(h.calls, [], 'member parent preflight must still reject invalid name');
});

test('actual mounted form accepts its own ACK renders through all four stages',async()=>{
 const h=pipeline();h.find('Header').props.onSettings();h.render();
 const form=mount(h.find('Settings').props);h.link(form);
 form.edit('title','New');form.find('DateRangePicker').props.onChange('2026-10-07','2026-10-12');form.render();form.find('TimezoneCombobox').props.onChange('Asia/Seoul');form.render();form.edit('name','Bob');
 await form.submit();h.reconcile();assert.deepEqual(h.calls,['title','schedule','load','name']);assert.equal(h.toasts.length,1);
});
test('real sync hook Settings rename saves latest unsaved and received date deltas',async()=>{
 const h=pipeline({realHook:true,room:{role:'MEMBER',ownerId:'other'}});
 h.model.edit({name:'Alice',availableDates:['2026-10-09']});h.render();
 h.model.receive({name:'Alice',availableDates:['2026-10-08','2026-10-10']},h.room);h.render();
 await h.submit({...h.draft,title:'Ignored',name:'Bob'});h.render();
 assert.deepEqual(h.calls,['name']);assert.deepEqual(Array.from(h.model.baseline.availableDates),['2026-10-09','2026-10-10']);assert.equal(h.model.baseline.name,'Bob');
});
test('required reload locks form edits and Cancel but Retry remains callable',async()=>{
 const h=mount({closeBlocked:true,submitError:'Reload failed'});const old=h.input('name').props.onChange;
 h.find('Dialog').props.onOpenChange(false);old({target:{value:'Late'}});h.render();
 assert.equal(h.closes.length,0);assert.equal(h.input('name').props.value,'Alice');await h.submit();assert.equal(h.calls.length,1);
});
test('shrink draft exposes persistent explanation disables Save and writes nothing',async()=>{
 const h=mount();h.find('DateRangePicker').props.onChange('2026-10-08','2026-10-10');h.render();h.edit('title','New');await h.submit();
 assert.equal(h.calls.length,0);assert.ok(h.nodes().some(n=>n.props.children==='dateSettings.shrinkWarning'));assert.equal(h.nodes().find(n=>n.props.type==='submit').props.disabled,true);
});

function shrinkButton(f,key){const b=f.nodes().find(n=>n.props.children===key);assert.ok(b,`missing ${key}`);b.props.onClick();f.render();}
function stageShrink(f){f.edit('title','New');f.find('DateRangePicker').props.onChange('2026-10-08','2026-10-10');f.render();f.edit('name','Bob');}
function approveShrink(f){shrinkButton(f,'dateSettings.reviewDates');shrinkButton(f,'dateSettings.consent');}
function shrinkPipeline(extra={}){
 const h=pipeline({realHook:true,schedule:s=>({schedule:s,removedDates:7}),load:()=>({room:{...h.room,title:'New',startDate:'2026-10-08'},userId:'user-a',responses:[{userId:'user-a',displayName:'Alice',availableDates:['2026-10-08'],updatedAt:'2026-10-07T12:00:00.000002Z'}]}),...extra});
 h.find('Header').props.onSettings();h.render();const f=mount(h.find('Settings').props);h.link(f);stageShrink(f);return {h,f};
}
test('G4 mounted real hook shrink needs consent then actual trim review and a new Save',async()=>{
 const {h,f}=shrinkPipeline();await f.submit();assert.deepEqual(h.calls,[]);approveShrink(f);assert.deepEqual(h.calls,[]);await f.submit();h.reconcile();
 assert.deepEqual(h.calls,['title','schedule','load']);assert.equal(h.toasts.length,0);assert.equal(h.model.rangeChanged,false);
 assert.ok(f.nodes().some(n=>n.props['data-actual-removals']===7));assert.ok(f.nodes().some(n=>n.props.children==='dateSettings.trimMismatch'));
 await f.submit();assert.deepEqual(h.calls,['title','schedule','load']);shrinkButton(f,'dateSettings.actualReviewed');h.reconcile();assert.equal(h.calls.includes('name'),false);
 await f.submit();h.reconcile();assert.deepEqual(h.calls,['title','schedule','load','name']);assert.equal(h.toasts.length,1);
});
test('G4 reload failure retains actual trim count and Retry loads only before review',async()=>{
 let fail=true;const {h,f}=shrinkPipeline({load:()=>{if(fail){fail=false;throw Error();}return {room:{...h.room,title:'New',startDate:'2026-10-08'},userId:'user-a',responses:[{userId:'user-a',displayName:'Alice',availableDates:['2026-10-08'],updatedAt:'2026-10-07T12:00:00.000002Z'}]};}});
 approveShrink(f);await f.submit();h.reconcile();assert.equal(h.find('Settings').props.closeBlocked,true);assert.ok(f.nodes().some(n=>n.props['data-actual-removals']===7));await f.submit();h.reconcile();assert.deepEqual(h.calls,['title','schedule','load','load']);shrinkButton(f,'dateSettings.actualReviewed');h.reconcile();await f.submit();h.reconcile();assert.deepEqual(h.calls,['title','schedule','load','load','name']);
});
test('G4 unexpected response change during own title ACK prevents schedule dispatch',async()=>{
 const held=deferred();const {h,f}=shrinkPipeline({title:()=>held.promise});approveShrink(f);const running=f.submit();h.model.edit({name:'Alice',availableDates:['2026-10-09']});h.reconcile();held.resolve({title:'New'});await running;assert.deepEqual(h.calls,['title']);assert.equal(h.toasts.length,0);
});
test('G4 post trim review revoked on own dates ABA before remaining rename',async()=>{
 const {h,f}=shrinkPipeline();approveShrink(f);await f.submit();h.reconcile();shrinkButton(f,'dateSettings.actualReviewed');h.reconcile();h.model.edit({name:'Alice',availableDates:[]});h.reconcile();h.model.edit({name:'Alice',availableDates:['2026-10-08']});h.reconcile();await f.submit();assert.deepEqual(h.calls,['title','schedule','load']);
});
test('G4 own availability edit undo before a render invalidates parent consent boundary',async()=>{
 const {h,f}=shrinkPipeline();approveShrink(f);const edit=h.find('Calendar').props.onChange;
 edit(['2026-10-09']);edit(['2026-10-08']);h.render();await f.submit();assert.deepEqual(h.calls,[]);
});
test('G4 shrink zero actual removals still requires actual review',async()=>{
 const {h,f}=shrinkPipeline({schedule:s=>({schedule:s,removedDates:0})});approveShrink(f);await f.submit();h.reconcile();assert.deepEqual(h.calls,['title','schedule','load']);assert.ok(f.nodes().some(n=>n.props['data-actual-removals']===0));await f.submit();assert.equal(h.calls.includes('name'),false);shrinkButton(f,'dateSettings.actualReviewed');h.reconcile();await f.submit();assert.equal(h.calls.filter(x=>x==='name').length,1);
});
test('G4 actual own trim details and remaining dates are reviewed before acknowledging real hook',async()=>{
 const {h,f}=shrinkPipeline();h.model.edit({name:'Alice',availableDates:['2026-10-07','2026-10-09']});h.reconcile();approveShrink(f);await f.submit();h.reconcile();assert.equal(h.model.rangeChanged,true);assert.deepEqual(h.calls,['title','schedule','load']);
 const actual=h.find('Settings').props.actualTrim;assert.deepEqual(Array.from(actual.ownRemovedDates),['2026-10-07']);assert.deepEqual(Array.from(actual.remainingOwnDates),['2026-10-09']);
 assert.ok(f.nodes().some(n=>Array.isArray(n.props.children)&&n.props.children.includes('dateSettings.actualOwnRemoved')));await f.submit();assert.equal(h.model.rangeChanged,true);
 shrinkButton(f,'dateSettings.actualReviewed');h.reconcile();assert.equal(h.model.rangeChanged,false);assert.equal(h.calls.includes('name'),false);await f.submit();h.reconcile();assert.deepEqual(Array.from(h.model.baseline.availableDates),['2026-10-09']);
});
test('G4 real hook partial rename failure retries name only with live dates',async()=>{
 let fail=true;const {h,f}=shrinkPipeline({realName:(name,availableDates)=>{if(fail){fail=false;throw Error('name failed');}return {saved:true,value:{name,availableDates,version:'2026-10-07T12:00:00.000003Z'}};}});
 approveShrink(f);await f.submit();h.reconcile();shrinkButton(f,'dateSettings.actualReviewed');h.reconcile();await f.submit();h.reconcile();assert.deepEqual(h.calls,['title','schedule','load','name']);assert.equal(f.input('name').props.value,'Bob');assert.equal(h.toasts.length,0);await f.submit();h.reconcile();assert.deepEqual(h.calls,['title','schedule','load','name','name']);assert.equal(h.toasts.length,1);
});
test('G4 loaded responses changing after actual review blocks name until a fresh review',async()=>{
 const {h,f}=shrinkPipeline();approveShrink(f);await f.submit();h.reconcile();shrinkButton(f,'dateSettings.actualReviewed');h.reconcile();
 h.setResponses([{userId:'user-a',displayName:'Alice',availableDates:['2026-10-08'],updatedAt:'2026-10-07T12:00:00.000004Z'}]);h.reconcile();await f.submit();assert.deepEqual(h.calls,['title','schedule','load']);shrinkButton(f,'dateSettings.actualReviewed');h.reconcile();await f.submit();assert.equal(h.calls.filter(x=>x==='name').length,1);
});
test('G4 unexpected reload conflict still retains actual own trim details',async()=>{
 const {h,f}=shrinkPipeline({load:()=>({room:{...h.room,title:'External',startDate:'2026-10-08'},userId:'user-a',responses:[{userId:'user-a',displayName:'Alice',availableDates:['2026-10-08'],updatedAt:'2026-10-07T12:00:00.000002Z'}]})});
 h.model.edit({name:'Alice',availableDates:['2026-10-07','2026-10-09']});h.reconcile();approveShrink(f);await f.submit();h.reconcile();assert.equal(h.find('Settings').props.externalConflict,true);
 assert.deepEqual(Array.from(h.find('Settings').props.actualTrim.ownRemovedDates),['2026-10-07']);assert.equal(h.toasts.length,0);assert.deepEqual(h.calls,['title','schedule','load']);
});
test('G4 actual trim review alone cannot resume hook autosave or explicit availability writes',async()=>{
 const {h,f}=shrinkPipeline();approveShrink(f);await f.submit();h.reconcile();shrinkButton(f,'dateSettings.actualReviewed');h.reconcile();
 assert.equal(h.guards().canAutosave(),false);assert.equal(h.guards().canMutate(),false);assert.deepEqual(h.calls,['title','schedule','load']);await f.submit();h.reconcile();assert.deepEqual(h.calls,['title','schedule','load','name']);assert.equal(h.guards().canAutosave(),true);
});
test('G4 actual unsaved removals exclude saved dates already removed by authoritative rebase',async()=>{
 const {h,f}=shrinkPipeline({response:{availableDates:['2026-10-07']},load:()=>({room:{...h.room,title:'New',startDate:'2026-10-09'},userId:'user-a',responses:[{userId:'user-a',displayName:'Alice',availableDates:[],updatedAt:'2026-10-07T12:00:00.000002Z'}]})});
 h.model.edit({name:'Alice',availableDates:['2026-10-07','2026-10-08','2026-10-09']});h.reconcile();f.find('DateRangePicker').props.onChange('2026-10-09','2026-10-10');f.render();approveShrink(f);await f.submit();h.reconcile();
 assert.equal(h.model.rangeChanged,true);const trim=h.find('Settings').props.actualTrim;assert.deepEqual(Array.from(trim.ownRemovedDates),['2026-10-08']);assert.deepEqual(Array.from(trim.remainingOwnDates),['2026-10-09']);
});
test('G4 every schedule ACK retains exact removedDates during required load without imposing shrink review on expansion',async()=>{
 const held=deferred();const h=pipeline({realHook:true,load:()=>held.promise});h.find('Header').props.onSettings();h.render();const f=mount(h.find('Settings').props);h.link(f);
 f.edit('title','New');f.find('DateRangePicker').props.onChange('2026-10-07','2026-10-12');f.render();f.find('TimezoneCombobox').props.onChange('Asia/Seoul');f.render();f.edit('name','Bob');const running=f.submit();
 for(let i=0;i<20&&!h.calls.includes('load');i++)await Promise.resolve();h.reconcile();assert.ok(f.nodes().some(n=>n.props['data-actual-removals']===0));
 held.resolve({room:{...h.room,title:'New',endDate:'2026-10-12',timezone:'Asia/Seoul'},userId:'user-a',responses:[{userId:'user-a',displayName:'Alice',availableDates:['2026-10-08'],updatedAt:'2026-10-07T12:00:00.000002Z'}]});await running;h.reconcile();assert.deepEqual(h.calls,['title','schedule','load','name']);assert.equal(h.toasts.length,1);
});
test('G4 unexpected loaded response revision during title await stops schedule even after exact title ACK',async()=>{
 const held=deferred();const {h,f}=shrinkPipeline({title:()=>held.promise});approveShrink(f);const running=f.submit();
 h.setResponses([{userId:'user-a',displayName:'Alice',availableDates:['2026-10-08'],updatedAt:'2026-10-07T12:00:00.000004Z'}]);h.reconcile();held.resolve({title:'New'});await running;assert.deepEqual(h.calls,['title']);assert.equal(h.toasts.length,0);
});
for(const stage of ['title','schedule','load','name'])for(const change of ['role','metadata','room','user'])test(`${change} invalidation while ${stage} is held stops next stage`,async()=>{
 const held=deferred();const h=pipeline({[stage]:()=>held.promise});const running=h.submit();
 for(let i=0;i<20&&!h.calls.includes(stage);i++)await Promise.resolve();assert.ok(h.calls.includes(stage));
 if(change==='role')h.remote({role:'MEMBER'});if(change==='metadata')h.remote({title:'External'});if(change==='room')h.remote({id:'room-b'});if(change==='user')h.identity('user-b');
 held.resolve(stage==='title'?{title:'New'}:stage==='schedule'?{schedule:{startDate:'2026-10-07',endDate:'2026-10-12',timezone:'Asia/Seoul'},removedDates:0}:stage==='name'?{ok:true,value:{name:'Bob',availableDates:[]}}:{});
 await running;assert.deepEqual(h.calls,['title','schedule','load','name'].slice(0,['title','schedule','load','name'].indexOf(stage)+1));assert.equal(h.toasts.length,0);
});
test('held old poll cannot rewind ACK and cannot satisfy mandatory reload',async()=>{
 const held=deferred();let reads=0;const h=pipeline({load:()=>++reads===1?held.promise:{room:{...h.room,title:'New',endDate:'2026-10-12',timezone:'Asia/Seoul'},userId:'user-a',responses:[{userId:'user-a',displayName:'Alice',availableDates:[],updatedAt:'2026-10-07T12:00:00Z'}]}});
 const old=h.poll();await h.submit();h.render();assert.deepEqual(h.calls,['load','title','schedule','load','name']);assert.equal(h.find('Header').props.title,'New');
 held.resolve({room:h.room,userId:'user-a',responses:[]});await held.promise;await old;for(let i=0;i<5;i++)await Promise.resolve();h.render();assert.equal(h.find('Header').props.title,'New');
});
test('revoked local operation still holds global server lock until settlement',async()=>{
 const held=deferred();const h=pipeline({title:()=>held.promise});const running=h.submit();h.remote({title:'External'});await h.submit();assert.deepEqual(h.calls,['title']);assert.equal(h.guards().canAutosave(),false);held.resolve({title:'New'});await running;h.render();assert.equal(h.guards().canAutosave(),true);assert.equal(h.toasts.length,0);
});
test('wrapper revokes retained child transport and hook guards before child cleanup',async()=>{const held=deferred();const h=pipeline({title:()=>held.promise});const running=h.submit();h.revokeWrapper();assert.equal(h.guards().canAutosave(),false);held.resolve({title:'New'});await running;assert.deepEqual(h.calls,['title']);assert.equal(h.toasts.length,0);});

test('actual form with real hook completes self ACK pipeline and preserves unsaved availability',async()=>{
 const h=pipeline({realHook:true});h.model.edit({name:'Alice',availableDates:['2026-10-09']});h.render();h.find('Header').props.onSettings();h.render();
 const f=mount(h.find('Settings').props);h.link(f);f.edit('title','New');f.find('DateRangePicker').props.onChange('2026-10-07','2026-10-12');f.render();f.find('TimezoneCombobox').props.onChange('Asia/Seoul');f.render();f.edit('name','Bob');
 await f.submit();h.reconcile();assert.deepEqual(h.calls,['title','schedule','load','name']);assert.equal(h.toasts.length,1);assert.deepEqual(Array.from(h.model.baseline.availableDates),['2026-10-09']);
});
for(const failed of ['schedule','load','name'])test(`actual form ${failed} failure preserves draft and successful ACKs on Retry`,async()=>{
 let first=true;const h=pipeline({[failed]:value=>{if(first){first=false;if(failed==='name')return {ok:false,reason:'failed'};throw Error();}return failed==='schedule'?{schedule:value,removedDates:0}:failed==='name'?{ok:true,value:{name:value,availableDates:[]}}:{room:{...h.room,title:'New',endDate:'2026-10-12',timezone:'Asia/Seoul'},userId:'user-a',responses:[{userId:'user-a',displayName:'Alice',availableDates:[],updatedAt:'2026-10-07T12:00:00Z'}]};}});
 h.find('Header').props.onSettings();h.render();const f=mount(h.find('Settings').props);h.link(f);f.edit('title','New');f.find('DateRangePicker').props.onChange('2026-10-07','2026-10-12');f.render();f.find('TimezoneCombobox').props.onChange('Asia/Seoul');f.render();f.edit('name','Bob');
 await f.submit();h.reconcile();assert.equal(f.input('name').props.value,'Bob');assert.equal(h.toasts.length,0);await f.submit();h.reconcile();
 assert.deepEqual(h.calls,failed==='schedule'?['title','schedule','schedule','load','name']:failed==='load'?['title','schedule','load','load','name']:['title','schedule','load','name','name']);assert.equal(h.toasts.length,1);
});
test('unexpected authoritative metadata produces conflict and stops name',async()=>{const h=pipeline({load:()=>({room:{...h.room,title:'External',endDate:'2026-10-12',timezone:'Asia/Seoul'},userId:'user-a',responses:[{userId:'user-a',displayName:'Alice',availableDates:[],updatedAt:'2026-10-07T12:00:00Z'}]})});await h.submit();h.render();assert.deepEqual(h.calls,['title','schedule','load']);assert.match(h.find('Settings').props.submitError,/changed/);assert.equal(h.find('Settings').props.externalConflict,true);await h.submit();assert.deepEqual(h.calls,['title','schedule','load']);assert.equal(h.toasts.length,0);});
test('post reload range flag has reachable Reviewed action and requires explicit second Save',async()=>{
 const h=pipeline({load:()=>{h.model.rangeChanged=true;return {room:{...h.room,title:'New',endDate:'2026-10-12',timezone:'Asia/Seoul'},userId:'user-a',responses:[{userId:'user-a',displayName:'Alice',availableDates:[],updatedAt:'2026-10-07T12:00:00Z'}]};}});
 h.find('Header').props.onSettings();h.render();const f=mount(h.find('Settings').props);h.link(f);f.edit('title','New');f.find('DateRangePicker').props.onChange('2026-10-07','2026-10-12');f.render();f.find('TimezoneCombobox').props.onChange('Asia/Seoul');f.render();f.edit('name','Bob');await f.submit();h.reconcile();
 assert.deepEqual(h.calls,['title','schedule','load']);const review=f.nodes().find(n=>n.props.children==='dateRoom.reviewed');assert.ok(review);review.props.onClick();h.reconcile();assert.deepEqual(h.calls,['title','schedule','load']);await f.submit();h.reconcile();assert.deepEqual(h.calls,['title','schedule','load','name']);
});
for(const ack of [{title:' bad '},{title:'a\u0001'},{title:'x'.repeat(101)}])test('invalid title ACK value fails closed before schedule',async()=>{const h=pipeline({title:()=>ack});await h.submit();assert.deepEqual(h.calls,['title']);assert.equal(h.toasts.length,0);});
for(const ack of [{schedule:{startDate:'2026-10-07',endDate:'2026-11-12',timezone:'UTC'},removedDates:0},{schedule:{startDate:'2026-10-07',endDate:'2026-10-12',timezone:'+09'},removedDates:0},{schedule:{startDate:'2026-10-07',endDate:'2026-10-12',timezone:'UTC'},removedDates:-1}])test('invalid schedule ACK values fail closed before reload',async()=>{const h=pipeline({schedule:()=>ack});await h.submit();assert.deepEqual(h.calls,['title','schedule']);assert.equal(h.toasts.length,0);});
test('retained availability edit and Save reject metadata ABA',()=>{const h=pipeline();const edit=h.find('Calendar').props.onChange;const save=h.find('Button').props.onClick;h.remote({title:'External'});h.remote({title:'Meeting'});edit(['2026-10-09']);save();assert.deepEqual(h.calls,[]);});
test('parent range review gate blocks title before all writes',async()=>{const h=pipeline();h.model.rangeChanged=true;h.render();await h.submit();assert.deepEqual(h.calls,[]);});

test('actual polling effect pauses during settings and resumes with a fresh bounded timer',async()=>{
 const held=deferred();const h=pipeline({parentEffects:true,title:()=>held.promise});assert.equal(h.timers.size,1);
 const running=h.submit();assert.equal(h.timers.size,0);held.resolve({title:'New'});await running;h.render();assert.equal(h.timers.size,1);
});
test('held roster read from old identity epoch cannot commit after Settings ACK',async()=>{
 const held=deferred();let reads=0;const h=pipeline({parentEffects:true,roster:()=>++reads===1?held.promise:Promise.resolve({ok:true,json:async()=>({people:[]})})});
 await h.submit();h.render();held.resolve({ok:true,json:async()=>({people:[{userId:'11111111-1111-4111-8111-111111111111',displayName:'Old roster',isAdmin:false,hasAvailability:true}]})});
 await held.promise;for(let i=0;i<10;i++)await Promise.resolve();h.render();assert.deepEqual(h.people(),[]);
});
test('mounted coordinator executes title schedule authoritative reload and live name exactly once',async()=>{const h=pipeline();await h.submit();assert.deepEqual(h.calls,['title','schedule','load','name']);assert.equal(h.toasts.length,1);});
test('title success schedule failure retry skips title',async()=>{let fail=true;const h=pipeline({schedule:s=>{if(fail){fail=false;throw Error();}return {schedule:s,removedDates:0};}});await h.submit();h.render();await h.submit();assert.deepEqual(h.calls,['title','schedule','schedule','load','name']);});
test('schedule success reload failure retries load only',async()=>{let fail=true;const h=pipeline({load:()=>{if(fail){fail=false;throw Error();}return {room:{...h.room,title:'New',endDate:'2026-10-12',timezone:'Asia/Seoul'},userId:'user-a',responses:[{userId:'user-a',displayName:'Alice',availableDates:[],updatedAt:'2026-10-07T12:00:00Z'}]};}});await h.submit();h.render();assert.equal(h.guards().canAutosave(),false);await h.submit();assert.deepEqual(h.calls,['title','schedule','load','load','name']);});
test('name failure retry skips acknowledged metadata',async()=>{let fail=true;const h=pipeline({name:name=>{if(fail){fail=false;return {ok:false,reason:'failed'};}return {ok:true,value:{name,availableDates:[]}};}});await h.submit();h.render();await h.submit();assert.deepEqual(h.calls,['title','schedule','load','name','name']);});
test('shrink blocks all writes before title',async()=>{const h=pipeline();await h.submit({...h.draft,startDate:'2026-10-08'});assert.deepEqual(h.calls,[]);});
for(const stage of ['title','schedule','load'])test(`malformed ${stage} ACK stops following stages`,async()=>{const h=pipeline({[stage]:()=>({})});await h.submit();assert.deepEqual(h.calls,stage==='title'?['title']:stage==='schedule'?['title','schedule']:['title','schedule','load']);assert.equal(h.toasts.length,0);});
test('held transport globally blocks duplicate writes and availability edits',async()=>{const held=deferred();const h=pipeline({title:()=>held.promise});const pending=h.submit();h.render();await h.submit();assert.equal(h.guards().canMutate(),false);assert.equal(h.guards().canAutosave(),false);h.find('Calendar').props.onChange([]);assert.deepEqual(h.calls,['title']);held.resolve({title:'New'});await pending;});
for(const stage of ['title','schedule','load','name'])test(`auth loading after ${stage} await prevents subsequent writes and feedback`,async()=>{const held=deferred();const h=pipeline({[stage]:()=>held.promise});const pending=h.submit();for(let i=0;i<20 && !h.calls.includes(stage);i++) await Promise.resolve();assert.ok(h.calls.includes(stage));h.render({userId:'user-a',loading:true});held.resolve(stage==='title'?{title:'New'}:stage==='schedule'?{schedule:{startDate:'2026-10-07',endDate:'2026-10-12',timezone:'Asia/Seoul'},removedDates:0}:stage==='name'?{ok:true,value:{name:'Bob',availableDates:[]}}:{});await pending;assert.deepEqual(h.calls,['title','schedule','load','name'].slice(0,['title','schedule','load','name'].indexOf(stage)+1));assert.equal(h.toasts.length,0);});
