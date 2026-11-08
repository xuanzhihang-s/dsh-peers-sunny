# Changelog

## 0.8.1

- 修：对端跑完但取结果那一次 RPC 恰好断线时，任务被标成 done 却没有正文（只留下「读取结果失败：connection no longer available」）。现在读结果失败会重试最多 5 次（退避 1.5s/3s/4.5s/6s），仍失败才收尾，并在错误里提示可用 remote_read_session 直接看对端记录。
- 修：两个测试文件仍在 import 工作区里的历史快照 index.v0.2.0.js（绝对路径，别人机器上必然失败），改为 import ../src/index.js。现在 9 个测试都跑的是当前源码。

## 0.8.0

- **改名**：`dsh-peers-syh` → `dsh-peers-sunny`（npm 包名、GitHub 仓库、bundle id、HTTP 路由前缀 `/dsh-peers-sunny/api/*`、日志与提示文案全部一致改名）。旧包 `dsh-peers-syh` 不再更新，已装旧包的用户需要卸载后重装。
- 描述改为「对等」视角：两台设备的 agent 可以互相派活、互相读写对方工作区、接力完成任务。
- 无功能变更。

## 0.7.2

- README 新增「让 AI 自己装（一句话）」：给出可直接粘给 DSH 的一句话指令 + agent 执行清单（profile 定位、npm 源、dependencies 与 bundles 必须双写、手机端完全访问与同一 Remote 账号）。
- 无代码改动。

## 0.7.1

- 修：手机窄屏（约 390px）下 Remote 弹窗排版塌陷——标题被左上角图标压住、主机行状态竖排、设备名被输入框盖住。新增 `@media (max-width:560px)` 补丁：面板行允许换行且输入框窄屏占满一行；Remote 头部标题换行并留出 54px 图标位；分组标题与主机行允许换行、状态列 `flex:0 0 auto`。
- 修：`peer_hello` 报的是 Client 身份 deviceId，可拨的却是 Host 身份，两者不同。改为优先报 `status().host.deviceId`，并新增 `clientDeviceId` 字段；设备表剔除本机时同时排除两个身份。
- 修：重启后第一次连对端常报 `REMOTE_PREFLIGHT_FAILED`（remote 侧握手尚未完成），原来只重试 1 次、间隔 1.5s，实测常连败两次。改为 1.5s / 4s / 8s 退避、最多 4 次尝试；该错误保证「没有变更被派发」，重试安全。

## 0.7.0

- 已发布到 npm：`npm i dsh-peers-syh@0.7.0`（dist-tags `latest`、`beta` 均指向 0.7.0）。
- 设备表三源合并：服务端设备目录（可拨）+ `status().host.connectedClients`（此刻连入）+ `~/.dsh/remote/servers/*/host/trusted-peers.json`（历史信任），每行标注 `dialable` / `connected` / `trustedAt`。
- 新增「仅连入」状态；对这类设备调用 `peer_delegate` 报 `PEER_NOT_DIALABLE` 并提示去那台设备打开「允许控制本机」。
- 名字互报（PEER-HELLO）：派活时附带发起方自报名；对端调用 `peer_hello` 把身份行放在回复最后一行，发起端解析后写入 `peers.json` 的 `remoteName`，并从正文里剥掉该行。
- 显示名优先级：本地别名 > 对端自报 > 服务端登记名 > 平台。
- 同名同平台的多个 Remote 身份（Host 一个 deviceId、Client 又一个）合并成一行（启发式）。
- 面板新增状态徽章与后缀（可派活 / 已连接 / 仅连入 / 离线）。
- 发布准备：npm 元数据（`repository` / `homepage` / `bugs` / `publishConfig`）、`CHANGELOG.md`、`.gitignore`、GitHub Actions 三平台 CI。
- 测试迁入包内 `test/`（9 个用例 + `run-all.mjs`，`npm test` 一条命令跑完，每个用例自带临时 `HOME`，不碰真实 `~/.dsh`）。
- `scripts/market-entry.mjs`：发布后一条命令把当前版本写进 `market-index.json`（npm / git 两种 source，同版本整条替换）。
- `files` 增加 `scripts/`（安装后仍可跑 `node scripts/contract-check.mjs`）。

## 0.6.0

- 面板首行是「本机」，可给这台电脑改名：写当前 profile 的 `cordis.patch.yml`（`ds-harness-remote.config.deviceName`，写前留 `.bak-peers` 备份），重启 DSH 生效。
- 新增 `POST /dsh-peers-syh/api/self-name`；本机名与设备别名撞名时拒绝。

## 0.5.0

- 设备命名面板改挂在 ds-harness-remote 的「远程工作台」弹窗正文（`.dshRemotePageBody`）里，跟随弹窗开关；移除独立浮层按钮与 `webserver/index-inject` 注入。
- 行样式对齐 Remote 主机列表（52px 行高、分隔线、右侧输入框）。

## 0.4.1

- 新增 `peer_aliases` 工具与 `POST /dsh-peers-syh/api/aliases`：一次给多台设备命名，整批校验、单次落盘；空字符串清空名称。

## 0.4.0

- 左下角「设备」胶囊按钮 + 弹层面板（0.5.0 已改为长在 Remote 弹窗里）。

## 0.3.x

- 插件元数据：`locale/{en,zh}.json`（`meta.title` / `meta.description`）、`icon.svg`，`exports` 补 `./locale/*`。
- 桌面端通过 `webserver/index-inject` 注入面板脚本（0.5.0 已移除）。

## 0.2.x

- 派活改为**异步**：`peer_delegate` 立即返回 `taskId`，后台守望对端回合结束，把结果作为 `[PEER REPORT]` 回注发起会话。
- 新增 `peer_tasks` / `peer_inbox`；任务状态落盘 `~/.dsh/peers-tasks.json`。
- 回归过滤：只取 `type === 'text'` 的 part，不再把 reasoning 当成回复。
- 守望加固：每次 RPC 套超时、状态变化写 `~/.dsh/peers-watch.log`；`REMOTE_PREFLIGHT_FAILED` 自动重试一次（该错误码保证没有变更被派发）。

## 0.1.0

- 首个版本：`peer_list` / `peer_alias` / `peer_delegate` / `peer_result`，同步 `waitMs` 模式，别名存 `~/.dsh/peers.json`。
