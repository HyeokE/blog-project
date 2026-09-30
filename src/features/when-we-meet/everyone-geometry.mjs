// Everyone-only layout; editable availability keeps its existing independent gutter.
export function everyoneDayWidth(blocks,compact=false){
 const lanes=Math.max(1,...blocks.map(block=>block.lanes));
 return Math.max(120,lanes*(compact?16:72)+8);
}
/** `fit`: the column has a fixed width (phone day pager), so compact rails that would not fit at a 16px pitch
 * share the column proportionally instead of spilling into the next day. */
export function eventGeometry(block,compact=false,fit=false){
 if(compact&&fit&&block.lanes>5)return {left:`calc(${block.lane/block.lanes*100}% + 1px)`,width:`max(2px, calc(${100/block.lanes}% - 2px))`};
 return compact
  ? {left:block.lane*16,width:12}
  : {left:`calc(${block.lane/block.lanes*100}% + 2px)`,width:`calc(${100/block.lanes}% - 4px)`};
}
