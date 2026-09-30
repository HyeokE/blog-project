import {createContext,useContext} from 'react';
export type MockAccount={user:{id:string;email:string;user_metadata:{full_name:string}}|null;loading:boolean;error:string;signOut:()=>Promise<void>};
export const PERSON={id:'11111111-1111-4111-8111-111111111111',email:'storybook@example.invalid',user_metadata:{full_name:'Alex Sample'}};
export const account:MockAccount={user:PERSON,loading:false,error:'',signOut:async()=>{}};
const Context=createContext(account);
export function MockAccountProvider({children,value}:{children:React.ReactNode;value:Partial<MockAccount>}){return <Context.Provider value={{...account,...value}}>{children}</Context.Provider>}
export const useCraftAccount=()=>useContext(Context);
export default MockAccountProvider;
