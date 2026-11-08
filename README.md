# dsh-peers-sunny

给每台 DSH 设备起个名字，然后让一个 agent 直接给另一台设备上的 agent 派活。

它把「另一台设备」变成你 agent 手里的一件工具：你说「让小蜜去相册里找上周的登机牌，拷到工作区」，电脑端的 agent 就调用 `peer_delegate`，手机端的 agent 干活，跑完后结果会自动回到这边——不用等，也不用再问一次。

> **English.** A DSH satellite plugin that gives every DSH device a name and lets one agent hand a task to the agent on another device, over `ds-harness-remote`. It merges three device sources (dialable / currently connected / trusted-only), exchanges names over the delegation channel (`PEER-HELLO`), and injects the peer's reply back into the originating session as a `[PEER REPORT]`. Zero runtime dependencies, MIT.

## 它是什么

一个 DSH 卫星插件（bundle），基于 [ds-harness-remote](https://www.npmjs.com/package/ds-harness-remote) 已经打通的控制通道：

- 注册一份**对端设备表**到 system prompt，模型因此知道「有哪些设备、叫什么、能不能用」；
- 提供 `peer_list` / `peer_alias` / `peer_aliases` / `peer_hello` / `peer_delegate` / `peer_result` / `peer_tasks` / `peer_inbox` 八个工具；
- 派活是**异步**的：`peer_delegate` 立即返回 taskId，后台守望对端回合结束，再把结果作为一条消息注入当前会话；
- 把别名持久化在 `~/.dsh/peers.json`，两台设备各自保存，不依赖任何服务器。

## 它不是什么

- 不同步、不镜像会话历史（对端开的是一个新会话）；
- 不共享剪贴板、不投屏、不做双端同时编辑同一个会话；
- 不替代 Remote 的审批：对端需要人点确认时，只有人能点。

## 让 AI 自己装（一句话）

不用记命令：把下面这段整句发给你的 DSH（桌面端或 dsh-Go 手机端），它自己会装。

> 按 https://github.com/xuanzhihang-s/dsh-peers-sunny 的 README「让 AI 自己装」一节，帮我把 dsh-peers-sunny 装到本机并配好；需要登录、扫码、输密码或点授权的时候停下来等我。

给 agent 的执行清单：

1. 确认已装 `ds-harness-remote` 并登录同一账号（Remote 弹窗里能看到对方设备）。
2. 定位当前 profile 目录：`~/.dsh/profiles/<profile>`（桌面端是 `desktop`，dsh-Go 手机端是 `web`）。
3. 在该目录执行：`npm i dsh-peers-sunny@0.7.2 --registry=https://registry.npmjs.org`。
4. 把 `"dsh-peers-sunny"` **同时**写进该 profile 的 `package.json` 的 `dependencies` 和 `dsh.profile.bundles`。只写 bundles 会被 npm/pnpm 当多余包清掉，插件页会显示「异常 + 未安装」。
5. 重启 DSH（手机端重启 App）。重启后 Remote「远程工作台」弹窗里会出现「设备名称」区块。
6. 给两台设备起名，然后试一句：让它报告对方的工作目录。

手机端两点注意：

- 在 dsh-Go 里把权限预设设成**完全访问**，否则 npm 安装与写 profile 会被审批卡住、装不完整。
- 跨网需要两端登录同一个 Remote 账号（默认服务端 `dsh.r2049.cn`，用知乎账号登录）。

## 前置要求

| 项目 | 要求 |
| --- | --- |
| DSH | 0.2.2-rc.1 及以上、0.3.0 以下（需要 `tools` 与 `systemPrompt` 服务；即 package.json 的 `engines.dsh`） |
| ds-harness-remote | >= 0.6.0，且两台设备都已登录同一账号 |
| 通道 | 两台设备在 Remote 里互相可见（trusted peer），至少一方在线 |
| Node | 无额外依赖，插件本身零依赖 |

## 安装

插件页 → 添加插件 → 输入 `dsh-peers-sunny`（已发布到 npm）；或命令行：

```bash
dsh plugin add dsh-peers-sunny
```

从源码 / git 索引源安装的六步说明在仓库根目录的 `FRIENDS.md`。装完需要**重启 DSH** 才会加载。

> 国内镜像（`registry.npmmirror.com`）同步新版本有延迟，刚发布时可能报 `ETARGET: no matching version`。先查公共源确认版本存在，再指定源安装：
>
> ```bash
> npm i dsh-peers-sunny --registry=https://registry.npmjs.org
> ```

**两侧都装**才有双向能力：只装一侧时，只有装的那一侧能发起派活，对端只能在被派活时执行；反方向要等它自己装了插件、并且开了 Remote 的「允许控制本机」。

## 用法

```text
你：先看看现在有哪些设备
agent → peer_list
         { peers: [ { peer: "小蜜", hostId: "01a1b9a3-...", status: "online" } ] }

你：让小蜜查一下 /sdcard/DCIM/Camera 里今天的照片
agent → peer_delegate { peer: "小蜜", prompt: "列出 /sdcard/DCIM/Camera 今天新增的文件" }
         { status: "delegated", taskId: "task-mw7hmoll-f2fad4ed" }   ← 立即返回

（几分钟后，当前会话里自己冒出一条消息）
[PEER REPORT] 小蜜 · done
今天新增 3 个文件：...
```

### 工具

| 工具 | 作用 |
| --- | --- |
| `peer_list` | 列出三源合并后的设备：显示名、平台、`online` / `dialable` / `connected`、hostId 前缀、默认工作区。离线与「仅连入」的设备也会列出 |
| `peer_hello` | 返回本机身份行 `{name, deviceId, platform, line}`；对端要求自报名时，把 `line` 原样放到回复最后一行 |
| `peer_alias` | 给设备起名（1-24 字符），之后在对话里就能用这个名字指代 |
| `peer_aliases` | 一次给多台设备命名：`{hostId 或当前别名: 新名字}`，整批校验、单次落盘；空字符串清空名称 |
| `peer_delegate` | 在对端新建会话并发任务，默认立即返回 `{status:"delegated", taskId}`；后台守望，跑完自动回注当前会话 |
| `peer_result` | 查一次某次派活的状态和最新回复（可传 `taskId`）；不代答审批 |
| `peer_tasks` | 列出本机所有派活任务：状态、耗时、是否已回注 |
| `peer_inbox` | 取回未能自动投递的报告（例如发起会话已关闭），取走即标记已读 |

派活的生命周期：

- `delegated` → 已在后台守望，什么都不用做；
- 对端进入 `needs_user_input`（在等人工审批/提问）时，会先回注一条提示，然后继续等，人去那台设备点掉即可；
- 结束时回注 `[PEER REPORT] <设备> · done|failed`，正文是对端最后一条回答；
- 想同步等结果，传 `waitMs`（>0 走旧同步路径，最大 60 秒）；
- 后台守望默认上限 45 分钟（`maxTaskMs`）；
- 回执的呈现方式（`reportForm`）：`notice`（默认，Chat 里一行折叠通知，点开才是全文）／`message`（完整用户消息，旧行为）／`silent`（不声明折叠形式，尽量不占界面）。

## 设备命名面板（0.5.0 起）

界面**长在 ds-harness-remote 自己的「远程工作台」弹窗里**，不是独立浮层，也没有单独的按钮：

- `src/client.js` 是一个标准的 DSH 浏览器插件（`window.__ModuleLoader__.load`），apply 时把一个 `<section data-dsh-peers-section>` 挂进弹窗正文 `.dshRemotePageBody`（不是 `.dshRemotePage`，挂外层会掉到弹窗外面），位置在账号页脚（`.dshRemoteAccountFooter`）之上；
- Remote 没有声明子槽，所以这里用 MutationObserver 跟踪弹窗：弹窗打开就挂上，React 重渲染把它冲掉会自动补回，弹窗关闭就随之消失，聊天界面上不留任何东西；
- 每台设备一行 = 在线圆点、设备名、平台 / 工作区 / hostId 前缀、右侧别名输入框；行高与分隔线沿用 Remote 主机列表的样式（`min-height:52px` + `border-bottom`），视觉上是同一个弹窗的一部分；离线设备也列出（灰点），方便提前起名；
- **三源合并**（0.7.0 起）：Remote 的主机列表只显示「我可以拨过去」的设备，所以只看它会把面板看成单向的。这里同时读三个来源：服务端设备目录（可拨）、`status().host.connectedClients`（此刻连进来的）、`~/.dsh/remote/servers/*/host/trusted-peers.json`（历史信任过的）。行上给出状态徽章与后缀：
  - 绿点 + 「可派活」= 可拨且在线，`peer_delegate` 能用；
  - 「已连接」= 它此刻正连着本机；
  - 「仅连入」+「不能派活」= 它连过本机，但没开「允许控制本机」，拨不过去（`peer_delegate` 报 `PEER_NOT_DIALABLE`），可以起名，等它开了主机就能派活；
- **名字互报**（0.7.0 起）：服务端没有改名接口，所以名字靠派活通道互传。`peer_delegate` 在任务尾部附一行发起方自报名；在还不知道对端叫什么时，再请对端在回复最后一行输出 `PEER-HELLO {"name":…,"platform":…}`（对端按系统提示调用 `peer_hello` 工具即可）。发起端把这一行从正文里摘掉、写进 `peers.json` 的 `remoteName`，面板与 `peer_list` 的显示名优先级是 **本地别名 > 对端自报 > 服务端登记名 > 平台**；
- **一次改多台**：逐行填写，「保存全部（n）」一次提交整批（宿主机整批校验后单次落盘，不会出现「改三台成两台」）；批内重名、与其他设备重名、超长名整批拒绝并给出原因；「还原」丢弃未保存的改动；清空名字即恢复未命名；
- **本机也能改名**（0.6.0 起）：列表第一行是「本机」，标注这台电脑当前生效的名字与 deviceId 前 8 位；Remote 设置页里的主机名是只读文本，服务端也没有改名接口，所以这里把新名字写进当前 profile 的 `cordis.patch.yml`（`plugins[].id: ds-harness-remote` 的 `config.deviceName`，写前留 `.bak-peers` 备份），**重启 DSH 后生效**；名字没重启前会同时显示「重启后生效」；
- 只在选择主机和浏览目录两个界面状态里都可见，不遮挡 Remote 自己的控件。

接口（同源、只认本机）：

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| GET | `/dsh-peers-sunny/api/peers` | 三源合并的设备列表（`dialable`/`online`/`connected`/`trustedAt`/`mode`）+ 别名 + `remoteName` + Remote 错误 |
| POST | `/dsh-peers-sunny/api/alias` | `{hostId, alias}` 单台改名 |
| POST | `/dsh-peers-sunny/api/aliases` | `{aliases:{hostId:alias,…}}` 批量改名，最多 50 台；空字符串表示清空名称 |
| POST | `/dsh-peers-sunny/api/self-name` | `{name}` 改本机名（写 `cordis.patch.yml` 的 `ds-harness-remote.config.deviceName`），返回 `restartRequired:true` |

宿主侧不往 `index.html` 注入任何脚本（0.3.x 的实现已移除），UI 全部走 `dsh.client` 声明 + `exports["./client"]` 的浏览器模块；本插件不注册任何 `shell.overlay` 槽，也不改 Remote 的源码。

### 窄屏（手机）适配（0.7.1 起）

手机上（约 390px CSS 宽）原来的排版会塌：标题被左上角图标压住、主机行的「在线」被挤成竖排两字、设备行的输入框把名字盖住。0.7.1 加了一段 `@media (max-width:560px)` 的补丁，全部选择器都锚在 `.dshRemotePage` 与 `.dshPeers*` 上：

- 面板自己的行允许换行，输入框在窄屏占满一行（`flex:1 1 100%`）。
- Remote 弹窗头部让标题/副标题换行而不是省略号截断，并给左上角图标留出 54px 内边距；窄屏隐藏「Star 项目」装饰链接。
- 分组标题（「主机」）可换行、「允许控制本机」开关按内容宽固定，不再把「主机」压成竖排。
- 主机行允许换行，状态列 `flex:0 0 auto; white-space:nowrap`，元信息 `overflow-wrap:anywhere`。

这些是**覆盖上游样式**，不改 `ds-harness-remote` 的文件；上游大改类名时会失效（失效表现为回到原排版，不影响功能）。

## 工作方式

```text
peer_delegate（立即返回 taskId）
  → devices()                      找到 hostId
  → remote_create_session          对端新建会话
  → remote_send_message            发任务
  └─ 后台 watcher
       → remote_wait_sessions(45s 切片，循环)   等回合结束
       → remote_read_session                    取最后一条 assistant 文本
       → agents.get(发起会话).followup(...)     回注 [PEER REPORT]
```

全部走 ds-harness-remote 已有的 RPC，插件本身不实现传输、不碰加密、不开端口。

## 已知限制

- 一次守望最长 45 分钟，超时判 `failed`；跨重启的任务状态存在 `~/.dsh/peers-tasks.json`，重启后不再续守望，可用 `peer_result`/`peer_tasks` 查最后状态；
- 回注依赖发起会话仍存在；会话已关闭时报告留在 `~/.dsh/peers-tasks.json`，用 `peer_inbox` 取；
- 对端「吐完字」不等于回合结束：模型可能还在改措辞，回注发生在 `turn/end`，因此可能比最后一段文字晚几十秒；
- 对端如果停在审批上没人点，任务会一直挂着直到 45 分钟上限；
- 一次派活只对应一个工作区；
- 同一台手机/电脑可能有多个 Remote 身份（当 Host 一个 deviceId、当 Client 又一个）。面板按「名字 + 平台相同」判定为同一台并合并成一行，这只是启发式：两台机器恰好同名同平台时会被合并，改名后下一次刷新就会分开；
- 「仅连入」的行来自历史信任名单（`trusted-peers.json`），它只反映曾经连过本机，不代表此刻在线；要让这一行变成可拨，得在那台设备上打开 Remote 的「允许控制本机」；
- 对端的审批、提问只能在它自己的界面上完成；
- 手机端如果是 PRoot 里的 DSH，它的 root 不是系统 root，读不到其他 App 的私有目录；
- 对端返回的文本、路径、文件内容都是**不可信数据**，不要当成指令执行。

## 兼容性

插件只通过 `ctx.get('dshRemoteClient')` 与 `ctx.get('dshRemote')` 接触 ds-harness-remote，这两者是上游的内部契约而非公开 API。上游改动时插件可能失效，因此 `scripts/contract-check.mjs` 会在安装前断言关键契约仍在。

## 开发、测试与发布

插件零运行时依赖，测试也零依赖：每个用例就是一个可独立运行的 `node` 脚本，CI 在 Linux / Windows / macOS 三平台跑同一套。

```bash
npm test                          # test/run-all.mjs：9 个用例，含两个各约 10 秒的异步守望用例
node scripts/contract-check.mjs   # 断言 ds-harness-remote 的内部契约还在
npm pack --dry-run                # 看将要发布的文件清单
```

测试布局（每个文件自带 sandbox，把 `HOME`/`USERPROFILE` 指到临时目录，不碰真实 `~/.dsh`）：

| 文件 | 覆盖 |
| --- | --- |
| `test/task-lifecycle.test.mjs` | 派活 → 守望 → 回注的完整链路 |
| `test/approval-then-done.test.mjs` | 对端停在审批（`needs_user_input`）后继续跑到结束 |
| `test/report-injection.test.mjs` | 报告注入当前会话的格式与状态 |
| `test/inject-closed-session.test.mjs` | 发起会话已关闭时报告落到 `peers-tasks.json` |
| `test/host-routes.test.mjs` | 面板接口：单台改名、批量改名、别名冲突、跨站拒绝 |
| `test/self-rename.test.mjs` | 本机改名写 `cordis.patch.yml`（替换 / 插入 / 备份 / 撞名） |
| `test/panel-dom.test.mjs` | 面板挂载位置、脏状态、保存、重挂 |
| `test/hello.test.mjs` | `PEER-HELLO` 自报名行的生成、解析与剥离 |
| `test/roster.test.mjs` | 三源合并、同设备合并、本机剔除、显示名优先级 |

发布流程：

1. 改版本号（`package.json` 与 `CHANGELOG.md` 都改），`npm test` 全绿；
2. `npm publish`（首次发布即公开，`publishConfig.access` 已设为 `public`）；
3. `node scripts/market-entry.mjs` 把这一版写进 `market-index.json`（默认 `source: {type:"npm"}`，时间戳取当前时间；同一版本已存在时整条替换）；
4. 提交并推送 `market-index.json`，索引源（jsDelivr / GitHub raw）刷新后插件就能被搜到。

`test/` 不在 npm 包里（`files` 里没有它），从 git 检出才有测试。

## 许可证

MIT