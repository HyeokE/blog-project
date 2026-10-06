/** Dispatch only from an explicitly validated creation submit, never OAuth hydration. */
export async function submitCreation(form,name,{createRoom,createDateRoom}){
 const {title,startDate,endDate,timezone}=form;
 const scheduleMode=form.scheduleMode??'time';
 if(scheduleMode==='date')return createDateRoom({title,startDate,endDate,timezone,scheduleMode:'date',name:name.trim()});
 if(scheduleMode!=='time')throw new Error('Invalid schedule mode');
 return createRoom({title,startDate,endDate,startTime:form.startTime,endTime:form.endTime,timezone},name.trim());
}
