import type {Meta,StoryObj} from '@storybook/nextjs-vite';
import {useState} from 'react';
import {ParticipantCount} from '@/features/when-we-meet/ParticipantCount';
import {EmptyMeetings as EmptyMeetingsState} from '@/features/when-we-meet/EmptyMeetings';
import {within,userEvent} from 'storybook/test';
import WhenWeMeet from '@/features/when-we-meet/WhenWeMeet';
import {InvitationLanding} from '@/features/when-we-meet/InvitationLanding';
import {WeeklyAvailability} from '@/features/when-we-meet/WeeklyAvailability';
import {makeSlots} from '@/features/when-we-meet/domain.mjs';
import {MockAccountProvider,PERSON} from './mock-account';
import {state,calendar,type Room,type Response,type ConfirmationPayload} from './mock-api';
import {MeetingRowsSkeleton,RoomSkeleton} from '@/features/when-we-meet/ServerSkeletons';
import ServerSectionBoundary from '@/features/when-we-meet/ServerSectionBoundary';
import SiteError from '@/components/site-error/SiteError';
import {saveDraft} from '@/features/when-we-meet/draft.mjs';
import {todayInTimezone} from '@/features/when-we-meet/creation-validation.mjs';
import {expect,waitFor} from 'storybook/test';
import {Toaster} from '@/components/ui/sonner';
import type {ConfirmationRecordData} from '@/features/when-we-meet/confirm-tab.mjs';
const id='22222222-2222-4222-8222-222222222222';
const room:Room={id,title:'Team coffee',ownerId:PERSON.id,role:'ADMIN',startDate:'2026-09-30',endDate:'2026-10-02',startTime:'00:00',endTime:'24:00',timezone:'Asia/Seoul',inviteToken:'storybook-only'};
const slots=makeSlots({title:room.title,startDate:room.startDate,endDate:room.endDate,startTime:room.startTime,endTime:room.endTime,timezone:room.timezone}) as {id:string;utc:string;date:string;time:string}[];
const rows:Response[]=[{userId:PERSON.id,displayName:'Alex Sample',slots:slots.slice(12,15).map(x=>x.id)},{userId:'33333333-3333-4333-8333-333333333333',displayName:'Morgan Sample',slots:slots.slice(12,14).map(x=>x.id)}];
const meta={title:'When We Meet/Actual screens',component:WhenWeMeet,parameters:{nextjs:{appDirectory:true}}} satisfies Meta<typeof WhenWeMeet>;
export default meta;
type Story=StoryObj<typeof meta>;
function Frame({children,user=true,loading=false}:{children:React.ReactNode;user?:boolean;loading?:boolean}){return <MockAccountProvider value={{user:user?PERSON:null,loading}}><div className="light-wall light-page craft-chrome">{children}</div><Toaster/></MockAccountProvider>}
const list=<section className="wwm-card wwm-meetings" aria-label="Your meetings"><ul><li><a href="#storybook-room"><div className="wwm-meeting-title-row"><strong>Team coffee</strong><ParticipantCount count={15}/></div><span>2026.09.30 – 10.02 · All day · Asia/Seoul</span></a></li><li data-meeting-id="confirmed-sample"><a href="#storybook-room-2"><div className="wwm-meeting-title-row"><strong>Design review</strong><span className="wwm-meeting-tag">Confirmed</span><ParticipantCount count={1}/></div><span>2026.10.05 – 10.09 · 09:00–18:00 · Asia/Seoul</span></a></li></ul></section>;
export const GuestHome:Story={render:()=> <Frame user={false}><WhenWeMeet meetingsSection={null}/></Frame>};
export const AccountLoading:Story={render:()=> <Frame user={false} loading><WhenWeMeet meetingsSection={null}/></Frame>};
export const EmptyMeetings:Story={render:()=> <Frame><WhenWeMeet meetingsSection={<section className="wwm-card wwm-meetings" aria-label="Your meetings"><EmptyMeetingsState/></section>}/></Frame>};
export const PopulatedMeetings:Story={render:()=> <Frame><WhenWeMeet meetingsSection={list}/></Frame>};
export const CreateDialog:Story={...EmptyMeetings,play:async({canvasElement})=>{await userEvent.click(within(canvasElement).getByRole('button',{name:'New meeting'}));}};
export const CreateValidationError:Story={...CreateDialog,play:async(ctx)=>{await CreateDialog.play?.(ctx);await userEvent.click(within(document.body).getByRole('button',{name:'Create meeting'}));}};
export const GuestCreateDialog:Story={...GuestHome,play:async({canvasElement})=>{await userEvent.click(within(canvasElement).getByRole('button',{name:'Create a meeting'}));}};
function StreamedAvailabilityDemo(){const [result]=useState(()=>{let resolve!:(v:{responses:Response[]})=>void;const promise=new Promise<{responses:Response[]}>(r=>{resolve=r});return {promise,resolve}});return <Frame><button type="button" onClick={()=>result.resolve({responses:rows})}>Resolve availability fixture</button><WhenWeMeet roomId={id} initialRoom={{room,responses:[],userId:PERSON.id}} responsesPromise={result.promise}/></Frame>}
export const RoomAvailabilityLoading:Story={render:()=> <StreamedAvailabilityDemo/>};
export const RoomAvailabilityStreamed:Story={...RoomAvailabilityLoading,play:async({canvasElement})=>{const c=within(canvasElement);await expect(c.getByRole('heading',{name:'Team coffee'})).toBeVisible();await expect(c.getByLabelText('Loading availability')).toBeVisible();await userEvent.click(c.getByRole('button',{name:'Resolve availability fixture'}));await waitFor(()=>expect(c.queryByLabelText('Loading availability')).not.toBeInTheDocument());await expect(c.getByRole('tab',{name:'Availability'})).toBeVisible();}};
export const RoomAvailability:Story={render:()=> <Frame><WhenWeMeet roomId={id} initialRoom={{room,responses:rows,userId:PERSON.id}}/></Frame>};
export const RoomEveryone:Story={...RoomAvailability,play:async({canvasElement})=>{await userEvent.click(within(canvasElement).getByRole('tab',{name:'Everyone'}));}};
export const RoomPeople:Story={...RoomAvailability,play:async({canvasElement})=>{const c=within(canvasElement);await userEvent.click(c.getByRole('tab',{name:'People'}));await waitFor(()=>expect(c.getByText('Taylor Sample')).toBeVisible());await expect(c.getByText('No availability yet')).toBeVisible();}};
const openMenu=async(canvasElement:HTMLElement)=>{await userEvent.click(within(canvasElement).getByRole('button',{name:'Meeting options'}));await waitFor(()=>expect(within(document.body).getByRole('menu')).toBeVisible());};
export const RoomSettings:Story={...RoomAvailability,play:async({canvasElement})=>{await openMenu(canvasElement);await userEvent.click(within(document.body).getByRole('menuitem',{name:'Settings'}));}};
export const RoomNoResponses:Story={render:()=> <Frame><WhenWeMeet roomId={id} initialRoom={{room,responses:[],userId:PERSON.id}}/></Frame>};
function Calendar({density,readOnly=false}:{density:'empty'|'single'|'double'|'many';readOnly?:boolean}){const [mine,setMine]=useState<string[]>(density==='empty'?[]:slots.slice(density==='many'?0:12,density==='many'?48:12+(density==='single'?1:2)).map(s=>s.id));return <div className="wwm wwm-room"><div className="wwm-shell"><section className="wwm-card wwm-availability"><WeeklyAvailability startDate={room.startDate} endDate={room.endDate} timezone={room.timezone} slots={slots} responses={density==='empty'?[]:density==='many'?Array.from({length:15},(_,i)=>({userId:`person-${i}`,displayName:`Participant ${i+1}`,slots:slots.slice(12,18).map(s=>s.id)})):rows} currentUserId={PERSON.id} mine={mine} dirty={false} onToggle={slot=>setMine(old=>old.includes(slot)?old.filter(x=>x!==slot):[...old,slot])} readOnly={readOnly}/></section></div></div>}
export const EmptyCalendar:Story={render:()=> <Frame><Calendar density="empty"/></Frame>};
export const SingleHalfHour:Story={render:()=> <Frame><Calendar density="single"/></Frame>};
export const DoubleHalfHour:Story={render:()=> <Frame><Calendar density="double"/></Frame>};
export const FullDay:Story={render:()=> <Frame><Calendar density="many"/></Frame>};
export const ManyRespondents:Story={render:()=> <Frame><Calendar density="many" readOnly/></Frame>};
function Invite({signedIn=false,loading=false,busy=false,valid=true,error='',nameReady=false}:{signedIn?:boolean;loading?:boolean;busy?:boolean;valid?:boolean;error?:string;nameReady?:boolean}){const [name,setName]=useState('');return <Frame user={signedIn}><div className="wwm"><div className="wwm-shell"><InvitationLanding signedIn={signedIn} loading={loading} busy={busy} valid={valid} name={name} nameReady={nameReady} onName={setName} error={error} onSignIn={()=>{}} onJoin={()=>{}} onRetry={()=>{}}/></div></div></Frame>}
export const InvitationGuest:Story={render:()=> <Invite/>};
export const InvitationLoading:Story={render:()=> <Invite loading/>};
export const InvitationSignedIn:Story={render:()=> <Invite signedIn/>};
export const InvitationJoining:Story={render:()=> <Invite signedIn nameReady/>};
export const InvitationBusy:Story={render:()=> <Invite signedIn busy/>};
export const InvitationInvalid:Story={render:()=> <Invite valid={false}/>};
export const InvitationFailed:Story={render:()=> <Invite signedIn error="Unable to join meeting. Please try again."/>};
export const ListLoading:Story={render:()=> <Frame><WhenWeMeet meetingsSection={<MeetingRowsSkeleton/>}/></Frame>};
export const RoomLoading:Story={render:()=> <Frame><main className="wwm"><RoomSkeleton/></main></Frame>};
function BrokenSection():React.ReactNode{throw new Error('Synthetic section failure');}
export const ListLoadError:Story={render:()=> <Frame><WhenWeMeet meetingsSection={<ServerSectionBoundary><BrokenSection/></ServerSectionBoundary>}/></Frame>};
export const RoomLoadError:Story={render:()=> <Frame><main className="wwm"><ServerSectionBoundary><BrokenSection/></ServerSectionBoundary></main></Frame>};
export const RouteNotFound:Story={render:()=> <Frame><SiteError status="404"/></Frame>};
export const RouteServerError:Story={render:()=> <Frame><SiteError status="500" retry={<button onClick={()=>{}}>다시 시도</button>}/></Frame>};
// Draft dates are relative to today in the room timezone, so Create stories never hit "dates in the past".
const plusDays=(iso:string,days:number)=>new Date(Date.parse(`${iso}T00:00:00Z`)+days*86_400_000).toISOString().slice(0,10);
const draftDates=()=>{const start=plusDays(todayInTimezone('Asia/Seoul')||new Date().toISOString().slice(0,10),1);return {startDate:start,endDate:plusDays(start,2)}};
const seeded=()=>saveDraft(sessionStorage,{form:{title:'Team coffee',...draftDates(),startTime:'00:00',endTime:'24:00',timezone:'Asia/Seoul'},name:'Alex Sample'});
const submitCreate=async(ctx:Parameters<NonNullable<Story['play']>>[0])=>{await CreateDialog.play?.(ctx);await userEvent.click(within(document.body).getByRole('button',{name:'Create meeting'}));};
export const RestoredDraft:Story={...CreateDialog,beforeEach:seeded};
export const CreateSubmitting:Story={...EmptyMeetings,beforeEach:()=>{seeded();state.create='pending';},play:submitCreate};
export const CreateFailure:Story={...EmptyMeetings,beforeEach:()=>{seeded();state.create='failure';},play:submitCreate};
export const CreateSuccess:Story={...EmptyMeetings,beforeEach:()=>{seeded();state.create='success';},play:submitCreate};
export const LoginRequired:Story={...GuestHome,beforeEach:seeded,play:async(ctx)=>{await GuestCreateDialog.play?.(ctx);await userEvent.click(within(document.body).getByRole('button',{name:'Create meeting'}));await waitFor(()=>expect(within(document.body).getByText('Sign in with Google to create a meeting')).toBeVisible());}};
const editCell=async({canvasElement}:Parameters<NonNullable<Story['play']>>[0])=>{const cell=canvasElement.querySelector<HTMLButtonElement>('.wwm-week-edit');if(!cell)throw Error('Edit cell missing');await userEvent.click(cell);};
export const Saving:Story={...RoomAvailability,beforeEach:()=>{state.save='pending';},play:async(ctx)=>{await editCell(ctx);await waitFor(()=>expect(within(ctx.canvasElement).getAllByText(/Saving/)[0]).toBeVisible());}};
export const SaveFailed:Story={...RoomAvailability,beforeEach:()=>{state.save='failure';},play:async(ctx)=>{await editCell(ctx);await waitFor(()=>expect(within(ctx.canvasElement).getAllByText(/Couldn’t save/)[0]).toBeVisible());}};
export const SaveRetryRecovered:Story={...SaveFailed,play:async(ctx)=>{await SaveFailed.play?.(ctx);state.save='success';await userEvent.click(within(ctx.canvasElement).getByRole('button',{name:'Retry'}));await waitFor(()=>expect(within(ctx.canvasElement).getAllByText(/^Saved/)[0]).toBeVisible());}};
export const LiveConnected:Story={...RoomAvailability,beforeEach:()=>{state.connected=true;state.responses=rows;},play:async({canvasElement})=>{await new Promise(r=>setTimeout(r,200));await expect(within(canvasElement).queryByText('Offline')).not.toBeInTheDocument();}};
export const Offline:Story={...RoomAvailability,beforeEach:()=>{state.offline=true;},play:async({canvasElement})=>{await waitFor(()=>expect(within(canvasElement).getByText('Offline')).toBeVisible());}};
export const ConnectionUnavailable:Story={...RoomAvailability};
export const SessionExpiredOnSave:Story={...SaveFailed,beforeEach:()=>{state.save='failure';state.message='Session expired. Sign in again.';}};
export const AccessDeniedOnSave:Story={...SaveFailed,beforeEach:()=>{state.save='failure';state.message='You do not have permission to edit this meeting.';}};
export const InvitationMissingToken:Story={render:()=> <Frame><WhenWeMeet roomId={id}/></Frame>};
export const AlreadyJoined:Story={...RoomAvailability,parameters:{docs:{description:{story:'An existing member opens the room: the server supplies initialRoom, bypassing the invitation landing.'}}}};
export const NameRequiredToJoin:Story={render:()=> <Invite signedIn/>};
export const CalendarMobile:Story={...RoomAvailability,globals:{viewport:{value:'mobile',isRotated:false}}};
export const CalendarDark:Story={...RoomAvailability,globals:{theme:'dark'}};

