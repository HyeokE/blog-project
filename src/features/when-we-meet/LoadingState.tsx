import './loading-state.css';

/** Indeterminate progress: no simulated percentage or timer-based completion. */
export function LoadingState({label,description}:{label:string;description?:string}){
 return <div className="wwm-loading-state" role="status" aria-live="polite">
  <div className="wwm-loading-calendar" aria-hidden="true">{Array.from({length:9},(_,index)=><span key={index} style={{animationDelay:`${index*90}ms`}}/>)}</div>
  <div className="wwm-loading-copy"><strong>{label}</strong>{description&&<p>{description}</p>}</div>
 </div>;
}
