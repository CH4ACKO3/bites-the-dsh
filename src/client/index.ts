import type { ClientContext, SessionBinding } from '@deepseek-ai/dsh-client-runtime/client'
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import './contract.js'
import { PlaybackControls } from './PlaybackControls.js'
import {
  decorateChatView,
  decorateConversationRoot,
  decorateInputBar,
  decorateMessageIconActions,
} from './decorators.js'
import {
  PLAYBACK_LOCALE_NAMESPACE,
  playbackDictionaries,
} from './locales.js'
import {
  type SessionPlayback,
} from './playback-controller.js'
import {
  configurePlaybackProjection,
  playbackEventsOf,
} from './playback-projection.js'
import { registerPlaybackEvents } from './raw-events.js'
import { playbackController } from './runtime.js'
import { installPlaybackStyles } from './styles.js'

declare module '@deepseek-ai/cordis' {
  interface Context {
    sessionPlayback: SessionPlayback
  }
}

export const name = '@ch4acko3/dsh-bites-the-dust'
export const inject = [
  'slots',
  'sessions',
  'conversationEvents',
  'conversationViews',
  'conversation',
  'locale',
] as const

export function apply(ctx: ClientContext): void {
  const playback = playbackController
  const sessionSubscriptions = new Map<string, () => void>()
  const historyLoads = new Set<string>()

  registerPlaybackEvents(ctx)
  configurePlaybackProjection(ctx)

  ctx.effect(
    () => ctx.locale.register(PLAYBACK_LOCALE_NAMESPACE, playbackDictionaries),
    'dsh-bites-the-dust: dictionaries',
  )
  const t = ctx.locale.bind(PLAYBACK_LOCALE_NAMESPACE)
  playback.setReadonlyEffect((sessionId, active) => {
    ctx.conversation.blocks.set(sessionId as SessionId, active ? { reason: t('readonly') } : undefined)
  })
  ctx.provide('sessionPlayback', playback)

  const attach = (binding: SessionBinding) => {
    if (!sessionSubscriptions.has(binding.sessionId)) {
      const sync = () => {
        const snapshot = binding.session.getSnapshot()
        const events = playbackEventsOf(snapshot).entries.map(({ event, location }) => ({
          seq: event.seq,
          time: event.time,
          turn: location.kind === 'turn' || location.kind === 'step'
            ? location.turn.turn
            : undefined,
        }))
        playback.syncEvents(binding.sessionId, events, snapshot.hasMore)
      }
      sync()
      const unsubscribeSession = binding.session.subscribe(sync)
      const unsubscribePlayback = playback.subscribe(binding.sessionId, (state) => {
        const snapshot = binding.session.getSnapshot()
        if (
          state.mode === 'live'
          || state.cursorSeq > state.loadedBaseSeq
          || !snapshot.hasMore
          || snapshot.loadingOlder
          || historyLoads.has(binding.sessionId)
        ) return

        historyLoads.add(binding.sessionId)
        void binding.session.loadOlder()
          .catch(() => undefined)
          .finally(() => historyLoads.delete(binding.sessionId))
      })
      sessionSubscriptions.set(binding.sessionId, () => {
        unsubscribePlayback()
        unsubscribeSession()
      })
    }
    return playback.storeFor(binding.sessionId)
  }

  ctx.effect(() => {
    const disposeProvider = ctx.sessions.provide({
      hooks: ['playback'],
      resolve: (binding) => ({
        hooks: { playback: attach(binding) },
      }),
    })
    return () => {
      disposeProvider()
      for (const unsubscribe of sessionSubscriptions.values()) unsubscribe()
      sessionSubscriptions.clear()
      historyLoads.clear()
      playback.dispose()
    }
  }, 'dsh-bites-the-dust: playback session feed')

  ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
    name: 'conversation.session.header.actions',
    id: 'session-playback',
    order: 100,
    locale: PLAYBACK_LOCALE_NAMESPACE,
    inject: () => ({ playback }),
  }, PlaybackControls))

  ctx.effect(installPlaybackStyles, 'dsh-bites-the-dust: styles')
}

export {
  decorateChatView,
  decorateConversationRoot,
  decorateInputBar,
  decorateMessageIconActions,
}
export * from './playback-controller.js'
export * from './projection-clock.js'
export * from './raw-events.js'
