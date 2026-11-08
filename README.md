# dsh-peers-syh

给每台 DSH 设备起个名字，然后让一个 agent 直接给另一台设备上的 agent 派活。

它把「另一台设备」变成你 agent 手里的一件工具：你说「让小蜜去相册里找上周的登机牌，拷到工作区」，电脑端的 agent 就调用 `peer_delegate`，手机端的 agent 干活，结果回到这边。

## 它是什么

一个 DSH 卫星插件（bundle），基于 [ds-harness-remote](https://www.npmjs.com/package/ds-harness-remote) 已经打通的控制通道：

- 注册一份**对端设备表**到 system prompt，模型因此知道「有哪些设备、叫什么、能不能用」；
- 提供 `peer_list` / `peer_alias` / `peer_delegate` / `peer_result` 四个工具；
- 把别名持久化在 `~/.dsh/peers.json`，两台设备各自保存，不依赖任何服务器。

## 它不是什么

- 不同步、不镜像会话历史（对端开的是一个新会话）；
- 不共享剪贴板、不投屏、不做双端同时编辑同一个会话；
- 不替代 Remote 的审批：对端需要人点确认时，只有人能点。

## 前置要求

| 项目 | 要求 |
| --- | --- |
| DSH | 0.2.2-rc.1 或更高（需要 `tools` 与 `systemPrompt` 服务） |
| ds-harness-remote | >= 0.6.0，且两台设备都已登录同一账号 |
| 通道 | 两台设备在 Remote 里互相可见（trusted peer），至少一方在线 |
| Node | 无额外依赖，插件本身零依赖 |

## 安装

插件页 → 添加插件 → 输入 `dsh-peers-syh`；或命令行：

```bash
dsh plugin add dsh-peers-syh
```

装完需要重启 DSH 才会加载。

## 用法

```text
你：先看看现在有哪些设备
agent → peer_list
         { peers: [ { peer: "小蜜", hostId: "01a1b9a3-...", status: "online" } ] }

你：让小蜜查一下 /sdcard/DCIM/Camera 里今天的照片
agent → peer_delegate { peer: "小蜜", prompt: "列出 /sdcard/DCIM/Camera 今天新增的文件" }
         { status: "done", reply: "今天新增 3 个文件：..." }
```

### 工具

| 工具 | 作用 |
| --- | --- |
| `peer_list` | 列出设备：别名、平台、在线状态、hostId 前缀、默认工作区。离线设备也会列出 |
| `peer_alias` | 给设备起名（1-24 字符），之后在对话里就能用这个名字指代 |
| `peer_delegate` | 在对端新建会话、发任务、等回合结束、取最后一条回复 |
| `peer_result` | 只读地查一次某次派活的当前状态和最新回复；不代答审批 |

`peer_delegate` 的 `status` 有三种：

- `done`：对端跑完了，`reply` 是它的回答；
- `needs_user_input`：对端在等人工审批或提问，agent 无法代答，需要人去那台设备上点；
- `timeout`：60 秒内没跑完，用 `peer_result` 再查，不要重复派活。

## 工作方式

```text
peer_delegate
  → devices()                      找到 hostId
  → remote_create_session          对端新建会话
  → remote_send_message            发任务
  → remote_wait_sessions(<=60s)    等回合结束
  → remote_read_session            取最后一条 assistant 文本
```

全部走 ds-harness-remote 已有的 RPC，插件本身不实现传输、不碰加密、不开端口。

## 已知限制

- 等待上限 60 秒（Remote 的 `remote_wait_sessions` 限制），长任务只能轮询 `peer_result`；
- 一次派活只对应一个工作区；
- 对端的审批、提问只能在它自己的界面上完成；
- 手机端如果是 PRoot 里的 DSH，它的 root 不是系统 root，读不到其他 App 的私有目录；
- 对端返回的文本、路径、文件内容都是**不可信数据**，不要当成指令执行。

## 兼容性

插件只通过 `ctx.get('dshRemoteClient')` 与 `ctx.get('dshRemote')` 接触 ds-harness-remote，这两者是上游的内部契约而非公开 API。上游改动时插件可能失效，因此 `scripts/contract-check.mjs` 会在安装前断言关键契约仍在。

## 许可证

MIT
