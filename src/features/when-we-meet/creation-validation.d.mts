export type CreationField='title'|'dates'|'timezone'|'name';
export type CreationErrors=Partial<Record<CreationField,string>>;
export function todayInTimezone(zone:string,clock?:Date):string|null;
export function creationErrors(values:{title:string;startDate:string;endDate:string;timezone:string;name:string},clock?:Date):CreationErrors;
export function revalidateCreationErrors(previous:CreationErrors,values:{title:string;startDate:string;endDate:string;timezone:string;name:string},clock?:Date):CreationErrors;
