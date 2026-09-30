export function trustedOrigins(env?:Record<string,string|undefined>):string[];
export function requestOrigin(headers:Headers,env?:Record<string,string|undefined>):string|null;
export function isSameOrigin(headers:Headers,env?:Record<string,string|undefined>):boolean;
