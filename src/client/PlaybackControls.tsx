import type {
  PropsLocale,
  PropsRuntime,
} from '@deepseek-ai/dsh-client-ui-slots'
import { useEffect, useState } from 'react'
import {
  PLAYBACK_IDLE_LIMITS,
  PLAYBACK_RATES,
  type PlaybackDirection,
  type PlaybackIdleLimit,
  type PlaybackPosition,
  type PlaybackRate,
  type SessionPlayback,
} from './playback-controller.js'
import { PLAYBACK_LOCALE_NAMESPACE } from './locales.js'

type PlaybackControlsProps = PropsRuntime<'conversation.session.header.actions'>
  & PropsLocale<typeof PLAYBACK_LOCALE_NAMESPACE>
  & { playback: SessionPlayback }

type PositionMode = 'event' | 'turn' | 'time'

const worldTime = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

function PositionControl({
  sessionId,
  playback,
  position,
  t,
}: Pick<PlaybackControlsProps, 'sessionId' | 'playback' | 't'> & {
  position: PlaybackPosition
}) {
  const [mode, setMode] = useState<PositionMode>('event')
  const current = mode === 'event'
    ? position.event
    : mode === 'turn'
      ? position.turn
      : position.time
  const minimum = mode === 'time' ? position.startTime : 1
  const maximum = mode === 'event'
    ? position.events
    : mode === 'turn'
      ? position.turns
      : position.endTime
  const [draft, setDraft] = useState(current)

  useEffect(() => setDraft(current), [current, mode])

  const commit = (value: number) => {
    if (mode === 'event') playback.seekEvent(sessionId, value)
    else if (mode === 'turn') playback.seekTurn(sessionId, value)
    else playback.seekTime(sessionId, value)
  }
  const jumpLabel = mode === 'event'
    ? t('jumpToEvent')
    : mode === 'turn'
      ? t('jumpToTurn')
      : t('jumpToTime')
  const positionLabel = mode === 'event'
    ? `${Math.round(draft)} / ${position.events}`
    : mode === 'turn'
      ? `${Math.round(draft)} / ${position.turns}`
      : worldTime.format(new Date(draft))

  return <span className="dsh-btd-positionControl">
    <select
      className="dsh-btd-positionMode"
      aria-label={t('positionMode')}
      title={t('positionMode')}
      value={mode}
      onChange={(event) => setMode(event.currentTarget.value as PositionMode)}
    >
      <option value="event">{t('events')}</option>
      <option value="turn" disabled={position.turns === 0}>{t('turns')}</option>
      <option value="time">{t('time')}</option>
    </select>
    <input
      className="dsh-btd-positionRange"
      type="range"
      aria-label={jumpLabel}
      aria-valuetext={positionLabel}
      title={jumpLabel}
      min={minimum}
      max={Math.max(minimum, maximum)}
      step={mode === 'time' ? 'any' : 1}
      value={draft}
      disabled={maximum <= minimum}
      onChange={(event) => {
        const value = event.currentTarget.valueAsNumber
        setDraft(value)
        commit(value)
      }}
    />
    <output className="dsh-btd-position" title={positionLabel}>{positionLabel}</output>
  </span>
}

function PlaybackIcon({ kind }: { kind: 'replay' | 'step-back' | 'reverse' | 'pause' | 'forward' | 'step-forward' }) {
  const common = {
    width: 14,
    height: 14,
    viewBox: '0 0 14 14',
    fill: 'none',
    'aria-hidden': true,
  } as const

  if (kind === 'pause') {
    return <svg {...common}><path d="M4.5 3.25v7.5M9.5 3.25v7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
  }
  if (kind === 'replay') {
    return <svg {...common}><path d="M3.1 4.6A4.5 4.5 0 1 1 2.7 8M3.1 4.6V1.9M3.1 4.6H5.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
  }
  if (kind === 'step-back' || kind === 'step-forward') {
    const forward = kind === 'step-forward'
    return <svg {...common}>
      <path d={forward ? 'M4.1 3.3 8.4 7l-4.3 3.7' : 'M9.9 3.3 5.6 7l4.3 3.7'} stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d={forward ? 'M10.2 3v8' : 'M3.8 3v8'} stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  }
  const forward = kind === 'forward'
  return <svg {...common}>
    <path d={forward ? 'M3.2 3.1 7.4 7l-4.2 3.9zM7.1 3.1 11.3 7l-4.2 3.9z' : 'M10.8 3.1 6.6 7l4.2 3.9zM6.9 3.1 2.7 7l4.2 3.9z'} fill="currentColor" />
  </svg>
}

