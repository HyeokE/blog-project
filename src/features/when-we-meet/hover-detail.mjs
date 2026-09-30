// Hover is transient; keyboard focus and explicit clicks have separate lifetimes.
export function createHoverDetail(onChange,delay=140){
 let timer=null,active=null,mode='hover';
 const cancel=()=>{if(timer!==null)clearTimeout(timer);timer=null};
 return {
  open(id,nextMode='hover'){cancel();if(active!==id||mode==='hover'||nextMode!=='hover')mode=nextMode;active=id;onChange(id)},
  enter(){cancel()},
  leave(){cancel();if(mode!=='hover')return;const id=active;timer=setTimeout(()=>{timer=null;if(active===id){active=null;onChange(null)}},delay)},
  close(){cancel();active=null;onChange(null)},
  dispose(){cancel();active=null},
 };
}
