import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {
  ConversationEventInput,
  ConversationLocation,
  ConversationNodeDefinition,
  ConversationViewBuilder,
  ConversationViewDefinition,
  ConversationViewNode,
} from '@deepseek-ai/dsh-client-runtime/client'

export const PLAYBACK_TARGET = 'session-playback'

export interface PlaybackEntry extends ConversationEventInput {
  readonly location: ConversationLocation
}

export interface PlaybackEventNode extends ConversationViewNode {
  readonly target: typeof PLAYBACK_TARGET
  readonly anchorSeq: number
  readonly data: PlaybackEntry
}

export interface PlaybackEventSnapshot {
  readonly entries: readonly PlaybackEntry[]
}

declare module '@deepseek-ai/dsh-client-runtime/client' {
  interface ConversationViewSnapshotMap {
    'session-playback': PlaybackEventSnapshot
  }
}

export const EMPTY_PLAYBACK_EVENTS: PlaybackEventSnapshot = Object.freeze({ entries: [] })

const rawEventDefinition: ConversationNodeDefinition<PlaybackEntry> = {
  kind: 'session-playback.raw-event',
  target: PLAYBACK_TARGET,

  match(event) {
    return {
      id: String(event.seq),
      role: 'start',
    }
  },

  start(_context, match) {
    return {
      event: match.event,
      view: match.view,
      location: match.location,
    }
  },

  update(context) {
    return context.state
  },

  publication(match) {
    return match.event.type === 'assistant/chunk' ? 'animation-frame' : 'immediate'
  },

  buildViewNode(context) {
    if (context.state === undefined) return null
    return {
      key: context.key,
      kind: context.kind,
      id: context.id,
      target: PLAYBACK_TARGET,
      anchorSeq: context.state.event.seq,
      data: context.state,
    }
  },
}

class PlaybackEventBuilder implements ConversationViewBuilder<PlaybackEventNode, PlaybackEventSnapshot> {
  readonly empty = EMPTY_PLAYBACK_EVENTS
  readonly #nodes = new Map<string, PlaybackEventNode>()

  replace({ nodes }: { readonly nodes: readonly PlaybackEventNode[] }): PlaybackEventSnapshot {
    this.#nodes.clear()
    for (const node of nodes) this.#nodes.set(node.key, node)
    return this.#snapshot()
  }

  apply({ upserts }: { readonly upserts: readonly PlaybackEventNode[] }): PlaybackEventSnapshot {
    for (const node of upserts) this.#nodes.set(node.key, node)
    return this.#snapshot()
  }

  #snapshot(): PlaybackEventSnapshot {
    const entries = [...this.#nodes.values()]
      .sort((left, right) => left.anchorSeq - right.anchorSeq)
      .map((node) => node.data)
    return Object.freeze({ entries: Object.freeze(entries) })
  }
}

const rawEventView: ConversationViewDefinition<PlaybackEventNode, PlaybackEventSnapshot> = {
  target: PLAYBACK_TARGET,
  create: () => new PlaybackEventBuilder(),
}

export function registerPlaybackEvents(ctx: ClientContext): void {
  ctx.effect(
    () => ctx.conversationViews.register(rawEventView),
    'dsh-bites-the-dust: raw event view',
  )
  ctx.effect(
    () => ctx.conversationEvents.register(rawEventDefinition),
    'dsh-bites-the-dust: raw event definition',
  )
}
