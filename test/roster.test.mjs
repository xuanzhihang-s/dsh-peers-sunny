import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const home = mkdtempSync(join(tmpdir(), 'dsh-peers-roster-'))
process.env.USERPROFILE = home
process.env.HOME = home
mkdirSync(join(home, '.dsh', 'remote', 'servers', 'srv1', 'host'), { recursive: true })
writeFileSync(join(home, '.dsh', 'remote', 'servers', 'srv1', 'host', 'trusted-peers.json'), JSON.stringify({
  schemaVersion: 1,
  peers: [
    { deviceId: 'phone-client-id', name: 'localhost', platform: 'linux', trustedAt: 100 },
    { deviceId: 'tablet-client-id', name: 'DSH App (Android)', platform: 'dsh-app-android', trustedAt: 200 },
  ],
}))

const { __test } = await import('../src/index.js')

const client = {
  status: () => ({
    deviceId: 'self-id',
    host: { connectedClients: [{ deviceId: 'phone-client-id', name: 'localhost', platform: 'linux', mode: 'p2p' }] },
  }),
  devices: async () => [
    { deviceId: 'phone-host-id', name: 'localhost', platform: 'linux', online: true },
    { deviceId: 'self-id', name: 'self', platform: 'win32', online: true },
  ],
}
const ctx = { get: (key) => (key === 'dshRemoteClient' ? client : undefined) }
const store = { version: 1, peers: { 'tablet-client-id': { alias: '平板' } } }
const { rows, error } = await __test.rosterOf(ctx, store, AbortSignal.timeout(5000))

const fail = (message) => { console.log('FAIL ' + message); process.exitCode = 1 }
for (const row of rows) {
  console.log('ROW ' + [row.displayName, row.platform, 'dialable=' + row.dialable, 'online=' + row.online, 'connected=' + row.connected, 'trusted=' + row.trustedAt].join(' | '))
}
if (error) fail('unexpected error ' + error)
const phone = rows.filter((row) => row.hostId === 'phone-host-id')
if (phone.length !== 1) fail('phone should be one row, got ' + phone.length)
else if (!phone[0].connected) fail('phone should be connected after merge')
const tablet = rows.find((row) => row.hostId === 'tablet-client-id')
if (!tablet) fail('tablet missing')
else {
  if (tablet.dialable !== false) fail('tablet should not be dialable')
  if (tablet.displayName !== '平板') fail('alias should win: ' + tablet.displayName)
  if (tablet.trustedAt !== 200) fail('trustedAt')
}
if (rows.some((row) => row.hostId === 'self-id')) fail('self leaked into roster')
console.log('ROWS ' + rows.length)
console.log('DONE')