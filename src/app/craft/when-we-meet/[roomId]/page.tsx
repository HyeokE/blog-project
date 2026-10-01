import type { Metadata } from 'next';
import { unstable_rethrow } from 'next/navigation';
import WhenWeMeet from '@/features/when-we-meet/WhenWeMeet';
import {createWwmTranslator} from '@/i18n/wwm.mjs';
import {getWwmLocale} from '@/lib/wwm-locale';
import {craftRoomConfirmation,craftRoomMetadata,craftRoomResponses,currentSupabaseUser,serverSupabaseClient} from '@/lib/supabase/server';
import {normalizeInvitationPreview} from '@/features/when-we-meet/normalize.mjs';
import {uuid} from '@/app/api/craft/when-we-meet/http';
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
// The card is the When We Meet segment's image; a page-level openGraph replaces the inherited one, so it is named here.
const CARD={url:'/craft/when-we-meet/opengraph-image',width:1200,height:630,alt:'When We Meet: find a time that works for everyone'};
// Room links are shared in chats: the preview shows the organizer's name (token-gated, same as the invitation screen),
// in English and Korean, and never the meeting title, dates or people. Never indexed.
async function invitationOrganizer(roomId:string,token:unknown){
 if(!uuid(roomId)||!uuid(token))return null;
 try{
  const client=await serverSupabaseClient({readOnly:true});
  const {data,error}=await client.rpc('wwm_invitation_preview',{p_room_id:roomId,p_token:token});
  return error?null:normalizeInvitationPreview(data)?.organizerName?.trim().slice(0,40)||null;
 }catch{return null}
}
export async function generateMetadata({params,searchParams}:{params:Promise<{roomId:string}>;searchParams:Promise<{invite?:string|string[]}>}): Promise<Metadata>{
 const [{roomId},{invite},locale]=await Promise.all([params,searchParams,getWwmLocale()]);
 const t=createWwmTranslator(locale),en=createWwmTranslator('en'),ko=createWwmTranslator('ko');
 const name=await invitationOrganizer(roomId,Array.isArray(invite)?invite[0]:invite);
 const title=t('app.roomTitle'),description=name?`${en('app.inviteShare',{name})} ${ko('app.inviteShare',{name})}`:`${en('app.inviteShareAnonymous')} ${ko('app.inviteShareAnonymous')}`;
 return {title,robots:{index:false,follow:false},description,openGraph:{type:'website',siteName:'HYEOK.DEV',locale:locale==='ko'?'ko_KR':'en_US',title,description,images:[CARD]},twitter:{card:'summary_large_image',title,description,images:[CARD.url]}};
}
export default function Page({params}:{params:Promise<{roomId:string}>}){
 return <Suspense fallback={<main className="wwm"><RoomSkeleton/></main>}><RoomSection params={params}/></Suspense>;
}
