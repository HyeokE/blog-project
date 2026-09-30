import {useSyncExternalStore} from 'react';
import {readFillHighlight,subscribeFillHighlight,type FillHighlight} from './fill-highlight.mjs';
const empty:FillHighlight={slotIds:[],firstSlotId:null,nonce:0};
/** The slots the last Fill from Google Calendar (or its Undo) changed; `nonce` changes on every apply. */
export function useFillHighlight():FillHighlight{return useSyncExternalStore(subscribeFillHighlight,readFillHighlight,()=>empty)}
