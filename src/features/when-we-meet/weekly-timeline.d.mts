export type TimelineSlot={id:string;utc:string;date:string;time:string};
export type SavedResponse={user_id:string;display_name:string;slots:string[]};
export type TimelineRun={date:string;slotIds:string[];startUtc:string;endUtc:string};
export type TimelineRow={userId:string;displayName:string;label:string;isCurrentUser:boolean;color:string;slotIds:string[];runs:TimelineRun[]};
export type ProjectedSlot=TimelineSlot&{count:number;all:boolean};
export function weekWindow(dates:string[],requestedWeek?:number,selectedDay?:string|null):{weekIndex:number;weekCount:number;dates:string[];selectedDay:string|null};
export function projectDraftRow(input:{slots:TimelineSlot[];selectedIds:string[];displayName:string}):{label:string;unsaved:true;runs:TimelineRun[]};
export function projectWeeklyTimeline(input:{slots:TimelineSlot[];responses:SavedResponse[];currentUserId:string}):{responseCount:number;days:Array<{date:string;slots:ProjectedSlot[]}>;rows:TimelineRow[];countById:Record<string,number>};
