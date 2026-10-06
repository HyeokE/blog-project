import {datesInRange,normalizeAvailableDates,mergeAvailableDateChanges} from './date-availability.mjs';
import {todayInTimezone} from './creation-validation.mjs';
import {DateApiProblem,dateUuid,normalizeDateRoom,normalizeDateResponses,normalizeDateCreated,normalizeDateSaved,normalizeDateSchedule,dateRoomColumns,dateResponseColumns,dateDbFields,dateCreateParameters,dateSaveParameters,dateScheduleParameters} from './date-normalize.mjs';
const problem=(message,status=400)=>{throw new DateApiProblem(message,status);};
function databaseError(error){if(!error)return;const code=error.code;if(['42703','42883','PGRST202','PGRST204'].includes(code))problem('Date mode is unavailable.',503);if(['42501','P0002','PGRST116'].includes(code))problem('Meeting access required.',403);if(code==='22023')problem('Invalid date meeting values.',400);if(code==='40001')problem('Another edit arrived. Retry to merge your changes.',409);problem('Could not update the date meeting.',500);}
const validName=value=>typeof value==='string'&&value.trim().length>0&&value.trim().length<=50&&!/[\u0000-\u001f\u007f]/.test(value);
function scheduleInput(input,clock,currentStart){
 if(input.startTime!=null||input.endTime!=null||input.scheduleMode!==undefined&&input.scheduleMode!=='date')problem('Date rooms cannot use times.');
 if(typeof input.timezone!=='string'||input.timezone.length>64||input.timezone!==input.timezone.trim())problem('Choose a valid timezone.');
 const today=todayInTimezone(input.timezone,clock);if(!today)problem('Choose a valid timezone.');
 try{datesInRange(input.startDate,input.endDate);}catch{problem('Choose valid dates, up to 28 days.');}
 if(input.startDate<today&&input.startDate!==currentStart)problem('Choose a start date that is not in the past.');
 return {startDate:input.startDate,endDate:input.endDate,timezone:input.timezone};
}
function inputDates(value,room){try{return normalizeAvailableDates(value,room);}catch{problem('Choose valid availability dates inside the meeting range.');}}
const maxBodyBytes=8192;
// Cancel without awaiting producer cleanup: a producer's cancel promise may never settle.
function cancelReader(reader){try{void reader.cancel().catch(()=>{});}catch{/* Already closed or errored. */}}
async function limitedBody(request){
 if(!request.body)return null;
 const reader=request.body.getReader();
 const abort=()=>cancelReader(reader);
 request.signal.addEventListener('abort',abort,{once:true});
 try{
 const length=request.headers.get('content-length');
 if(request.signal.aborted||(length!==null&&/^\d+$/.test(length)&&Number(length)>maxBodyBytes)){
 cancelReader(reader);return {tooLarge:!request.signal.aborted};
 }
 const bytes=new Uint8Array(maxBodyBytes);let size=0;
 while(true){
 const {done,value}=await reader.read();
 if(request.signal.aborted)return null;
 if(done)break;
 if(value.byteLength>maxBodyBytes-size){cancelReader(reader);return {tooLarge:true};}
 bytes.set(value,size);size+=value.byteLength;
 }
 const value=JSON.parse(new TextDecoder().decode(bytes.subarray(0,size)));
 return value&&typeof value==='object'&&!Array.isArray(value)?{value}:null;
 }catch{cancelReader(reader);return null;}
 finally{request.signal.removeEventListener('abort',abort);reader.releaseLock();}
}
/** Shared executable HTTP adapter. Framework authentication and guards are injected by routes.
 * The legacy injected body dependency remains accepted by the declaration for route compatibility;
 * this adapter reads and parses only its own bounded buffer, never the shared body helper.
 */
