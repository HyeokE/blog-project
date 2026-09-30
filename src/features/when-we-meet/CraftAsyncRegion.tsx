'use client';
import {ANALYTICS_ELEMENTS} from '@/constants/analytics';
import {Component,Suspense,type ReactNode} from 'react';
import {useWwmCopy} from './i18n/WwmI18nProvider';
import type {MeetingCopy} from './meeting-copy.mjs';
import './async-region.css';
type Props={children:ReactNode;fallback:ReactNode;onRetry:()=>void};
type State={error:Error|null};
class Boundary extends Component<Props&{copy:MeetingCopy},State>{state:State={error:null};static getDerivedStateFromError(error:Error){return {error}};render(){const {t}=this.props.copy;if(this.state.error){return <section className="wwm-card" role="alert"><p>{t('room.sectionLoadFailed')}</p><button type="button" data-analytics-label={ANALYTICS_ELEMENTS.RETRY} onClick={()=>{this.props.onRetry();this.setState({error:null})}}>{t('common.retry')}</button></section>;}return this.props.children}}
export function CraftAsyncRegion({children,fallback,onRetry}:Props){const copy=useWwmCopy();return <Boundary copy={copy} onRetry={onRetry} fallback={fallback}><Suspense fallback={fallback}>{children}</Suspense></Boundary>}
export function MeetingRowsSkeleton(){const {t}=useWwmCopy();return <section className="wwm-card wwm-meetings" role="status" aria-label={t('list.loadingShort')}><div className="wwm-skeleton-row"/><div className="wwm-skeleton-row"/></section>}
export function RoomSkeleton(){const {t}=useWwmCopy();return <section className="wwm-card wwm-availability" role="status" aria-label={t('room.loadingMeeting')}><div className="wwm-skeleton-row"/><div className="wwm-skeleton-row"/><div className="wwm-skeleton-row"/></section>}
