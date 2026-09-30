import type { Metadata } from 'next';
import { unstable_rethrow } from 'next/navigation';
import WhenWeMeet from '@/features/when-we-meet/WhenWeMeet';
import {craftRoomConfirmation,craftRoomMetadata,craftRoomResponses,currentSupabaseUser} from '@/lib/supabase/server';
import type {RoomResponseResult} from '@/features/when-we-meet/RoomResponseLoader';
import {Suspense} from 'react';
import {RoomSkeleton} from '@/features/when-we-meet/ServerSkeletons';
import ServerSectionRetry from '@/features/when-we-meet/ServerSectionRetry';

export async function RoomSection({params}:{params:Promise<{roomId:string}>}){
 const {roomId}=await params;
 try {
  const context=await currentSupabaseUser();
  // The confirmation read runs beside the metadata read: it decides the header status line and the opening tab.
  const [initialRoom,initialConfirmation]=await Promise.all([craftRoomMetadata(roomId,context),craftRoomConfirmation(roomId,context).catch(()=>null)]);
  const responsesPromise=initialRoom?craftRoomResponses(roomId,context).then((responses):RoomResponseResult=>({responses}),():RoomResponseResult=>({error:'Could not load availability. Please try again.'})):undefined;
  return <WhenWeMeet key={`${roomId}:${initialRoom?.userId||'guest'}`} roomId={roomId} initialRoom={initialRoom} responsesPromise={responsesPromise} initialConfirmation={initialRoom?initialConfirmation:null}/>;
 } catch(error) {
  unstable_rethrow(error);
  return <ServerSectionRetry room/>;
 }
}
export const metadata: Metadata={title:'Meeting | When We Meet',robots:{index:false,follow:false},description:'Private scheduling invitation.'};
export default function Page({params}:{params:Promise<{roomId:string}>}){
 return <Suspense fallback={<main className="wwm"><RoomSkeleton/></main>}><RoomSection params={params}/></Suspense>;
}