// Calendar autofill (Availability tab). Synthetic busy previews; Apply only edits the local draft + mock autosave.
const openFill=async({canvasElement}:Parameters<NonNullable<Story['play']>>[0])=>{const c=within(canvasElement);await userEvent.click(c.getByRole('button',{name:'Fill from Google Calendar'}));};
const freeIds=slots.filter(s=>['10:00','10:30','11:00','14:00','14:30'].includes(s.time)).map(s=>s.id);
export const AutofillPreview:Story={...RoomAvailability,beforeEach:()=>{calendar.busyIds=freeIds;calendar.slotCount=slots.length;},play:async(ctx)=>{await openFill(ctx);await waitFor(()=>expect(within(document.body).getByRole('button',{name:'Fill 15 slots'})).toBeVisible());}};
export const AutofillApplied:Story={...AutofillPreview,play:async(ctx)=>{await AutofillPreview.play?.(ctx);await userEvent.click(within(document.body).getByRole('button',{name:'Fill 15 slots'}));await waitFor(()=>expect(within(document.body).getByText('Filled 15 half-hours')).toBeVisible());await expect(within(document.body).queryByRole('button',{name:'Fill 15 slots'})).not.toBeInTheDocument();}};
export const AutofillZero:Story={...RoomAvailability,beforeEach:()=>{calendar.busyIds=[];calendar.slotCount=slots.length;},play:async(ctx)=>{await openFill(ctx);await waitFor(()=>expect(within(document.body).getByText(/No free half-hours/)).toBeVisible());await expect(within(document.body).queryByRole('button',{name:/^Fill \d/})).not.toBeInTheDocument();}};
export const AutofillReconnect:Story={...RoomAvailability,beforeEach:()=>{calendar.busy='reconnect';},play:async(ctx)=>{await openFill(ctx);await waitFor(()=>expect(within(document.body).getByRole('button',{name:'Connect Google Calendar'})).toBeVisible());}};
export const AutofillError:Story={...RoomAvailability,beforeEach:()=>{calendar.busy='error';},play:async(ctx)=>{await openFill(ctx);await waitFor(()=>expect(within(document.body).getByRole('button',{name:'Retry'})).toBeVisible());}};
export const AutofillPending:Story={...RoomAvailability,beforeEach:()=>{calendar.busy='pending';},play:async(ctx)=>{await openFill(ctx);await waitFor(()=>expect(within(ctx.canvasElement).getByRole('button',{name:'Checking calendar…'})).toBeDisabled());}};
export const AutofillPreviewMobile:Story={...AutofillPreview,globals:{viewport:{value:'mobile',isRotated:false}}};
export const AutofillPreviewDark:Story={...AutofillPreview,globals:{theme:'dark'}};
// Confirm tab. Synthetic GET/POST fixtures; the mock POST never creates events or email.
const MORGAN='33333333-3333-4333-8333-333333333333';
const review:NonNullable<ConfirmationPayload['review']>={calendarConnected:true,organizerEmail:'alex@example.test',attendees:[{userId:PERSON.id,name:'Alex Sample',email:'alex@example.test',hasAvailability:true,isOrganizer:true},{userId:MORGAN,name:'Morgan Sample',email:'morgan@example.test',hasAvailability:true,isOrganizer:false}]};
const confirmed=(status:string)=>({status,title:'Team coffee',startsAt:slots[12].id,endsAt:new Date(Date.parse(slots[13].id)+1800000).toISOString(),timezone:'Asia/Seoul',googleEventUrl:status==='confirmed'?'https://calendar.google.com/calendar/event?eid=storybook':null});
const openConfirm=async({canvasElement}:Parameters<NonNullable<Story['play']>>[0])=>{const c=within(canvasElement);await userEvent.click(c.getByRole('tab',{name:'Confirm'}));};
const pickAndReview=async(ctx:Parameters<NonNullable<Story['play']>>[0])=>{await openConfirm(ctx);const c=within(ctx.canvasElement);const cell=await waitFor(()=>c.getByRole('button',{name:/^2026\.09\.30 06:00–06:30/}));await userEvent.click(cell);await userEvent.click(c.getByRole('button',{name:'Review confirmation'}));await waitFor(()=>expect(within(document.body).getByRole('dialog')).toBeVisible());};
export const ConfirmOwnerDraft:Story={...RoomAvailability,beforeEach:()=>{calendar.confirmation={confirmation:null,review};},play:async(ctx)=>{await openConfirm(ctx);await waitFor(()=>expect(within(ctx.canvasElement).getByRole('heading',{name:'Confirm a time'})).toBeVisible());}};
export const ConfirmOwnerReview:Story={...ConfirmOwnerDraft,play:pickAndReview};
// Keyboard path: Enter on a half-hour sets the start, Enter on another sets the end; the fields and action bar follow.
const selectRange=async(ctx:Parameters<NonNullable<Story['play']>>[0])=>{await openConfirm(ctx);const c=within(ctx.canvasElement);const from=await waitFor(()=>c.getByRole('button',{name:/^2026\.09\.30 06:00–06:30/}));from.focus();await userEvent.keyboard('{Enter}');c.getByRole('button',{name:/^2026\.09\.30 07:00–07:30/}).focus();await userEvent.keyboard('{Enter}');await waitFor(()=>expect(c.getAllByText('2026.09.30 · 06:00–07:30')[0]).toBeVisible());await expect(c.getByRole('combobox',{name:'Start'})).toHaveTextContent('06:00');};
export const ConfirmOwnerSelectedRange:Story={...ConfirmOwnerDraft,play:selectRange};
export const ConfirmOwnerSelectedRangeDark:Story={...ConfirmOwnerSelectedRange,globals:{theme:'dark'}};
export const ConfirmCalendarDisconnected:Story={...RoomAvailability,beforeEach:()=>{calendar.confirmation={confirmation:null,review:{...review,calendarConnected:false}};},play:pickAndReview};
export const ConfirmReconciling:Story={...ConfirmOwnerDraft,beforeEach:()=>{calendar.confirmation={confirmation:null,review};calendar.post='reconciling';},play:async(ctx)=>{await pickAndReview(ctx);await userEvent.click(within(document.body).getByRole('button',{name:'Confirm & send invitations'}));await waitFor(()=>expect(within(document.body).getAllByRole('button',{name:'Check again'})[0]).toBeVisible());}};
export const ConfirmSendFailed:Story={...ConfirmOwnerDraft,beforeEach:()=>{calendar.confirmation={confirmation:null,review};calendar.post='google';},play:async(ctx)=>{await pickAndReview(ctx);await userEvent.click(within(document.body).getByRole('button',{name:'Confirm & send invitations'}));await waitFor(()=>expect(within(document.body).getAllByText(/Nothing was sent/)[0]).toBeVisible());}};
export const ConfirmConfirmed:Story={...RoomAvailability,beforeEach:()=>{calendar.confirmation={confirmation:confirmed('confirmed'),review};},play:async(ctx)=>{await openConfirm(ctx);await waitFor(()=>expect(within(ctx.canvasElement).getByRole('heading',{name:'Confirmed meeting'})).toBeVisible());}};
// A confirmed meeting opens on Confirm, with the status line in the header.
const confirmedRecord:ConfirmationRecordData={status:'confirmed',title:'Team coffee',startsAt:slots[12].id,endsAt:new Date(Date.parse(slots[13].id)+1800000).toISOString(),timezone:'Asia/Seoul',googleEventUrl:'https://calendar.google.com/calendar/event?eid=storybook',revision:1};
export const ConfirmedRoom:Story={render:()=> <Frame><WhenWeMeet roomId={id} initialRoom={{room,responses:rows,userId:PERSON.id}} initialConfirmation={confirmedRecord}/></Frame>,beforeEach:()=>{confirmedOwner()();},play:async ctx=>{await waitFor(()=>expect(within(ctx.canvasElement).getByText(/^Confirmed · /)).toBeVisible());await waitFor(()=>expect(within(ctx.canvasElement).getByRole('heading',{name:'Confirmed meeting'})).toBeVisible());}};
export const ConfirmedRoomDark:Story={...ConfirmedRoom,globals:{theme:'dark'}};
export const ConfirmedRoomMobile:Story={...ConfirmedRoom,globals:{viewport:{value:'mobile',isRotated:false}}};
export const ConfirmSendSuccess:Story={...ConfirmOwnerDraft,beforeEach:()=>{calendar.confirmation={confirmation:null,review};calendar.post='confirmed';},play:async(ctx)=>{await pickAndReview(ctx);await userEvent.click(within(document.body).getByRole('button',{name:'Confirm & send invitations'}));await waitFor(()=>expect(within(document.body).getByText('Invitations sent to 2 people')).toBeVisible());await waitFor(()=>expect(within(ctx.canvasElement).getByText(/^Confirmed · /)).toBeVisible());}};
export const ConfirmMemberPending:Story={render:()=> <Frame><WhenWeMeet roomId={id} initialRoom={{room:{...room,ownerId:MORGAN,role:'MEMBER'},responses:rows,userId:PERSON.id}}/></Frame>,beforeEach:()=>{calendar.confirmation={confirmation:confirmed('pending'),review:null};},play:async(ctx)=>{await openConfirm(ctx);await waitFor(()=>expect(within(ctx.canvasElement).getByText(/organizer is sending invitations/)).toBeVisible());}};
export const ConfirmLoading:Story={...RoomAvailability,beforeEach:()=>{calendar.confirmationLoad='pending';},play:openConfirm};
export const ConfirmLoadError:Story={...RoomAvailability,beforeEach:()=>{calendar.confirmationLoad='failure';},play:async(ctx)=>{await openConfirm(ctx);await waitFor(()=>expect(within(ctx.canvasElement).getByRole('button',{name:'Retry'})).toBeVisible());}};
export const ConfirmOwnerReviewMobile:Story={...ConfirmOwnerReview,globals:{viewport:{value:'mobile',isRotated:false}}};
export const ConfirmOwnerDraftDark:Story={...ConfirmOwnerDraft,globals:{theme:'dark'}};
export const ConfirmOwnerReviewDark:Story={...ConfirmOwnerReview,globals:{theme:'dark'}};

