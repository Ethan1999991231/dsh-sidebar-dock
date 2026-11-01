# 发布填写素材（GitHub）

复制粘贴用。改 `<你的用户名>` 即可。

---

## 1. 仓库 About 简介

GitHub 的 Description 上限 **350 字符**。给三档，按喜好取一条。

**中文（推荐，61 字）**

```
把 DeepSeek Harness 的「工作区 / 会话记录」列表停靠到左 / 右 / 上 / 下任意一边，解决左栏插件太多把会话挤没的问题；支持自动收纳与可调触发范围。
```

**中英混排（一句话，适合 About 一行显示）**

```
Dock the DeepSeek Harness workspace/session list to any edge (left/right/top/bottom) — 不再被左侧栏插件挤没。
```

**English only**

```
Dock the DeepSeek Harness workspace / session list to the left, right, top or bottom edge — with an auto-hiding reveal band and a configurable trigger zone. Solves a crowded plugin rail squeezing the session list out of view.
```

**Website 字段**（可不填，或填仓库 Releases 页）

```
https://github.com/<你的用户名>/dsh-sidebar-dock/releases
```

---

## 2. Topics（最多 20 个，建议 10 个）

```
deepseek-harness
dsh
dsh-plugin
plugin
sidebar
dock
layout
workspaces
sessions
uikit
```

---

## 3. Release v1.3.0

**Tag**：`v1.3.0`（已在仓库里打好附注标签）

**Release title**

```
v1.3.0 — 工作区列表四向停靠 + 自动收纳 + 可调触发范围
```

**Release 正文**（整段复制）

```markdown
把 DeepSeek Harness（DSH）左栏里的「工作区 / 会话记录」列表单独停靠到左 / 右 / 上 / 下任意一边，
插件图标条、品牌行、底部设置钮留在原位 —— 解决「左侧栏插件装太多、会话列表被挤得没法看」。

![settings](docs/settings.png)

## 安装

两个附件，任选其一。

**A. `dsh-sidebar-dock-1.3.0.zip`（推荐手动安装）**
解压后让 DSH 安装这个目录：

```
plugin_manager action=install_bundle target=<解压出来的目录绝对路径>
```

**B. `dsh-sidebar-dock-1.3.0.tgz`（命令行 / 自动化）**

```bash
dsh plugin --profile <profile-name> add <下载路径>/dsh-sidebar-dock-1.3.0.tgz
```

装完 **重载一次页面或重启软件端** 才会加载新的 client 模块。卸载：在「插件」界面关掉该 bundle 即可，
无副作用（不写宿主文件、不改宿主配置）。

## 功能

- **四向停靠**：左侧（默认，等于不改）/ 右侧 / 上侧 / 下侧，点一下立即生效
- **左栏宽度**：原始（保持宿主宽度）/ 适中 176px / 紧凑 112px
- **自动收纳**：平时收成贴边 5px 边线，鼠标贴边才展开，移开 420ms 收起
- **触发范围**：窄 32 / 标准 64 / 宽 104 / 很大 160 px（只监听 pointermove，不挡任何按钮点击）
- 新建的工作区与会话自动跟随；状态存 localStorage，卸载即还原

## 设置项

**设置 → 通用 → 工作区列表停靠位置**

| 控件 | 取值 | localStorage 键 |
| --- | --- | --- |
| 停靠位置 | 左侧 / 右侧 / 上侧 / 下侧 | `dsh-sidebar-dock/position` |
| 左栏宽度 | 原始 / 适中 176px / 紧凑 112px | `dsh-sidebar-dock/rail` |
| 触发范围 | 窄 32 / 标准 64 / 宽 104 / 很大 160 px | `dsh-sidebar-dock/zone` |
| 自动收纳 | 开 / 关 | `dsh-sidebar-dock/peek` |

## 校验和

```
96e87047c5f1a29e5d556a8de632f828afa33063b92fda0bdc2007557f04c487  dsh-sidebar-dock-1.3.0.zip
ba3b0b033c05322ed3461fb74bd904493b7588085a30e39c9acc2d9267027b92  dsh-sidebar-dock-1.3.0.tgz
```

## 已知边界

- 侧栏收起（rail 态）时插件不接管布局，设置行会提示先展开
- 非左侧停靠时宿主的分栏拖拽把手暂时隐藏（它的 left 是按默认 lane 算的像素），改回「左侧」即恢复
- 右栏保持原位；其它插件自己的固定层 z-index 更高，可能压住面板边角

**Full changelog**: [CHANGELOG.md](CHANGELOG.md)
```

---

## 4. 一句话宣传语（README 副标题 / 社交媒体）

```
左侧栏插件太多？把「工作区 / 会话记录」挪到右边、上面或下面 —— 一个设置项，立刻生效。
```

---

## 5. 首次 push 命令

```bash
cd dsh-sidebar-dock
git remote add origin https://github.com/<你的用户名>/dsh-sidebar-dock.git
git branch -M main
git push -u origin main
git push origin v1.3.0
```
