export function createHoverDetail(onChange:(id:string|null)=>void,delay?:number):{open(id:string,mode?:'hover'|'focus'|'pinned'):void;enter():void;leave():void;close():void;dispose():void};
