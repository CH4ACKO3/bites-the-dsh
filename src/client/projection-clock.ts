import type {
  ConversationSnapshot,
  ConversationTimelineSnapshot,
} from '@deepseek-ai/dsh-client-runtime/client'

export interface PlaybackProjectionClock {
  readonly kind: 'historical'
  readonly time: number
}

declare module '@deepseek-ai/dsh-client-runtime/client' {
  interface ConversationTimelineSnapshot {
    readonly playbackClock?: PlaybackProjectionClock
  }
}

export function withPlaybackClock(
  timeline: ConversationTimelineSnapshot,
  time: number,
): ConversationTimelineSnapshot {
  return {
    ...timeline,
    playbackClock: {
      kind: 'historical',
      time,
    },
  }
}

export function withConversationPlaybackClock(
  snapshot: ConversationSnapshot,
  time: number,
): ConversationSnapshot {
  const chat = {
    ...snapshot.chat,
    timeline: withPlaybackClock(snapshot.chat.timeline, time),
  }
  const sourceViews = snapshot.views as unknown as { get(target: string): unknown }
  const views = {
    get: (target: string) => target === 'chat' ? chat : sourceViews.get(target),
  } as ConversationSnapshot['views']

  return {
    ...snapshot,
    chat,
    views,
  }
}
