
/* ---------- a very small DOM, just enough for the panel half ---------- */

class Node {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase()
    this.children = []
    this.parentNode = null
    this._text = ''
    this._attrs = new Map()
    this._listeners = new Map()
    this.className = ''
    this.style = {}
    this.value = ''
    this.title = ''
    this.type = ''
    this.disabled = false
    this.placeholder = ''
    this.maxLength = 0
  }
  get textContent() {
    if (this.children.length === 0) return this._text
    return this.children.map((child) => child.textContent).join('')
  }
  set textContent(value) {
    this._text = String(value)
    this.children = []
  }
  get isConnected() {
    let node = this
    while (node.parentNode) node = node.parentNode
    return node === document.body || node === document.documentElement
  }
  get lastElementChild() { return this.children[this.children.length - 1] || null }
  get previousSibling() {
    if (!this.parentNode) return null
    const index = this.parentNode.children.indexOf(this)
    return index <= 0 ? null : this.parentNode.children[index - 1]
  }
  setAttribute(name, value) { this._attrs.set(name, String(value)) }
  getAttribute(name) { return this._attrs.has(name) ? this._attrs.get(name) : null }
  appendChild(child) { return this.insertBefore(child, null) }
  insertBefore(child, reference) {
    if (child.parentNode) child.parentNode.children = child.parentNode.children.filter((node) => node !== child)
    child.parentNode = this
    const index = reference ? this.children.indexOf(reference) : -1
    if (index < 0) this.children.push(child)
    else this.children.splice(index, 0, child)
    return child
  }
  removeChild(child) {
    this.children = this.children.filter((node) => node !== child)
    child.parentNode = null
    return child
  }
  remove() { if (this.parentNode) this.parentNode.removeChild(this) }
  addEventListener(type, handler) {
    if (!this._listeners.has(type)) this._listeners.set(type, [])
    this._listeners.get(type).push(handler)
  }
  dispatch(type) {
    for (const handler of this._listeners.get(type) || []) handler({ type, target: this, currentTarget: this, preventDefault() {} })
  }
  matches(selector) {
    const parsed = parseSelector(selector)
    if (parsed.tag && this.tagName !== parsed.tag.toUpperCase()) return false
    if (parsed.className && !String(this.className).split(/\s+/).includes(parsed.className)) return false
    if (parsed.attr && this.getAttribute(parsed.attr) === null) return false
    if (parsed.attr && parsed.attrValue !== null && this.getAttribute(parsed.attr) !== parsed.attrValue) return false
    return true
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null }
  querySelectorAll(selector) {
    const found = []
    const walk = (node) => {
      for (const child of node.children) {
        if (child.matches(selector)) found.push(child)
        walk(child)
      }
    }
    walk(this)
    return found
  }
  find(predicate) {
    for (const child of this.children) {
      if (predicate(child)) return child
      const deeper = child.find(predicate)
      if (deeper) return deeper
    }
    return null
  }
}

