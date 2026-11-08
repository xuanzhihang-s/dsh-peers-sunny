
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
process.env.USERPROFILE = mkdtempSync(join(tmpdir(), 'peers-'))
process.env.HOME = process.env.USERPROFILE

const mod = await import(new URL('../src/index.js', import.meta.url).href)

const calls = []
const sent = []
const followups = []
let waitCount = 0
const client = {
  async devices() { return [{ deviceId: 'host-a', name: 'phone', platform: 'linux', online: true }] },
  async listRemoteWorkspaces() { return [{ workspaceId: 'ws-1', backend: 'harness', path: '/root/ws' }] },
  async runSessionTool(name, args) {
    calls.push(name)
    if (name === 'remote_create_session') return { sessionId: 'sess-1' }
    if (name === 'remote_send_message') return { ok: true }
    if (name === 'remote_wait_sessions') {
      waitCount += 1
      return { sessions: [{ status: waitCount < 2 ? 'running' : 'idle' }] }
    }
    if (name === 'remote_read_session') {
      return { status: 'idle', records: [{ seq: 1, json: JSON.stringify({ type: 'event', event: { type: 'assistant/message', data: { message: { role: 'assistant', content: [{ type: 'text', text: '报告：做完了 13 字节' }] } } } }) }] }
    }
    throw new Error('unexpected ' + name)
  },
}
const agent = { id: 'sess-origin', followup(m) { followups.push(m) } }
let tools = { register(def) { tools[def.name] = def } }
const cleanups = []
const ctx = {
  inject(deps, cb) { cb({ get: () => tools, effect: (fn) => { const c = fn(); if (typeof c === 'function') cleanups.push(c) } }) },
  get(name) {
    if (name === 'dshRemoteClient') return client
    if (name === 'agents') return { get: (id) => (id === 'sess-origin' ? agent : undefined) }
    return undefined
  },
}
mod.apply(ctx, {})
const delegate = tools.peer_delegate
const res = await delegate.execute({ peer: 'host-a', prompt: '分析一下' }, { signal: new AbortController().signal, agent })
console.log('DELEGATE', JSON.stringify(res))
console.log('calls after return', calls.join(','))
await new Promise((r) => setTimeout(r, 300))
console.log('FOLLOWUP COUNT', followups.length)
if (followups.length) {
  console.log('ROLE', followups[0].role, 'SOURCE', JSON.stringify(followups[0].source))
  console.log(followups[0].content[0].text.split('\n').slice(0, 6).join('\n'))
}
const tasks = await tools.peer_tasks.execute({}, { signal: new AbortController().signal })
console.log('TASKS', JSON.stringify(tasks))
for (const c of cleanups) c()