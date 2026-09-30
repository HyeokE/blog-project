import '@/container/light-wall/light-wall.css';
import '@/container/light-wall/wall-pages.css';
import CraftAccount from './CraftAccount';
import {Toaster} from '@/components/ui/sonner';
import './craft.css';
import './design-system.css';
import './surface-motion.css';
import {Suspense} from 'react';
import {currentSupabaseUser} from '@/lib/supabase/server';
import {getWwmLocale} from '@/lib/wwm-locale';
async function AccountSection({children}:{children:React.ReactNode}){const [{user},locale]=await Promise.all([currentSupabaseUser(),getWwmLocale()]);return <CraftAccount locale={locale} initialUser={user?{id:user.id,email:user.email,user_metadata:user.user_metadata}:null}>{children}</CraftAccount>}
export default function CraftLayout({children}:{children:React.ReactNode}){return <><link rel="preload" href="/fonts/SUIT-Regular.ttf" as="font" type="font/ttf" crossOrigin="anonymous"/><Suspense fallback={<CraftAccount>{children}</CraftAccount>}><AccountSection>{children}</AccountSection></Suspense><Toaster/></>}