export async function handleDateRequest(request,roomId,{currentUser,sameOrigin,uuid,ok,failed,invalid,clock}){
 try{
 if(request.method==='POST'&&!sameOrigin(request))return failed('Invalid request origin.',403);
 if(roomId!==undefined&&!uuid(roomId))return invalid('Invalid meeting ID.');
 let input;
 if(request.method==='POST'){
 if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')??''))return invalid('Use application/json.');
 const parsed=await limitedBody(request);
 if(parsed?.tooLarge)return invalid('Request body is too large.');
 if(!parsed?.value)return invalid();input=parsed.value;
 }
 const service=createDateService(await currentUser(),clock?{clock}:undefined);
 if(request.method==='GET')return ok(await (roomId===undefined?service.capability():service.load(roomId)));
 if(roomId===undefined)return ok(await service.create(input));
 if(input.action==='saveDates')return ok(await service.save(roomId,input));
 if(input.action==='scheduleDates')return ok(await service.schedule(roomId,input));
 return invalid('Invalid date action.');
 }catch(error){return error instanceof DateApiProblem?failed(error.message,error.status):failed('Could not process the date meeting.');}
}
/** Inject the authenticated publishable-key/RLS Supabase client, never a service role. */
export function createDateService({client,user},{clock=new Date()}={}){
 if(user?.is_anonymous||!dateUuid(user?.id)||!(user.app_metadata?.provider==='google'||user.app_metadata?.providers?.includes('google')))problem('Sign in with Google to continue.',401);
 const userId=user.id;
 async function readRoom(roomId){if(!dateUuid(roomId))problem('Invalid meeting ID.');const {data,error}=await client.from('wwm_rooms').select(dateRoomColumns).eq('id',roomId).single();databaseError(error);if(!data)problem('Meeting unavailable or you are not a member.',403);return normalizeDateRoom(data,userId);}
 async function ownResponse(roomId,room){const {data,error}=await client.from('wwm_responses').select(dateResponseColumns).eq(dateDbFields.roomId,roomId).eq(dateDbFields.userId,userId).single();databaseError(error);if(!data)problem('Your response was not found.',403);const [response]=normalizeDateResponses([data],room);if(response.userId!==userId)problem('Meeting access required.',403);return response;}
 return {
 async capability(){const {error}=await client.from('wwm_rooms').select(dateDbFields.scheduleMode).limit(0);databaseError(error);return {supported:true};},
 async create(input){if(input.scheduleMode!=='date')problem('Date mode required.');const schedule=scheduleInput(input,clock);if(typeof input.title!=='string'||!input.title.trim()||input.title.trim().length>100||/[\u0000-\u001f\u007f]/.test(input.title))problem('Enter a meeting title (1–100 characters).');if(!validName(input.name))problem('Enter your name (1–50 characters).');const {data,error}=await client.rpc('wwm_create_date_room',dateCreateParameters({...schedule,title:input.title.trim(),name:input.name.trim()}));databaseError(error);return normalizeDateCreated(data);},
 async load(roomId){const room=await readRoom(roomId);const {data,error}=await client.from('wwm_responses').select(dateResponseColumns).eq(dateDbFields.roomId,roomId);databaseError(error);return {room,responses:normalizeDateResponses(data,room),userId};},
 async save(roomId,input){if(!validName(input.name))problem('Enter your name (1–50 characters).');if(!input.base||typeof input.base.name!=='string'||!Array.isArray(input.base.availableDates))problem('Refresh this meeting before saving; your selection remains on this device.',409);
 for(let attempt=0;attempt<4;attempt++){
 const room=await readRoom(roomId),base=inputDates(input.base.availableDates,room),desired=inputDates(input.availableDates,room),current=await ownResponse(roomId,room);
 const value={name:input.name.trim()===input.base.name.trim()?current.displayName:input.name.trim(),availableDates:inputDates(mergeAvailableDateChanges(base,desired,current.availableDates),room)};
 const {data,error}=await client.rpc('wwm_save_dates',dateSaveParameters(roomId,value,current.updatedAt));if(error?.code==='40001')continue;databaseError(error);
 return {saved:true,value:{...value,version:normalizeDateSaved(data)}};
 }problem('Another edit arrived while saving. Retry to merge your changes.',409);},
 async schedule(roomId,input){const room=await readRoom(roomId);if(room.role!=='ADMIN')problem('Only the meeting owner can change the dates.',403);const schedule=scheduleInput(input,clock,room.startDate);const {data,error}=await client.rpc('wwm_update_date_schedule',dateScheduleParameters(roomId,schedule));databaseError(error);return normalizeDateSchedule(data);}
 };
}
