#!/usr/bin/env node
// 把当前 package.json 的版本写进 market-index.json（发布后跑一次）。
//
//   node scripts/market-entry.mjs                      # 默认 source: npm，时间戳取现在
//   node scripts/market-entry.mjs --source git --commit <40 位小写 hex>
//   node scripts/market-entry.mjs --version 0.8.0 --dry
//
// 同一个版本已存在时整条替换（时间戳也刷新），不会出现两条同版本。
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const indexPath = join(root, 'market-index.json')

const argv = process.argv.slice(2)
const flag = (name) => {
  const at = argv.indexOf('--' + name)
  return at === -1 ? undefined : argv[at + 1]
}
const has = (name) => argv.includes('--' + name)

const version = flag('version') ?? pkg.version
const sourceType = flag('source') ?? 'npm'
const commit = flag('commit')
const dry = has('dry')

if (sourceType !== 'npm' && sourceType !== 'git') {
  console.error('--source 只能是 npm 或 git')
  process.exit(1)
}
if (sourceType === 'git' && !/^[0-9a-f]{40}$/.test(commit ?? '')) {
  console.error('--source git 必须带 --commit <40 位小写十六进制>')
  process.exit(1)
}

const engines = pkg.engines?.dsh
if (!engines) {
  console.error('package.json 缺 engines.dsh，市场索引要求它是合法 SemVer range')
  process.exit(1)
}

const source = sourceType === 'npm'
  ? { type: 'npm' }
  : { type: 'git', url: pkg.repository?.url?.replace(/^git\+/, '').replace(/\.git$/, ''), commit }

const entry = {
  version,
  publishTimestamp: Math.floor(Date.now() / 1000),
  source,
  engines: { dsh: engines },
}

/* ---------- semver（够用就行：x.y.z[-pre]，release 高于同号 prerelease） ---------- */

const parse = (text) => {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(text)
  if (!match) throw new Error('不是合法版本号：' + text)
  return { nums: [Number(match[1]), Number(match[2]), Number(match[3])], pre: match[4] ?? null }
}

const compare = (left, right) => {
  const a = parse(left)
  const b = parse(right)
  for (let i = 0; i < 3; i += 1) {
    if (a.nums[i] !== b.nums[i]) return a.nums[i] - b.nums[i]
  }
  if (a.pre === b.pre) return 0
  if (a.pre === null) return 1
  if (b.pre === null) return -1
  return a.pre < b.pre ? -1 : 1
}

/* ---------- 写入 ---------- */

const index = JSON.parse(readFileSync(indexPath, 'utf8'))
const plugin = (index.plugins ?? []).find((item) => item.name === pkg.name)
if (!plugin) {
  console.error('market-index.json 里没有 ' + pkg.name + ' 这个插件条目，先手工加一节再跑这个脚本')
  process.exit(1)
}

const versions = (plugin.versions ?? []).filter((item) => item.version !== version)
versions.push(entry)
versions.sort((left, right) => compare(right.version, left.version))
plugin.versions = versions

const text = JSON.stringify(index, null, 2) + '\n'
if (dry) {
  console.log(JSON.stringify(entry, null, 2))
  console.log('\n(dry run，没有写文件；写入后版本顺序：' + versions.map((item) => item.version).join(' > ') + ')')
  process.exit(0)
}
writeFileSync(indexPath, text)
console.log('wrote ' + indexPath)
console.log(versions.map((item) => item.version + ' (' + item.source.type + ')').join('\n'))
