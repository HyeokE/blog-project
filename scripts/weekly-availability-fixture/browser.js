// Run with: aside repl "$(< scripts/weekly-availability-fixture/browser.js)" (set WEEKLY_QA_URL by replacing URL below)
const url='http://127.0.0.1:57905';
const p=await openTab(url);
try {
 console.log((await snapshot(p,{interactive:true})).tree);
 console.log('ROOT',await p.locator('.wwm-weekly').count());
 await fs.mkdir('./artifacts/weekly-qa',{recursive:true});
 for(const width of [1440,390,375,320]){
  await p.setViewportSize({width,height:width===320?568:width===1440?900:844});
  await p.screenshot({path:`./artifacts/weekly-qa/${width}.png`,fullPage:true});
  console.log('VIEW',width,await p.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,days:document.querySelectorAll('.wwm-week-desktop-day').length,visibleDay:document.querySelector('.wwm-week-mobile-day .wwm-week-date')?.textContent})));
 }
}finally{await closeTab(p)}
