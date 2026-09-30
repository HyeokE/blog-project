import * as React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import googleG from './google-g.png';
import './google-sign-in-button.css';

/** Presentation only: callers retain ownership of the OAuth action and errors. */
type GoogleSignInButtonProps = Omit<React.ComponentProps<typeof Button>, 'variant' | 'size' | 'children'> & {
  context?: 'header' | 'standard';
  pending?: boolean;
};

export function GoogleSignInButton({ context = 'standard', pending = false, disabled, className = '', ...props }: GoogleSignInButtonProps) {
  return <Button {...props} type={props.type ?? 'button'} variant="outline" size="default"
    className={`craft-google-sign-in craft-google-sign-in--${context} ${className}`.trim()}
    disabled={disabled || pending} aria-busy={pending}>
    <Image src={googleG} alt="" width={18} height={18} aria-hidden="true" unoptimized />
    <span>{pending ? 'Connecting to Google…' : 'Continue with Google'}</span>
  </Button>;
}
