import {request} from './api';
import type {DateConfirmationProposal} from './date-confirmation.mjs';
import type {DateConfirmationOwner} from './date-confirmation-persistence.mjs';
export {ApiError} from './api';
export type DateConfirmationStatus={revision:number;status:'pending'|'reconciling'|'confirmed';scheduleMode:'date';title:string;startDate:string;endDate:string;timezone:string;url:string|null};
export type DateConfirmationResult={status:'confirmed'|'reconciling'|'conflict'|'not_confirmed'|'sent'|'too_soon'|'unknown'|'failed';url?:string;message?:string};
export type DateConfirmationInput=Omit<DateConfirmationProposal,'roomId'>;
const url=(roomId:string)=>`/api/craft/when-we-meet/${encodeURIComponent(roomId)}/dates/confirmation`;
export function getDateConfirmation(roomId:string,signal?:AbortSignal){return request<{status:DateConfirmationStatus|null;owner:DateConfirmationOwner|null;review:{attendees:Array<{userId:string;displayName:string;email:string|null;hasAvailability:boolean}>}|null}>(url(roomId),undefined,{signal});}
export function confirmDateMeetingRoute(roomId:string,input:DateConfirmationInput){return request<DateConfirmationResult>(url(roomId),{...input,action:'send'});}
export function updateDateMeetingRoute(roomId:string,input:DateConfirmationInput){return request<DateConfirmationResult>(url(roomId)+'/update',{...input,action:'send'});}
export function reconcileDateMeetingRoute(roomId:string,operation:'initial'|'update'='initial'){return request<DateConfirmationResult>(url(roomId)+(operation==='update'?'/update':''),{action:'reconcile'});}
export function resendDateMeetingRoute(roomId:string){return request<DateConfirmationResult>(url(roomId)+'/resend',{action:'send'});}
