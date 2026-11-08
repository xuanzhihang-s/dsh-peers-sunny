#!/usr/bin/env node
// Run every *.test.mjs with the same Node that runs this file; exit non-zero on the first failure.
import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const files = readdirSync(here).filter((name) => name.endsWith('.test.mjs')).sort()
let failed = 0

for (const file of files) {
  const started = Date.now()
  const result = spawnSync(process.execPath, [join(here, file)], { stdio: 'inherit' })
  const ms = Date.now() - started
  if (result.status === 0) {
    console.log(`ok   ${file} (${String(ms)}ms)`)
    continue
  }
  failed += 1
  console.error(`FAIL ${file} (exit ${String(result.status)})`)
}

console.log(failed === 0 ? `\n${String(files.length)} test files passed` : `\n${String(failed)} of ${String(files.length)} test files failed`)
process.exit(failed === 0 ? 0 : 1)
