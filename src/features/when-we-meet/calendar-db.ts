import 'server-only';
import pg from 'pg';
import {createHash} from 'node:crypto';
import {SUPABASE_ROOT_CA} from './supabase-ca';
import {normalizeCredential} from './normalize.mjs';
const {Pool}=pg;
let pool:pg.Pool|undefined;
// Least-privilege login (wwm_calendar_runtime only); TLS is verified against Supabase's root CA.
function db(){const connectionString=process.env.WWM_CALENDAR_DATABASE_URL;if(!connectionString)throw Error('Calendar database unavailable');return pool??=new Pool({connectionString,ssl:{ca:SUPABASE_ROOT_CA,rejectUnauthorized:true},max:3,connectionTimeoutMillis:4000,statement_timeout:5000,application_name:'wwm_calendar'});}
export const stateHash=(state:string)=>createHash('sha256').update(state).digest('hex');
export async function storeCredential(user:string,subject:string,email:string,cipher:string){await db().query('select wwm_calendar_private.store_credential($1,$2,$3,$4)',[user,subject,email,cipher]);}
export async function readCredential(user:string,subject:string){const result=await db().query('select * from wwm_calendar_private.read_credential($1,$2)',[user,subject]);return normalizeCredential(result.rows[0]);}
export async function finalizeConfirmation(room:string,organizer:string,eventId:string,payloadHash:string,status:'confirmed'|'reconciling'|'released',url:string|null=null){const result=await db().query('select wwm_calendar_private.finalize_confirmation($1,$2,$3,$4,$5,$6) as status',[room,organizer,eventId,payloadHash,status,url]);return result.rows[0]?.status as string;}
export async function finalizeConfirmationUpdate(room:string,organizer:string,eventId:string,revision:number,payloadHash:string,status:'confirmed'|'reconciling'|'reverted',url:string|null=null){const result=await db().query('select wwm_calendar_private.finalize_confirmation_update($1,$2,$3,$4,$5,$6,$7) as status',[room,organizer,eventId,revision,payloadHash,status,url]);return result.rows[0]?.status as string;}
export async function finalizeResend(room:string,organizer:string,eventId:string,status:'sent'|'failed'){const result=await db().query('select wwm_calendar_private.finalize_resend($1,$2,$3,$4) as status',[room,organizer,eventId,status]);return result.rows[0]?.status as string;}
