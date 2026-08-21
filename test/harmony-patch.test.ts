import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createRequire } from 'node:module'
import test from 'node:test'

const workspaceRequire = createRequire(import.meta.url)
const harmonyRequire = createRequire(workspaceRequire.resolve('dsh-harmony/package.json'))
const { tsquery } = harmonyRequire('@phenomnomnominal/tsquery')
const MagicString = harmonyRequire('magic-string').default
const ts = harmonyRequire('typescript')

test('Harmony patches do not impose a semantic order on Turn Fold', () => {
  const manifest = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'package.json'), 'utf8'))
  assert.equal(manifest.dsh.harmony.after, undefined)
})

test('Harmony patches expose human-readable descriptions', () => {
  const patches = workspaceRequire('../patches/conversation.patch.cjs')

  for (const patch of patches) {
    assert.equal(typeof patch.description, 'string', `${patch.id} has no description`)
    assert.notEqual(patch.description.trim(), '', `${patch.id} has an empty description`)
  }
})

test('Harmony component patches each match the rc.8 conversation bundle exactly once', () => {
  const patches = workspaceRequire('../patches/conversation.patch.cjs')
  const packageJson = workspaceRequire.resolve('@deepseek-ai/dsh-client-ui-conversation/package.json')
  const filename = join(dirname(packageJson), 'lib/client.js')
  let source = readFileSync(filename, 'utf8')

  for (const patch of patches) {
    const sourceFile = tsquery.ast(source, filename)
    const nodes = tsquery(sourceFile, patch.select)
    assert.equal(nodes.length, patch.expect, `${patch.id} selector drifted`)

    const edit = new MagicString(source)
    for (const node of nodes) {
      patch.apply({
        patch: { key: `test/${patch.id}`, owner: 'test' },
        source,
        sourceFile,
        node,
        edit,
        ts,
      })
    }
    source = edit.toString()
  }

  assert.match(source, /decorateConversationRoot/)
  assert.match(source, /decorateChatView/)
  assert.match(source, /decorateInputBar/)
  assert.match(source, /decorateMessageIconActions/)
  assert.match(source, /@ch4acko3\/bites-the-dsh/)
})
