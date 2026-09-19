import type {
  ConversationTimelineSnapshot,
} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { PlaybackSnapshot as ConversationSnapshot } from './playback-snapshot.js'

export interface PlaybackProjectionClock {
  readonly kind: 'historical'
  readonly time: number
}

declare module '@deepseek-ai/dsh-client-ui-conversation/client' {
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
