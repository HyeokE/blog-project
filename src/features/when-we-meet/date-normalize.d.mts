import type {DateRoom,DateResponse,DateRoomSchedule,DateResponseBaseline,DateScheduleResult,CreateDateRoomInput} from './date-contracts';
export class DateApiProblem extends Error{status:number;constructor(message:string,status?:number);}
export function dateUuid(value:unknown):boolean;
export function rawDateVersion(value:unknown):string;
export function normalizeDateRoom(row:unknown,userId:string):DateRoom;
export function normalizeDateResponses(rows:unknown,room:DateRoomSchedule):DateResponse[];
export function normalizeDateCreated(row:unknown):{id:string;inviteToken:string};
export function normalizeDateSaved(rows:unknown):string;
export function normalizeDateSchedule(rows:unknown):DateScheduleResult;
export const dateRoomColumns:string;
export const dateResponseColumns:string;
export const dateDbFields:{roomId:string;userId:string;scheduleMode:string};
export function dateCreateParameters(input:Omit<CreateDateRoomInput,'scheduleMode'>):Record<string,unknown>;
export function dateSaveParameters(roomId:string,value:DateResponseBaseline,version:string):Record<string,unknown>;
export function dateScheduleParameters(roomId:string,input:DateRoomSchedule):Record<string,unknown>;
