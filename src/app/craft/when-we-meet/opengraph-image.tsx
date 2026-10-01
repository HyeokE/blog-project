import {craftOgImage} from '@/lib/craft-og';

// Also the card for every room link: invitations are private, so the image never carries a meeting's title or people.
export const alt='When We Meet: find a time that works for everyone';
export const size={width:1200,height:630};
export const contentType='image/png';

export default function Image(){return craftOgImage({eyebrow:'CRAFT · HYEOK.DEV',title:'When We Meet',lines:['Find a time that works for everyone.','다 같이 되는 시간을 쉽게 찾아요'],motif:true})}
