import type {ValidDateConfirmation} from './date-confirmation.mjs';
export interface StoredDateConfirmation {
 readonly valid: ValidDateConfirmation;
 readonly status:'pending'|'reconciling'|'confirmed'|'reverted';
 readonly payloadHash:string;
 readonly url:string|null;
}
export interface DateConfirmationOwner {
 readonly root:StoredDateConfirmation & {readonly eventId:string;readonly organizerId:string;readonly organizerEmail:string};
 readonly revisions:readonly (StoredDateConfirmation & {readonly baseRevision:number|null})[];
 readonly pending:(StoredDateConfirmation & {readonly baseRevision:number|null;readonly previous:ValidDateConfirmation})|null;
}
/** Requires an authorized owner-only RPC result, never a browser payload. */
export function normalizeDateConfirmationOwner(data:unknown,roomId:string,ownerId:string):DateConfirmationOwner|null;
