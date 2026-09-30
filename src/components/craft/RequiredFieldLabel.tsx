'use client';
import {Label} from '@/components/ui/label';
import type {ComponentProps} from 'react';

export function RequiredFieldLabel({required=false,children,htmlFor,className,...props}:ComponentProps<typeof Label>&{required?:boolean}){
 return <Label htmlFor={htmlFor} id={htmlFor?`${htmlFor}-label`:undefined} className={`craft-field-label${className?` ${className}`:''}`} {...props}><span className="craft-field-label-text">{children}{required&&<span className="craft-required-dot" aria-hidden="true"/>}</span></Label>;
}
