import type { PlaybackState } from './playback-controller.js'
import type { PlaybackEntry } from './raw-events.js'

const EMPTY_LIST: readonly never[] = Object.freeze([])
const MIN_TYPING_DURATION = 600
const MAX_TYPING_DURATION = 4_000
const MS_PER_GRAPHEME = 50
const graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

export interface InputStateRuntime {
  readonly draft: string
  readonly imageIds: readonly unknown[]
  readonly phase: 'plain' | 'adjudicating' | 'claimed' | 'submitting'
  readonly claim?: unknown
  readonly occurrences: readonly unknown[]
  readonly paste?: unknown
  readonly [key: string]: unknown
}

export type MaybeInputHook = <Selected>(
  selector: (state: InputStateRuntime) => Selected,
  equal?: (left: Selected, right: Selected) => boolean,
) => Selected | undefined

function userText(entry: PlaybackEntry): string | undefined {
  const { event } = entry
  if (event.type !== 'user/message' || event.data.source.kind !== 'user') return undefined
  const text = event.data.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
  return text === '' ? undefined : text
}

function typingDuration(graphemes: number): number {
  return Math.min(MAX_TYPING_DURATION, Math.max(MIN_TYPING_DURATION, graphemes * MS_PER_GRAPHEME))
}

function typingStart(
  entries: readonly PlaybackEntry[],
  targetIndex: number,
  targetTime: number,
  duration: number,
  skipIdle: boolean,
): number {
  if (!skipIdle) return Math.max(entries[0]?.event.time ?? targetTime, targetTime - duration)

  let anchorIndex = targetIndex - 1
  if (entries[anchorIndex]?.event.type === 'turn/start') anchorIndex -= 1
  return Math.min(entries[anchorIndex]?.event.time ?? targetTime - duration, targetTime)
}

export function simulatedDraftAt(
  entries: readonly PlaybackEntry[],
  playback: Pick<PlaybackState, 'cursorSeq' | 'cursorTime' | 'skipIdle'>,
): string {
  const targetIndex = entries.findIndex((entry) => (
    entry.event.seq > playback.cursorSeq && userText(entry) !== undefined
  ))
  if (targetIndex < 0) return ''

  const target = entries[targetIndex]!
  const text = userText(target)!
  const graphemes = [...graphemeSegmenter.segment(text)].map(({ segment }) => segment)
  const start = typingStart(
    entries,
    targetIndex,
    target.event.time,
    typingDuration(graphemes.length),
    playback.skipIdle,
  )
  if (playback.cursorTime <= start || playback.cursorTime >= target.event.time) return ''

  const progress = (playback.cursorTime - start) / (target.event.time - start)
  return graphemes.slice(0, Math.ceil(graphemes.length * progress)).join('')
}

export function bindSimulatedInput(useInput: MaybeInputHook, draft: string): MaybeInputHook {
  return (selector, equal) => useInput((state) => selector({
    ...state,
    draft,
    imageIds: EMPTY_LIST,
    phase: 'plain',
    claim: undefined,
    occurrences: EMPTY_LIST,
    paste: undefined,
  }), equal)
}
