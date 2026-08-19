import type { ComponentType, ReactNode } from 'react'
import { createContext, useContext, useMemo, useSyncExternalStore } from 'react'
import type {
  ChatViewSlotProps,
  ConversationSlotProps,
} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import { projectConversationSnapshot } from './playback-projection.js'
import { playbackController } from './runtime.js'
import { bindProjectedSession } from './session-hook.js'

type ConversationRootRuntimeProps = ConversationSlotProps & {
  sessionId: SessionId | undefined
}

const NO_SESSION_PLAYBACK_KEY = '__dsh-bites-the-dust:no-session__'
const HistoricalPlaybackContext = createContext(false)

type InputBarRuntimeProps = Record<string, unknown> & { disabled?: boolean }

type MessageIconActionsRuntimeProps = Record<string, unknown> & {
  onBranch?: () => void
  extraActions?: ReactNode
}

export function decorateConversationRoot(Original: ComponentType<ConversationSlotProps>) {
  return function PlaybackConversationRoot(props: ConversationSlotProps) {
    const { sessionId } = props as ConversationRootRuntimeProps
    const store = useMemo(
      () => playbackController.storeFor(sessionId ?? NO_SESSION_PLAYBACK_KEY),
      [sessionId],
    )
    const playback = useSyncExternalStore(
      store.subscribe,
      store.getSnapshot,
      store.getSnapshot,
    )
    const active = sessionId !== undefined && playback.mode !== 'live'

    return <HistoricalPlaybackContext.Provider value={active}>
      <div
        style={{ display: 'contents' }}
        data-session-playback-readonly={active || undefined}
      >
        <Original {...props} />
      </div>
    </HistoricalPlaybackContext.Provider>
  }
}

export function decorateInputBar(Original: ComponentType<InputBarRuntimeProps>) {
  return function PlaybackInputBar(props: InputBarRuntimeProps) {
    const historical = useContext(HistoricalPlaybackContext)
    return <Original {...props} disabled={historical || props.disabled} />
  }
}

export function decorateMessageIconActions(Original: ComponentType<MessageIconActionsRuntimeProps>) {
  return function PlaybackMessageIconActions(props: MessageIconActionsRuntimeProps) {
    const historical = useContext(HistoricalPlaybackContext)
    return <Original
      {...props}
      onBranch={historical ? undefined : props.onBranch}
      extraActions={historical ? null : props.extraActions}
    />
  }
}

export function decorateChatView(Original: ComponentType<ChatViewSlotProps>) {
  return function PlaybackChatView(props: ChatViewSlotProps) {
    const playback = props.usePlayback((value) => value)
    const liveSnapshot = props.useSession((value) => value)
    const projected = useMemo(
      () => projectConversationSnapshot(liveSnapshot, playback),
      [liveSnapshot, playback],
    )
    const useProjectedSession = useMemo(
      () => bindProjectedSession(props.useSession, projected),
      [projected, props.useSession],
    )

    return <Original
      {...props}
      useSession={playback.mode === 'live' ? props.useSession : useProjectedSession}
    />
  }
}
