import type {
  ConversationSnapshot,
  UseConversationSession,
} from '@deepseek-ai/dsh-client-runtime/client'

export function bindProjectedSession(
  useSession: UseConversationSession,
  snapshot: ConversationSnapshot,
): UseConversationSession {
  return <Selected,>(selector: (value: ConversationSnapshot) => Selected): Selected => {
    useSession(selector)
    return selector(snapshot)
  }
}
