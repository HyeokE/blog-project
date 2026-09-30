import {ANALYTICS_EVENTS,ANALYTICS_WWM_FUNNELS,type AnalyticsWwmFlow,type AnalyticsWwmSignal,type AnalyticsWwmStep} from '@/constants/analytics';
import {trackEvent} from '@/utils/analytics';

/**
 * Drop-off tracking for When We Meet. A flow starts at its first step; `wwm_funnel` records each step once with
 * `step_index` and time since the flow began; `wwm_exit` records how the flow ended (`reason`), whether it was
 * completed, and the last step reached, so the funnel shows where people leave. Page hide/unload ends every open
 * flow as `page_hide` (sent by beacon). Params are step names, counts and durations only: never ids, names,
 * titles, emails or time lists.
 */
type Params=Record<string,string|number|boolean>;
type FlowState={startedAt:number;steps:Set<string>;lastStep:string;lastIndex:number;completed:boolean;exitSent:boolean;context?:()=>Params};
const flows=new Map<AnalyticsWwmFlow,FlowState>();
let listening=false;

function order(flow:AnalyticsWwmFlow):readonly string[]{return ANALYTICS_WWM_FUNNELS[flow]}
function elapsed(state:FlowState){return Math.max(0,Date.now()-state.startedAt)}
function context(state:FlowState):Params{try{return state.context?.()??{}}catch{return {}}}
function ensureListeners(){
 if(listening||typeof window==='undefined')return;
 listening=true;
 const leave=()=>{for(const flow of [...flows.keys()])end(flow,'page_hide',{},true)};
 window.addEventListener('pagehide',leave);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')leave()});
}
function begin(flow:AnalyticsWwmFlow){
 let state=flows.get(flow);
 if(!state||state.completed&&state.exitSent){state={startedAt:Date.now(),steps:new Set(),lastStep:'',lastIndex:-1,completed:false,exitSent:false};flows.set(flow,state)}
 ensureListeners();
 return state;
}

/** A step reached. Repeats of the same step in one flow are ignored; a later step re-arms the exit report. */
export function funnelStep<F extends AnalyticsWwmFlow>(flow:F,step:AnalyticsWwmStep<F>,extra:Params={}){
 const state=begin(flow);
 if(state.steps.has(step))return;
 state.steps.add(step);
 const index=order(flow).indexOf(step);
 if(index>state.lastIndex){state.lastStep=step;state.lastIndex=index}
 state.exitSent=false;
 trackEvent(ANALYTICS_EVENTS.WWM_FUNNEL,{flow,step,step_index:index,elapsed_ms:elapsed(state),...extra});
}
/** Like `funnelStep`, but only inside a flow that is already running (never starts one). */
export function funnelStepIfActive<F extends AnalyticsWwmFlow>(flow:F,step:AnalyticsWwmStep<F>,extra:Params={}){if(flows.has(flow))funnelStep(flow,step,extra)}
/** The last step of a flow: marks it completed (a later exit reports completed=true). */
export function funnelComplete<F extends AnalyticsWwmFlow>(flow:F,step:AnalyticsWwmStep<F>,extra:Params={}){
 funnelStep(flow,step,extra);
 const state=flows.get(flow);
 if(state)state.completed=true;
}
/** A side event inside a flow (error, tab view, copy). Never advances the funnel; repeats are reported. */
export function funnelSignal(flow:AnalyticsWwmFlow,signal:AnalyticsWwmSignal,extra:Params={}){
 const state=flows.get(flow);
 trackEvent(ANALYTICS_EVENTS.WWM_FUNNEL,{flow,step:signal,step_index:-1,signal:true,elapsed_ms:state?elapsed(state):0,...extra});
}
/** Supplies a snapshot (counts, flags) attached to this flow's exit report. Pass null to clear. */
export function funnelContext(flow:AnalyticsWwmFlow,read:(()=>Params)|null){
 const state=flows.get(flow);
 if(state)state.context=read??undefined;
}
function end(flow:AnalyticsWwmFlow,reason:string,extra:Params,keep=false){
 const state=flows.get(flow);
 if(!state||state.exitSent||!state.steps.size)return;
 state.exitSent=true;
 trackEvent(ANALYTICS_EVENTS.WWM_EXIT,{flow,reason,completed:state.completed,last_step:state.lastStep,last_step_index:state.lastIndex,steps_reached:state.steps.size,steps_total:order(flow).length,elapsed_ms:elapsed(state),...context(state),...extra,...(reason==='page_hide'||reason==='handoff'?{transport_type:'beacon'}:{})});
 if(!keep)flows.delete(flow);
}
/** The flow ended by a choice or navigation (`dialog_close`, `handoff`, `navigate`, `tab_leave`). No-op if it never started or already exited. */
export function funnelEnd(flow:AnalyticsWwmFlow,reason:string,extra:Params={}){end(flow,reason,extra)}
/** Forget a flow without reporting (for example after a sign-in redirect that will resume it). */
export function funnelReset(flow:AnalyticsWwmFlow){flows.delete(flow)}
/** Test hook: clears all state. */
export function resetFunnelsForTest(){flows.clear()}
