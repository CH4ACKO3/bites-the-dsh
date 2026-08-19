import assert from 'node:assert/strict'
import test from 'node:test'
import { SessionPlaybackController } from '../src/client/playback-controller.ts'

test('live mode follows the live head', () => {
  const playback = new SessionPlaybackController()

  playback.syncLiveHead('session', 8)

  assert.deepEqual(playback.getState('session'), {
    mode: 'live',
    direction: 1,
    rate: 1,
    cursorSeq: 8,
    liveHeadSeq: 8,
    skipIdle: true,
  })
})

test('historical playback remains fixed while live events arrive', () => {
  const playback = new SessionPlaybackController()
  playback.syncLiveHead('session', 8)
  playback.enter('session')
  playback.seek('session', 3)

  playback.syncLiveHead('session', 12)

  assert.equal(playback.getState('session').cursorSeq, 3)
  assert.equal(playback.getState('session').liveHeadSeq, 12)
})

test('exiting playback returns to the live head', () => {
  const playback = new SessionPlaybackController()
  playback.syncLiveHead('session', 8)
  playback.enter('session')
  playback.seek('session', 3)
  playback.syncLiveHead('session', 12)

  playback.exit('session')

  assert.equal(playback.getState('session').mode, 'live')
  assert.equal(playback.getState('session').cursorSeq, 12)
})

test('time controls reject use outside playback mode', () => {
  const playback = new SessionPlaybackController()

  assert.throws(() => playback.seek('session', 0), /not in playback mode/)
  assert.throws(() => playback.play('session'), /not in playback mode/)
})
