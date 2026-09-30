export type FillHighlight={slotIds:string[];firstSlotId:string|null;nonce:number};
export function readFillHighlight():FillHighlight;
export function subscribeFillHighlight(listener:()=>void):()=>void;
export function publishFillHighlight(slotIds:string[]):void;
export function clearFillHighlight():void;
