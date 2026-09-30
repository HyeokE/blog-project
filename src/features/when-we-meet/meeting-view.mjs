// Private records are visible only for the identity that fetched them.
export function meetingView(userId, list) {
  if (!userId || userId !== list.owner) return { meetings: [], state: 'loading' };
  return { meetings: list.meetings, state: list.state };
}
