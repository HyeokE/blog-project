const formats={en:new Intl.DateTimeFormat('en-US',{month:'short',timeZone:'UTC'}),ko:new Intl.DateTimeFormat('ko-KR',{month:'short',timeZone:'UTC'})};
const yearFormats={ko:new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'short',timeZone:'UTC'})};
/** `Sep` / `9월` on the first column and where the month changes; the year joins it across a year boundary. */
export function monthBoundaryLabel(date,previous,locale='en'){
 if(previous?.slice(0,7)===date.slice(0,7))return '';
 const at=new Date(`${date}T00:00:00Z`),withYear=Boolean(previous&&previous.slice(0,4)!==date.slice(0,4));
 if(locale==='ko')return (withYear?yearFormats.ko:formats.ko).format(at);
 const month=formats.en.format(at);
 return withYear?`${month} ${date.slice(0,4)}`:month;
}
