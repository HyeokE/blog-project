'use client';
import {useSyncExternalStore} from 'react';

/** Subscribes to a media query; false on the server and before hydration. */
export function useMediaQuery(query:string){
 return useSyncExternalStore(
  notify=>{const list=window.matchMedia(query);list.addEventListener('change',notify);return ()=>list.removeEventListener('change',notify)},
  ()=>window.matchMedia(query).matches,
  ()=>false,
 );
}
