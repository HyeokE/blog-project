'use client';
import {ANALYTICS_ELEMENTS,ANALYTICS_SECTIONS} from '@/constants/analytics';
import {Component,startTransition,type ReactNode} from 'react';
import {useRouter} from 'next/navigation';
import {Button} from '@/components/ui/button';
import './async-region.css';
import {Notice} from './Notice';
import {MEETING_COPY} from './meeting-copy.mjs';
class Boundary extends Component<{children:ReactNode;retry:()=>void},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true}}render(){return this.state.failed?<Notice tone="error" className="wwm-section-error" title="Couldn’t load this part of the page" action={<Button type="button" variant="outline" data-analytics-label={ANALYTICS_ELEMENTS.RETRY} onClick={()=>{this.setState({failed:false});startTransition(this.props.retry)}}>Retry</Button>}>Your saved data is safe. {MEETING_COPY.loadErrorDetail}</Notice>:this.props.children}}
export default function ServerSectionBoundary({children}:{children:ReactNode}){const router=useRouter();return <Boundary retry={()=>router.refresh()}>{children}</Boundary>}
