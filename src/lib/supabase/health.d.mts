declare module './health.mjs' {
 export function probeAuthHealth(options?:{url?:string;key?:string;fetcher?:typeof fetch;timeoutMs?:number}):Promise<{status:'ok'|'unavailable';service:'supabase';scope:'auth'}>;
}
export {};
