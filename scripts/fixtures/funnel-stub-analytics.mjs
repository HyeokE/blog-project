export const events=[];
export function trackEvent(name,parameters={}){events.push({name,...parameters})}
