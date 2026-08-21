export const PLAYBACK_RATES = [0.25, 0.5, 1, 2, 4, 8, 16] as const
export const PLAYBACK_IDLE_LIMITS = [1_000, 3_000, 5_000, 10_000, 30_000] as const

export type PlaybackRate = (typeof PLAYBACK_RATES)[number]
export type PlaybackIdleLimit = (typeof PLAYBACK_IDLE_LIMITS)[number]
export type PlaybackDirection = 1 | -1
export type PlaybackMode = 'live' | 'paused' | 'playing'
export type HistoryLoadStatus = 'idle' | 'loading' | 'failed'

export interface PlaybackEventClock {
  readonly seq: number
  readonly time: number
  readonly turn?: number
}

export interface PlaybackPosition {
  readonly event: number
  readonly events: number
  readonly turn: number
  readonly turns: number
  readonly time: number
  readonly startTime: number
  readonly endTime: number
}

export interface PlaybackState {
  mode: PlaybackMode
  direction: PlaybackDirection
  rate: PlaybackRate
  cursorSeq: number
  cursorTime: number
  liveHeadSeq: number
  loadedBaseSeq: number
  hasMoreHistory: boolean
  skipIdle: boolean
  idleLimit: PlaybackIdleLimit
  simulateTyping: boolean
  historyLoadStatus: HistoryLoadStatus
}

export interface PlaybackFrameClock {
  request(callback: (now: number) => void): number
  cancel(id: number): void
}

export interface SessionPlayback {
  enter(sessionId: string): void
  exit(sessionId: string): void
  play(sessionId: string, direction?: PlaybackDirection): void
  pause(sessionId: string): void
  seek(sessionId: string, seq: number): void
  step(sessionId: string, direction: PlaybackDirection): void
  setRate(sessionId: string, rate: PlaybackRate): void
  setSkipIdle(sessionId: string, skipIdle: boolean): void
  setIdleLimit(sessionId: string, limit: PlaybackIdleLimit): void
  setSimulateTyping(sessionId: string, simulateTyping: boolean): void
  retryOlderHistory(sessionId: string): Promise<void>
  getPosition(sessionId: string): PlaybackPosition
  seekEvent(sessionId: string, event: number): void
  seekTurn(sessionId: string, turn: number): void
  seekTime(sessionId: string, time: number): void
  getState(sessionId: string): Readonly<PlaybackState>
  subscribe(sessionId: string, listener: PlaybackListener): () => void
}

export type PlaybackListener = (state: Readonly<PlaybackState>) => void
export type PlaybackReadonlyEffect = (sessionId: string, active: boolean) => void

interface SessionPlaybackRuntime {
  events: readonly PlaybackEventClock[]
  eventIndexBySeq: ReadonlyMap<number, number>
  turns: readonly {
    readonly firstSeq: number
    readonly lastSeq: number
  }[]
  startTime: number
  endTime: number
  frameId: number | null
  frameTime: number | null
  segment: {
    readonly targetSeq: number
    readonly startTime: number
    readonly targetTime: number
    readonly duration: number
    elapsed: number
  } | null
  historyLoader: (() => Promise<void>) | null
  historyLoad: Promise<void> | null
  lastHistoryBaseSeq: number | null
}

const browserFrameClock: PlaybackFrameClock = {
  request: (callback) => window.requestAnimationFrame(callback),
  cancel: (id) => window.cancelAnimationFrame(id),
}

function initialState(): PlaybackState {
  return {
    mode: 'live',
    direction: 1,
    rate: 1,
    cursorSeq: 0,
    cursorTime: 0,
    liveHeadSeq: 0,
    loadedBaseSeq: 0,
    hasMoreHistory: false,
    skipIdle: true,
    idleLimit: 1_000,
    simulateTyping: false,
    historyLoadStatus: 'idle',
  }
}

function initialRuntime(): SessionPlaybackRuntime {
  return {
    events: [],
    eventIndexBySeq: new Map(),
    turns: [],
    startTime: 0,
    endTime: 0,
    frameId: null,
    frameTime: null,
    segment: null,
    historyLoader: null,
    historyLoad: null,
    lastHistoryBaseSeq: null,
  }
}

function assertSequence(seq: number): void {
  if (!Number.isSafeInteger(seq) || seq < 0) {
    throw new RangeError(`Sequence must be a non-negative safe integer: ${seq}`)
  }
}

