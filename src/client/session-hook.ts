import type {
  SessionSnapshot as ConversationSnapshot,
} from '@deepseek-ai/dsh-api-session-controller/client'
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots'
import type { KeyedSnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots'
type UseConversationSession = SnapshotSelectorHook<ConversationSnapshot>

export function bindProjectedKeyedHook<T>(live: KeyedSnapshotSelectorHook<T>, read: (key: string) => T): KeyedSnapshotSelectorHook<T> {
  function projected(key: string): T | undefined
  function projected<S>(key: string, selector: (value: T | undefined) => S): S
  function projected<S>(key: string, selector?: (value: T | undefined) => S): T | S | undefined {
    live(key)
    const value = read(key)
    return selector === undefined ? value : selector(value)
  }
  return projected
}

export function bindProjectedSession(
  useSession: UseConversationSession,
  snapshot: ConversationSnapshot,
): UseConversationSession {
  return <Selected,>(selector: (value: ConversationSnapshot) => Selected): Selected => {
    useSession(selector)
    return selector(snapshot)
  }
}
