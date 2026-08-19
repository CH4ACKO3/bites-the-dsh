const { component } = require('dsh-harmony-react')

const target = {
  package: '@deepseek-ai/dsh-client-ui-conversation',
  version: '0.1.0-rc.8',
  files: ['lib/client.js'],
}

module.exports = [
  component({
    id: 'readonly-conversation-root',
    target,
    select: { name: 'ConversationRoot' },
    expect: 1,
    operation: {
      kind: 'decorate',
      with: {
        module: '@ch4acko3/dsh-bites-the-dust',
        export: 'decorateConversationRoot',
      },
    },
  }),
  component({
    id: 'historical-chat-projection',
    target,
    select: { name: 'ChatView' },
    expect: 1,
    operation: {
      kind: 'decorate',
      with: {
        module: '@ch4acko3/dsh-bites-the-dust',
        export: 'decorateChatView',
      },
    },
  }),
  component({
    id: 'readonly-native-input',
    target,
    select: { name: 'InputBar' },
    expect: 1,
    operation: {
      kind: 'decorate',
      with: {
        module: '@ch4acko3/dsh-bites-the-dust',
        export: 'decorateInputBar',
      },
    },
  }),
  component({
    id: 'readonly-native-message-actions',
    target,
    select: { name: 'MessageIconActions' },
    expect: 1,
    operation: {
      kind: 'decorate',
      with: {
        module: '@ch4acko3/dsh-bites-the-dust',
        export: 'decorateMessageIconActions',
      },
    },
  }),
]
