#!/usr/bin/env node
// Assert the ds-harness-remote internals this plugin depends on are still there.
// Usage: node scripts/contract-check.mjs [path-to-ds-harness-remote]
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const candidates = [
  process.argv[2],
  join(homedir(), '.dsh', 'profiles', 'desktop', 'node_modules', 'ds-harness-remote'),
  join(homedir(), '.dsh', 'profiles', 'web', 'node_modules', 'ds-harness-remote'),
].filter(Boolean)

const root = candidates.find((dir) => existsSync(join(dir, 'dist', 'index.js')))
if (!root) {
  console.error('ds-harness-remote not found; pass its directory as the first argument')
  process.exit(2)
}

const source = readFileSync(join(root, 'dist', 'index.js'), 'utf8')
const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version
const required = [
  ['dshRemoteClient service', "provide(\"dshRemoteClient\""],
  ['dshRemote service', "provide(\"dshRemote\""],
  ['remote_create_session', 'remote_create_session'],
  ['remote_send_message', 'remote_send_message'],
  ['remote_wait_sessions', 'remote_wait_sessions'],
  ['remote_read_session', 'remote_read_session'],
  ['settings/replace allowlist entry', 'settings/replace'],
  ['pluginManager/setPluginEnabled allowlist entry', 'pluginManager/setPluginEnabled'],
]

let failed = 0
for (const [label, needle] of required) {
  const found = source.includes(needle)
  if (!found) failed += 1
  console.log((found ? 'ok   ' : 'MISS ') + label)
}
console.log('ds-harness-remote ' + version + ' at ' + root)
process.exit(failed === 0 ? 0 : 1)
