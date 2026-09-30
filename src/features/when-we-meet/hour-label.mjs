export function hourLabel(time){
 if(!/^\d{2}:00$/.test(time))return '';
 const hour=Number(time.slice(0,2));
 return `${hour%12||12} ${hour<12?'AM':'PM'}`;
}
