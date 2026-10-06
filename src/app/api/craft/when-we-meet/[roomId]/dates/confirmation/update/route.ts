import {handleDateConfirmationRequest} from '@/features/when-we-meet/date-confirmation-service.mjs';
import {createDateConfirmationRuntime} from '@/features/when-we-meet/date-confirmation-runtime';
export const dynamic='force-dynamic';
const dependencies=createDateConfirmationRuntime();
type Context={params:Promise<{roomId:string}>};
export async function POST(request:Request,context:Context){return handleDateConfirmationRequest(request,(await context.params).roomId,'update',dependencies);}
