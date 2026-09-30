type Row={key:string;time:string;cycle:number;byDate:Record<string,{id:string}>};
export function cellPosition(rows:Row[],dates:string[],id:string):{row:number;col:number}|null;
export function gridMove(rows:Row[],dates:string[],fromId:string,key:string,modifiers?:{ctrl?:boolean}):string|null;
export function initialFocusId(input:{rows:Row[];dates:string[];lastId:string|null;selectedIds:string[];fallbackRow:number}):string|null;
export function scrollTargetRow(rows:Row[],relevantIds:Iterable<string>,options?:{leadRows?:number;defaultTime?:string}):number;
export function pagerWindow(dates:string[],start:number,size?:number):{start:number;dates:string[];hasPrev:boolean;hasNext:boolean};
export function pagerStartFor(dates:string[],start:number,date:string,size?:number):number;
