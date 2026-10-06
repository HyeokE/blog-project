import type { currentSupabaseUser } from '@/lib/supabase/server';
import type { DateRoom } from './date-contracts';
import {
  dateUuid,
  dateRoomColumns,
  dateResponseColumns,
  normalizeDateRoom,
  normalizeDateResponses,
} from './date-normalize.mjs';
type Context = Awaited<ReturnType<typeof currentSupabaseUser>>;
export async function craftDateRoomEntry(
  roomId: string,
  context: Context,
): Promise<{ kind: 'guest' | 'time' } | { kind: 'date'; room: DateRoom; userId: string }> {
  if (!context.user || !dateUuid(roomId)) {
    return { kind: 'guest' };
  }
  const { data, error } = await context.client
    .from('wwm_rooms')
    .select('schedule_mode')
    .eq('id', roomId)
    .single();
  if (error?.code === '42703') {
    return { kind: 'time' };
  }
  if (error) {
    if (['PGRST116', '42501'].includes(error.code)) {
      return { kind: 'guest' };
    }
    throw new Error('Could not load meeting.');
  }
  if (!data) {
    return { kind: 'guest' };
  }
  if (data.schedule_mode === 'time') {
    return { kind: 'time' };
  }
  if (data.schedule_mode !== 'date') {
    throw new Error('Invalid meeting mode.');
  }
  const result = await context.client
    .from('wwm_rooms')
    .select(dateRoomColumns)
    .eq('id', roomId)
    .single();
  if (result.error || !result.data) {
    throw new Error('Could not load date meeting.');
  }
  return {
    kind: 'date',
    room: normalizeDateRoom(result.data, context.user.id),
    userId: context.user.id,
  };
}
export async function craftDateRoomResponses(roomId: string, room: DateRoom, context: Context) {
  const { data, error } = await context.client
    .from('wwm_responses')
    .select(dateResponseColumns)
    .eq('room_id', roomId);
  if (error) {
    throw new Error('Could not load date availability.');
  }
  return normalizeDateResponses(data || [], room);
}
