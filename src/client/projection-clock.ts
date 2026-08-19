import type { ConversationTimelineSnapshot } from '@deepseek-ai/dsh-client-runtime/client'

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
