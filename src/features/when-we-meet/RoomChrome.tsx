'use client';
import {useEffect,useRef,useState} from 'react';
import {Link2,MoreHorizontal} from 'lucide-react';
import {toast} from 'sonner';
import {ANALYTICS_ELEMENTS} from '@/constants/analytics';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Dialog,DialogContent,DialogDescription,DialogFooter,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuTrigger} from '@/components/ui/dropdown-menu';
import {compactRange,confirmedLine,MEETING_TOASTS,resendQuestion} from './meeting-copy.mjs';
import {resendFailure,type ConfirmationRecordData} from './confirm-tab.mjs';
import './room-chrome.css';

const COPIED_MS=2000;

/** Read-only invitation link with an inline Copy that flips to "Copied" for two seconds. On failure the link is selected for manual copy. */
export function LinkField({value,autoSelect=false}:{value:string;autoSelect?:boolean}){
 const [copied,setCopied]=useState(false);
 const input=useRef<HTMLInputElement>(null),timer=useRef(0);
 useEffect(()=>()=>window.clearTimeout(timer.current),[]);
 useEffect(()=>{if(autoSelect)requestAnimationFrame(()=>input.current?.select())},[autoSelect]);
 async function copy(){
  try{await navigator.clipboard.writeText(value);setCopied(true);window.clearTimeout(timer.current);timer.current=window.setTimeout(()=>setCopied(false),COPIED_MS)}
  catch{input.current?.focus();input.current?.select();toast.error(MEETING_TOASTS.copyFailed)}
 }
 return <div className="wwm-link-field"><Input ref={input} aria-label="Invitation link" data-analytics-label={ANALYTICS_ELEMENTS.INVITE_LINK_INPUT} readOnly value={value} onFocus={event=>event.target.select()}/><Button type="button" variant="ghost" size="sm" className="wwm-link-copy" data-analytics-label={ANALYTICS_ELEMENTS.INVITE_LINK_COPY} data-analytics-id="inline" onClick={()=>void copy()}><span aria-live="polite">{copied?'Copied':'Copy'}</span></Button></div>;
}

/** Copies a link; resolves false when the clipboard refused (callers then show the link selected). */
export async function copyLink(link:string){try{await navigator.clipboard.writeText(link);toast.success(MEETING_TOASTS.linkCopied);return true}catch{return false}}

export type CreatedMeeting={id:string;title:string;link:string;summary:string};
/** The one success moment after creating a meeting: name, window, link and the way in. No toast. */
export function CreatedMeetingDialog({meeting,onOpenMeeting,onClose,onCloseAutoFocus}:{meeting:CreatedMeeting|null;onOpenMeeting:(id:string)=>void;onClose:()=>void;onCloseAutoFocus:(event:Event)=>void}){
 const [failed,setFailed]=useState(false);
 useEffect(()=>{setFailed(false)},[meeting?.id]);
 return <Dialog open={Boolean(meeting)} onOpenChange={open=>{if(!open)onClose()}}>
  <DialogContent className="wwm-ready-dialog" onCloseAutoFocus={onCloseAutoFocus}>
   {meeting&&<><DialogHeader><DialogTitle><span className="wwm-ready-name">{meeting.title}</span> is ready</DialogTitle><DialogDescription>{meeting.summary}</DialogDescription></DialogHeader>
   <LinkField value={meeting.link} autoSelect={failed}/>
   <DialogFooter className="wwm-ready-footer"><Button type="button" data-analytics-label={ANALYTICS_ELEMENTS.MEETING_OPEN} onClick={()=>onOpenMeeting(meeting.id)}>Open meeting</Button></DialogFooter></>}
  </DialogContent>
 </Dialog>;
}

/** Fallback when the clipboard is unavailable: the link, selected, with its own Copy. */
export function InviteLinkDialog({link,onClose,onCloseAutoFocus}:{link:string;onClose:()=>void;onCloseAutoFocus:(event:Event)=>void}){
 return <Dialog open={Boolean(link)} onOpenChange={open=>{if(!open)onClose()}}><DialogContent className="wwm-ready-dialog" onCloseAutoFocus={onCloseAutoFocus}><DialogHeader><DialogTitle>Invite people</DialogTitle><DialogDescription>Anyone with this link can join with Google.</DialogDescription></DialogHeader>{link&&<LinkField value={link} autoSelect/>}<DialogFooter className="wwm-ready-footer"><Button type="button" variant="outline" data-analytics-label={ANALYTICS_ELEMENTS.DIALOG_DONE} onClick={onClose}>Done</Button></DialogFooter></DialogContent></Dialog>;
}

