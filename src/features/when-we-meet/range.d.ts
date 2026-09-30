export function rangeDays(start: string,end: string): number;
export function resetRange(): {start:string;end:string;phase:'start';error:string};
export function selectRangeDate(state:{start:string;end:string;phase:string;error?:string},date:string): {start:string;end:string;phase:string;error:string};
export function isRangeEndDisabled(state:{start:string;end:string;phase:string;error?:string},date:string): boolean;
export function isRangeDateDisabled(state:{start:string;end:string;phase:string;error?:string},date:string,minDate:string,maxDate?:string): boolean;
