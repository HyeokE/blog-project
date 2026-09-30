'use client';
import './guest-calendar-preview.css';
import {useWwmCopy} from './i18n/WwmI18nProvider';
import {hourLabel,weekdayLabel} from './hour-label.mjs';

/** Static, synthetic illustration. Never pass room responses or account data here. */
// Monday 12 – Friday 16 October 2026; only the weekday names and day numbers are shown.
const days=['2026-10-12','2026-10-13','2026-10-14','2026-10-15','2026-10-16'];
const hours=['09:00','10:00','11:00','12:00','13:00','14:00'];
const availability=new Set(['0-1','0-2','1-0','1-1','1-3','2-1','2-2','2-3','3-0','3-2','3-4','4-1','4-3','4-4']);

export function GuestCalendarPreview(){
 const {t,locale}=useWwmCopy();
 return <div className="wwm-guest-preview" aria-hidden="true" inert>
  <div className="wwm-guest-preview-heading">{t('guest.previewHeading')} <span>{t('guest.weekView')}</span></div>
  <div className="wwm-guest-preview-grid">
   <div className="wwm-guest-preview-corner">{t('grid.time')}</div>
   {days.map(day=><div className="wwm-guest-preview-day" key={day}>{weekdayLabel(day,locale)}<strong>{Number(day.slice(-2))}</strong></div>)}
   {hours.map((hour,row)=><div className="wwm-guest-preview-row" key={hour}><span className="wwm-guest-preview-hour">{hourLabel(hour,locale)}</span>{days.map((day,col)=><span className={`wwm-guest-preview-cell ${availability.has(`${col}-${row}`)?'is-available':''}`} key={day}/>)}</div>)}
  </div>
 </div>;
}
