'use client';
import {ANALYTICS_ELEMENTS,ANALYTICS_SECTIONS} from '@/constants/analytics';
import {Component,startTransition,type ReactNode} from 'react';
import {useRouter} from 'next/navigation';
class Boundary extends Component<{children:ReactNode;retry:()=>void},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true}}render(){return this.state.failed?<section className="wwm-card" role="alert"><p>Could not load this section.</p><button type="button" data-analytics-label={ANALYTICS_ELEMENTS.RETRY} onClick={()=>{this.setState({failed:false});startTransition(this.props.retry)}}>Retry</button></section>:this.props.children}}
export default function ServerSectionBoundary({children}:{children:ReactNode}){const router=useRouter();return <Boundary retry={()=>router.refresh()}>{children}</Boundary>}
