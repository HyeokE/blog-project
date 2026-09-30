import type {Meta,StoryObj} from '@storybook/nextjs-vite';
import CraftPage from '@/app/craft/page';
import CraftPrivacyPage from '@/app/craft/privacy/page';
import '@/app/craft/craft.css';
import '@/app/craft/legal.css';
// Static Craft pages inside the Craft frame: checks the shared 1120px content column (no data, no network).
const meta={title:'Craft/Pages',parameters:{nextjs:{appDirectory:true}}} satisfies Meta;
export default meta;
type Story=StoryObj<typeof meta>;
const Frame=({children}:{children:React.ReactNode})=> <div className="light-wall light-page craft-chrome">{children}</div>;
export const Index:Story={render:()=> <Frame><CraftPage/></Frame>};
export const Privacy:Story={render:()=> <Frame><CraftPrivacyPage/></Frame>};
export const IndexMobile:Story={...Index,globals:{viewport:{value:'mobile',isRotated:false}}};
