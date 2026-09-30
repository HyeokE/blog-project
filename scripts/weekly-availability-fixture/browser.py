# Run in Hermes browser_exec: exec(open('/Users/junhyeok_home/project/blog-project/scripts/weekly-availability-fixture/browser.py').read())
# Start server.mjs first; set WEEKLY_QA_URL to its printed loopback URL.
import os, json, time, shutil, hashlib
from pathlib import Path
url=os.environ.get('WEEKLY_QA_URL','http://127.0.0.1:57905')
out=Path('/Users/junhyeok_home/.hermes/cache/scratch/weekly-qa-evidence');out.mkdir(parents=True,exist_ok=True)
new_tab(url);wait_for_load()
# Browser-use can finish navigation before this fixture's bundle executes; explicitly execute its served bundle if needed.
if not js('!!document.querySelector(".wwm-weekly")'):
 cdp('Runtime.evaluate',expression='fetch("/bundle.js").then(r=>r.text()).then(t=>(0,eval)(t))',awaitPromise=True)
for attempt in range(30):
 if js('!!document.querySelector(".wwm-weekly")'):break
 time.sleep(.2)
assert js('!!document.querySelector(".wwm-weekly")'), 'production WeeklyAvailability did not mount'
results={'fixture':'synthetic; no DB/API/auth/save writes','url':url,'viewports':{},'checks':{}}
for width,height in [(1440,900),(390,844),(375,812),(320,568)]:
 cdp('Emulation.setDeviceMetricsOverride',width=width,height=height,deviceScaleFactor=1,mobile=False)
 time.sleep(.2)
 dims=js('({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,selected:document.querySelector(".wwm-week-picker button[aria-pressed=true]")?.innerText})')
 assert dims['client']==width and dims['scroll']<=width,(width,dims)
 screenshot=Path(capture_screenshot());destination=out/f'{width}.png';shutil.copy2(screenshot,destination)
 results['viewports'][str(width)]={**dims,'image':str(destination),'sha256':hashlib.sha256(destination.read_bytes()).hexdigest()}
cdp('Emulation.setDeviceMetricsOverride',width=390,height=844,deviceScaleFactor=1,mobile=False)
# Select another weekday, then navigate to the second seven-day window.
js('document.querySelectorAll(".wwm-week-picker button")[2].click()')
assert js('document.querySelector(".wwm-week-picker button[aria-pressed=true]")?.innerText').startswith('Wed')
js("document.querySelector('button[aria-label=\"Next week\"]').click()")
assert 'Week 2 of 2' in js('document.querySelector(".wwm-week-nav").innerText')
assert js('document.querySelector(".wwm-week-mobile-day .wwm-week-date").innerText').startswith('2026.11.02')
results['checks']['nextWeek']='14-day draft navigation retained'
# Saved counts do not change when editable own draft changes.
before=js('[...document.querySelectorAll(".wwm-week-mobile-day .wwm-week-count")].map(x=>x.textContent)')
js('document.querySelector(".wwm-week-mobile-day .wwm-week-edit").dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,pointerType:"mouse"}))')
after=js('[...document.querySelectorAll(".wwm-week-mobile-day .wwm-week-count")].map(x=>x.textContent)')
assert before==after,(before,after)
results['checks']['savedCounts']='unchanged after own draft pointerdown'
# Inspect real participant bars and anchored popover on focus and mouse.
bar=js('document.querySelector(".wwm-week-mobile-day .wwm-week-bar")?.outerHTML')
assert bar,'participant bar missing'
js('document.querySelector(".wwm-week-mobile-day .wwm-week-bar").focus()')
time.sleep(.2)
detail=js('({text:document.querySelector(".wwm-week-detail")?.innerText,rect:document.querySelector(".wwm-week-detail")?.getBoundingClientRect().toJSON(),bar:document.querySelector(".wwm-week-mobile-day .wwm-week-bar")?.getBoundingClientRect().toJSON()})')
results['checks']['focusDetail']=detail
results['checks']['focusDetailPass']=bool(detail.get('text') and 'Alex' in detail['text'] and detail.get('rect',{}).get('width',0)>0)
js('document.querySelector(".wwm-week-mobile-day .wwm-week-bar").dispatchEvent(new MouseEvent("mouseenter",{bubbles:true}))')
results['checks']['legend']=js('document.querySelector(".wwm-week-legend").innerText')
js("document.querySelector('button[aria-label=\"Next week\"]').click()") if False else None
# Fall-back repeated 01:00 slots fall on Sunday November 1 in the first fixture week.
js("document.querySelector('button[aria-label=\"Previous week\"]').click()")
js('document.querySelectorAll(".wwm-week-picker button")[6].click()')
labels=js('[...document.querySelectorAll(".wwm-week-mobile-day .wwm-week-times span")].map(x=>x.innerText)')
assert labels.count('01:00\nGMT-4')==1 and labels.count('01:00\nGMT-5')==1,labels
results['checks']['dstLabels']=labels
(out/'result.json').write_text(json.dumps(results,indent=2))
print(json.dumps(results,indent=2))
