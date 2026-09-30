export type BestTime={date:string;start:string;end:string;startId:string;endId:string;count:number;total:number;missing:string[]};
export function bestTimes(input:{slots:Array<{id:string;date:string;time:string}>;responses:Array<{userId:string;slots:string[]}>;members:Array<{id:string;name:string}>;limit?:number;minSlots?:number;maxSlots?:number}):BestTime[];
