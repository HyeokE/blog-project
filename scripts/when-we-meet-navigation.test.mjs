import test from 'node:test';
import assert from 'node:assert/strict';
import { meetingView } from '../src/features/when-we-meet/meeting-view.mjs';

const room = { id: 'r1', owner_id: 'alice', title: 'Coffee' };
test('same owner revalidation retains actionable meeting links', () => {
  assert.deepEqual(meetingView('alice', { owner: 'alice', meetings: [room], state: 'loading' }).meetings, [room]);
});
test('identity change and logout never expose another owner meetings', () => {
  assert.deepEqual(meetingView('bob', { owner: 'alice', meetings: [room], state: 'ready' }).meetings, []);
  assert.deepEqual(meetingView(null, { owner: 'alice', meetings: [room], state: 'ready' }).meetings, []);
});
