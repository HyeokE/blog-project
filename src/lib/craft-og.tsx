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
 return new ImageResponse(
  <div style={{width:'100%',height:'100%',display:'flex',background:PALETTE.canvas,color:PALETTE.ink,fontFamily:'SUIT',padding:'72px 80px'}}>
   <div style={{display:'flex',flexDirection:'column',justifyContent:'space-between',flex:1,minWidth:0}}>
    <div style={{display:'flex',fontSize:30,fontWeight:800,letterSpacing:1,color:PALETTE.muted}}>{eyebrow}</div>
    <div style={{display:'flex',flexDirection:'column',gap:22}}>
     <div style={{display:'flex',fontSize:motif?104:132,fontWeight:800,lineHeight:1.04,letterSpacing:-2}}>{title}</div>
     <div style={{display:'flex',flexDirection:'column',gap:8}}>{lines.map(line=><div key={line} style={{display:'flex',fontSize:motif?32:36,color:PALETTE.muted,lineHeight:1.3}}>{line}</div>)}</div>
    </div>
    <div style={{display:'flex',width:96,height:6,background:PALETTE.accent}}/>
   </div>
   {motif&&<div style={{display:'flex',flexDirection:'column',justifyContent:'center',marginLeft:56}}>
    <div style={{display:'flex',flexWrap:'wrap',width:7*62+6*10+2*28+4,gap:10,padding:28,background:PALETTE.surface,border:`2px solid ${PALETTE.rule}`,borderRadius:8}}>
     {GRID.map((cell,index)=><div key={index} style={{display:'flex',width:62,height:62,borderRadius:4,background:cell===2?PALETTE.accent:cell===1?PALETTE.accentSoft:'transparent',border:cell?'none':`2px solid ${PALETTE.rule}`}}/>)}
    </div>
   </div>}
  </div>,
  {width:1200,height:630,fonts:[{name:'SUIT',data:regular,weight:400,style:'normal'},{name:'SUIT',data:bold,weight:800,style:'normal'}]},
 );
}
