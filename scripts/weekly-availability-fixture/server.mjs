import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const dir=dirname(fileURLToPath(import.meta.url)),root=resolve(dir,'../..'),require=createRequire(import.meta.url);
const webpack=require('next/dist/compiled/webpack/webpack').webpack;
const scratch=join(process.env.HOME,'.hermes/cache/scratch');
const output=await mkdtemp(join(scratch,'weekly-qa-'));
const source=await Promise.all(['src/features/when-we-meet/WeeklyAvailability.tsx','src/features/when-we-meet/weekly-availability.css','scripts/weekly-availability-fixture/entry.tsx'].map(async p=>[p,createHash('sha256').update(await readFile(resolve(root,p))).digest('hex')]));
const config={mode:'development',devtool:false,context:root,entry:resolve(dir,'entry.tsx'),output:{path:output,filename:'bundle.js'},resolve:{extensions:['.tsx','.ts','.mjs','.js'],alias:{'@':resolve(root,'src'),'cn':resolve(dir,'classnames.mjs')}},module:{rules:[{test:/\.tsx?$/,use:resolve(dir,'ts-loader.cjs')},{test:/\.css$/,use:resolve(dir,'css-loader.cjs')}]}};
try{
 await new Promise((ok,fail)=>webpack(config,(error,stats)=>error||stats.hasErrors()?fail(new Error(error?.message||stats.toString({all:false,errors:true}))):ok()));
 const css=Buffer.concat(await Promise.all(['weekly-availability.css','week-calendar.css'].map(name=>readFile(resolve(root,'src/features/when-we-meet',name)))));
 const bundle=await readFile(join(output,'bundle.js'));
 const server=createServer((req,res)=>{if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle)}else if(req.url==='/style.css'){res.setHeader('Content-Type','text/css');res.end(css)}else{res.setHeader('Content-Type','text/html');res.end('<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><title>Synthetic weekly QA</title><link rel="stylesheet" href="/style.css"><div id="root"></div><script src="/bundle.js"></script>')}});
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const manifest=join(scratch,'weekly-qa-server.json');
 const metadata={url:`http://127.0.0.1:${server.address().port}`,source,output};
 await writeFile(manifest,JSON.stringify(metadata));
 console.log(JSON.stringify(metadata));
 const stop=()=>server.close(()=>Promise.all([rm(output,{recursive:true,force:true}),rm(manifest,{force:true})]).then(()=>process.exit(0)));
 process.on('SIGTERM',stop);process.on('SIGINT',stop);
}catch(error){await rm(output,{recursive:true,force:true});console.error(error);process.exitCode=1}
