import type {ValidDateConfirmation,DateConfirmationRoom} from './date-confirmation.mjs';
import type {DateConfirmationOwner} from './date-confirmation-persistence.mjs';
export type DateConfirmationOperation='initial'|'update'|'resend';
export interface DateConfirmationDependencies<Session=unknown> {
 sameOrigin(request:Request):boolean;
 currentUser():Promise<Session>;
 loadRoom(session:Session,roomId:string):Promise<DateConfirmationRoom & {role:string}>;
 loadOwner(session:Session,roomId:string,userId:string):Promise<DateConfirmationOwner|null>;
 loadStatus(session:Session,roomId:string):Promise<unknown>;
 attendees(session:Session,roomId:string):Promise<Array<{userId:string;displayName:string;email:string|null;hasAvailability:boolean}>>;
 token(session:Session):Promise<string>;
 reserve(session:Session,mode:DateConfirmationOperation,valid:ValidDateConfirmation,eventId:string,hash:string):Promise<string>;
 getEvent(session:Session,token:string,eventId:string):Promise<unknown>;
 insertEvent(session:Session,token:string,body:unknown):Promise<unknown>;
 patchEvent(session:Session,token:string,eventId:string,body:unknown,etag:string):Promise<unknown>;
 finalize(session:Session,mode:DateConfirmationOperation,valid:ValidDateConfirmation,eventId:string,status:string,url:string|null,hash:string):Promise<string>;
}
export function handleDateConfirmationRequest<S>(request:Request,roomId:string,mode:DateConfirmationOperation,deps:DateConfirmationDependencies<S>):Promise<Response>;
