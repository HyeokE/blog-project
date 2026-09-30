'use client';
import {useEffect,useRef,useState} from 'react';
import {funnelStepIfActive} from './funnel';
import {Check,Link2,MoreHorizontal} from 'lucide-react';
import {toast} from 'sonner';
import {ANALYTICS_ELEMENTS} from '@/constants/analytics';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Dialog,DialogContent,DialogDescription,DialogFooter,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuTrigger} from '@/components/ui/dropdown-menu';
import {AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle} from '@/components/ui/alert-dialog';
import {Badge} from '@/components/ui/badge';
import {RICH_SLOT,rich,useWwmCopy} from './i18n/WwmI18nProvider';
import {resendFailure,type ConfirmationRecordData} from './confirm-tab.mjs';
import './room-chrome.css';

const COPIED_MS=2000;

/** Read-only invitation link with an inline Copy that flips to "Copied" for two seconds. On failure the link is selected for manual copy. */
export function LinkField({value,autoSelect=false}:{value:string;autoSelect?:boolean}){
 const {t,MEETING_TOASTS}=useWwmCopy();
 const [copied,setCopied]=useState(false);
 const input=useRef<HTMLInputElement>(null),timer=useRef(0);
 useEffect(()=>()=>window.clearTimeout(timer.current),[]);
 useEffect(()=>{if(autoSelect)requestAnimationFrame(()=>input.current?.select())},[autoSelect]);
 async function copy(){
  try{await navigator.clipboard.writeText(value);funnelStepIfActive('create','invite_copied');setCopied(true);window.clearTimeout(timer.current);timer.current=window.setTimeout(()=>setCopied(false),COPIED_MS)}
  catch{input.current?.focus();input.current?.select();toast.error(MEETING_TOASTS.copyFailed)}
 }
 return <div className="wwm-link-field"><Input ref={input} aria-label={t('room.invitationLink')} data-analytics-label={ANALYTICS_ELEMENTS.INVITE_LINK_INPUT} readOnly value={value} onFocus={event=>event.target.select()}/><Button type="button" variant="ghost" size="sm" className="wwm-link-copy" data-analytics-label={ANALYTICS_ELEMENTS.INVITE_LINK_COPY} data-analytics-id="inline" onClick={()=>void copy()}><span aria-live="polite">{copied?t('create.copied'):t('create.copy')}</span></Button></div>;
}

/** Copies a link; resolves false when the clipboard refused (callers then show the link selected). `copied` is the success toast text. */
export async function copyLink(link:string,copied:string){try{await navigator.clipboard.writeText(link);toast.success(copied);return true}catch{return false}}

export type CreatedMeeting={id:string;title:string;link:string;summary:string};
/** The one success moment after creating a meeting: name, window, link and the way in. No toast. */
export function CreatedMeetingDialog({meeting,onOpenMeeting,onClose,onCloseAutoFocus}:{meeting:CreatedMeeting|null;onOpenMeeting:(id:string)=>void;onClose:()=>void;onCloseAutoFocus:(event:Event)=>void}){
 const {t}=useWwmCopy();
 const [failed,setFailed]=useState(false);
 useEffect(()=>{setFailed(false)},[meeting?.id]);
 return <Dialog open={Boolean(meeting)} onOpenChange={open=>{if(!open)onClose()}}>
  <DialogContent className="wwm-ready-dialog" closeLabel={t('common.close')} onCloseAutoFocus={onCloseAutoFocus}>
   {meeting&&<><DialogHeader><DialogTitle>{rich(t('create.readyTitle',{title:RICH_SLOT}),RICH_SLOT,<span className="wwm-ready-name">{meeting.title}</span>)}</DialogTitle><DialogDescription>{meeting.summary}</DialogDescription></DialogHeader>
   <LinkField value={meeting.link} autoSelect={failed}/>
   <DialogFooter className="wwm-ready-footer"><Button type="button" data-analytics-label={ANALYTICS_ELEMENTS.MEETING_OPEN} onClick={()=>onOpenMeeting(meeting.id)}>{t('create.openMeeting')}</Button></DialogFooter></>}
  </DialogContent>
 </Dialog>;
}

/** Fallback when the clipboard is unavailable: the link, selected, with its own Copy. */
export function InviteLinkDialog({link,onClose,onCloseAutoFocus}:{link:string;onClose:()=>void;onCloseAutoFocus:(event:Event)=>void}){
 const {t}=useWwmCopy();
 return <Dialog open={Boolean(link)} onOpenChange={open=>{if(!open)onClose()}}><DialogContent className="wwm-ready-dialog" closeLabel={t('common.close')} onCloseAutoFocus={onCloseAutoFocus}><DialogHeader><DialogTitle>{t('room.invitePeople')}</DialogTitle><DialogDescription>{t('create.linkHint')}</DialogDescription></DialogHeader>{link&&<LinkField value={link} autoSelect/>}<DialogFooter className="wwm-ready-footer"><Button type="button" variant="outline" data-analytics-label={ANALYTICS_ELEMENTS.DIALOG_DONE} onClick={onClose}>{t('common.done')}</Button></DialogFooter></DialogContent></Dialog>;
}

