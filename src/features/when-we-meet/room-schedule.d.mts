export type RoomSchedule={startDate:string;endDate:string;startTime:string;endTime:string;timezone:string};
export type ScheduleErrors=Partial<Record<'dates'|'times'|'timezone',string>>;
export function scheduleChanged(before:RoomSchedule,after:RoomSchedule):boolean;
export function scheduleErrors(values:RoomSchedule,options?:{previousStart?:string},clock?:Date):ScheduleErrors;
export function scheduleImpact(responses:Array<{displayName:string;slots:string[]}>,next:RoomSchedule):{removedSlots:number;people:string[]};
