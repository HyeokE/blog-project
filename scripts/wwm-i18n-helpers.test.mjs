// Locale-aware helpers behind the When We Meet UI: Korean output, English unchanged, and no raw server English in Korean.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createWwmTranslator} from '../src/i18n/wwm.mjs';
import {hourLabel,clockLabel,dayLabel,weekdayLabel} from '../src/features/when-we-meet/hour-label.mjs';
import {monthBoundaryLabel} from '../src/features/when-we-meet/month-boundary.mjs';
import {creationErrors} from '../src/features/when-we-meet/creation-validation.mjs';
import {scheduleErrors} from '../src/features/when-we-meet/room-schedule.mjs';
import {validateRoom,validateRoomCode,makeSlots} from '../src/features/when-we-meet/domain.mjs';
import {confirmFailure,resendFailure,confirmPanelState,normalizeConfirmationResponse} from '../src/features/when-we-meet/confirm-tab.mjs';
import {calendarReturnNotice,fillFailure} from '../src/features/when-we-meet/calendar-fill.mjs';
import {selectionAvailability} from '../src/features/when-we-meet/confirm-selection.mjs';
import {projectWeeklyTimeline} from '../src/features/when-we-meet/weekly-timeline.mjs';
import {createMeetingCopy} from '../src/features/when-we-meet/meeting-copy.mjs';

const ko=createWwmTranslator('ko'),en=createWwmTranslator('en');
const hangul=/[가-힣]/;

