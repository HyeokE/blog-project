import 'server-only';
import type {User} from '@supabase/supabase-js';
import {readCredential} from './calendar-db';
import {decryptCredential} from './calendar-connection.mjs';
import {calendarClientConfig,refreshAccessToken,GoogleCalendarError} from './calendar-google.mjs';

// Short-lived access token for the signed-in user's own Google Calendar. Never returned to the browser.
export async function calendarAccessToken(user:User){
 const subject=user.identities?.find(identity=>identity.provider==='google')?.id;
 const key=process.env.WWM_CALENDAR_ENCRYPTION_KEY;
 if(!subject||!key)throw new GoogleCalendarError('Calendar unavailable',{reconnect:!subject});
 const row=await readCredential(user.id,subject);
 if(!row)throw new GoogleCalendarError('Calendar not connected',{reconnect:true});
 const {refresh_token}=decryptCredential(row.credentialCiphertext,key,`credential:${user.id}:${subject}`) as {refresh_token:string};
 return refreshAccessToken(refresh_token,calendarClientConfig());
}
