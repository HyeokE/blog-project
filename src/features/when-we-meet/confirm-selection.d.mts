type Slot={id:string;utc:string;date:string;time:string};
/** One room-local date plus the first and last selected slot ids (inclusive). */
export type ConfirmRange={date:string;startId:string;endId:string};
export type ConfirmFields={date:string;start:string;end:string};
export function dragRange(slots:Slot[],anchorId:string,targetId:string):ConfirmRange|null;
export function tapRange(state:{anchor:string|null}|null,slots:Slot[],id:string):{anchor:string|null;range:ConfirmRange|null};
export function rangeSlotIds(slots:Slot[],range:ConfirmRange|null):string[];
export function rangeFields(slots:Slot[],range:ConfirmRange|null):ConfirmFields|null;
export function fieldsRange(slots:Slot[],fields:ConfirmFields):ConfirmRange|null;
export function rangeInstants(range:ConfirmRange):{start:string;end:string};
export type SelectionResponse='available'|'partial'|'unavailable'|'not-responded';
export function selectionAvailability<M extends {id:string;response?:SelectionResponse;availability?:string}>(members:M[],responses:Array<{userId:string;slots:string[]}>,slots:Slot[],range:ConfirmRange|null):Array<M&{response:SelectionResponse;availability?:string}>;
export function selectionDrift(previous:Array<{id:string;response?:string}>|null,current:Array<{id:string;response?:string}>|null):boolean;