test('grid hour labels: 12-hour "9 AM" in English, "오전 9시" in Korean',()=>{
 assert.equal(hourLabel('09:00'),'9 AM');assert.equal(hourLabel('09:00','en'),'9 AM');
 assert.equal(hourLabel('09:00','ko'),'오전 9시');assert.equal(hourLabel('13:00','ko'),'오후 1시');assert.equal(hourLabel('09:30','ko'),'');
 assert.equal(clockLabel('06:00','ko'),'오전 6:00');assert.equal(clockLabel('12:30','ko'),'오후 12:30');
});
test('day labels, weekday names and month boundaries follow the locale',()=>{
 assert.equal(dayLabel('2026-09-30','ko'),'9월 30일 (수)');assert.equal(weekdayLabel('2026-09-30','ko'),'수');assert.equal(weekdayLabel('2026-09-30'),'Wed');
 assert.equal(monthBoundaryLabel('2026-10-01','2026-09-30','ko'),'10월');assert.equal(monthBoundaryLabel('2027-01-01','2026-12-31','ko'),'2027년 1월');
 assert.equal(monthBoundaryLabel('2026-10-02','2026-10-01','ko'),'');
});
test('grid cell names read naturally in both languages',()=>{
 const name=(t,locale)=>t('grid.cellCount',{when:t('grid.when',{day:dayLabel('2026-09-30',locale),time:clockLabel('06:00',locale)}),count:2,total:3});
 assert.equal(name(en,'en'),'Wed, Sep 30, 6:00 AM, 2 of 3 available');
 // Korean copy is owned by the dictionary; the Intl date/time parts are fixed.
 assert.equal(name(ko,'ko'),ko('grid.cellCount',{when:ko('grid.when',{day:'9월 30일 (수)',time:'오전 6:00'}),count:2,total:3}));
 assert.match(name(ko,'ko'),/^9월 30일 \(수\).*오전 6:00/);
 assert.match(ko('grid.pagerDay',{weekday:'수',day:30}),/30.*수/);
});
test('create and schedule validation speak the UI language; field routing does not depend on English text',()=>{
 const now=new Date('2026-10-01T03:00:00Z');
 const errors=creationErrors({title:' ',startDate:'',endDate:'',timezone:'Asia/Seoul',name:' '},now,ko);
 assert.deepEqual(errors,{title:ko('create.titleError'),dates:ko('validation.datesRequired'),name:ko('validation.name')});
 assert.ok(Object.values(errors).every(text=>hangul.test(text)));
 const room={startDate:'2026-10-01',endDate:'2026-10-03',startTime:'09:00',endTime:'18:00',timezone:'Asia/Seoul'};
 assert.equal(scheduleErrors({...room,endDate:'2026-10-30'},{previousStart:room.startDate},now,ko).dates,ko('validation.maxDays'));
 assert.equal(scheduleErrors({...room,startTime:'12:00',endTime:'09:00'},{previousStart:room.startDate},now,ko).times,ko('validation.endAfterStart'));
 assert.equal(validateRoomCode({...room,title:'x',timezone:'Mars/Base'}),'timezone');
 assert.equal(validateRoom({...room,title:''}),'Enter a title (up to 100 characters).','server routes keep English');
});
test('Korean confirm/resend errors come from the dictionary by status, never the server text',()=>{
 const server='This meeting changed since you opened it. Reload and review again.';
 assert.deepEqual(confirmFailure({status:409,message:server},ko),{status:'failed',error:ko('confirm.errors.conflict'),retrySame:false});
 assert.equal(confirmFailure({status:409,reconnect:true,message:'Connect'},ko).calendar,'disconnected');
 assert.equal(confirmFailure({status:502,message:'Google Calendar rejected the invitation. Nothing was sent.'},ko).retrySame,true);
 assert.equal(confirmFailure(new TypeError('Failed to fetch'),ko).error,ko('confirm.errors.network'));
 assert.equal(resendFailure({status:429,message:'Invitations were just sent.'},ko).error,ko('resend.errors.tooSoon'));
 for(const status of [400,401,403,409,429,500,502])assert.match(confirmFailure({status,message:'English server text'},ko).error,hangul);
 assert.equal(confirmFailure({status:409,message:server}).error,server,'without a translator the legacy English pass-through stays');
});
test('apiError picks dictionary copy by HTTP status and situation',()=>{
 const copy=createMeetingCopy('ko');
 assert.equal(copy.apiError({status:403,message:'Only the meeting owner can rename it.'},'rename'),ko('errors.notOwner'));
 assert.equal(copy.apiError({status:401},'delete'),ko('errors.session'));
 assert.equal(copy.apiError({status:502},'schedule'),ko('settings.scheduleFailed'));
 assert.equal(copy.apiError({status:404},'join'),ko('invitation.invalid'));
 assert.equal(copy.apiError(new Error('offline'),'create'),ko('errors.create'));
 assert.equal(createMeetingCopy('en').apiError({status:400},'create'),'Check the meeting details and try again.');
});
test('calendar notices, partial availability and the "You" label are localized',()=>{
 assert.equal(calendarReturnNotice('connected',ko).text,ko('fill.connected'));assert.match(calendarReturnNotice('connected').text,/Fill from Google Calendar/);
 assert.equal(fillFailure({status:502},ko).message,ko('fill.calendarError'));
 const slots=makeSlots({title:'x',startDate:'2026-10-01',endDate:'2026-10-01',startTime:'09:00',endTime:'11:00',timezone:'Asia/Seoul'});
 const [member]=selectionAvailability([{id:'a',name:'A'}],[{userId:'a',displayName:'A',slots:[slots[0].id,slots[1].id]}],slots,{date:'2026-10-01',startId:slots[0].id,endId:slots[3].id},ko);
 assert.equal(member.availability,ko('confirm.status.availableBetween',{range:'09:00–10:00'}));
 const timeline=projectWeeklyTimeline({slots,responses:[{userId:'me',displayName:'준혁',slots:[]}],currentUserId:'me',youLabel:ko('common.you')});
 assert.equal(timeline.rows[0].label,`준혁 (${ko('common.you')})`);
 const failed=confirmPanelState({data:normalizeConfirmationResponse({confirmation:{status:'failed',title:'x',startsAt:slots[0].utc,endsAt:slots[1].utc,timezone:'Asia/Seoul'},review:null}),slots,t:ko});
 assert.equal(failed.error,ko('confirm.errors.lastAttemptFailed'));
});
