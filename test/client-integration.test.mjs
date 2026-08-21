import assert from 'node:assert/strict'
import test from 'node:test'
import React, { useSyncExternalStore } from 'react'
import * as jsxRuntime from 'react/jsx-runtime'
import { act, create } from 'react-test-renderer'

class FakeConversationNodeAssembler {
  static constructions = 0

  inputs = []

  constructor() {
    FakeConversationNodeAssembler.constructions += 1
  }

  replaceWindow(inputs) {
    this.inputs = inputs
  }

  flush() {}

  snapshot(target) {
    if (target !== 'chat') return undefined
    const nodes = this.inputs.map(({ event }) => ({ seq: event.seq }))
    return {
      timeline: { turnOrder: [], turns: new Map() },
      legacy: {
        nodes,
        turnTimings: new Map(),
        turnEnds: new Map(),
        partial: false,
        runningCalls: new Map(),
      },
    }
  }

  get(target) {
    return this.snapshot(target)
  }
}

async function loadClientBundle() {
  let client
  globalThis.window = {
    requestAnimationFrame: () => 1,
    cancelAnimationFrame: () => {},
    __ModuleLoader__: {
      load({ factory }) {
        client = factory((id) => {
          if (id === 'react') return React
          if (id === 'react/jsx-runtime') return jsxRuntime
          if (id === '@deepseek-ai/dsh-client-runtime/client') {
            return { ConversationNodeAssembler: FakeConversationNodeAssembler }
          }
          throw new Error(`Unexpected client dependency: ${id}`)
        })
      },
    },
  }
  globalThis.document = {
    querySelector: () => null,
    createElement: () => ({ dataset: {}, remove() {} }),
    head: { appendChild() {} },
  }
  await import(`../lib/client.js?integration=${Date.now()}`)
  return client
}

function textOf(node) {
  if (typeof node === 'string') return node
  return node.children.map(textOf).join('')
}

test('built client wires native replay, recovery UI, and stable historical projection', async () => {
  const client = await loadClientBundle()
  const effects = []
  const blocks = new Map()
  let playback
  let sessionProvider
  let PlaybackControls
  const ctx = {
    conversationEvents: { register: () => () => {} },
    conversationViews: { register: () => () => {} },
    conversation: { blocks },
    locale: {
      register: () => () => {},
      bind: () => (key) => ({
        enter: 'Replay session',
        historical: 'Historical replay',
        historyLoading: 'Loading earlier history',
        historyLoadFailed: 'Earlier history failed to load',
        retryOlderHistory: 'Retry loading earlier history',
      })[key] ?? key,
    },
    provide(_name, value) {
      playback = value
    },
    effect(run) {
      const cleanup = run()
      if (typeof cleanup === 'function') effects.push(cleanup)
    },
    sessions: {
      provide(provider) {
        sessionProvider = provider
        return () => {}
      },
    },
    slots: {
      inject(_name, register) {
        register()
      },
      register(_options, component) {
        PlaybackControls = component
        return () => {}
      },
    },
  }
  client.apply(ctx)

  let historyAttempts = 0
  const rawEntries = [
    { event: { seq: 1, time: 100, type: 'turn/start', data: { turn: 1 } }, view: {}, location: { kind: 'turn', turn: { turn: 1 } } },
    { event: { seq: 2, time: 200, type: 'assistant/message', data: {} }, view: {}, location: { kind: 'turn', turn: { turn: 1 } } },
    { event: { seq: 3, time: 300, type: 'turn/end', data: { turn: 1 } }, view: {}, location: { kind: 'turn', turn: { turn: 1 } } },
  ]
  const baseChat = {
    timeline: { turnOrder: [], turns: new Map() },
    legacy: { nodes: [], turnTimings: new Map(), turnEnds: new Map(), partial: false, runningCalls: new Map() },
  }
  let snapshot = {
    sessionId: 'session',
    hasMore: true,
    loadingOlder: false,
    chat: baseChat,
    nodes: [],
    views: { get: (target) => target === client.PLAYBACK_TARGET ? { entries: rawEntries } : baseChat },
  }
  const binding = {
    sessionId: 'session',
    session: {
      getSnapshot: () => snapshot,
      subscribe: () => () => {},
      async loadOlder() {
        historyAttempts += 1
        throw new Error('offline')
      },
    },
  }
  const store = sessionProvider.resolve(binding).hooks.playback
  const usePlayback = (selector) => useSyncExternalStore(
    store.subscribe,
    () => selector(store.getSnapshot()),
    () => selector(store.getSnapshot()),
  )
  const t = ctx.locale.bind()
  const controlsElement = () => React.createElement(PlaybackControls, {
    sessionId: 'session',
    usePlayback,
    playback,
    t,
  })

  let controls
  await act(async () => {
    controls = create(controlsElement())
  })
  await act(async () => {
    controls.root.findByType('button').props.onClick()
  })
  assert.deepEqual(blocks.get('session'), { reason: 'readonly' })

  await act(async () => {
    playback.seekEvent('session', 1)
    await Promise.resolve()
  })
  const failedStatus = controls.root.findByProps({ 'data-history-status': 'failed' })
  assert.match(textOf(failedStatus), /failed/i)
  assert.equal(historyAttempts, 1)
  await act(async () => {
    failedStatus.findByType('button').props.onClick()
    await Promise.resolve()
  })
  assert.equal(historyAttempts, 2)

  function ProjectedProbe(props) {
    const value = props.useSession((value) => ({
      nodes: value.nodes,
      clock: value.chat.timeline.playbackClock,
    }))
    return React.createElement('output', null, JSON.stringify(value))
  }
  const DecoratedProbe = client.decorateChatView(ProjectedProbe)
  const useSession = (selector) => selector(snapshot)
  const projectionElement = () => React.createElement(DecoratedProbe, { usePlayback, useSession })
  let projection
  await act(async () => {
    projection = create(projectionElement())
  })
  const initialConstructions = FakeConversationNodeAssembler.constructions
  await act(async () => {
    playback.seekTime('session', 150)
  })
  assert.equal(FakeConversationNodeAssembler.constructions, initialConstructions)

  snapshot = {
    ...snapshot,
    views: {
      get: (target) => target === client.PLAYBACK_TARGET
        ? { entries: [...rawEntries, { event: { seq: 4, time: 400, type: 'assistant/message', data: {} }, view: {}, location: { kind: 'turn', turn: { turn: 2 } } }] }
        : baseChat,
    },
  }
  await act(async () => {
    projection.update(projectionElement())
  })
  assert.equal(FakeConversationNodeAssembler.constructions, initialConstructions)

  await act(async () => {
    playback.exit('session')
  })
  assert.equal(blocks.get('session'), undefined)
  for (const cleanup of effects.reverse()) cleanup()
  controls.unmount()
  projection.unmount()
  delete globalThis.window
  delete globalThis.document
})
