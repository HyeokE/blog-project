import 'server-only';
import pg from 'pg';
import {createHash} from 'node:crypto';
const {Pool}=pg;
let pool:pg.Pool|undefined;
function db(){const connectionString=process.env.WWM_CALENDAR_DATABASE_URL;if(!connectionString)throw Error('Calendar database unavailable');return pool??=new Pool({connectionString,max:3,connectionTimeoutMillis:4000,statement_timeout:5000,application_name:'wwm_calendar'});}
export const stateHash=(state:string)=>createHash('sha256').update(state).digest('hex');
export async function storeCredential(user:string,subject:string,email:string,cipher:string){await db().query('select wwm_calendar_private.store_credential($1,$2,$3,$4)',[user,subject,email,cipher]);}
export async function readCredential(user:string,subject:string){const result=await db().query('select * from wwm_calendar_private.read_credential($1,$2)',[user,subject]);return result.rows[0]??null;}
