// Everyone-only layout; editable availability keeps its existing independent gutter.
export function everyoneDayWidth(blocks,compact=false){
 const lanes=Math.max(1,...blocks.map(block=>block.lanes));
 return Math.max(120,lanes*(compact?16:72)+8);
}
export function eventGeometry(block,compact=false){
 return compact
  ? {left:block.lane*16,width:12}
  : {left:`calc(${block.lane/block.lanes*100}% + 2px)`,width:`calc(${100/block.lanes}% - 4px)`};
}
