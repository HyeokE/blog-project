import type {WwmTranslate} from '../../i18n/wwm.mjs';
export type CreationField='title'|'dates'|'timezone'|'name'|'times'|'scheduleMode';
export type CreationErrors=Partial<Record<CreationField,string>>;
export function todayInTimezone(zone:string,clock?:Date):string|null;
export function creationErrors(values:{title:string;startDate:string;endDate:string;timezone:string;name:string;scheduleMode?:string;startTime?:string;endTime?:string},clock?:Date,t?:WwmTranslate):CreationErrors;
export function revalidateCreationErrors(previous:CreationErrors,values:{title:string;startDate:string;endDate:string;timezone:string;name:string;scheduleMode?:string;startTime?:string;endTime?:string},clock?:Date,t?:WwmTranslate):CreationErrors;
