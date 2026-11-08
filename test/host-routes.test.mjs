import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// 这个冒烟测试会写 peers.json：把它关进临时 HOME，绝不碰 ~/.dsh/peers.json。
// index.js 在模块加载时就算好 STORE，所以必须先设环境变量再动态 import。
const sandbox = mkdtempSync(join(tmpdir(), 'dsh-peers-smoke-'))
process.env.USERPROFILE = sandbox
process.env.HOME = sandbox

const { apply } = await import('../src/index.js')
console.log('SANDBOX', sandbox)

const routes = new Map()
const tools = []
const definitions = new Map()
const devices = [
  { deviceId: 'host-a', name: 'phone', platform: 'linux', online: true },
  { deviceId: 'host-b', name: 'tablet', platform: 'android', online: false },
]

function makeCtx() {
  const ctx = {
    on() { return () => {} },
    effect(fn) { const d = fn(); return () => { if (typeof d === 'function') d() } },
    get(name) {
      if (name === 'webServer') return { register(route) { routes.set(route.path, route); return () => {} }, tapIndex() { return () => {} } }
      if (name === 'dshRemoteClient') return { devices: async () => devices }
      if (name === 'tools') return { register(def) { tools.push(def.name); definitions.set(def.name, def); return () => {} } }
      return null
    },
    inject(_deps, cb) { cb(ctx) },
  }
  return ctx
}

apply(makeCtx(), {})

function call(path, init = {}) {
  const route = routes.get(path)
  if (!route) throw new Error('route missing: ' + path + ' have=' + [...routes.keys()].join(','))
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

const list = await call('/dsh-peers-syh/api/peers')
console.log('LIST', list.status, list.body)
const bad = await call('/dsh-peers-syh/api/alias', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ hostId: 'host-a', alias: '' }) })
console.log('BAD', bad.status, bad.body)
const ok = await call('/dsh-peers-syh/api/alias', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ hostId: 'host-a', alias: '小米14' }) })
console.log('SET', ok.status, ok.body)
const list2 = await call('/dsh-peers-syh/api/peers')
console.log('LIST2', list2.status, list2.body)
const xsite = await call('/dsh-peers-syh/api/peers', { headers: { 'sec-fetch-site': 'cross-site' } })
console.log('XSITE', xsite.status, xsite.body)
const batch = await call('/dsh-peers-syh/api/aliases', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ aliases: { 'host-a': '小屏', 'host-b': '小笔' } }) })
console.log('BATCH', batch.status, batch.body)
const dupBatch = await call('/dsh-peers-syh/api/aliases', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ aliases: { 'host-a': '同名', 'host-b': '同名' } }) })
console.log('BATCH DUP', dupBatch.status, dupBatch.body)
const clash = await call('/dsh-peers-syh/api/aliases', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ aliases: { 'host-a': '手机：荣耀7Rro' } }) })
console.log('BATCH CLASH', clash.status, clash.body)
const clear = await call('/dsh-peers-syh/api/aliases', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ aliases: { 'host-b': '   ' } }) })
console.log('BATCH CLEAR', clear.status, clear.body)
const list3 = await call('/dsh-peers-syh/api/peers')
console.log('LIST3', list3.status, list3.body)
console.log('LEGACY PANEL ROUTE REMOVED', routes.has('/dsh-peers-syh/panel.js') === false)
console.log('TOOLS', tools.join(','))

const batchTool = definitions.get('peer_aliases')
const toolOut = await batchTool.execute({ aliases: { 'host-a': '小屏', 'host-b': '小笔' } })
console.log('TOOL peer_aliases', JSON.stringify(toolOut))
const toolDup = await batchTool.execute({ aliases: { '小屏': '同名', '小笔': '同名' } }).then(() => 'no error', (error) => String(error.message))
console.log('TOOL peer_aliases DUP', toolDup)
const toolClear = await batchTool.execute({ aliases: { '小屏': '' } })
console.log('TOOL peer_aliases CLEAR', JSON.stringify(toolClear))