// Confirmed meeting: owner Edit / Resend, edit review + reconciling, member update note. Synthetic only.
const editDetail=(over:Partial<NonNullable<NonNullable<ConfirmationPayload['review']>['edit']>>={})=>({revision:1,recipientIds:[PERSON.id,MORGAN],excludedIds:[],optionalIds:[],open:null,lastResentAt:null,...over});
const confirmedOwner=(over:Partial<NonNullable<NonNullable<ConfirmationPayload['review']>['edit']>>={})=>()=>{calendar.confirmation={confirmation:{...confirmed('confirmed'),revision:1},review:{...review,edit:editDetail(over)}};};
const openConfirmed=async(ctx:Parameters<NonNullable<Story['play']>>[0])=>{await openConfirm(ctx);await waitFor(()=>expect(within(ctx.canvasElement).getByRole('button',{name:'Edit meeting'})).toBeVisible());};
export const ConfirmOwnerConfirmedActions:Story={...RoomAvailability,beforeEach:confirmedOwner(),play:openConfirmed};
const openEditReview=async(ctx:Parameters<NonNullable<Story['play']>>[0])=>{await openConfirmed(ctx);const c=within(ctx.canvasElement);await userEvent.click(c.getByRole('button',{name:'Edit meeting'}));await waitFor(()=>expect(c.getByRole('heading',{name:'Edit confirmed meeting'})).toBeVisible());const cell=await waitFor(()=>c.getByRole('button',{name:/^2026\.09\.30 08:00–08:30/}));await userEvent.click(cell);await userEvent.click(c.getByRole('button',{name:'Review changes'}));await waitFor(()=>expect(within(document.body).getByRole('dialog')).toBeVisible());};
export const ConfirmEditReview:Story={...RoomAvailability,beforeEach:confirmedOwner(),play:openEditReview};
export const ConfirmEditReviewMobile:Story={...ConfirmEditReview,globals:{viewport:{value:'mobile',isRotated:false}}};
export const ConfirmEditReviewDark:Story={...ConfirmEditReview,globals:{theme:'dark'}};
export const ConfirmEditing:Story={...RoomAvailability,beforeEach:confirmedOwner(),play:async ctx=>{await openConfirmed(ctx);await userEvent.click(within(ctx.canvasElement).getByRole('button',{name:'Edit meeting'}));}};
export const ConfirmEditSaved:Story={...RoomAvailability,beforeEach:()=>{confirmedOwner()();calendar.update='confirmed';},play:async ctx=>{await openEditReview(ctx);await userEvent.click(within(document.body).getByRole('button',{name:'Save & notify attendees'}));await waitFor(()=>expect(within(document.body).getByText('Changes saved · attendees notified')).toBeVisible());}};
export const ConfirmEditReconciling:Story={...RoomAvailability,beforeEach:confirmedOwner({open:{revision:2,status:'reconciling',title:'Team coffee (moved)',startsAt:slots[16].id,endsAt:new Date(Date.parse(slots[17].id)+1800000).toISOString(),recipientIds:[PERSON.id,MORGAN],excludedIds:[],optionalIds:[MORGAN]}}),play:async ctx=>{await openConfirm(ctx);await waitFor(()=>expect(within(ctx.canvasElement).getByText(/Saving your changes to Google Calendar/)).toBeVisible());}};
export const ConfirmEditFailed:Story={...RoomAvailability,beforeEach:()=>{confirmedOwner()();calendar.update='google';},play:async ctx=>{await openEditReview(ctx);await userEvent.click(within(document.body).getByRole('button',{name:'Save & notify attendees'}));await waitFor(()=>expect(within(document.body).getAllByText(/previous meeting details still stand/)[0]).toBeVisible());}};
const askResend=async(ctx:Parameters<NonNullable<Story['play']>>[0])=>{await openMenu(ctx.canvasElement);await userEvent.click(within(document.body).getByRole('menuitem',{name:'Resend invitations…'}));await waitFor(()=>expect(within(document.body).getByRole('heading',{name:'Email 2 attendees again?'})).toBeVisible());};
export const ConfirmResendAsk:Story={...ConfirmedRoom,play:async ctx=>{await ConfirmedRoom.play?.(ctx);await askResend(ctx);}};
export const ConfirmResendPending:Story={...ConfirmedRoom,beforeEach:()=>{confirmedOwner()();calendar.resend='pending';},play:async ctx=>{await askResend(ctx);await userEvent.click(within(document.body).getByRole('button',{name:'Resend'}));await waitFor(()=>expect(within(document.body).getByRole('button',{name:'Resending…'})).toBeDisabled());}};
export const ConfirmResendDone:Story={...ConfirmedRoom,beforeEach:()=>{confirmedOwner()();calendar.resend='sent';},play:async ctx=>{await askResend(ctx);await userEvent.click(within(document.body).getByRole('button',{name:'Resend'}));await waitFor(()=>expect(within(document.body).getByText('Invitations re-sent')).toBeVisible());}};
export const ConfirmResendTooSoon:Story={...ConfirmedRoom,beforeEach:()=>{confirmedOwner()();calendar.resend='too_soon';},play:async ctx=>{await askResend(ctx);await userEvent.click(within(document.body).getByRole('button',{name:'Resend'}));await waitFor(()=>expect(within(document.body).getByText(/Try again in a minute/)).toBeVisible());}};
export const ConfirmMemberUpdated:Story={render:()=> <Frame><WhenWeMeet roomId={id} initialRoom={{room:{...room,ownerId:MORGAN,role:'MEMBER'},responses:rows,userId:PERSON.id}}/></Frame>,beforeEach:()=>{calendar.confirmation={confirmation:{...confirmed('confirmed'),title:'Team coffee (moved)',startsAt:slots[16].id,endsAt:new Date(Date.parse(slots[17].id)+1800000).toISOString(),revision:2},review:null};},play:async ctx=>{await openConfirm(ctx);await waitFor(()=>expect(within(ctx.canvasElement).getByText(/Updated by the organizer/)).toBeVisible());}};
export const ConfirmMemberUpdatedMobile:Story={...ConfirmMemberUpdated,globals:{viewport:{value:'mobile',isRotated:false}}};

