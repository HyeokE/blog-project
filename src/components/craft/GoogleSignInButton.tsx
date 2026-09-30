import * as React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import googleG from './google-g.png';
import './google-sign-in-button.css';

/** Presentation only: callers retain ownership of the OAuth action and errors. */
type GoogleSignInButtonProps = Omit<React.ComponentProps<typeof Button>, 'variant' | 'size' | 'children'> & {
  context?: 'header' | 'standard';
  pending?: boolean;
  /** Localized button text; Craft pages outside When We Meet keep the English defaults. */
  label?: string;
  pendingLabel?: string;
};

export function GoogleSignInButton({ context = 'standard', pending = false, label = 'Continue with Google', pendingLabel = 'Connecting to Google…', disabled, className = '', ...props }: GoogleSignInButtonProps) {
  return <Button {...props} type={props.type ?? 'button'} variant="outline" size="default"
    className={`craft-google-sign-in craft-google-sign-in--${context} ${className}`.trim()}
    disabled={disabled || pending} aria-busy={pending}>
    <Image src={googleG} alt="" width={18} height={18} aria-hidden="true" unoptimized />
    <span>{pending ? pendingLabel : label}</span>
  </Button>;
}
