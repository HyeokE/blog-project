'use client';
import {Component,Suspense,type ReactNode} from 'react';
import './async-region.css';
type Props={children:ReactNode;fallback:ReactNode;onRetry:()=>void};
type State={error:Error|null};
class Boundary extends Component<Props,State>{state:State={error:null};static getDerivedStateFromError(error:Error){return {error}};render(){if(this.state.error){return <section className="wwm-card" role="alert"><p>Could not load this section: {this.state.error.message}</p><button type="button" onClick={()=>{this.props.onRetry();this.setState({error:null})}}>Retry</button></section>;}return this.props.children}}
export function CraftAsyncRegion({children,fallback,onRetry}:Props){return <Boundary onRetry={onRetry} fallback={fallback}><Suspense fallback={fallback}>{children}</Suspense></Boundary>}
export function MeetingRowsSkeleton(){return <section className="wwm-card wwm-meetings" role="status" aria-label="Loading meetings"><div className="wwm-skeleton-row"/><div className="wwm-skeleton-row"/></section>}
export function RoomSkeleton(){return <section className="wwm-card wwm-availability" role="status" aria-label="Loading room"><div className="wwm-skeleton-row"/><div className="wwm-skeleton-row"/><div className="wwm-skeleton-row"/></section>}
