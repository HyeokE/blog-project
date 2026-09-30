'use client';
import {ANALYTICS_ELEMENTS} from '@/constants/analytics';
import {Component,startTransition,type ReactNode} from 'react';
import {useRouter} from 'next/navigation';
import {Button} from '@/components/ui/button';
import './async-region.css';
import {Notice} from './Notice';
import {useWwmCopy} from './i18n/WwmI18nProvider';
import type {MeetingCopy} from './meeting-copy.mjs';
class Boundary extends Component<{children:ReactNode;retry:()=>void;copy:MeetingCopy},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true}}render(){const {t}=this.props.copy;return this.state.failed?<Notice tone="error" className="wwm-section-error" title={t('room.sectionLoadFailed')} action={<Button type="button" variant="outline" data-analytics-label={ANALYTICS_ELEMENTS.RETRY} onClick={()=>{this.setState({failed:false});startTransition(this.props.retry)}}>{t('common.retry')}</Button>}>{t('room.savedDataSafe')} {t('room.loadErrorDetail')}</Notice>:this.props.children}}
export default function ServerSectionBoundary({children}:{children:ReactNode}){const router=useRouter();const copy=useWwmCopy();return <Boundary copy={copy} retry={()=>router.refresh()}>{children}</Boundary>}
