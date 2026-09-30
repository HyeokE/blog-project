'use client';
import {Toaster as Sonner} from 'sonner';

export function Toaster(){return <Sonner position="top-right" closeButton richColors={false} toastOptions={{className:'craft-toast',duration:3500}}/>}
