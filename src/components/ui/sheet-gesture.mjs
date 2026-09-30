// Pure detent logic for the mobile bottom sheet's grab-bar drag.
// dy: pointer travel in px (down positive); velocity: px/ms at release.
const DISTANCE=64,FLICK=.5;

export function releaseSheet({dy,velocity,expanded,height=Infinity}){
 const down=dy>DISTANCE||velocity>FLICK,up=dy<-DISTANCE||velocity<-FLICK;
 if(expanded){
  if(dy>Math.min(height*.6,360))return 'close';
  return down?'collapse':'stay';
 }
 if(down)return 'close';
 return up?'expand':'stay';
}

// Downward travel moves the sheet; upward travel grows it toward the large detent,
// then resists (rubber band) instead of detaching from the bottom edge.
export function sheetDragFrame({dy,startHeight,maxHeight}){
 if(dy>=0)return {translate:dy,height:startHeight};
 const wanted=startHeight-dy;
 if(wanted<=maxHeight)return {translate:0,height:wanted};
 const over=wanted-maxHeight;
 return {translate:0,height:maxHeight+over*48/(over+48)};
}
