import {CalendarDays} from 'lucide-react';
import './empty-meetings.css';

export function EmptyMeetings(){
 return <div className="wwm-empty-meetings" role="status">
  <CalendarDays size={32} strokeWidth={1.25} aria-hidden="true"/>
  <h2>No meetings yet</h2>
  <p>Create a meeting to find a time together,<br/>or join one with an invitation link.</p>
 </div>;
}
