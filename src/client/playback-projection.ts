import {
  ConversationNodeAssembler,
  type ChatSnapshot,
  type ClientContext,
  type ConversationRuntime,
  type ConversationSnapshot,
} from '@deepseek-ai/dsh-client-runtime/client'
import type { PlaybackState } from './playback-controller.js'
import { withPlaybackClock } from './projection-clock.js'
import {
  EMPTY_PLAYBACK_EVENTS,
  PLAYBACK_TARGET,
  type PlaybackEventSnapshot,
} from './raw-events.js'

let conversationRuntime: ConversationRuntime | undefined

export function configurePlaybackProjection(ctx: ClientContext): void {
  conversationRuntime = {
    events: ctx.conversationEvents,
    views: ctx.conversationViews,
  }
}

export function playbackEventsOf(snapshot: ConversationSnapshot): PlaybackEventSnapshot {
  const views = snapshot.views as unknown as {
    get(target: string): unknown
  }
  return views.get(PLAYBACK_TARGET) as PlaybackEventSnapshot | undefined
    ?? EMPTY_PLAYBACK_EVENTS
}

export function projectConversationSnapshot(
  snapshot: ConversationSnapshot,
  playback: PlaybackState,
): ConversationSnapshot {
  if (playback.mode === 'live') return snapshot
  if (conversationRuntime === undefined) {
    throw new Error('Playback projection runtime is not configured')
  }

  const inputs = playbackEventsOf(snapshot).entries
    .filter(({ event }) => event.seq <= playback.cursorSeq)
    .map(({ event, view }) => ({ event, view }))
  const assembler = new ConversationNodeAssembler(
    conversationRuntime.events,
    conversationRuntime.views,
  )
  assembler.replaceWindow(inputs, snapshot.hasMore)
  assembler.flush()

  const chat = assembler.snapshot('chat') as ChatSnapshot | undefined
  if (chat === undefined) {
    throw new Error('Playback projection could not resolve the native chat view')
  }
  const projectedChat = {
    ...chat,
    timeline: withPlaybackClock(chat.timeline, playback.cursorTime),
  }
  const views = {
    get: (target: string) => target === 'chat'
      ? projectedChat
      : (assembler as unknown as { get(target: string): unknown }).get(target),
  } as ConversationSnapshot['views']

  return {
    ...snapshot,
    views,
    chat: projectedChat,
    nodes: chat.legacy.nodes,
    turnTimings: chat.legacy.turnTimings,
    turnEnds: chat.legacy.turnEnds,
    partial: chat.legacy.partial,
    runningCalls: chat.legacy.runningCalls,
    pending: [],
    queue: [],
    running: false,
    loadingOlder: false,
    promptError: null,
    lastAgentError: null,
  }
}
