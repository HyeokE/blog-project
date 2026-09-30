'use client';
import {use,useEffect} from 'react';
import type {Response} from './api';
export type RoomResponseResult={responses:Response[];error?:never}|{responses?:never;error:string};
/** Suspends only the availability section while the server read streams. */
export function RoomResponseLoader({result,onReady}:{result:Promise<RoomResponseResult>;onReady:(value:RoomResponseResult)=>void}){
 const value=use(result);
 useEffect(()=>{onReady(value)},[value,onReady]);
 return null;
}
