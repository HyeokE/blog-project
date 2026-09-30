declare module '*.mjs' {
  export function validateRoom(room:{title:string;startDate:string;endDate:string;startTime:string;endTime:string;timezone:string}): string|null;
  export function makeSlots(room:{title:string;startDate:string;endDate:string;startTime:string;endTime:string;timezone:string}): Array<{id:string;utc:string;date:string;time:string}>;
  export function toggleSlot(current:string[],id:string):string[];
  export function aggregate(ids:string[],responses:Array<{slots:string[]}>):Array<{id:string;count:number;all:boolean}>;
}
