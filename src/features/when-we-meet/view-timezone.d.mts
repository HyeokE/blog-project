type Slot={id:string;utc:string;date:string;time:string};
export function clockIn(instant:string|number|Date,zone:string):{date:string;time:string};
export function projectSlots<T extends Slot>(slots:T[],zone:string):T[];
export function isHalfHourAligned(slots:Slot[]):boolean;
export function labelsDiffer(slots:Slot[],projected:Slot[]):boolean;
export function timezoneView<T extends Slot>(input:{slots:T[];roomZone:string;zone:string|null|undefined;useZone:boolean}):{offered:boolean;zone:string;slots:T[];startDate:string;endDate:string;startTime:string;endTime:string};
