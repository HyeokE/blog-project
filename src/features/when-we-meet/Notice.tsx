'use client';
import {AlertCircle,AlertTriangle,Clock,Info} from 'lucide-react';
import {Alert,AlertDescription,AlertTitle} from '@/components/ui/alert';
import './notice.css';

export type NoticeTone='pending'|'info'|'warning'|'error';
const icons={pending:Clock,info:Info,warning:AlertTriangle,error:AlertCircle} as const;
/**
 * The one inline notice for When We Meet (shadcn Alert + Craft tokens): icon, optional title, one sentence
 * and an optional next step beside it. Errors are announced (role=alert), pending work is a polite status,
 * warnings/info are static text.
 */
export function Notice({tone,title,children,action,className}:{tone:NoticeTone;title?:React.ReactNode;children?:React.ReactNode;action?:React.ReactNode;className?:string}){
 const Icon=icons[tone];
 return <Alert className={`wwm-notice${className?` ${className}`:''}`} data-tone={tone} data-variant={tone==='error'?'destructive':'default'} variant={tone==='error'?'destructive':'default'} role={tone==='error'?'alert':tone==='pending'?'status':'note'}>
  <Icon aria-hidden="true"/>
  {title&&<AlertTitle>{title}</AlertTitle>}
  {children&&<AlertDescription>{children}</AlertDescription>}
  {action&&<div className="wwm-notice-action">{action}</div>}
 </Alert>;
}