function isPlaybackRate(value: number): value is PlaybackRate {
  return PLAYBACK_RATES.some((rate) => rate === value)
}

function isPlaybackIdleLimit(value: number): value is PlaybackIdleLimit {
  return PLAYBACK_IDLE_LIMITS.some((limit) => limit === value)
}

export class SessionPlaybackController implements SessionPlayback {
  readonly #states = new Map<string, PlaybackState>()
  readonly #runtimes = new Map<string, SessionPlaybackRuntime>()
  readonly #listeners = new Map<string, Set<PlaybackListener>>()
  readonly #stores = new Map<string, {
    getSnapshot: () => PlaybackState
    subscribe: (listener: () => void) => () => void
  }>()
  readonly #clock: PlaybackFrameClock
  #readonlyEffect: PlaybackReadonlyEffect = () => {}

  constructor(clock: PlaybackFrameClock = browserFrameClock) {
    this.#clock = clock
  }

  setReadonlyEffect(effect: PlaybackReadonlyEffect): void {
    this.#readonlyEffect = effect
  }

  syncEvents(
    sessionId: string,
    events: readonly PlaybackEventClock[],
    hasMoreHistory: boolean,
  ): void {
    for (let index = 0; index < events.length; index += 1) {
      const event = events[index]
      if (event === undefined) continue
      assertSequence(event.seq)
      if (!Number.isFinite(event.time)) {
        throw new RangeError(`Event time must be finite: ${event.time}`)
      }
      if (index > 0 && event.seq <= events[index - 1]!.seq) {
        throw new Error(`Playback events must be strictly ordered by seq: ${event.seq}`)
      }
    }

    const runtime = this.#runtime(sessionId)
    runtime.events = events
    runtime.eventIndexBySeq = new Map(events.map((event, index) => [event.seq, index]))
    const turns = new Map<number, { firstSeq: number; lastSeq: number }>()
    for (const event of events) {
      if (event.turn === undefined) continue
      const current = turns.get(event.turn)
      if (current === undefined) turns.set(event.turn, { firstSeq: event.seq, lastSeq: event.seq })
      else current.lastSeq = event.seq
    }
    runtime.turns = [...turns.values()]
    runtime.startTime = events.reduce(
      (earliest, event) => Math.min(earliest, event.time),
      events[0]?.time ?? 0,
    )
    runtime.endTime = events.reduce(
      (latest, event) => Math.max(latest, event.time),
      events[0]?.time ?? 0,
    )
    const first = events[0]?.seq ?? 0
    const head = events.at(-1)?.seq ?? 0
    const headTime = events.at(-1)?.time ?? 0
    this.#update(sessionId, (state) => ({
      ...state,
      loadedBaseSeq: first,
      liveHeadSeq: head,
      hasMoreHistory,
      historyLoadStatus: state.loadedBaseSeq !== first || !hasMoreHistory
        ? 'idle'
        : state.historyLoadStatus,
      cursorSeq: state.mode === 'live'
        ? head
        : Math.min(head, Math.max(first, state.cursorSeq)),
      cursorTime: state.mode === 'live'
        ? headTime
        : Math.min(runtime.endTime, Math.max(runtime.startTime, state.cursorTime)),
    }))
  }

  enter(sessionId: string): void {
    const state = this.#state(sessionId)
    if (state.mode !== 'live') return
    this.#update(sessionId, (current) => ({ ...current, mode: 'paused' }))
    this.#readonlyEffect(sessionId, true)
  }

  exit(sessionId: string): void {
    this.#cancelFrame(sessionId)
    this.#update(sessionId, (state) => ({
      ...state,
      mode: 'live',
      direction: 1,
      cursorSeq: state.liveHeadSeq,
      cursorTime: this.#runtime(sessionId).events.at(-1)?.time ?? 0,
    }))
    this.#readonlyEffect(sessionId, false)
  }

  play(sessionId: string, direction: PlaybackDirection = 1): void {
    const state = this.#requirePlayback(sessionId)
    const runtime = this.#runtime(sessionId)
    const index = runtime.eventIndexBySeq.get(state.cursorSeq) ?? -1
    const current = runtime.events[index]
    const hasTarget = index >= 0 && (
      direction === -1 && current !== undefined && state.cursorTime > current.time
      || runtime.events[index + direction] !== undefined
    )
    if (!hasTarget) {
      this.pause(sessionId)
      return
    }

    this.#cancelFrame(sessionId)
    runtime.frameTime = null
    runtime.segment = null
    this.#update(sessionId, (current) => ({ ...current, mode: 'playing', direction }))
    runtime.frameId = this.#clock.request((now) => this.#tick(sessionId, now))
  }

  pause(sessionId: string): void {
    this.#requirePlayback(sessionId)
    this.#cancelFrame(sessionId)
    this.#update(sessionId, (state) => ({ ...state, mode: 'paused' }))
  }

  seek(sessionId: string, seq: number): void {
    assertSequence(seq)
    const state = this.#requirePlayback(sessionId)
    const runtime = this.#runtime(sessionId)
    const targetIndex = runtime.eventIndexBySeq.get(seq)
    const target = targetIndex === undefined ? undefined : runtime.events[targetIndex]
    if (target === undefined) {
      throw new RangeError(
        `Sequence ${seq} is outside the loaded event window ${state.loadedBaseSeq}-${state.liveHeadSeq}`,
      )
    }
    runtime.frameTime = null
    runtime.segment = null
    this.#update(sessionId, (current) => ({
      ...current,
      cursorSeq: seq,
      cursorTime: target.time,
    }))
  }

  step(sessionId: string, direction: PlaybackDirection): void {
    const state = this.#requirePlayback(sessionId)
    const runtime = this.#runtime(sessionId)
    const index = runtime.eventIndexBySeq.get(state.cursorSeq) ?? -1
    const current = runtime.events[index]
    const next = direction === -1
      && current !== undefined
      && state.cursorTime > current.time
      ? current
      : runtime.events[index + direction]
    this.#cancelFrame(sessionId)
    if (next === undefined) {
      this.#update(sessionId, (current) => ({ ...current, mode: 'paused', direction }))
      return
    }
    this.#update(sessionId, (current) => ({
      ...current,
      mode: 'paused',
      direction,
      cursorSeq: next.seq,
      cursorTime: next.time,
    }))
  }

  setRate(sessionId: string, rate: PlaybackRate): void {
    this.#requirePlayback(sessionId)
    if (!isPlaybackRate(rate)) throw new RangeError(`Unsupported playback rate: ${rate}`)
    this.#update(sessionId, (state) => ({ ...state, rate }))
  }

  setSkipIdle(sessionId: string, skipIdle: boolean): void {
    this.#requirePlayback(sessionId)
    this.#runtime(sessionId).segment = null
    this.#update(sessionId, (state) => ({ ...state, skipIdle }))
  }

  setIdleLimit(sessionId: string, limit: PlaybackIdleLimit): void {
    this.#requirePlayback(sessionId)
    if (!isPlaybackIdleLimit(limit)) throw new RangeError(`Unsupported idle limit: ${limit}`)
    this.#runtime(sessionId).segment = null
    this.#update(sessionId, (state) => ({ ...state, idleLimit: limit }))
  }

  setSimulateTyping(sessionId: string, simulateTyping: boolean): void {
    this.#requirePlayback(sessionId)
    this.#update(sessionId, (state) => ({ ...state, simulateTyping }))
  }

  setHistoryLoader(sessionId: string, loader: (() => Promise<void>) | null): void {
    this.#runtime(sessionId).historyLoader = loader
  }

  async loadOlder(sessionId: string, retry = false): Promise<void> {
    const state = this.#requirePlayback(sessionId)
    const runtime = this.#runtime(sessionId)
    if (!state.hasMoreHistory || runtime.historyLoader === null) return
    if (runtime.historyLoad !== null) return runtime.historyLoad
    if (!retry && runtime.lastHistoryBaseSeq === state.loadedBaseSeq) return

    runtime.lastHistoryBaseSeq = state.loadedBaseSeq
    this.#update(sessionId, (current) => ({ ...current, historyLoadStatus: 'loading' }))
    const load = (async () => {
      try {
        await runtime.historyLoader?.()
        if (this.#runtimes.get(sessionId) === runtime) {
          this.#update(sessionId, (current) => ({ ...current, historyLoadStatus: 'idle' }))
        }
      } catch {
        if (this.#runtimes.get(sessionId) === runtime) {
          this.#update(sessionId, (current) => ({ ...current, historyLoadStatus: 'failed' }))
        }
      }
    })()
    runtime.historyLoad = load
    await load
    if (runtime.historyLoad === load) runtime.historyLoad = null
  }

  retryOlderHistory(sessionId: string): Promise<void> {
    return this.loadOlder(sessionId, true)
  }

  getPosition(sessionId: string): PlaybackPosition {
    const state = this.#state(sessionId)
    const runtime = this.#runtime(sessionId)
    const eventIndex = runtime.eventIndexBySeq.get(state.cursorSeq) ?? -1
    const event = runtime.events[eventIndex]
    if (event === undefined) {
      return {
        event: 0,
        events: 0,
        turn: 0,
        turns: 0,
        time: 0,
        startTime: 0,
        endTime: 0,
      }
    }

    const turnIndex = runtime.turns.findLastIndex((turn) => turn.firstSeq <= event.seq)
    return {
      event: eventIndex + 1,
      events: runtime.events.length,
      turn: turnIndex + 1,
      turns: runtime.turns.length,
      time: state.cursorTime,
      startTime: runtime.startTime,
      endTime: runtime.endTime,
    }
  }

  seekEvent(sessionId: string, event: number): void {
    this.seek(sessionId, this.#eventAtPosition(sessionId, event).seq)
  }

  #eventAtPosition(sessionId: string, event: number): PlaybackEventClock {
    if (!Number.isSafeInteger(event) || event < 1) {
      throw new RangeError(`Event position must be a positive safe integer: ${event}`)
    }
    const target = this.#runtime(sessionId).events[event - 1]
    if (target === undefined) throw new RangeError(`Event position is outside the loaded window: ${event}`)
    return target
  }

  seekTurn(sessionId: string, turn: number): void {
    if (!Number.isSafeInteger(turn) || turn < 1) {
      throw new RangeError(`Turn position must be a positive safe integer: ${turn}`)
    }
    const target = this.#runtime(sessionId).turns[turn - 1]
    if (target === undefined) throw new RangeError(`Turn position is outside the loaded window: ${turn}`)
    this.seek(sessionId, target.lastSeq)
  }

  seekTime(sessionId: string, time: number): void {
    if (!Number.isFinite(time)) throw new RangeError(`Time position must be finite: ${time}`)
    this.#requirePlayback(sessionId)
    const runtime = this.#runtime(sessionId)
    if (time < runtime.startTime || time > runtime.endTime) {
      throw new RangeError(
        `Time position is outside the loaded window ${runtime.startTime}-${runtime.endTime}: ${time}`,
      )
    }

    let lower = 0
    let upper = runtime.events.length
    while (lower < upper) {
      const middle = Math.floor((lower + upper) / 2)
      if (runtime.events[middle]!.time <= time) lower = middle + 1
      else upper = middle
    }
    const target = runtime.events[lower - 1]
    if (target === undefined) throw new RangeError('Time position is outside an empty event window')
    this.#cancelFrame(sessionId)
    this.#update(sessionId, (state) => ({
      ...state,
      mode: 'paused',
      cursorSeq: target.seq,
      cursorTime: time,
    }))
  }

  getState(sessionId: string): Readonly<PlaybackState> {
    return this.#state(sessionId)
  }

  storeFor(sessionId: string): {
    getSnapshot: () => PlaybackState
    subscribe: (listener: () => void) => () => void
  } {
    const existing = this.#stores.get(sessionId)
    if (existing !== undefined) return existing

    const created = {
      getSnapshot: () => this.#state(sessionId),
      subscribe: (listener: () => void) => this.subscribe(sessionId, () => listener()),
    }
    this.#stores.set(sessionId, created)
    return created
  }

  subscribe(sessionId: string, listener: PlaybackListener): () => void {
    const listeners = this.#listeners.get(sessionId) ?? new Set<PlaybackListener>()
    listeners.add(listener)
    this.#listeners.set(sessionId, listeners)

    return () => {
      listeners.delete(listener)
      if (listeners.size === 0) this.#listeners.delete(sessionId)
    }
  }

  dispose(): void {
    for (const sessionId of this.#states.keys()) {
      this.#cancelFrame(sessionId)
      if (this.#state(sessionId).mode !== 'live') this.#readonlyEffect(sessionId, false)
    }
    this.#listeners.clear()
    this.#stores.clear()
    this.#states.clear()
    this.#runtimes.clear()
  }

  #tick(sessionId: string, now: number): void {
    const state = this.#state(sessionId)
    const runtime = this.#runtime(sessionId)
    runtime.frameId = null
    if (state.mode !== 'playing') return

    if (runtime.frameTime === null) {
      runtime.frameTime = now
      runtime.frameId = this.#clock.request((nextNow) => this.#tick(sessionId, nextNow))
      return
    }

    let budget = Math.max(0, now - runtime.frameTime) * state.rate
    runtime.frameTime = now
    let index = runtime.eventIndexBySeq.get(state.cursorSeq) ?? -1
    let cursorSeq = state.cursorSeq
    let cursorTime = state.cursorTime

    while (index >= 0) {
      let segment = runtime.segment
      if (segment === null) {
        const current = runtime.events[index]
        const targetIndex = state.direction === -1
          && current !== undefined
          && cursorTime > current.time
          ? index
          : index + state.direction
        const target = runtime.events[targetIndex]
        if (target === undefined) break
        const recordedDuration = Math.abs(target.time - cursorTime)
        segment = {
          targetSeq: target.seq,
          startTime: cursorTime,
          targetTime: target.time,
          duration: state.skipIdle
            ? Math.min(state.idleLimit, recordedDuration)
            : recordedDuration,
          elapsed: 0,
        }
        runtime.segment = segment
      }

      const targetIndex = runtime.eventIndexBySeq.get(segment.targetSeq) ?? -1
      const target = runtime.events[targetIndex]
      if (target === undefined) {
        runtime.segment = null
        break
      }
      const remaining = segment.duration - segment.elapsed
      if (remaining <= budget) {
        budget -= remaining
        cursorSeq = target.seq
        cursorTime = target.time
        index = targetIndex
        runtime.segment = null
        continue
      }

      if (budget === 0) break
      segment.elapsed += budget
      cursorTime = segment.startTime
        + (segment.targetTime - segment.startTime) * segment.elapsed / segment.duration
      if (state.direction === -1) cursorSeq = target.seq
      budget = 0
      break
    }

    if (cursorSeq !== state.cursorSeq || cursorTime !== state.cursorTime) {
      this.#update(sessionId, (current) => ({ ...current, cursorSeq, cursorTime }))
    }

    const current = runtime.events[index]
    const hasTarget = state.direction === -1
      && current !== undefined
      && cursorTime > current.time
      || runtime.events[index + state.direction] !== undefined
    if (!hasTarget) {
      runtime.frameTime = null
      runtime.segment = null
      this.#update(sessionId, (current) => ({ ...current, mode: 'paused' }))
      return
    }

    runtime.frameId = this.#clock.request((nextNow) => this.#tick(sessionId, nextNow))
  }

  #state(sessionId: string): PlaybackState {
    const existing = this.#states.get(sessionId)
    if (existing !== undefined) return existing

    const created = Object.freeze(initialState())
    this.#states.set(sessionId, created)
    return created
  }

  #runtime(sessionId: string): SessionPlaybackRuntime {
    const existing = this.#runtimes.get(sessionId)
    if (existing !== undefined) return existing

    const created = initialRuntime()
    this.#runtimes.set(sessionId, created)
    return created
  }

  #requirePlayback(sessionId: string): PlaybackState {
    const state = this.#state(sessionId)
    if (state.mode === 'live') throw new Error(`Session ${sessionId} is not in playback mode`)
    return state
  }

  #cancelFrame(sessionId: string): void {
    const runtime = this.#runtime(sessionId)
    if (runtime.frameId !== null) this.#clock.cancel(runtime.frameId)
    runtime.frameId = null
    runtime.frameTime = null
    runtime.segment = null
  }

  #update(sessionId: string, update: (state: PlaybackState) => PlaybackState): void {
    const current = this.#state(sessionId)
    const next = Object.freeze(update(current))
    if (
      next.mode === current.mode
      && next.direction === current.direction
      && next.rate === current.rate
      && next.cursorSeq === current.cursorSeq
      && next.cursorTime === current.cursorTime
      && next.liveHeadSeq === current.liveHeadSeq
      && next.loadedBaseSeq === current.loadedBaseSeq
      && next.hasMoreHistory === current.hasMoreHistory
      && next.skipIdle === current.skipIdle
      && next.idleLimit === current.idleLimit
      && next.simulateTyping === current.simulateTyping
      && next.historyLoadStatus === current.historyLoadStatus
    ) return

    this.#states.set(sessionId, next)
    for (const listener of this.#listeners.get(sessionId) ?? []) listener(next)
  }
}
