export function visibleDates(dates: string[],offset: number,size: number): string[];
export function shiftWindow(offset: number,direction: number,total: number,size: number): number;
export function slotLabel(view: 'mine'|'overlap',selected: boolean,count: number,total: number): string;
export function rangePreview(start: string,end: string): {days:number;valid:boolean};
