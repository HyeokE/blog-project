import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {ImageResponse} from 'next/og';

/** Craft share cards (1200x630): the light Craft palette, SUIT for Latin and Hangul, a quiet calendar motif. */
const PALETTE={canvas:'#eae6d8',surface:'#f1eee2',ink:'#514e40',muted:'#635f52',rule:'#cfc7ae',accent:'#a46e42',accentSoft:'#e0c9ad'};
// 7 days x 5 weeks; 1 = a free slot, 2 = the chosen time.
const GRID=[0,1,1,0,1,0,0, 1,1,2,2,1,0,0, 0,1,2,2,1,1,0, 1,0,1,1,0,0,0, 0,1,1,0,1,0,0];
const fonts=()=>Promise.all(['SUIT-Regular.ttf','SUIT-ExtraBold.ttf'].map(file=>readFile(path.join(process.cwd(),'public','fonts',file))));

export async function craftOgImage({eyebrow,title,lines,motif}:{eyebrow:string;title:string;lines:string[];motif?:boolean}){
 const [regular,bold]=await fonts();
 const cell=40,gap=6,pad=20;
 return new ImageResponse(
  <div style={{width:'100%',height:'100%',display:'flex',position:'relative',background:PALETTE.canvas,color:PALETTE.ink,fontFamily:'SUIT',padding:'72px 80px'}}>
   <div style={{display:'flex',flexDirection:'column',justifyContent:motif?'flex-start':'space-between',flex:1,minWidth:0}}>
    <div style={{display:'flex',fontSize:30,fontWeight:800,letterSpacing:1,color:PALETTE.muted}}>{eyebrow}</div>
    <div style={{display:'flex',flexDirection:'column',gap:22,marginTop:motif?44:0}}>
     {/* One line: the title is never broken. */}
     <div style={{display:'flex',fontSize:motif?112:132,fontWeight:800,lineHeight:1.04,letterSpacing:-2,whiteSpace:'nowrap'}}>{title}</div>
     <div style={{display:'flex',flexDirection:'column',gap:8}}>{lines.map(line=><div key={line} style={{display:'flex',fontSize:motif?30:36,color:PALETTE.muted,lineHeight:1.3}}>{line}</div>)}</div>
    </div>
    {!motif&&<div style={{display:'flex',width:96,height:6,background:PALETTE.accent}}/>}
   </div>
   {motif&&<div style={{display:'flex',position:'absolute',left:80,bottom:72,width:96,height:6,background:PALETTE.accent}}/>}
   {motif&&<div style={{display:'flex',position:'absolute',right:80,bottom:72,flexWrap:'wrap',width:7*cell+6*gap+2*pad+4,gap,padding:pad,background:PALETTE.surface,border:`2px solid ${PALETTE.rule}`,borderRadius:8}}>
    {GRID.map((state,index)=><div key={index} style={{display:'flex',width:cell,height:cell,borderRadius:4,background:state===2?PALETTE.accent:state===1?PALETTE.accentSoft:'transparent',border:state?'none':`2px solid ${PALETTE.rule}`}}/>)}
   </div>}
  </div>,
  {width:1200,height:630,fonts:[{name:'SUIT',data:regular,weight:400,style:'normal'},{name:'SUIT',data:bold,weight:800,style:'normal'}]},
 );
}
