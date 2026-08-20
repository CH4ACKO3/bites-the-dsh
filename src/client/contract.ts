import type {
  MaybeSnapshotSelectorHook,
  SnapshotSelectorHook,
} from '@deepseek-ai/dsh-client-ui-slots'
import type { PlaybackState } from './playback-controller.js'

export type PlaybackLocaleKey =
  | 'enter'
  | 'historical'
  | 'stepBack'
  | 'reverse'
  | 'pause'
  | 'forward'
  | 'stepForward'
  | 'rate'
  | 'skipIdle'
  | 'simulateTyping'
  | 'idleLimit'
  | 'idleSeconds'
  | 'positionMode'
  | 'events'
  | 'turns'
  | 'time'
  | 'jumpToEvent'
  | 'jumpToTurn'
  | 'jumpToTime'
  | 'exitReplay'
  | 'readonly'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'bites-the-dsh': PlaybackLocaleKey
  }

  interface SessionStandardProps {
    usePlayback: SnapshotSelectorHook<PlaybackState>
  }

  interface SessionMaybeStandardProps {
    usePlayback: MaybeSnapshotSelectorHook<PlaybackState>
  }
}
