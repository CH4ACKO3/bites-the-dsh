import assert from 'node:assert/strict'
import test from 'node:test'
import type {
  ChatSnapshot,
  ConversationSnapshot,
  ConversationTimelineSnapshot,
} from '@deepseek-ai/dsh-client-runtime/client'
import {
  withConversationPlaybackClock,
  withPlaybackClock,
} from '../src/client/projection-clock.ts'

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

test('clock-only projection preserves the assembled conversation tree', () => {
  const timeline = {
    turnOrder: [],
    turns: new Map(),
  } as unknown as ConversationTimelineSnapshot
  const nodes = [{ id: 'stable-node' }]
  const otherView = { stable: true }
  const chat = {
    timeline,
    legacy: {
      nodes,
      turnTimings: new Map(),
      turnEnds: new Map(),
      partial: false,
      runningCalls: new Map(),
    },
  } as unknown as ChatSnapshot
  const snapshot = {
    chat,
    nodes,
    views: {
      get: (target: string) => target === 'chat' ? chat : otherView,
    },
  } as unknown as ConversationSnapshot

  const first = withConversationPlaybackClock(snapshot, 2_000)
  const second = withConversationPlaybackClock(snapshot, 3_000)

  assert.strictEqual(first.nodes, nodes)
  assert.strictEqual(second.nodes, nodes)
  assert.strictEqual(first.views.get('other'), otherView)
  assert.strictEqual(second.views.get('other'), otherView)
  assert.deepEqual(first.chat.timeline.playbackClock, { kind: 'historical', time: 2_000 })
  assert.deepEqual(second.chat.timeline.playbackClock, { kind: 'historical', time: 3_000 })
})