function parseSelector(selector) {
  const match = /^([a-zA-Z]*)(?:\.([\w-]+))?(?:\[([\w-]+)(?:="([^"]*)")?\])?$/.exec(selector)
  if (!match) throw new Error('unsupported selector: ' + selector)
  return { tag: match[1] || '', className: match[2] || '', attr: match[3] || '', attrValue: match[4] === undefined ? null : match[4] }
}

globalThis.document = {
  head: new Node('head'),
  body: new Node('body'),
  documentElement: new Node('html'),
  createElement: (tag) => new Node(tag),
  createTextNode: (text) => { const node = new Node('#text'); node.textContent = text; return node },
  querySelector(selector) { return this.body.querySelector(selector) },
  querySelectorAll(selector) { return this.body.querySelectorAll(selector) },
}

const ticks = []
let observerCallback = null
globalThis.window = {
  requestAnimationFrame(fn) { ticks.push(fn); return ticks.length },
  cancelAnimationFrame() {},
  __ModuleLoader__: { load: (definition) => { loadedDefinition = definition } },
}
globalThis.MutationObserver = class {
  constructor(callback) { observerCallback = callback }
  observe() {}
}
let loadedDefinition = null
const flush = async () => {
  for (let index = 0; index < 6; index += 1) {
    const frame = ticks.shift()
    if (frame) frame()
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
}

/* ---------- stub host data ---------- */

const requests = []
const peers = [
  { hostId: 'host-a', name: 'phone', platform: 'linux', online: true, alias: '手机', workspaceId: 'd748dd2f-a222' },
  { hostId: 'host-b', name: 'tablet', platform: 'android', online: false, alias: null, workspaceId: null },
]
const self = { deviceId: '01a1b99a-09c7-714b-9864-3922c73b24b8', platform: 'win32', name: 'DESKTOP-CG9VJQ2', configuredName: null, pending: false }
globalThis.fetch = async (url, init) => {
  requests.push({ url, method: (init && init.method) || 'GET', body: init && init.body ? JSON.parse(init.body) : null })
  const ok = (payload) => ({ ok: true, status: 200, json: async () => payload })
  if (url.endsWith('/peers')) return ok({ peers, remoteError: null, self })
  if (url.endsWith('/self-name')) { const name = JSON.parse(init.body).name; self.configuredName = name; self.pending = name !== self.name; return ok({ ok: true, name, restartRequired: true }) }
  if (url.endsWith('/aliases')) return ok({ ok: true, saved: Object.keys(JSON.parse(init.body).aliases).length })
  throw new Error('unexpected request ' + url)
}

/* ---------- load the plugin ---------- */

await import(new URL('../src/client.js', import.meta.url).href)
if (!loadedDefinition) throw new Error('client module did not register')
console.log('MODULE ID', loadedDefinition.id)
const mod = loadedDefinition.factory(() => { throw new Error('this half must not require anything') })
console.log('INJECT', JSON.stringify(mod.inject))

/* the remote workspace dialog as ds-harness-remote renders it:
   section.dshRemotePage > header.dshRemotePageHeader + div.dshRemotePageBody > (hosts, footer) */
const page = new Node('section')
page.className = 'dshRemotePage'
const header = new Node('header'); header.className = 'dshRemotePageHeader'
const body = new Node('div'); body.className = 'dshRemotePageBody'
const hosts = new Node('section'); hosts.className = 'dshRemoteHosts'
const footer = new Node('footer'); footer.className = 'dshRemoteAccountFooter'
body.appendChild(hosts); body.appendChild(footer)
page.appendChild(header); page.appendChild(body)
document.body.appendChild(page)

mod.apply()
await flush()

const ourSection = body.querySelector('[data-dsh-peers-section]')
console.log('MOUNTED', !!ourSection, ourSection && ourSection.className)
console.log('ORDER', body.children.map((node) => node.tagName + '.' + (node.className || '')).join(' | '))
console.log('ROWS', ourSection.querySelectorAll('.dshPeersRow').length)
console.log('SELF ROW', ourSection.querySelector('[data-self="true"]').textContent)
console.log('STATUS', ourSection.querySelector('.dshPeersPanelStatus').textContent)

const inputs = ourSection.querySelectorAll('.dshPeersInput')
inputs[0].value = '书房的电脑'
inputs[0].dispatch('input')
inputs[1].value = ' 我的手机 '
inputs[1].dispatch('input')
inputs[2].value = '平板'
inputs[2].dispatch('input')
const saveButton = ourSection.querySelector('.dshPeersSave')
console.log('DIRTY', ourSection.querySelector('.dshPeersPanelStatus').textContent, '|', saveButton.textContent, 'disabled=' + saveButton.disabled)

saveButton.dispatch('click')
await flush()
const selfPost = requests.filter((entry) => entry.url.endsWith('/self-name')).pop()
const post = requests.filter((entry) => entry.url.endsWith('/aliases')).pop()
console.log('POST SELF', JSON.stringify(selfPost && selfPost.body))
console.log('POST', JSON.stringify(post && post.body))
console.log('AFTER SAVE', ourSection.querySelector('.dshPeersPanelStatus').textContent)

/* React may drop the injected node when it re-renders the dialog: the observer must put it back */
ourSection.remove()
observerCallback()
await flush()
const remounted = body.querySelector('[data-dsh-peers-section]')
console.log('REMOUNTED', !!remounted, body.children.map((node) => node.className || node.tagName).join(' | '))

/* closing the dialog must leave nothing behind on the page */
page.remove()
observerCallback()
await flush()
console.log('CLEAN', document.querySelector('[data-dsh-peers-section]') === null)