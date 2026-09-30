const KEY='wwm:invite-oauth-return';
const DONE='wwm:invite-oauth-completed';
const TTL=10*60*1000;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function invitationPath(room,token){return UUID.test(room)&&UUID.test(token)?`/craft/when-we-meet/${room}?invite=${token}`:null}
function validPath(path){if(typeof path!=='string')return false;const match=/^\/craft\/when-we-meet\/([^/?#]+)\?invite=([^&#]+)$/.exec(path);return Boolean(match&&invitationPath(match[1],match[2])===path)}
function take(storage,key,path,now){try{const value=JSON.parse(storage.getItem(key));storage.removeItem(key);return value?.version===1&&value.path===path&&Number.isFinite(value.savedAt)&&value.savedAt<=now&&now-value.savedAt<=TTL}catch{return false}}
export function markInviteReturn(storage,path,now=Date.now()){if(!validPath(path))return false;try{storage.removeItem(DONE);storage.setItem(KEY,JSON.stringify({version:1,path,savedAt:now}));return true}catch{return false}}
export function completeInviteReturn(storage,path,now=Date.now()){if(!validPath(path)||!take(storage,KEY,path,now))return false;try{storage.setItem(DONE,JSON.stringify({version:1,path,savedAt:now}));return true}catch{return false}}
export function consumeInviteReturn(storage,path,now=Date.now()){const completed=validPath(path)&&take(storage,DONE,path,now);if(completed){try{storage.removeItem(KEY)}catch{}}return completed}
export function restoreInviteReturn(storage,roomPath,now=Date.now()){try{const pending=JSON.parse(storage.getItem(KEY));if(pending?.version!==1||!validPath(pending.path)||pending.path.split('?')[0]!==roomPath)return null;return completeInviteReturn(storage,pending.path,now)?pending.path:null}catch{return null}}
export function clearInviteReturn(storage){try{storage.removeItem(KEY);storage.removeItem(DONE)}catch{}}
export function profileName(metadata){for(const key of ['full_name','name']){const value=metadata?.[key];if(typeof value==='string'&&value.trim().length>0&&value.trim().length<=50)return value.trim()}return ''}
