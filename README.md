# dsh-session-archive-panel · 归档会话面板

给 DeepSeek Harness 的「设置」加一个「归档会话」页：列出所有已归档的对话，可搜索、可恢复、可彻底删除；同时让工作区侧栏的会话区不再显示任何已归档对话（所有工作区都生效）。

## 装

需要 DSH `0.2.x`。

### 方式一：从 GitHub 装（推荐，不需要 npm 账号）

```powershell
dsh plugin --profile desktop add github:Listgone/dsh-session-archive-panel
```

网页版把 `desktop` 换成 `web`。

### 方式二：用 Release 里的压缩包

从 [Releases](https://github.com/Listgone/dsh-session-archive-panel/releases) 下载 `dsh-session-archive-panel-*.tgz`，解压到任意目录，然后在该目录执行：

```powershell
dsh plugin --profile desktop add ./dsh-session-archive-panel
```

装完**重启一次 DSH**（完全退出再打开，不是刷新网页），设置里就会出现「归档会话」。

## 用

- **列表**：每条显示标题、所属工作区、更新时间；默认只显示 5 条，底部「加载更多」每次再展开 5 条，并提示还剩多少条。
- **搜索**：按标题、工作区名、会话编号实时筛选；计数会变成「匹配 N 个（共 M 个）」。
- **收起 / 展开**：把搜索框和列表整块折起来，只留标题、状态提示和总数。
- **恢复 / 全部恢复**：对话回到它所属工作区的正常会话列表；「全部恢复」只作用于当前筛出来的结果。
- **彻底删除 / 全部删除**：都要求点两下——第一下只把按钮变成红字「再点一次确认（N 条）」，4～5 秒内不点就自动撤销。删的是磁盘上 `…\.dsh\sessions\<工作区>\<会话 id>\` 这一整个目录，**删了不能恢复**；删完页面提示「已删除（大小）」。
- **工作区侧栏**：所有工作区都不再显示已归档对话（等同于原生视图选项里的「隐藏已归档」）。

## 会动磁盘，请先看这条

「彻底删除」是**真删文件**，不是只从列表里隐藏：

- 只删 `sessions` 目录下面、目录名正好等于会话 id 的那一个文件夹；找不到就返回「session file not found」，不会碰别的目录。
- 会话 id 先做字符白名单校验，拼出的路径还会再校验一次必须落在 `sessions` 里面。
- 删除后 DSH 内存里可能还留着这条会话的索引，界面上的行会立刻消失，重启后彻底干净。
- 建议先拿一条不重要的归档对话试一次。

## 目录里各是什么

| 文件 | 给谁用 | 干什么 |
| --- | --- | --- |
| `lib/index.js` | DSH 本体 | 插件的「主机端」入口：提供「删除会话文件」接口（网页界面碰不到磁盘，只能靠它）。 |
| `lib/client.js` | DSH 网页界面 | 插件的「界面端」：设置里的「归档会话」页、列表、搜索、恢复与删除按钮，以及把侧栏的归档显示关掉。 |
| `cordis.patch.yml` | DSH 本体 | 装配清单：告诉 DSH 启动时把这个插件装上。 |
| `package.json` | DSH 本体与包管理器 | 插件身份信息、界面入口位置、装配清单位置。 |
| `README.md` / `LICENSE` | 看这个仓库的人 | 说明文件与 MIT 许可。 |
| `src/`、`scripts/`、`tsconfig.json`、`tsdown.config.ts` | 开发时备用 | 早期 TypeScript 脚手架，运行的是 `lib/` 里的手写 JavaScript，这些不参与运行。 |

## 卸载

```powershell
dsh plugin --profile desktop remove dsh-session-archive-panel
```

或直接在「设置 → 插件」里停用。

## 已知边界

- 只适配 `0.2.x` 的界面结构与 `workspaces` / `sessions` 客户端服务；DSH 大版本改动后可能需要跟进。
- 删除依赖 DSH 默认的会话存放位置（`<DSH_HOME>/sessions`，默认 `C:\Users\<你>\.dsh\sessions`）；自定义过存放位置的老设备上可能找不到会话目录。
- 「彻底删除」不可撤销。本插件不提供回收站。

## 许可

MIT
