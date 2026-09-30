const p=await openTab('https://macmini-home.taile6a871.ts.net:8446/craft/when-we-meet');
try {
 const failures=[];
 const check=(condition,message)=>{if(!condition)failures.push(message)};
 const initial=(await snapshot(p,{interactive:true})).tree;
 console.log(initial);
 const visible=[];
 for(const label of ['New meeting','Create a room']){const matches=p.getByRole('button',{name:label,exact:true});for(let i=0;i<await matches.count();i++)if(await matches.nth(i).isVisible())visible.push({label,element:matches.nth(i)})}
 if(visible.length!==1)throw new Error(`Expected exactly one visible creation CTA, found ${visible.map(x=>x.label).join(', ') || 'none'}; snapshot: ${initial}`);
 const entry=visible[0].element;
 await entry.click();
 const title=p.getByRole('textbox',{name:'What are we planning?'});
 const name=p.getByRole('textbox',{name:'Your name'});
 // The range trigger's visible copy is still being iterated; its id is the stable contract (also used by create() focus routing).
 const dates=p.locator('#wwm-range-trigger');
 check(!(await dates.locator('#wwm-range-value').innerText()).includes('Choose dates — Choose dates'),'duplicate empty date label');
 await title.fill('Keyboard regression draft');await name.fill('Keyboard QA');
 // Radix popover/dialog open and close are animated; wait for settled state before asserting focus.
 await dates.click();await sleep(350);check(await dates.getAttribute('aria-expanded')==='true','date picker did not open');await p.getByRole('button',{name:'Go to the Next Month'}).focus();await p.keyboard.press('Escape');await sleep(350);
 check(await p.getByRole('dialog').count()===1,'first Escape dismissed modal');
 check(await dates.getAttribute('aria-expanded')==='false','first Escape did not dismiss picker');
 check(await dates.evaluate(el=>document.activeElement===el),'first Escape did not focus date trigger');
 await p.keyboard.press('Escape');await sleep(350);
 check(await p.getByRole('dialog').count()===0,'second Escape did not dismiss modal');
 const afterEscape=await p.evaluate(()=>({tag:document.activeElement?.tagName, label:document.activeElement?.getAttribute('aria-label'),text:document.activeElement?.textContent?.trim().slice(0,80)}));
 check(await entry.evaluate(el=>document.activeElement===el),`second Escape did not restore CTA focus: ${JSON.stringify(afterEscape)}`);
 await entry.click();await sleep(350);
 check(await title.inputValue()==='Keyboard regression draft','title draft lost');
 check(await name.inputValue()==='Keyboard QA','name draft lost');
 check(await p.evaluate(()=>{const active=document.activeElement,dialog=active?.closest('.wwm-create-dialog');return active?.getAttribute('data-slot')==='dialog-title'&&dialog?.getAttribute('aria-labelledby')===active.id}),'reopen did not focus the labelling heading');
 check(await title.evaluate(el=>el.selectionStart!==0||el.selectionEnd!==el.value.length),'reopen selected title text');
 await p.getByRole('button',{name:'Cancel',exact:true}).click();await sleep(350);
 const afterCancel=await p.evaluate(()=>({tag:document.activeElement?.tagName,label:document.activeElement?.getAttribute('aria-label'),text:document.activeElement?.textContent?.trim().slice(0,80)}));
 check(await entry.evaluate(el=>document.activeElement===el),`Cancel did not restore CTA focus: ${JSON.stringify(afterCancel)}`);
 console.log('DIALOG_KEYBOARD_RESULT '+JSON.stringify({entry:visible[0].label,afterEscape,afterCancel,failures}));
} finally {await closeTab(p)}