// Settings: the owner can rename the meeting; members only see their own name.
const openSettings=async({canvasElement}:Parameters<NonNullable<Story['play']>>[0])=>{await openMenu(canvasElement);await userEvent.click(within(document.body).getByRole('menuitem',{name:'Settings'}));await waitFor(()=>expect(within(document.body).getByRole('dialog')).toBeVisible());};
export const SettingsOwner:Story={...RoomAvailability,play:async ctx=>{await openSettings(ctx);await expect(within(document.body).getByLabelText(/Meeting name/)).toBeVisible();}};
export const SettingsOwnerDark:Story={...SettingsOwner,globals:{theme:'dark'}};
export const SettingsOwnerMobile:Story={...SettingsOwner,globals:{viewport:{value:'mobile',isRotated:false}}};
export const SettingsOwnerRenameFailed:Story={...RoomAvailability,beforeEach:()=>{calendar.rename='failure';},play:async ctx=>{await openSettings(ctx);const field=within(document.body).getByLabelText(/Meeting name/);await userEvent.clear(field);await userEvent.type(field,'Team lunch');await userEvent.click(within(document.body).getByRole('button',{name:'Save'}));await waitFor(()=>expect(within(document.body).getByText('Could not rename the meeting.')).toBeVisible());}};
export const SettingsOwnerRenamed:Story={...RoomAvailability,beforeEach:()=>{calendar.rename='success';},play:async ctx=>{await openSettings(ctx);const field=within(document.body).getByLabelText(/Meeting name/);await userEvent.clear(field);await userEvent.type(field,'Team lunch');await userEvent.click(within(document.body).getByRole('button',{name:'Save'}));await waitFor(()=>expect(within(ctx.canvasElement).getByRole('heading',{name:'Team lunch'})).toBeVisible());await waitFor(()=>expect(within(document.body).getByText('Meeting renamed')).toBeVisible());}};
const memberRoom={...room,ownerId:MORGAN,role:'MEMBER' as const};
export const SettingsMember:Story={render:()=> <Frame><WhenWeMeet roomId={id} initialRoom={{room:memberRoom,responses:rows,userId:PERSON.id}}/></Frame>,play:async ctx=>{await openSettings(ctx);await expect(within(document.body).queryByLabelText(/Meeting name/)).not.toBeInTheDocument();}};

