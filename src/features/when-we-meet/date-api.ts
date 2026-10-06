import {request} from './api';
import type {CreateDateRoomInput,DateRoomResult,DateResponseBaseline,DateRoomSchedule,DateSaveResult,DateScheduleResult} from './date-contracts';
export {ApiError} from './api';
export type * from './date-contracts';
const base='/api/craft/when-we-meet';
const roomUrl=(roomId:string)=>`${base}/${encodeURIComponent(roomId)}/dates`;
// Analytics integration pending: the existing outcome wrapper is private; no untyped operation labels.
export function createDateRoom(input:CreateDateRoomInput){return request<{id:string;inviteToken:string}>(`${base}/dates`,input);}
export function loadDateRoom(roomId:string,signal?:AbortSignal){return request<DateRoomResult>(roomUrl(roomId),undefined,{signal});}
export function saveDateResponse(roomId:string,name:string,availableDates:string[],baseline:DateResponseBaseline){return request<DateSaveResult>(roomUrl(roomId),{action:'saveDates',name,availableDates,base:baseline});}
export function updateDateRoomSchedule(roomId:string,schedule:DateRoomSchedule){return request<DateScheduleResult>(roomUrl(roomId),{action:'scheduleDates',...schedule});}
export function checkDateModeCapability(){return request<{supported:true}>(`${base}/dates`);}
