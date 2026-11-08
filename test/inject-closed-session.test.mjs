
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const home = mkdtempSync(join(tmpdir(), 'peers-'))
process.env.USERPROFILE = home
process.env.HOME = home
mkdirSync(join(home, '.dsh'), { recursive: true })
const createdAt = Date.now() - 60000
writeFileSync(join(home, '.dsh', 'peers-tasks.json'), JSON.stringify({ version: 1, tasks: { 'task-old-1': { taskId: 'task-old-1', peer: 'phone', hostId: 'host-a', alias: '小米14', workspaceId: 'ws-1', sessionId: 'sess-1', originSessionId: 'sess-origin', status: 'running', createdAt, delivered: false } } }, null, 2))

const mod = await import(new URL('../src/index.js', import.meta.url).href)
const followups = []
const flushed = []
const client = {
  async devices() { return [] },
  async listRemoteWorkspaces() { return [{ workspaceId: 'ws-1', backend: 'harness', path: '/root/ws' }] },
  async runSessionTool(name) {
    if (name === 'remote_wait_sessions') return { sessions: [{ status: 'idle' }] }
    if (name === 'remote_read_session') return { status: 'idle', records: [{ seq: 1, json: JSON.stringify({ type: 'event', event: { type: 'assistant/message', data: { message: { role: 'assistant', content: [{ type: 'text', text: '重启后补上的答复' }] } } } }) }] }
    throw new Error('unexpected ' + name)
  },
}
const agent = { id: 'sess-origin', session: { id: 'sess-origin' }, followup(m) { followups.push(m) } }
let tools = { register(def) { tools[def.name] = def } }
const cleanups = []
const ctx = {
  inject(deps, cb) { cb({ get: () => tools, effect: (fn) => { const c = fn(); if (typeof c === 'function') cleanups.push(c) } }) },
  get(name) {
    if (name === 'dshRemoteClient') return client
    if (name === 'agents') return { get: (id) => (id === 'sess-origin' ? agent : undefined) }
    if (name === 'sessions') return { flush: async (s) => flushed.push(s) }
    return undefined
  },
}
mod.apply(ctx, {})
await new Promise((r) => setTimeout(r, 9500))
console.log('FOLLOWUPS', followups.length, 'FLUSHED', flushed.length)
if (followups.length) console.log(followups[0].content[0].text.split('\n').slice(0, 4).join(' | '))
const tasks = await tools.peer_tasks.execute({}, { signal: new AbortController().signal })
console.log('TASKS', JSON.stringify(tasks))
for (const c of cleanups) c()
process.exit(0)