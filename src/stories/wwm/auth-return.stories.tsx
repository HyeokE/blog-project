import type {Meta,StoryObj} from '@storybook/nextjs-vite';
import {expect} from 'storybook/test';
import {AuthReturn} from '@/features/when-we-meet/AuthReturn';
import {storyCopy,within} from './locale-within';
// The screen between Google sign-in and the return to When We Meet (/craft/when-we-meet/auth/callback).
const meta={title:'When We Meet/Auth return',component:AuthReturn,parameters:{layout:'fullscreen',nextjs:{appDirectory:true}}} satisfies Meta<typeof AuthReturn>;
export default meta;
type Story=StoryObj<typeof meta>;
export const Pending:Story={play:async({canvasElement})=>{const {t}=storyCopy();await expect(within(canvasElement).getByRole('heading',{name:t('auth.finishing')})).toBeVisible();await expect(within(canvasElement).getByRole('status')).toHaveTextContent(t('auth.restoring'));}};
export const PendingMobile:Story={...Pending,globals:{viewport:{value:'mobile',isRotated:false}}};
export const PendingDark:Story={...Pending,globals:{theme:'dark'}};
export const Failed:Story={args:{error:'auth.failed'},play:async({canvasElement})=>{const {t}=storyCopy();await expect(within(canvasElement).getByRole('alert')).toHaveTextContent(t('auth.failed'));await expect(within(canvasElement).getByRole('link',{name:t('auth.returnToMeetings')})).toHaveAttribute('href','/craft/when-we-meet');}};
export const Cancelled:Story={args:{error:'auth.cancelled'}};
export const FailedMobile:Story={...Failed,globals:{viewport:{value:'mobile',isRotated:false}}};
export const FailedDark:Story={...Failed,globals:{theme:'dark'}};
