'use client';
import {ANALYTICS_ELEMENTS,ANALYTICS_SECTIONS} from '@/constants/analytics';
import {createContext,useContext,useEffect,useState} from 'react';
import {useRouter,usePathname} from 'next/navigation';
import WallChrome from '@/container/light-wall/WallChrome';
import {Button} from '@/components/ui/button';
import {GoogleSignInButton} from '@/components/craft/GoogleSignInButton';
import {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem} from '@/components/ui/dropdown-menu';
import {request,signInWithGoogle} from '@/features/when-we-meet/api';
import {clearCraftQueries} from '@/features/when-we-meet/query';
import {invitationPath,markInviteReturn} from '@/features/when-we-meet/invitation.mjs';
type AccountUser={id:string;email?:string;user_metadata?:Record<string,unknown>};
type Account={user:AccountUser|null;loading:boolean;signOut:()=>Promise<void>;error:string};
const Context=createContext<Account>({user:null,loading:true,signOut:async()=>undefined,error:''});
export const useCraftAccount=()=>useContext(Context);
export default function CraftAccount({children,initialUser}:{children:React.ReactNode;initialUser?:AccountUser|null}){
 const router=useRouter();
 const pathname=usePathname();
 const [user,setUser]=useState<AccountUser|null>(initialUser||null),[loading,setLoading]=useState(initialUser===undefined),[error,setError]=useState(''),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[attempt,setAttempt]=useState(0);
 useEffect(()=>{if(initialUser!==undefined){setUser(previous=>{if(previous?.id!==initialUser?.id){clearCraftQueries();}return initialUser}) ;setLoading(false)}},[initialUser]);
 // Craft is English; the blog root stays Korean. Restores the previous lang when leaving /craft.
 useEffect(()=>{const root=document.documentElement,lang=root.lang;root.dataset.craft='true';root.lang='en';return()=>{delete root.dataset.craft;root.lang=lang==='en'?'ko':lang||'ko'}},[]);
 useEffect(()=>{if(initialUser!==undefined&&attempt===0){return;}let alive=true;request<{user:AccountUser|null}>('/api/craft/auth').then(result=>{if(alive){setUser(result.user);setError('');setLoading(false)}}).catch(()=>{if(alive){setError('Could not check your account.');setLoading(false)}});return()=>{alive=false}},[attempt,initialUser]);
 async function signOut(){setBusy(true);setError('');try{await request('/api/craft/auth',{action:'signout'});clearCraftQueries();setUser(null);setOpen(false);router.refresh()}catch{setError('Sign out failed. Please retry.')}finally{setBusy(false)}}
 async function signIn(){window.dispatchEvent(new Event('craft-before-login'));const match=/^\/craft\/when-we-meet\/([0-9a-f-]{36})\/?$/i.exec(window.location.pathname);const token=new URLSearchParams(window.location.search).get('invite')||'';const path=match&&invitationPath(match[1],token);if(path){markInviteReturn(window.sessionStorage,path)}await signInWithGoogle(match?window.location.pathname:window.location.pathname+window.location.search)}
 return <Context.Provider value={{user,loading:loading||Boolean(error&&!user),signOut,error}}><div className="light-wall light-page craft-chrome" data-craft-subpage={pathname!=='/craft'&&pathname!=='/craft/'}><WallChrome locale="en" variant="document" showMenu={pathname==='/craft'||pathname==='/craft/'} account={<div className="craft-account" data-analytics-section={ANALYTICS_SECTIONS.CRAFT_ACCOUNT}>{!loading&&user&&<DropdownMenu open={open} onOpenChange={setOpen}><DropdownMenuTrigger asChild><Button type="button" className="craft-account-avatar" aria-label="Profile menu"><span className="craft-avatar-face">{typeof user.user_metadata?.avatar_url==='string'&&user.user_metadata.avatar_url.startsWith('https://')?<img src={user.user_metadata.avatar_url} alt="" referrerPolicy="no-referrer"/>:String(user.user_metadata?.full_name||user.email||'?').slice(0,1).toUpperCase()}</span></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="craft-account-menu"><DropdownMenuItem disabled={busy} onSelect={()=>void signOut()}>Sign out</DropdownMenuItem></DropdownMenuContent></DropdownMenu>}{!loading&&!user&&!error&&<GoogleSignInButton context="header" className="craft-account-login" data-analytics-label={ANALYTICS_ELEMENTS.SIGN_IN} onClick={()=>void signIn()}/>}{error&&<p role="alert" className="craft-account-error">{error} <button type="button" data-analytics-label={ANALYTICS_ELEMENTS.RETRY} onClick={()=>{setLoading(true);setAttempt(v=>v+1)}}>Retry</button></p>}</div>} />{children}</div></Context.Provider>
}
