export type RsvpStatus='accepted'|'declined'|'tentative'|'needsAction';
export const RSVP_STATUSES:readonly RsvpStatus[];
export function rsvpByMember(event:unknown,members:Array<{userId:string;email:string|null}>):Array<{userId:string;response:RsvpStatus}>|null;
export function rsvpCounts(rows:Array<{response?:RsvpStatus}>):Record<RsvpStatus,number>;