type HeaderProps={
 title:string;startDate:string;endDate:string;timezone:string;
 confirmation:ConfirmationRecordData|null;offline:boolean;
 settingsDisabled:boolean;menuTrigger:React.RefObject<HTMLButtonElement|null>;
 onInvite:()=>void;onSettings:()=>void;
 /** Owner of a confirmed meeting only. */
 resend?:{recipientCount:()=>Promise<number|undefined>;send:()=>Promise<unknown>};
};
/** Room identity: title, one meta line (dates · timezone, the only timezone in the view), confirmed status, Invite and a ⋯ menu. */
export function RoomHeader({title,startDate,endDate,timezone,confirmation,offline,settingsDisabled,menuTrigger,onInvite,onSettings,resend}:HeaderProps){
 const [asking,setAsking]=useState(false),[count,setCount]=useState<number|undefined>(),[sending,setSending]=useState(false);
 const confirmed=confirmation?.status==='confirmed';
 function askResend(){setCount(undefined);setAsking(true);void resend?.recipientCount().then(setCount,()=>setCount(undefined))}
 async function sendResend(){
  if(!resend||sending)return;
  setSending(true);
  try{await resend.send();setAsking(false);toast.success(MEETING_TOASTS.resent)}
  catch(error){setAsking(false);toast.error(resendFailure(error).error)}
  finally{setSending(false)}
 }
 return <header className="wwm-room-header">
  <div className="wwm-room-title-row"><h1>{title}</h1>
   <div className="wwm-header-actions">
    <Button type="button" variant="outline" data-analytics-label={ANALYTICS_ELEMENTS.INVITE_LINK_COPY} onClick={onInvite}><Link2 aria-hidden="true"/>Invite</Button>
    <DropdownMenu modal={false}><DropdownMenuTrigger asChild><Button ref={menuTrigger} type="button" variant="ghost" size="icon" className="wwm-room-menu-trigger" aria-label="Meeting options" data-analytics-label={ANALYTICS_ELEMENTS.MEETING_MENU}><MoreHorizontal aria-hidden="true"/></Button></DropdownMenuTrigger>
     <DropdownMenuContent align="end" className="wwm-room-menu">
      <DropdownMenuItem disabled={settingsDisabled} data-analytics-label={ANALYTICS_ELEMENTS.MEETING_SETTINGS} onSelect={onSettings}>Settings</DropdownMenuItem>
      {resend&&confirmed&&<DropdownMenuItem data-analytics-label={ANALYTICS_ELEMENTS.CONFIRM_RESEND} onSelect={askResend}>Resend invitations…</DropdownMenuItem>}
     </DropdownMenuContent>
    </DropdownMenu>
   </div>
  </div>
  <p className="wwm-room-meta">{compactRange(startDate,endDate)}<span aria-hidden="true"> · </span>{timezone}{offline&&<span className="wwm-offline" role="status"><i aria-hidden="true"/>Offline</span>}</p>
  {confirmed&&confirmation&&<p className="wwm-room-status"><span>{confirmedLine(confirmation)}</span>{confirmation.googleEventUrl&&<a href={confirmation.googleEventUrl} target="_blank" rel="noopener noreferrer" data-analytics-label={ANALYTICS_ELEMENTS.CONFIRM_EVENT_LINK}>View event</a>}</p>}
  <Dialog open={asking} onOpenChange={open=>{if(!sending)setAsking(open)}}><DialogContent className="wwm-resend-dialog" showCloseButton={!sending} onCloseAutoFocus={event=>{event.preventDefault();menuTrigger.current?.focus()}}><DialogHeader><DialogTitle>{resendQuestion(count)}</DialogTitle><DialogDescription>Google Calendar sends the same invitation again.</DialogDescription></DialogHeader><DialogFooter><Button type="button" variant="outline" data-analytics-label={ANALYTICS_ELEMENTS.DIALOG_CANCEL} disabled={sending} onClick={()=>setAsking(false)}>Cancel</Button><Button type="button" data-analytics-label={ANALYTICS_ELEMENTS.CONFIRM_RESEND_SEND} disabled={sending} aria-busy={sending||undefined} onClick={()=>void sendResend()}>{sending?'Resending…':'Resend'}</Button></DialogFooter></DialogContent></Dialog>
 </header>;
}
