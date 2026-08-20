import assert from 'node:assert/strict'
import test from 'node:test'
import type {
  ConversationSnapshot,
  UseConversationSession,
} from '@deepseek-ai/dsh-client-runtime/client'
import {
  SessionPlaybackController,
  type PlaybackFrameClock,
} from '../src/client/playback-controller.ts'
import { bindProjectedSession } from '../src/client/session-hook.ts'

const initialEvents = [
  { seq: 2, time: 100 },
  { seq: 3, time: 200 },
  { seq: 8, time: 300 },
] as const

class FakeFrameClock implements PlaybackFrameClock {
  #nextId = 1
  #callbacks = new Map<number, (now: number) => void>()

  request(callback: (now: number) => void): number {
    const id = this.#nextId
    this.#nextId += 1
    this.#callbacks.set(id, callback)
    return id
  }

  cancel(id: number): void {
    this.#callbacks.delete(id)
  }

  frame(now: number): void {
    const callbacks = [...this.#callbacks.values()]
    this.#callbacks.clear()
    for (const callback of callbacks) callback(now)
  }
}

test('projected session hook preserves the native hook call', () => {
  const liveSnapshot = { sessionId: 'live' } as ConversationSnapshot
  const projectedSnapshot = { sessionId: 'projected' } as ConversationSnapshot
  let nativeCalls = 0
  const useSession = (<Selected,>(selector: (snapshot: ConversationSnapshot) => Selected) => {
    nativeCalls += 1
    return selector(liveSnapshot)
  }) as UseConversationSession
  const useProjectedSession = bindProjectedSession(useSession, projectedSnapshot)

  assert.equal(useProjectedSession((snapshot) => snapshot.sessionId), 'projected')
  assert.equal(nativeCalls, 1)
})

test('live mode follows the live head', () => {
  const playback = new SessionPlaybackController()

  playback.syncEvents('session', initialEvents, true)

  assert.deepEqual(playback.getState('session'), {
    mode: 'live',
    direction: 1,
    rate: 1,
    cursorSeq: 8,
    cursorTime: 300,
    liveHeadSeq: 8,
    loadedBaseSeq: 2,
    hasMoreHistory: true,
    skipIdle: true,
    idleLimit: 1_000,
    simulateTyping: false,
  })
})

test('simulated typing is an opt-in playback setting', () => {
  const playback = new SessionPlaybackController()
  playback.syncEvents('session', initialEvents, false)

  assert.throws(() => playback.setSimulateTyping('session', true), /not in playback mode/)
  playback.enter('session')
  playback.setSimulateTyping('session', true)

  assert.equal(playback.getState('session').simulateTyping, true)
})

test('historical playback remains fixed while live events arrive', () => {
  const playback = new SessionPlaybackController()
  playback.syncEvents('session', initialEvents, false)
  playback.enter('session')
  playback.seek('session', 3)

  playback.syncEvents('session', [...initialEvents, { seq: 12, time: 400 }], false)

  assert.equal(playback.getState('session').cursorSeq, 3)
  assert.equal(playback.getState('session').liveHeadSeq, 12)
})

test('exiting playback returns to the live head', () => {
  const playback = new SessionPlaybackController()
  playback.syncEvents('session', initialEvents, false)
  playback.enter('session')
  playback.seek('session', 3)
  playback.syncEvents('session', [...initialEvents, { seq: 12, time: 400 }], false)

  playback.exit('session')

  assert.equal(playback.getState('session').mode, 'live')
  assert.equal(playback.getState('session').cursorSeq, 12)
})

test('time controls reject use outside playback mode', () => {
  const playback = new SessionPlaybackController()

  assert.throws(() => playback.seek('session', 0), /not in playback mode/)
  assert.throws(() => playback.play('session'), /not in playback mode/)
})

test('playback clock advances continuously by recorded event time', () => {
  const clock = new FakeFrameClock()
  const playback = new SessionPlaybackController(clock)
  playback.syncEvents('session', initialEvents, false)
  playback.enter('session')
  playback.seek('session', 2)

  playback.play('session', 1)
  clock.frame(0)
  clock.frame(50)

  assert.equal(playback.getState('session').cursorSeq, 2)
  assert.equal(playback.getState('session').cursorTime, 150)

  clock.frame(100)

  assert.equal(playback.getState('session').cursorSeq, 3)
  assert.equal(playback.getState('session').cursorTime, 200)
  assert.equal(playback.getState('session').mode, 'playing')
})

test('idle skipping uses the selected maximum delay', () => {
  const clock = new FakeFrameClock()
  const playback = new SessionPlaybackController(clock)
  playback.syncEvents('session', [
    { seq: 1, time: 0 },
    { seq: 2, time: 5_000 },
  ], false)
  playback.enter('session')
  playback.seek('session', 1)
  playback.setIdleLimit('session', 3_000)

  playback.play('session')
  clock.frame(0)
  clock.frame(1_500)
  assert.equal(playback.getState('session').cursorSeq, 1)
  assert.equal(playback.getState('session').cursorTime, 2_500)
  clock.frame(2_999)
  assert.equal(playback.getState('session').cursorSeq, 1)
  clock.frame(3_000)

  assert.equal(playback.getState('session').cursorSeq, 2)
})

test('position can be read and sought by event, turn, or real time', () => {
  const playback = new SessionPlaybackController()
  const startTime = new Date('2026-08-20T04:00:00+08:00').getTime()
  playback.syncEvents('session', [
    { seq: 2, time: startTime, turn: 4 },
    { seq: 3, time: startTime + 100, turn: 4 },
    { seq: 8, time: startTime + 1_000, turn: 7 },
  ], false)
  playback.enter('session')

  assert.deepEqual(playback.getPosition('session'), {
    event: 3,
    events: 3,
    turn: 2,
    turns: 2,
    time: startTime + 1_000,
    startTime,
    endTime: startTime + 1_000,
  })

  playback.seekEvent('session', 1)
  assert.equal(playback.getState('session').cursorSeq, 2)
  playback.seekTurn('session', 1)
  assert.equal(playback.getState('session').cursorSeq, 3)
  playback.seekTime('session', startTime + 900)
  assert.equal(playback.getState('session').cursorSeq, 3)
  assert.equal(playback.getPosition('session').time, startTime + 900)
})

test('playback continues forward and backward from time between events', () => {
  const clock = new FakeFrameClock()
  const playback = new SessionPlaybackController(clock)
  playback.syncEvents('session', initialEvents, false)
  playback.enter('session')

  playback.seekTime('session', 250)
  assert.equal(playback.getState('session').cursorSeq, 3)
  assert.equal(playback.getState('session').cursorTime, 250)

  playback.play('session', 1)
  clock.frame(0)
  clock.frame(25)
  assert.equal(playback.getState('session').cursorSeq, 3)
  assert.equal(playback.getState('session').cursorTime, 275)
  clock.frame(50)
  assert.equal(playback.getState('session').cursorSeq, 8)
  assert.equal(playback.getState('session').cursorTime, 300)

  playback.seekTime('session', 250)
  playback.play('session', -1)
  clock.frame(100)
  clock.frame(125)
  assert.equal(playback.getState('session').cursorSeq, 3)
  assert.equal(playback.getState('session').cursorTime, 225)
  clock.frame(150)
  assert.equal(playback.getState('session').cursorSeq, 3)
  assert.equal(playback.getState('session').cursorTime, 200)
})

test('reverse playback hides an event as the frame clock leaves its timestamp', () => {
  const clock = new FakeFrameClock()
  const playback = new SessionPlaybackController(clock)
  playback.syncEvents('session', initialEvents, false)
  playback.enter('session')

  playback.play('session', -1)
  clock.frame(0)
  clock.frame(25)

  assert.equal(playback.getState('session').cursorSeq, 3)
  assert.equal(playback.getState('session').cursorTime, 275)
})

test('read-only effect follows replay entry and exit', () => {
  const playback = new SessionPlaybackController(new FakeFrameClock())
  const effects: Array<[string, boolean]> = []
  playback.setReadonlyEffect((sessionId, active) => effects.push([sessionId, active]))
  playback.syncEvents('session', initialEvents, false)

  playback.enter('session')
  playback.exit('session')

  assert.deepEqual(effects, [
    ['session', true],
    ['session', false],
  ])
})

test('disposal releases read-only state even before an event window is synced', () => {
  const playback = new SessionPlaybackController(new FakeFrameClock())
  const effects: Array<[string, boolean]> = []
  playback.setReadonlyEffect((sessionId, active) => effects.push([sessionId, active]))

  playback.enter('session')
  playback.dispose()

  assert.deepEqual(effects, [
    ['session', true],
    ['session', false],
  ])
})