type HeaderProps={
 title:string;startDate:string;endDate:string;timezone:string;
 confirmation:ConfirmationRecordData|null;offline:boolean;
 settingsDisabled:boolean;menuTrigger:React.RefObject<HTMLButtonElement|null>;
 onInvite:()=>void;onSettings:()=>void;
 /** Owner of a confirmed meeting only. */
 resend?:{recipientCount:()=>Promise<number|undefined>;send:()=>Promise<unknown>};
};
/** Room identity: title, one meta line (dates · timezone, the only timezone in the view) with a compact Confirmed chip (day only, on every tab so the header never changes height), Invite and a ⋯ menu.
 * Phones: the title takes the full width; Invite (icon only) and ⋯ share the meta row. */
export function RoomHeader({title,startDate,endDate,timezone,confirmation,offline,settingsDisabled,menuTrigger,onInvite,onSettings,resend}:HeaderProps){
 const {t,compactRange,confirmedChip,MEETING_TOASTS,resendQuestion}=useWwmCopy();
 const [asking,setAsking]=useState(false),[count,setCount]=useState<number|undefined>(),[sending,setSending]=useState(false);
 const confirmed=confirmation?.status==='confirmed';
 function askResend(){setCount(undefined);setAsking(true);void resend?.recipientCount().then(setCount,()=>setCount(undefined))}
 async function sendResend(){
  if(!resend||sending)return;
  setSending(true);
  try{await resend.send();setAsking(false);toast.success(MEETING_TOASTS.resent)}
  catch(error){setAsking(false);toast.error(resendFailure(error,t).error)}
  finally{setSending(false)}
 }
 return <header className="wwm-room-header">
  <h1>{title}</h1>
   <div className="wwm-header-actions">
    <Button type="button" variant="outline" data-analytics-label={ANALYTICS_ELEMENTS.INVITE_LINK_COPY} onClick={onInvite}><Link2 aria-hidden="true"/><span className="wwm-invite-label">{t('room.invite')}</span></Button>
    <DropdownMenu modal={false}><DropdownMenuTrigger asChild><Button ref={menuTrigger} type="button" variant="outline" size="icon" className="wwm-room-menu-trigger" aria-label={t('room.options')} data-analytics-label={ANALYTICS_ELEMENTS.MEETING_MENU}><MoreHorizontal aria-hidden="true"/></Button></DropdownMenuTrigger>
     <DropdownMenuContent align="end" className="wwm-room-menu">
      <DropdownMenuItem disabled={settingsDisabled} data-analytics-label={ANALYTICS_ELEMENTS.MEETING_SETTINGS} onSelect={onSettings}>{t('common.settings')}</DropdownMenuItem>
      {resend&&confirmed&&<DropdownMenuItem data-analytics-label={ANALYTICS_ELEMENTS.CONFIRM_RESEND} onSelect={askResend}>{t('resend.menuItem')}</DropdownMenuItem>}
     </DropdownMenuContent>
    </DropdownMenu>
   </div>
  <p className="wwm-room-meta"><span>{compactRange(startDate,endDate)}<span aria-hidden="true"> · </span>{timezone}</span>{confirmed&&confirmation&&<Badge variant="outline" className="wwm-room-chip"><Check aria-hidden="true"/>{confirmedChip(confirmation)}</Badge>}{offline&&<span className="wwm-offline" role="status"><i aria-hidden="true"/>{t('common.offline')}</span>}</p>
  <AlertDialog open={asking} onOpenChange={open=>{if(!sending)setAsking(open)}}><AlertDialogContent className="wwm-resend-dialog" onCloseAutoFocus={event=>{event.preventDefault();menuTrigger.current?.focus()}}><AlertDialogHeader><AlertDialogTitle>{resendQuestion(count)}</AlertDialogTitle><AlertDialogDescription>{t('resend.body')}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel data-analytics-label={ANALYTICS_ELEMENTS.DIALOG_CANCEL} disabled={sending}>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction data-analytics-label={ANALYTICS_ELEMENTS.CONFIRM_RESEND_SEND} disabled={sending} aria-busy={sending||undefined} onClick={event=>{event.preventDefault();void sendResend()}}>{sending?t('resend.sending'):t('resend.confirm')}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 </header>;
}
