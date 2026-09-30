export function normalizeRoom<T extends {start_time:string;end_time:string}>(room:T):T;
export function normalizeResponses<T extends {slots:string[]}>(rows:T[]):T[];
