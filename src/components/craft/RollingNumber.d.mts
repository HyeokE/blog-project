declare module './RollingNumber.mjs' {
  import type { ComponentType } from 'react';
  export const RollingNumber: ComponentType<{value:number;locale?:string;className?:string;duration?:number}>;
}
export {};
