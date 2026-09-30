// Participant colours for the availability calendars. Values mirror the --craft-person-* tokens in
// src/app/craft/design-system.css (a test keeps them in sync); components use the token, never the hex.
export const SURFACES={light:'#f1eee2',dark:'#36372d'};
/** Earthy 8-hue ramp; each value is >=3:1 against the calendar surface of its theme and visibly
 * distinct from You and from each other (CIELAB ΔE, see the palette test). */
export const PARTICIPANT_HUES=[
 {name:'clay',light:'#a85e4a',dark:'#d99178'},
 {name:'olive',light:'#76702a',dark:'#b5ae6a'},
 {name:'ochre',light:'#946512',dark:'#d6a95a'},
 {name:'slate-green',light:'#4a6a60',dark:'#8fb3a6'},
 {name:'plum-brown',light:'#7a4a5c',dark:'#c99aab'},
 {name:'lavender',light:'#6a5a8c',dark:'#b3a3d6'},
 {name:'moss',light:'#3f7040',dark:'#8fc28a'},
 {name:'steel',light:'#56657f',dark:'#a7b4cf'},
];
/** The current user: an ink-adjacent umber, outside the ramp so it never collides with anyone else. */
export const YOU_HUE={name:'you',light:'#5b4e3a',dark:'#e6dcc2'};

const channel=value=>{const c=value/255;return c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4};
const luminance=hex=>{const h=hex.replace('#','');const [r,g,b]=[0,2,4].map(i=>channel(parseInt(h.slice(i,i+2),16)));return 0.2126*r+0.7152*g+0.0722*b};
/** WCAG 2 contrast ratio between two #rrggbb colours. */
export function contrastRatio(a,b){const [hi,lo]=[luminance(a),luminance(b)].sort((x,y)=>y-x);return (hi+0.05)/(lo+0.05)}

const hashId=id=>{let hash=2166136261;for(const char of id){hash=Math.imul(hash^char.codePointAt(0),16777619)}return hash>>>0};
/** Stable per user id; the current user always gets the You token (Availability and Everyone agree). */
export function participantColor(userId,currentUserId){
 return userId===currentUserId?'var(--craft-person-you)':`var(--craft-person-${hashId(userId)%PARTICIPANT_HUES.length+1})`;
}

const linear=value=>{const c=value/255;return c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4};
const lab=hex=>{const h=hex.replace('#','');const [r,g,b]=[0,2,4].map(i=>linear(parseInt(h.slice(i,i+2),16)));const f=t=>t>0.008856?Math.cbrt(t):7.787*t+16/116;const x=f((r*0.4124+g*0.3576+b*0.1805)/0.95047),y=f(r*0.2126+g*0.7152+b*0.0722),z=f((r*0.0193+g*0.1192+b*0.9505)/1.08883);return [116*y-16,500*(x-y),200*(y-z)]};
/** CIE76 colour difference between two #rrggbb colours (≈2 is just noticeable; ≥15 reads as a different colour at a glance). */
export function colorDistance(a,b){const p=lab(a),q=lab(b);return Math.hypot(p[0]-q[0],p[1]-q[1],p[2]-q[2])}
