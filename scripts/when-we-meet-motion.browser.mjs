// Browser-frame regression for the shared Popover, including interruption and focus.
const p=await openTab('https://macmini-home.taile6a871.ts.net:8446/craft/when-we-meet');
// No cookie changes: names come from the When We Meet dictionaries (WWM_DICT, injected by the test) in the language the page rendered.
const pageLang=(await p.evaluate('document.documentElement.lang'))==='ko'?'ko':'en';
const T=key=>key.split('.').reduce((node,part)=>node[part],WWM_DICT[pageLang]);
try {
 const failures=[];
 const initial=(await snapshot(p,{interactive:true})).tree;
 const entryNames=[T('list.newMeeting'),'Create a room'];
 const visible=[];
 for(const name of entryNames){const matches=p.getByRole('button',{name,exact:true});for(let i=0;i<await matches.count();i++)if(await matches.nth(i).isVisible())visible.push({name,element:matches.nth(i)})}
 if(visible.length!==1)throw new Error(`Expected exactly one visible creation CTA, found ${visible.map(x=>x.name).join(', ') || 'none'}; snapshot: ${initial}`);
 await visible[0].element.click();
 const trigger=p.locator('#wwm-range-trigger');
 await sleep(350);
 const frames=[];
 for(let cycle=0;cycle<3;cycle++){
  await trigger.click();await sleep(50);
  const trace=await p.evaluate(async()=>{const out=[];const started=performance.now();await new Promise(resolve=>{function sample(){const el=document.querySelector('.wwm-range-popover');out.push({t:Math.round(performance.now()-started),height:el?.getBoundingClientRect().height??null,opacity:el?Number(getComputedStyle(el).opacity):null,expanded:document.querySelector('.wwm-range>.wwm-picker-trigger')?.getAttribute('aria-expanded')});if(performance.now()-started<240)requestAnimationFrame(sample);else resolve()}requestAnimationFrame(sample)});return out});
  frames.push(trace);
  if(!trace.some(x=>x.height>0))failures.push(`cycle ${cycle}: popup absent`);
  if(trace.some((x,i)=>i&&x.opacity!==null&&trace[i-1].opacity!==null&&x.opacity<trace[i-1].opacity-.15))failures.push(`cycle ${cycle}: opening opacity flash`);
  await p.keyboard.press('Escape');await sleep(220);
  if(await trigger.getAttribute('aria-expanded')!=='false')failures.push(`cycle ${cycle}: escape did not close`);
  if(!await trigger.evaluate(el=>document.activeElement===el))failures.push(`cycle ${cycle}: trigger focus lost`);
 }
 await trigger.click();
 await p.getByRole('button',{name:DAY_PICKER[pageLang].next}).click();
 const next=await p.locator('.wwm-range-calendar').innerText();
 await p.getByRole('button',{name:DAY_PICKER[pageLang].previous}).click();
 if(next===await p.locator('.wwm-range-calendar').innerText())failures.push('month navigation stalled');
 await p.getByRole('textbox',{name:T('create.titleLabel')}).fill('Motion regression draft');
 await p.keyboard.press('Escape');await trigger.click();
 if(await p.getByRole('textbox',{name:T('create.titleLabel')}).inputValue()!=='Motion regression draft')failures.push('draft lost');
 console.log('MOTION_RESULT '+JSON.stringify({cycles:3,entry:visible[0].name,frameCounts:frames.map(x=>x.length),frames,failures}));
} finally {await closeTab(p)}
