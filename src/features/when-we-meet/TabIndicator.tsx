'use client';
import {useLayoutEffect,useRef} from 'react';
/** Underline that slides horizontally to the active tab; transitions only after the first placement. */
export function TabIndicator({value}:{value:string}){
  const ref=useRef<HTMLSpanElement>(null);
  useLayoutEffect(()=>{
    const bar=ref.current,list=bar?.parentElement;
    if(!bar||!list){return;}
    const place=()=>{
      const active=list.querySelector<HTMLElement>('[role="tab"][data-state="active"]');
      if(!active){return;}
      bar.style.width=`${active.offsetWidth}px`;bar.style.transform=`translateX(${active.offsetLeft}px)`;bar.dataset.ready='true';
    };
    place();
    const frame=requestAnimationFrame(()=>{bar.dataset.animate='true'});
    const observer=new ResizeObserver(place);observer.observe(list);
    return()=>{cancelAnimationFrame(frame);observer.disconnect()};
  },[value]);
  return <span ref={ref} className="wwm-tab-indicator" aria-hidden="true"/>;
}