function IconButton({
  label,
  kind,
  active = false,
  pressed,
  disabled = false,
  onClick,
}: {
  label: string
  kind: Parameters<typeof PlaybackIcon>[0]['kind']
  active?: boolean
  pressed?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return <button
    type="button"
    className="dsh-btd-iconButton"
    aria-label={label}
    title={label}
    disabled={disabled}
    data-active={active}
    aria-pressed={pressed}
    onClick={onClick}
  >
    <PlaybackIcon kind={kind} />
  </button>
}

export function PlaybackControls({ sessionId, usePlayback, playback, t }: PlaybackControlsProps) {
  const state = usePlayback((value) => value)
  if (state.liveHeadSeq === 0) return null

  if (state.mode === 'live') {
    return <button
      type="button"
      className="dsh-btd-enter"
      data-session-playback-controls=""
      onClick={() => playback.enter(sessionId)}
    >
      <PlaybackIcon kind="replay" />
      <span>{t('enter')}</span>
    </button>
  }

  const position = playback.getPosition(sessionId)
  const atBase = state.cursorSeq <= state.loadedBaseSeq
    && state.cursorTime <= position.startTime
  const atHead = state.cursorSeq >= state.liveHeadSeq
    && state.cursorTime >= position.endTime
  const retryOlderHistory = atBase && state.historyLoadStatus === 'failed'
  const historyStatus = atBase ? state.historyLoadStatus : 'idle'
  const backwardDisabled = atBase && !retryOlderHistory
  const runBackward = (action: () => void) => {
    if (retryOlderHistory) void playback.retryOlderHistory(sessionId)
    else action()
  }
  const togglePlay = (direction: PlaybackDirection) => {
    if (state.mode === 'playing' && state.direction === direction) playback.pause(sessionId)
    else playback.play(sessionId, direction)
  }

  return <span className="dsh-btd-toolbarGroup" data-session-playback-controls="">
    <div
      className="dsh-btd-controls"
      role="group"
      aria-label={t('historical')}
    >
      <span
        className="dsh-btd-status"
        data-history-status={historyStatus}
        role="status"
        aria-live="polite"
        title={historyStatus === 'idle' ? t('readonly') : undefined}
      >
        {historyStatus === 'failed'
          ? <button
              type="button"
              className="dsh-btd-statusRetry"
              title={t('retryOlderHistory')}
              onClick={() => { void playback.retryOlderHistory(sessionId) }}
            >
              <span className="dsh-btd-statusDot" aria-hidden="true" />
              <span className="dsh-btd-statusLabel">{t('historyLoadFailed')}</span>
            </button>
          : <>
              <span className="dsh-btd-statusDot" aria-hidden="true" />
              <span className="dsh-btd-statusLabel">
                {t(historyStatus === 'loading' ? 'historyLoading' : 'historical')}
              </span>
            </>}
      </span>
      <PositionControl sessionId={sessionId} playback={playback} position={position} t={t} />
      <span className="dsh-btd-divider" aria-hidden="true" />
      <IconButton label={t(retryOlderHistory ? 'retryOlderHistory' : 'stepBack')} kind="step-back" disabled={backwardDisabled} onClick={() => runBackward(() => playback.step(sessionId, -1))} />
      <IconButton label={t(retryOlderHistory ? 'retryOlderHistory' : 'reverse')} kind="reverse" active={state.mode === 'playing' && state.direction === -1} pressed={state.mode === 'playing' && state.direction === -1} disabled={backwardDisabled} onClick={() => runBackward(() => togglePlay(-1))} />
      <IconButton label={t('pause')} kind="pause" disabled={state.mode !== 'playing'} onClick={() => playback.pause(sessionId)} />
      <IconButton label={t('forward')} kind="forward" active={state.mode === 'playing' && state.direction === 1} pressed={state.mode === 'playing' && state.direction === 1} disabled={atHead} onClick={() => togglePlay(1)} />
      <IconButton label={t('stepForward')} kind="step-forward" disabled={atHead} onClick={() => playback.step(sessionId, 1)} />
      <span className="dsh-btd-divider" aria-hidden="true" />
      <select
        className="dsh-btd-rate"
        aria-label={t('rate')}
        title={t('rate')}
        value={state.rate}
        onChange={(event) => playback.setRate(sessionId, Number(event.currentTarget.value) as PlaybackRate)}
      >
        {PLAYBACK_RATES.map((rate) => <option key={rate} value={rate}>{rate}×</option>)}
      </select>
      <button
        type="button"
        className="dsh-btd-idle"
        data-active={state.simulateTyping}
        aria-pressed={state.simulateTyping}
        title={t('simulateTyping')}
        onClick={() => playback.setSimulateTyping(sessionId, !state.simulateTyping)}
      >
        {t('simulateTyping')}
      </button>
      <button
        type="button"
        className="dsh-btd-idle"
        data-active={state.skipIdle}
        aria-pressed={state.skipIdle}
        title={t('skipIdle')}
        onClick={() => playback.setSkipIdle(sessionId, !state.skipIdle)}
      >
        {t('skipIdle')}
      </button>
      <select
        className="dsh-btd-idleDuration"
        aria-label={t('idleLimit')}
        title={t('idleLimit')}
        value={state.idleLimit}
        disabled={!state.skipIdle}
        onChange={(event) => playback.setIdleLimit(
          sessionId,
          Number(event.currentTarget.value) as PlaybackIdleLimit,
        )}
      >
        {PLAYBACK_IDLE_LIMITS.map((limit) => <option key={limit} value={limit}>
          {t('idleSeconds', { seconds: limit / 1_000 })}
        </option>)}
      </select>
      <button
        type="button"
        className="dsh-btd-live"
        title={t('exitReplay')}
        onClick={() => playback.exit(sessionId)}
      >
        <span className="dsh-btd-liveDot" aria-hidden="true" />
        {t('exitReplay')}
      </button>
    </div>
    <span className="dsh-btd-toolbarSeparator" aria-hidden="true" />
  </span>
}
