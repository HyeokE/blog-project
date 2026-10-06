/** Civil date strings are validated at the server boundary, never converted to instants. */
export type CivilDate=string;
export type DateRoomSchedule={startDate:CivilDate;endDate:CivilDate;timezone:string};
export type DateRoom=DateRoomSchedule&{id:string;title:string;ownerId:string;inviteToken?:string;role:'ADMIN'|'MEMBER';scheduleMode:'date';startTime:null;endTime:null};
export type DateResponse={userId:string;displayName:string;availableDates:CivilDate[];updatedAt:string};
export type DateResponseBaseline={name:string;availableDates:CivilDate[]};
export type CreateDateRoomInput=DateRoomSchedule&{scheduleMode:'date';title:string;name:string};
export type DateRoomResult={room:DateRoom;responses:DateResponse[];userId:string};
export type DateSaveResult={saved:true;value:DateResponseBaseline&{version:string}};
export type DateScheduleResult={schedule:DateRoomSchedule;removedDates:number};
