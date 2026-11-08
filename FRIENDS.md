# 从零装到能用（五步）

这份说明写给「另一台设备上的朋友」。全部做完之后，你可以在一条对话里说
「让小米14 去把那张照片发过来」，这台电脑上的 agent 会自己去调手机。

## 前置

| 需要 | 说明 |
| --- | --- |
| DSH | 0.2.2-rc 或更新的 0.2.x（`engines.dsh` 是 `>=0.2.2-0 <0.3.0`） |
| ds-harness-remote | 0.6.0 以上，**两侧都装**且登录同一账号 |
| 配对 | 至少一次在原生 UI 上互相信任 |
| 依赖 | 插件零依赖，不需要 git、不需要 Node |

## 第一步：两侧都装好 ds-harness-remote 并登录

在 DSH 的插件页装上 `ds-harness-remote`，登录同一个账号。一侧是 Host（被调用的那台），
另一侧也打开「允许控制本机」才能双向调用——只开一侧时，只有开的那侧能被拨通。

## 第二步：完成配对

在 Host 侧会看到一条待信任的设备请求，**必须在原生 UI 上点「信任」**。
这一步插件替不了你，agent 也替不了你。

验证：在远程工作台弹窗里能看到对方设备，状态在线。

## 第三步：装 dsh-peers-sunny（两侧都装）

插件页 → 添加插件 → 输入 `dsh-peers-sunny`。装完**重启 DSH**。

如果插件页搜不到（索引还没刷到），用索引源安装：插件 → 发现 → 添加索引源，填

```
https://cdn.jsdelivr.net/gh/xuanzhihang-s/dsh-peers-sunny@main/market-index.json
```

或者从源码装：把仓库目录放进 `~/.dsh/profiles/desktop/node_modules/dsh-peers-sunny/`，
在 profile 的 `package.json` 里把 `dsh-peers-sunny` 加进 `dsh.profile.bundles` 与 `dependencies`
（`"dsh-peers-sunny": "link:<仓库绝对路径>"`），再跑一次 `pnpm install`、重启 DSH。

## 第四步：起名

重启后打开远程工作台弹窗，拉到「设备名称」一节，逐台填写名字后点「保存全部」。也可以对它说：

```
列出我的对端设备，然后把手机那台命名为「小米14」
```

名字存在本机 `~/.dsh/peers.json`，重连和重启都不丢；改本机名要重启 DSH 才生效。

## 第五步：试跑

```
让小米14 在它的工作区里创建 probe.txt，内容写 hello，然后告诉我字节数
```

派活是异步的：工具立刻返回 taskId，对端跑完后结果会自己回到这条对话里。三种结局：

- `done` —— 跑完了，回执正文是对端最后一句话
- `needs_user_input` —— 对端在等人工审批，得去那台设备上点
- `failed` —— 超时（默认 45 分钟上限）或对端报错；用 `peer_result` 收尾，别重复派活

## 常见卡点

| 现象 | 原因 |
| --- | --- |
| 面板里没有设备 | 没登录、没配对，或对端 App 没在前台 |
| 行上写着「仅连入」 | 它连过本机但没开「允许控制本机」，拨不过去（`PEER_NOT_DIALABLE`） |
| 一直 needs_user_input | 对端权限预设保守，写文件/跑命令都要审批 |
| 名字是 localhost / 平台名 | 还没起别名或对端没自报名；别名只存在本机，不改服务器上的设备名 |
| 装完没反应 | 没重启 DSH；bundle 只在启动时加载 |