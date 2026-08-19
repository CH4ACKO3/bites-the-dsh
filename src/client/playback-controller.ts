export const PLAYBACK_RATES = [0.25, 0.5, 1, 2, 4, 8, 16] as const

export type PlaybackRate = (typeof PLAYBACK_RATES)[number]
export type PlaybackDirection = 1 | -1
export type PlaybackMode = 'live' | 'paused' | 'playing'

export interface PlaybackState {
  mode: PlaybackMode
  direction: PlaybackDirection
  rate: PlaybackRate
  cursorSeq: number
  liveHeadSeq: number
  skipIdle: boolean
}

export type PlaybackListener = (state: Readonly<PlaybackState>) => void

function initialState(): PlaybackState {
  return {
    mode: 'live',
    direction: 1,
    rate: 1,
    cursorSeq: 0,
    liveHeadSeq: 0,
    skipIdle: true,
  }
}

function assertSequence(seq: number): void {
  if (!Number.isSafeInteger(seq) || seq < 0) {
    throw new RangeError(`Sequence must be a non-negative safe integer: ${seq}`)
  }
}

export class SessionPlaybackController {
  readonly #states = new Map<string, PlaybackState>()
  readonly #listeners = new Map<string, Set<PlaybackListener>>()

  enter(sessionId: string): void {
    this.#update(sessionId, (state) => ({ ...state, mode: 'paused' }))
  }

  exit(sessionId: string): void {
    this.#update(sessionId, (state) => ({
      ...state,
      mode: 'live',
      direction: 1,
      cursorSeq: state.liveHeadSeq,
    }))
  }

  play(sessionId: string, direction: PlaybackDirection = 1): void {
    this.#requirePlayback(sessionId)
    this.#update(sessionId, (state) => ({ ...state, mode: 'playing', direction }))
  }

  pause(sessionId: string): void {
    this.#requirePlayback(sessionId)
    this.#update(sessionId, (state) => ({ ...state, mode: 'paused' }))
  }

  seek(sessionId: string, seq: number): void {
    assertSequence(seq)
    const state = this.#requirePlayback(sessionId)
    if (seq > state.liveHeadSeq) {
      throw new RangeError(`Sequence ${seq} is beyond live head ${state.liveHeadSeq}`)
    }
    this.#update(sessionId, (current) => ({ ...current, cursorSeq: seq }))
  }

  step(sessionId: string, direction: PlaybackDirection): void {
    const state = this.#requirePlayback(sessionId)
    this.seek(sessionId, Math.min(state.liveHeadSeq, Math.max(0, state.cursorSeq + direction)))
  }

  setRate(sessionId: string, rate: PlaybackRate): void {
    this.#requirePlayback(sessionId)
    this.#update(sessionId, (state) => ({ ...state, rate }))
  }

  setSkipIdle(sessionId: string, skipIdle: boolean): void {
    this.#requirePlayback(sessionId)
    this.#update(sessionId, (state) => ({ ...state, skipIdle }))
  }

  syncLiveHead(sessionId: string, seq: number): void {
    assertSequence(seq)
    const state = this.#state(sessionId)
    if (seq < state.liveHeadSeq) {
      throw new RangeError(`Live head cannot move backward from ${state.liveHeadSeq} to ${seq}`)
    }
    this.#update(sessionId, (current) => ({
      ...current,
      liveHeadSeq: seq,
      cursorSeq: current.mode === 'live' ? seq : current.cursorSeq,
    }))
  }

  getState(sessionId: string): Readonly<PlaybackState> {
    return Object.freeze({ ...this.#state(sessionId) })
  }

  subscribe(sessionId: string, listener: PlaybackListener): () => void {
    const listeners = this.#listeners.get(sessionId) ?? new Set<PlaybackListener>()
    listeners.add(listener)
    this.#listeners.set(sessionId, listeners)
    listener(this.getState(sessionId))

    return () => {
      listeners.delete(listener)
      if (listeners.size === 0) this.#listeners.delete(sessionId)
    }
  }

  #state(sessionId: string): PlaybackState {
    const existing = this.#states.get(sessionId)
    if (existing !== undefined) return existing

    const created = initialState()
    this.#states.set(sessionId, created)
    return created
  }

  #requirePlayback(sessionId: string): PlaybackState {
    const state = this.#state(sessionId)
    if (state.mode === 'live') {
      throw new Error(`Session ${sessionId} is not in playback mode`)
    }
    return state
  }

  #update(sessionId: string, update: (state: PlaybackState) => PlaybackState): void {
    const next = update(this.#state(sessionId))
    this.#states.set(sessionId, next)
    for (const listener of this.#listeners.get(sessionId) ?? []) {
      listener(Object.freeze({ ...next }))
    }
  }
}
