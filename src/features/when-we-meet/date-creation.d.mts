import type {CreateRoomInput} from './api';
import type {CreateDateRoomInput} from './date-contracts';
export type CreationForm=CreateRoomInput&{scheduleMode:'time'|'date'};
export function submitCreation(form:CreationForm,name:string,api:{createRoom:(input:CreateRoomInput,name:string)=>Promise<{id:string;inviteToken:string}>;createDateRoom:(input:CreateDateRoomInput)=>Promise<{id:string;inviteToken:string}>}):Promise<{id:string;inviteToken:string}>;
