export type ParticipantHue={name:string;light:string;dark:string};
export const SURFACES:{light:string;dark:string};
export const PARTICIPANT_HUES:ParticipantHue[];
export const YOU_HUE:ParticipantHue;
export function contrastRatio(a:string,b:string):number;
export function participantColor(userId:string,currentUserId:string):string;
