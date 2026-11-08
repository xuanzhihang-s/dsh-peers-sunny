#!/usr/bin/env node
// Validate market-index.json with the same validator DSH ships, when it can be resolved.
// Usage: node scripts/check-index.mjs [https://host/plugins.json]
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const file = join(here, '..', 'market-index.json')
const url = process.argv[2] || 'https://example.com/plugins.json'
const raw = JSON.parse(readFileSync(file, 'utf8'))

let parse
try {
  const req = createRequire(import.meta.url)
  ;({ parseMarketIndex: parse } = req('@deepseek-ai/dsh-plugin-market-index'))
} catch {
  parse = undefined
}

if (!parse) {
  const ok = raw.format === 1 && Array.isArray(raw.plugins) && raw.plugins.length > 0
  console.log(ok ? 'structural check passed (DSH validator not resolvable in this process)' : 'structural check failed')
  process.exit(ok ? 0 : 1)
}

try {
  const index = parse(raw, url)
  console.log('valid format 1 index: ' + index.plugins.length + ' plugin(s)')
  for (const plugin of index.plugins) {
    console.log('  ' + plugin.name + ' -> ' + plugin.versions.map((v) => v.version).join(', '))
  }
} catch (error) {
  console.error('invalid: ' + (error.path || '?') + ' ' + (error.reason || error.message))
  process.exit(1)
}
