import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, copyFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const sandbox = mkdtempSync(join(tmpdir(), 'dsh-peers-self-'))
const profile = join(sandbox, 'profile')
mkdirSync(profile, { recursive: true })
process.env.USERPROFILE = sandbox
process.env.HOME = sandbox
process.env.DSH_PROFILE_DIR = profile

const fixture = [
  'plugins:',
  '  - id: billion-context',
  '    name: billion-context',
  '    config: {}',
  '  - id: ds-harness-remote',
  '    name: ds-harness-remote',
  '    config:',
  '      serverUrl: https://dsh.r2049.cn',
  '      deviceName: OLD-NAME',
  '  - id: dsh-peers-syh',
  '    name: dsh-peers-syh',
  '    config: {}',
  '',
].join('\n')
const configPath = join(profile, 'cordis.patch.yml')
writeFileSync(configPath, fixture)
writeFileSync(join(profile, 'package.json'), JSON.stringify({ name: 'desktop', dsh: { profile: { bundles: ['dsh-peers-syh'] } } }))

const { apply } = await import('../src/index.js')
console.log('SANDBOX', sandbox)

const routes = new Map()
const devices = [{ deviceId: 'host-a', name: 'phone', platform: 'linux', online: true }]
const ctx = {
  on() { return () => {} },
  effect(fn) { const d = fn(); return () => { if (typeof d === 'function') d() } },
  get(name) {
    if (name === 'webServer') return { register(route) { routes.set(route.path, route); return () => {} }, tapIndex() { return () => {} } }
    if (name === 'dshRemoteClient') return {
      devices: async () => devices,
      status: () => ({ deviceId: '01a1b99a-09c7-714b-9864-3922c73b24b8', deviceName: 'OLD-NAME' }),
    }
    if (name === 'tools') return { register() { return () => {} } }
    return null
  },
  inject(_deps, cb) { cb(ctx) },
}
apply(ctx, {})

function call(path, init = {}) {
  const route = routes.get(path)
  if (!route) throw new Error('route missing: ' + path)
  return new Promise((resolve, reject) => {
    const listeners = {}
    const req = {
      method: init.method || 'GET',
      headers: Object.assign({ host: '127.0.0.1:1', 'sec-fetch-site': 'same-origin' }, init.headers),
      on(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn) },
      destroy() {},
    }
    const res = {
      statusCode: 0, headers: {}, body: '',
      writeHead(code, headers) { this.statusCode = code; this.headers = headers || {} },
      end(text) { this.body = text || ''; resolve({ status: this.statusCode, body: this.body }) },
    }
    route.handler(req, res).catch(reject)
    if (init.body !== undefined) {
      const buf = Buffer.from(init.body)
      for (const fn of listeners.data || []) fn(buf)
      for (const fn of listeners.end || []) fn()
    }
  })
}

const before = await call('/dsh-peers-syh/api/peers')
const selfBefore = JSON.parse(before.body).self
console.log('SELF BEFORE', JSON.stringify(selfBefore))

const bad = await call('/dsh-peers-syh/api/self-name', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: '   ' }) })
console.log('BAD', bad.status, bad.body)

const ok = await call('/dsh-peers-syh/api/self-name', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: '书房台式机' }) })
console.log('SET', ok.status, ok.body)
console.log('CONFIG1', JSON.stringify(readFileSync(configPath, 'utf8')))
console.log('BACKUP', existsSync(configPath + '.bak-peers'))

const again = await call('/dsh-peers-syh/api/self-name', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: '游戏本' }) })
console.log('SET2', again.status, again.body)
console.log('CONFIG2', JSON.stringify(readFileSync(configPath, 'utf8')))

await call('/dsh-peers-syh/api/alias', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ hostId: 'host-a', alias: '手机：荣耀7Rro' }) })
const clash = await call('/dsh-peers-syh/api/self-name', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: '手机：荣耀7Rro' }) })
console.log('CLASH', clash.status, clash.body)

const after = await call('/dsh-peers-syh/api/peers')
console.log('SELF AFTER', JSON.stringify(JSON.parse(after.body).self))

// 第二个 profile：config 里还没有 deviceName，验证插入位置与缩进。
const profile2 = join(sandbox, 'profile2')
mkdirSync(profile2, { recursive: true })
const config2 = join(profile2, 'cordis.patch.yml')
writeFileSync(config2, [
  'plugins:',
  '  - id: ds-harness-remote',
  '    name: ds-harness-remote',
  '    config:',
  '      enabled: true',
  '      role: host',
  '  - id: dsh-peers-syh',
  '    name: dsh-peers-syh',
  '    config: {}',
  '',
].join('\n'))
process.env.DSH_PROFILE_DIR = profile2
const insert = await call('/dsh-peers-syh/api/self-name', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: '客厅主机' }) })
console.log('INSERT', insert.status, insert.body)
console.log('CONFIG3', JSON.stringify(readFileSync(config2, 'utf8')))