// Stage 2: create success moment, invite copy, join, compact everyone and mobile variants.
export const CreateSuccessDark:Story={...CreateSuccess,globals:{theme:'dark'}};
export const CreateSuccessMobile:Story={...CreateSuccess,globals:{viewport:{value:'mobile',isRotated:false}}};
export const CreateSuccessCopied:Story={...CreateSuccess,play:async(ctx)=>{await submitCreate(ctx);const body=within(document.body);await waitFor(()=>expect(body.getByRole('heading',{name:/is ready/})).toBeVisible());Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>Promise.resolve()}});await userEvent.click(body.getByRole('button',{name:'Copy'}));await waitFor(()=>expect(body.getByRole('button',{name:'Copied'})).toBeVisible());}};
export const InviteCopied:Story={...RoomAvailability,play:async({canvasElement})=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>Promise.resolve()}});await userEvent.click(within(canvasElement).getByRole('button',{name:'Invite'}));await waitFor(()=>expect(within(document.body).getByText('Link copied')).toBeVisible());}};
export const InviteCopyFailed:Story={...RoomAvailability,play:async({canvasElement})=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>Promise.reject(new Error('denied'))}});await userEvent.click(within(canvasElement).getByRole('button',{name:'Invite'}));await waitFor(()=>expect(within(document.body).getByText('Couldn’t copy — link selected')).toBeVisible());}};
export const RoomMenu:Story={...RoomAvailability,play:async({canvasElement})=>{await openMenu(canvasElement);}};
export const RoomEveryoneCompact:Story={...RoomAvailability,play:async({canvasElement})=>{const c=within(canvasElement);await userEvent.click(c.getByRole('tab',{name:'Everyone'}));await userEvent.click(c.getByRole('button',{name:'Compact'}));}};
export const RoomEveryoneDark:Story={...RoomEveryone,globals:{theme:'dark'}};
export const JoinedToast:Story={render:()=> <Frame><WhenWeMeet roomId={id}/></Frame>,beforeEach:()=>{state.room={...room,ownerId:MORGAN,role:'MEMBER'};state.responses=[rows[1]];window.history.replaceState(null,'',`${window.location.pathname}${window.location.search}&invite=33333333-3333-4333-8333-333333333333`);},play:async({canvasElement})=>{await waitFor(()=>expect(within(document.body).getByText(/You joined/)).toBeVisible(),{timeout:4000});await expect(within(canvasElement).getByText('Add your times')).toBeVisible();}};
export const AutofillPreviewDarkMobile:Story={...AutofillPreview,globals:{theme:'dark',viewport:{value:'mobile',isRotated:false}}};
export const ConfirmOwnerDraftMobile:Story={...ConfirmOwnerDraft,globals:{viewport:{value:'mobile',isRotated:false}}};
export const ConfirmOwnerSelectedRangeMobile:Story={...ConfirmOwnerSelectedRange,globals:{viewport:{value:'mobile',isRotated:false}},play:async(ctx)=>{await openConfirm(ctx);const c=within(ctx.canvasElement);await waitFor(()=>expect(c.getByRole('heading',{name:'Confirm a time'})).toBeVisible());const manual=c.queryByRole('button',{name:'Enter time manually'});if(manual)await userEvent.click(manual);}};
