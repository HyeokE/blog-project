import {craftOgImage} from '@/lib/craft-og';

export const alt='Craft: small things made to be useful';
export const size={width:1200,height:630};
export const contentType='image/png';

export default function Image(){return craftOgImage({eyebrow:'HYEOK.DEV',title:'Craft',lines:['Small things made to be useful.']})}
