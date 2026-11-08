
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
process.env.USERPROFILE = mkdtempSync(join(tmpdir(), 'peers-'))
process.env.HOME = process.env.USERPROFILE

const mod = await import(new URL('../src/index.js', import.meta.url).href)
const seq = ['running', 'needs_user_input', 'running', 'idle']
let i = 0
const client = {
  async devices() { return [{ deviceId: 'host-a', name: 'phone', platform: 'linux', online: true }] },
  async listRemoteWorkspaces() { return [{ workspaceId: 'ws-1', backend: 'harness' }] },
  async runSessionTool(name) {
    if (name === 'remote_create_session') return { sessionId: 'sess-9' }
    if (name === 'remote_send_message') return { ok: true }
    if (name === 'remote_wait_sessions') return { sessions: [{ status: seq[Math.min(i++, seq.length - 1)] }] }
    if (name === 'remote_read_session') return { status: 'idle', records: [{ json: JSON.stringify({ type: 'event', event: { type: 'assistant/message', data: { message: { role: 'assistant', content: [{ type: 'text', text: '最终结果 ok' }] } } } }) }] }
    throw new Error('unexpected ' + name)
  },
}
const followups = []
let agentAlive = true
const agent = { id: 'sess-origin', followup(m) { if (!agentAlive) throw new Error('dead'); followups.push(m) } }
let tools = { register(def) { tools[def.name] = def } }
const cleanups = []
const ctx = {
  inject(deps, cb) { cb({ get: () => tools, effect: (fn) => { const c = fn(); if (typeof c === 'function') cleanups.push(c) } }) },
  get(name) {
    if (name === 'dshRemoteClient') return client
    if (name === 'agents') return { get: (id) => (agentAlive && id === 'sess-origin' ? agent : undefined) }
    return undefined
  },
}
mod.apply(ctx, {})
const res = await tools.peer_delegate.execute({ peer: 'host-a', prompt: 'x' }, { signal: new AbortController().signal, agent })
console.log('DELEGATE status', res.status, 'taskId', res.taskId)
await new Promise((r) => setTimeout(r, 9500))
console.log('FOLLOWUPS', followups.length)
for (const f of followups) console.log('---', f.content[0].text.split('\n').slice(2, 4).join(' | '))
const tasks = await tools.peer_tasks.execute({}, { signal: new AbortController().signal })
console.log('TASKS', JSON.stringify(tasks.tasks.map((t) => [t.status, t.delivered])))
const inbox = await tools.peer_inbox.execute({}, { signal: new AbortController().signal })
console.log('INBOX after delivery', inbox.reports.length)
for (const c of cleanups) c()