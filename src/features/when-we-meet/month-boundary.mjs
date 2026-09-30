const monthFormat=new Intl.DateTimeFormat('en-US',{month:'short',timeZone:'UTC'});
export function monthBoundaryLabel(date,previous){
 if(previous?.slice(0,7)===date.slice(0,7))return '';
 const month=monthFormat.format(new Date(`${date}T00:00:00Z`));
 return previous&&previous.slice(0,4)!==date.slice(0,4)?`${month} ${date.slice(0,4)}`:month;
}
