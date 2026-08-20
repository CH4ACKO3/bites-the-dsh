const { component } = require('dsh-harmony-react')

const target = {
  package: '@deepseek-ai/dsh-client-ui-conversation',
  version: '0.1.0-rc.8',
  file: 'lib/client.js',
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
        module: '@ch4acko3/bites-the-dsh',
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
        module: '@ch4acko3/bites-the-dsh',
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
        module: '@ch4acko3/bites-the-dsh',
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
        module: '@ch4acko3/bites-the-dsh',
        export: 'decorateMessageIconActions',
      },
    },
  }),
]
