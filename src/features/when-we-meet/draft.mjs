const KEY='wwm:create-draft';
const RETURN_KEY='wwm:create-oauth-return';
const COMPLETED_KEY='wwm:create-oauth-completed';
const RETURN_TTL=10*60*1000;
const TTL=24*60*60*1000;
const fields=['title','startDate','endDate','startTime','endTime','timezone'];
export function saveDraft(storage,draft,now=Date.now()){
  try{storage.setItem(KEY,JSON.stringify({version:1,savedAt:now,form:Object.fromEntries(fields.map(k=>[k,draft.form[k]])),name:draft.name}));}catch{ /* Storage may be unavailable. */ }
}
export function readDraft(storage,now=Date.now()){
  try{const value=JSON.parse(storage.getItem(KEY));if(value?.version!==1||!Number.isFinite(value.savedAt)||value.savedAt>now||now-value.savedAt>TTL||typeof value.name!=='string'||!value.form||fields.some(k=>typeof value.form[k]!=='string'))return null;return {form:Object.fromEntries(fields.map(k=>[k,value.form[k]])),name:value.name};}catch{return null;}
}
export function clearDraft(storage){try{storage.removeItem(KEY)}catch{ /* Storage may be unavailable. */ }}
export function markCreateReturn(storage,path,now=Date.now()){try{storage.removeItem(COMPLETED_KEY);storage.setItem(RETURN_KEY,JSON.stringify({version:1,path,savedAt:now}))}catch{ /* Storage may be unavailable. */ }}
function take(storage,key,path,now){
  try{const value=JSON.parse(storage.getItem(key));storage.removeItem(key);return value?.version===1&&value.path===path&&Number.isFinite(value.savedAt)&&value.savedAt<=now&&now-value.savedAt<=RETURN_TTL}catch{try{storage.removeItem(key)}catch{ /* Storage may be unavailable. */ }return false}
}
// Call only after the callback's server-side code exchange resolves successfully.
export function completeCreateReturn(storage,path,now=Date.now()){
  if(!take(storage,RETURN_KEY,path,now))return false;
  try{storage.setItem(COMPLETED_KEY,JSON.stringify({version:1,path,savedAt:now}));return true}catch{return false}
}
export function consumeCreateReturn(storage,path,now=Date.now()){
  // An abandoned login intent is never sufficient to open the dialog.
  const completed=take(storage,COMPLETED_KEY,path,now);
  try{storage.removeItem(RETURN_KEY)}catch{ /* Storage may be unavailable. */ }
  return completed;
}
export function createIntent(valid,signedIn){return !valid?'invalid':signedIn?'create':'login'}
