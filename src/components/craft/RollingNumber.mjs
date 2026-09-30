'use client';
import React from 'react';
import {formatRollingValue,normalizeRollingValue} from './rolling-number.mjs';

/** Stable baseline and one accessible count; no vertical digit motion. */
export function RollingNumber({value,locale='ko-KR',className=''}){
 const formatted=formatRollingValue(normalizeRollingValue(value),locale);
 return React.createElement('span',{className:`craft-rolling ${className}`.trim()},
  React.createElement('span',{className:'craft-sr-only'},formatted),
  React.createElement('span',{'aria-hidden':'true',className:'craft-rolling-visual'},formatted));
}
