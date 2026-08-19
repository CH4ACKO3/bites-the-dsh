import assert from 'node:assert/strict'
import test from 'node:test'
import type { ConversationTimelineSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import { withPlaybackClock } from '../src/client/projection-clock.ts'

test('historical open turns expose the playback cursor as their projection clock', () => {
  const start = {
    seq: 1,
    time: 1_000,
    type: 'turn/start',
    data: { turn: 1 },
  }
  const turn = {
    turn: 1,
    start,
    end: undefined,
    status: 'open',
    steps: [],
    data: { get: () => undefined },
  }
  const timeline = {
    turnOrder: [1],
    turns: new Map([[1, turn]]),
  } as unknown as ConversationTimelineSnapshot

  const projected = withPlaybackClock(timeline, 4_000)

  assert.equal(projected.turns.get(1)?.status, 'open')
  assert.equal(projected.turns.get(1)?.start?.time, 1_000)
  assert.deepEqual(projected.playbackClock, { kind: 'historical', time: 4_000 })
})
