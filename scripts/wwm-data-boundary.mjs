import ts from 'typescript';
// Exact DB translation modules, not filename patterns or whole feature exclusions.
const adapterModules=new Set([
 'src/features/when-we-meet/normalize.mjs',
 'src/features/when-we-meet/normalize.d.mts',
 'src/features/when-we-meet/date-normalize.mjs',
 'src/features/when-we-meet/date-confirmation-persistence.mjs',
]);
const runtimePath='src/features/when-we-meet/date-confirmation-runtime.ts';
// Test-only scanner: SQL-facing query builders retain their existing exemptions.
const columns=/\b(owner_id|start_date|end_date|start_time|end_time|invite_token|user_id|display_name|updated_at|created_at|participant_count|is_admin|has_availability|starts_at|ends_at|google_event_url|credential_ciphertext|google_email|google_subject)\b/;
export function dataBoundaryLeaks(path,source){
 if(adapterModules.has(path)){return [];}
 if(path===runtimePath){
  const parsed=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  // Fail closed on malformed source. Only a unique top-level declaration qualifies.
  const members=parsed.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='memberStatus');
  if(parsed.parseDiagnostics.length===0&&members.length===1&&members[0].body){
   const body=members[0].body,start=body.getStart(parsed),end=body.end;
   source=source.slice(0,start)+source.slice(start,end).replace(/[^\r\n]/g,' ')+source.slice(end);
  }
 }
 const scanned=source.replace(/\.(select|eq|order)\('[^']*'/g,'').replace(/\.update\(\{[^}]*\}\)/g,'');
 return scanned.split('\n').flatMap((line,index)=>columns.test(line)?[`${path}:${index+1}`]:[]);
}
