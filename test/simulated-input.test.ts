import assert from 'node:assert/strict'
import test from 'node:test'
import type { PlaybackEntry } from '../src/client/raw-events.ts'
import {
  bindSimulatedInput,
  simulatedDraftAt,
  type InputStateRuntime,
} from '../src/client/simulated-input.ts'

function entry(event: PlaybackEntry['event']): PlaybackEntry {
  return {
    event,
    view: undefined,
    location: { kind: 'session' },
  }
}

const entries = [
  entry({ seq: 1, time: 1_000, type: 'turn/end', data: { turn: 1, reason: 'completed' } }),
  entry({ seq: 2, time: 9_990, type: 'turn/start', data: { turn: 2 } }),
  entry({
    seq: 3,
    time: 10_000,
    type: 'user/message',
    data: {
      id: 'message' as never,
      role: 'user',
      content: [{ type: 'text', text: '测试输入' }],
      source: { kind: 'user' },
    },
  }),
] as const

test('simulated input reveals the next human message over continuous replay time', () => {
  assert.equal(simulatedDraftAt(entries, {
    cursorSeq: 1,
    cursorTime: 1_000,
    skipIdle: true,
  }), '')
  assert.equal(simulatedDraftAt(entries, {
    cursorSeq: 1,
    cursorTime: 5_500,
    skipIdle: true,
  }), '测试')
  assert.equal(simulatedDraftAt(entries, {
    cursorSeq: 2,
    cursorTime: 9_999,
    skipIdle: true,
  }), '测试输入')
  assert.equal(simulatedDraftAt(entries, {
    cursorSeq: 3,
    cursorTime: 10_000,
    skipIdle: true,
  }), '')
})

test('simulated input ignores plugin-authored user-role context', () => {
  const injected = entry({
    seq: 4,
    time: 11_000,
    type: 'user/message',
    data: {
      id: 'context' as never,
      role: 'user',
      content: [{ type: 'text', text: 'workspace instructions' }],
      source: { kind: 'plugin', plugin: 'test' },
    },
  })

  assert.equal(simulatedDraftAt([...entries, injected], {
    cursorSeq: 3,
    cursorTime: 10_500,
    skipIdle: true,
  }), '')
})

test('simulated input projection does not mutate the native draft state', () => {
  const native: InputStateRuntime = {
    draft: 'kept live draft',
    imageIds: ['image'],
    phase: 'plain',
    occurrences: ['reference'],
  }
  const useInput = <Selected,>(selector: (state: InputStateRuntime) => Selected) => selector(native)
  const projected = bindSimulatedInput(useInput, '历史')

  assert.deepEqual(projected((state) => ({
    draft: state.draft,
    imageIds: state.imageIds,
    occurrences: state.occurrences,
  })), {
    draft: '历史',
    imageIds: [],
    occurrences: [],
  })
  assert.equal(native.draft, 'kept live draft')
})
