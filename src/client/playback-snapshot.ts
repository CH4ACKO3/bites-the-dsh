import type { SessionSnapshot } from '@deepseek-ai/dsh-api-session-controller/client'
import type { ConversationSnapshot } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { ChatSnapshot } from '@deepseek-ai/dsh-client-ui-chat/client'

/** Replay combines the three native read models without modifying any live store. */
export interface PlaybackSnapshot extends SessionSnapshot, ConversationSnapshot {
  readonly chat: ChatSnapshot
}
