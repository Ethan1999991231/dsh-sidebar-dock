# 让 `dsh-sidebar-dock` 在插件市场里真的搜得到、装得上

一句话结论：**插件市场不实时搜索 npm**，它搜的是社区精选目录
[`awesome-dsh-plugin`](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)
（构建产物 `https://awesome-dsh-plugin.com/plugins.json`，npm 包 `dsh-plugin-catalog`）。
所以「在搜索框里输入包名就能装」= **必须先被收录进那个目录**；发到 npm 只是让「收录后能按版本装」更顺，
以及让 `dsh plugin add dsh-sidebar-dock` 这类命令行安装可行。

依据（都在这台机器上核对过）：

- `dshmarket/lib/registry.js` —— 目录来自 `https://awesome-dsh-plugin.com/plugins.json`，不是 npm 实时搜索。
- `dshmarket/lib/routes.js:61` —— 安装信任是「catalog-bound」：市场只装目录里的条目，不接受任意 npm 名。
- `dshmarket` 全包 grep `/-/v1/search`、`npm search` —— 零命中，确认没有 npm 实时搜索兜底。
- 目录条目形态：`{ name, owner, url(GitHub), npm, version, category, description{en,zh}, icon? }`，共 8107 条。

## 三步走

### 1. 发到官方 npm（包名可用，已核对 404 = 未被占用）

```powershell
cd E:\Users\Administrator\Documents\deepseek-harness\default-workspace\plugins\dsh-sidebar-dock
node scripts/prepare-npm.mjs          # 生成 dist-npm/，把包名改成 dsh-sidebar-dock
cd dist-npm
npm login                             # 或 npm config set //registry.npmjs.org/:_authToken=xxxx
npm publish --access public
```

`prepare-npm.mjs` 会做三件事，缺一个都装不起来：

| 位置 | 从 | 到 | 为什么 |
| --- | --- | --- | --- |
| `package.json` `name` | `@local/dsh-sidebar-dock` | `dsh-sidebar-dock` | `@local` 作用域不可发布 |
| `cordis.patch.yml` `name:` | `@local/dsh-sidebar-dock` | `dsh-sidebar-dock` | Loader 按这个 specifier 解析模块 |
| `client.js` `load({ id: … })` | `@local/dsh-sidebar-dock` | `dsh-sidebar-dock` | Client 半注册 id 必须等于包名 |

工作树本身保持 `@local/...`（当前 profile 里装的是指向它的 junction），改名只发生在 `dist-npm/`，
所以不会打断你正在用的这一份。

已核对：`npm pack` 出 9 个文件 / 16.6 kB，`npm install <tgz>` 到临时工程后
`node_modules/dsh-sidebar-dock` 的 `name`、`dsh.bundle.patch` 正确，`client.js` 通过 `node --check`。

### 2. 推到 GitHub 并加 topic

```powershell
git remote add origin https://github.com/<用户名>/dsh-sidebar-dock.git
git branch -M main
git push -u origin main
git push origin v1.3.0
```

然后在仓库页 `⚙ → Topics` 加上 **`dsh-plugin`**（这是收录的硬性要求之一）。

### 3. 提 PR 收录（一个文件就是全部投稿）

仓库 `awesome-dsh-plugin/awesome-dsh-plugin`，新增
`data/plugins/<用户名>__dsh-sidebar-dock.yml`：

```yaml
url: https://github.com/<用户名>/dsh-sidebar-dock
name: <用户名>/dsh-sidebar-dock
category: ui
description:
  en: Docks the DSH workspace and session list to the left, right, top or bottom edge, with auto-hide and an adjustable reveal zone.
  zh: 把 DSH 的「工作区 / 会话记录」列表停靠到左、右、上、下任意一边，支持自动收纳与可调触发范围。
icon: https://raw.githubusercontent.com/<用户名>/dsh-sidebar-dock/main/icon.svg
```

（`icon` 可省，省了会用仓库头像；`zh` 可省，维护者会补。描述里出现 `: ` 必须加引号。）

收录要求逐条对照：

| 要求 | 本仓库状态 |
| --- | --- |
| `package.json` 声明 `dsh.bundle`（**只声明 `dsh.client` 会被拒**） | ✅ `dsh.bundle.patch` + 旁边有 `cordis.patch.yml` |
| 仓库有真实可用的代码 | ✅ 已在本机四向实测 |
| 仓库创建满 1 天（CI 自动查） | ⚠️ 提交 PR 时确认 |
| 加 `dsh-plugin` topic | ⚠️ 第 2 步做 |
| 描述只讲功能、不带营销词、且与代码一致 | ✅ 上面两条描述与实现一一对应 |
| 分类贴合实际功能 | ✅ `ui`（选项：`ui` `tools` `workflow` …） |

合并后目录会在 `main` 上自动重建，市场拉新索引后，搜索框输入 `dsh-sidebar-dock` 即可命中并一键安装。

## 收录之前 / 之后，怎么马上装上

- **发布 npm 之后立刻可用（不等收录）**：
  在 DSH 里 `plugin_manager action=install_bundle target=dsh-sidebar-dock`
  （`install_bundle` 的 `target` 接受包名 / 安装 spec，会走 profile 的包管理器把它加进去）。
- **本地文件也行**：`target=E:\…\plugins\dsh-sidebar-dock-1.3.0.zip` 解压后的目录，
  或 `dsh plugin --profile desktop add <路径>\dsh-sidebar-dock-1.3.0.tgz`。
- 换成 npm 版本前，先把现在这份 `@local/dsh-sidebar-dock` 卸掉，否则两个包都注册同一行设置。

## 常见坑

- 只发 npm 不提交目录 → 市场搜不到（它不搜 npm），但命令行 `dsh plugin add dsh-sidebar-dock` 可以装。
- 只提交目录不发 npm → 可以装，但走 git 源、没有版本号，更新靠 commit；有 npm 源时市场优先用 npm。
- 改了包名却忘了改 `cordis.patch.yml` 的 `name:` → 装上了但 Loader 解析不到模块，表现为「装了没反应」。
