'use client';
import {ANALYTICS_ELEMENTS,ANALYTICS_SECTIONS} from '@/constants/analytics';
import {Component,startTransition,type ReactNode} from 'react';
import {useRouter} from 'next/navigation';
import {AlertCircle} from 'lucide-react';
import {Button} from '@/components/ui/button';
import './async-region.css';
class Boundary extends Component<{children:ReactNode;retry:()=>void},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true}}render(){return this.state.failed?<section className="wwm-card wwm-section-error" role="alert"><AlertCircle aria-hidden="true"/><div><p><strong>Couldn’t load this part of the page.</strong> Your saved data is safe.</p><Button type="button" variant="outline" data-analytics-label={ANALYTICS_ELEMENTS.RETRY} onClick={()=>{this.setState({failed:false});startTransition(this.props.retry)}}>Retry</Button></div></section>:this.props.children}}
export default function ServerSectionBoundary({children}:{children:ReactNode}){const router=useRouter();return <Boundary retry={()=>router.refresh()}>{children}</Boundary>}
