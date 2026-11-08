import { __test } from '../src/index.js'

const fail = (message) => { console.log('FAIL ' + message); process.exitCode = 1 }
const hex = __test.helloLine({ name: '书房台式机', deviceId: 'abc', platform: 'win32' })
console.log('LINE ' + hex)

const reply = '好的，已经写完了。\n\nPEER-HELLO {"name":"小米14","platform":"android"}\n'
const got = __test.extractHello(reply)
console.log('EXTRACT name=' + got.name + ' platform=' + got.platform)
console.log('TEXT >>>' + got.text + '<<<')
if (got.name !== '小米14') fail('name')
if (got.platform !== 'android') fail('platform')
if (got.text.includes('PEER-HELLO')) fail('line not stripped')

const none = __test.extractHello('普通回复，没有自报名')
if (none.name !== null) fail('should not parse')
console.log('PLAIN ' + none.text)

const noName = __test.extractHello('PEER-HELLO {"platform":"linux"}')
if (noName.name !== null || !noName.text.includes('PEER-HELLO')) fail('nameless hello should stay as text')

const ask = __test.helloTrailer({ name: '书房台式机', deviceId: 'abc', platform: 'win32' }, true)
console.log('TRAILER ask:' + JSON.stringify(ask))
if (!ask.includes('发起方设备')) fail('trailer intro')
if (!ask.includes('原样输出')) fail('trailer ask')
const quiet = __test.helloTrailer({ name: '书房台式机' }, false)
if (quiet.includes('原样输出')) fail('trailer should not ask')
console.log('DONE')