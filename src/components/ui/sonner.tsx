'use client';
import {Toaster as Sonner} from 'sonner';

/**
 * One Craft toast: bottom-right on desktop, bottom-centre full width on phones (sonner's own ≤600px layout),
 * icon + one sentence + optional action, ~4s (Undo actions pass their own 10s). Look: `.craft-toast` in design-system.css.
 */
export function Toaster(){return <Sonner position="bottom-right" closeButton richColors={false} gap={8} offset={24} mobileOffset={16} toastOptions={{className:'craft-toast',duration:4000}}/>}
