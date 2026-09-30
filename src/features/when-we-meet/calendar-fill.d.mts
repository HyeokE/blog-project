export type FillPreview={slotIds:string[];freeCount:number;slotCount:number;canApply:boolean};
export function fillPreview(result:unknown,slots:Array<{id:string}>):FillPreview;
export function fillSummary(preview:FillPreview):string;
export function fillFailure(error:unknown):{kind:'reconnect'}|{kind:'error';message:string};
export type FillRange={start:string;end:string};
export function applyFillInRange(selected:string[],freeIds:string[],slots:Array<{id:string;date:string}>,range:FillRange):string[];
export function fillSummaryInRange(preview:FillPreview,slots:Array<{id:string;date:string}>,range:FillRange):{freeCount:number;slotCount:number;canApply:boolean;text:string};
export function calendarReturnNotice(outcome:string|null):{tone:'success'|'info'|'error';text:string}|null;
