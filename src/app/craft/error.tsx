'use client';
import CraftError from '@/components/craft/CraftError';

// Craft route errors stay in English with Craft styling; the blog's app/error.tsx keeps Korean.
export default function CraftErrorPage({reset}:{error:Error&{digest?:string};reset:()=>void}){return <CraftError status="500" onRetry={reset}/>}
