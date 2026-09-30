import {use} from 'react';
const queries=new Map<string,Promise<unknown>>();
export function useCraftQuery<T>(key:string,fetcher:()=>Promise<T>):T{
 let query=queries.get(key) as Promise<T>|undefined;
 if(!query){query=fetcher();queries.set(key,query)}
 return use(query);
}
export function clearCraftQueries(){queries.clear()}
export function retryCraftQuery(key:string){queries.delete(key)}
