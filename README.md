# DeepSeek Harness (DSH) Docker 镜像

构建一个预装了 DSH Web GUI 和常用插件的容器镜像。插件清单参考
[《DeepSeek Harness 值得安装的 15 款插件》](https://www.cnblogs.com/xiezhr/p/22560344)。

## 目录结构

```
dsh-docker/
├── .github/workflows/
│   └── docker-build-push.yml  # GitHub Actions：构建推送 GHCR + 打包 tar
├── Dockerfile                 # 镜像定义
├── docker-entrypoint.sh       # 容器入口：自动绑定容器 IP 并启动 dsh web
├── scripts/
│   └── install-plugins.sh     # 批量安装 profile 插件（忽略分支，用默认分支）
└── README.md
```

## 构建

```bash
docker build -t dsh:latest .
```

构建过程会：
1. 安装系统依赖（git / curl / 构建工具链）、pnpm 和 `@deepseek-ai/dsh`；
2. 初始化 `web` profile 并安装下方 14 款插件（`dsh plugin --profile web add ...`）；
3. 写入入口脚本，默认监听 3080 端口。

### 常用构建参数

| 参数 | 默认值 | 说明 |
|---|---|---|
| `DSH_VERSION` | `0.1.1-rc.2` | DSH npm 包版本 |
| `PLUGINS` | 下方 14 款 | 空格分隔的插件 spec（`github:owner/repo` 或 npm 包名） |
| `ALLOW_PLUGIN_FAILURES` | `0` | `1` = 单个插件安装失败时跳过继续构建 |

示例：

```bash
# 只装 Web UI 全家桶 + 插件市场
docker build --build-arg 'PLUGINS=github:zhu1090093659/dsh-web github:dsh-market/dsh-market' -t dsh:lite .

# 加上桌面客户端（Electron，体积大，headless 下基本不可用，不推荐）
docker build --build-arg 'PLUGINS=github:anywhere-labs/dsh-desktop github:zhu1090093659/dsh-web' -t dsh:desktop .
```

## 运行

```bash
docker run -d --name dsh \
  -p 3080:3080 \
  -v dsh-data:/opt/dsh \
  -e DEEPSEEK_API_KEY=sk-xxxx \
  dsh:latest
```

然后浏览器打开 `http://127.0.0.1:3080`。

### 环境变量

| 变量 | 默认值 | 说明 |
|---|---|---|
| `DSH_WEB_PORT` | `3080` | 监听端口 |
| `DSH_WEB_HOST` | `auto` | 绑定地址。`auto` 自动取容器首个非回环 IPv4 |
| `DSH_WEB_EXTRA_ARGS` | 空 | 追加给 `dsh web` 的参数，如 `--trusted-host` |
| `DSH_HOME` | `/opt/dsh` | DSH 数据目录（profile、会话、日志）；挂载卷持久化 |

模型 API Key 等配置按 DSH 常规方式注入（环境变量或 `$DSH_HOME` 下的配置文件），
不要在镜像里硬编码密钥。

## 已安装插件（14 款）

来自博客推荐，去掉了桌面客户端（Electron 应用，无头容器中无法运行）：

| 插件 | 仓库 | 用途 |
|---|---|---|
| dsh-web | [zhu1090093659/dsh-web](https://github.com/zhu1090093659/dsh-web) | Web UI 全家桶（侧边栏/看板/统计） |
| dsh-better-sidebar | [omdsh-dev/DSH-better-sidebar](https://github.com/omdsh-dev/DSH-better-sidebar) | 侧边栏：文件树/终端/Git |
| dsh-TUI | [ccch1mneyyy/dsh-TUI](https://github.com/ccch1mneyyy/dsh-TUI) | 全屏终端界面 |
| dsh-market | [dsh-market/dsh-market](https://github.com/dsh-market/dsh-market) | 内置插件市场 |
| modlens | [liustack/modlens](https://github.com/liustack/modlens) | 视觉理解（截图识别） |
| modsearch | [liustack/modsearch](https://github.com/liustack/modsearch) | 联网搜索 |
| dsh-imagegen | [dickpy/dsh-imagegen](https://github.com/dickpy/dsh-imagegen) | 对话中生图 |
| dsh-agent-teams | [NanmiCoder/dsh-agent-teams](https://github.com/NanmiCoder/dsh-agent-teams) | 多智能体协作 |
| dsh-at-file | [FSMargoo/dsh-at-file](https://github.com/FSMargoo/dsh-at-file) | 聊天中 @ 引用文件 |
| dsh-workspace-search | [tsonglew/dsh-workspace-search](https://github.com/tsonglew/dsh-workspace-search) | 工作区全文搜索 |
| dsh-usage-stats | [Make0209/dsh-usage-stats](https://github.com/Make0209/dsh-usage-stats) | Token 用量/计费统计 |
| dsh-context-doctor | [Zhenyu98/dsh-context-doctor](https://github.com/Zhenyu98/dsh-context-doctor) | 上下文体检 |
| dsh-computer-use | [ZRui-C/dsh-computer-use](https://github.com/ZRui-C/dsh-computer-use) | 浏览器/电脑控制自动化 |
| dsh-reverse-skill | [dhicoc/dsh-reverse-skill](https://github.com/dhicoc/dsh-reverse-skill) | 逆向/安全研究技能包 |

> 已核对这些仓库均真实存在；其中 3 个仓库已改名或换默认分支
> （`deepseek-harness-desktop`→`dsh-desktop`，默认分支 `master`；
> `dsh-web-ui`→`dsh-web`，默认分支 `dev`；`dsh-at-file` 转移到 `FSMargoo`），
> 安装脚本会自动尝试 `main → master → dev → HEAD`，不必手工指定分支。

## GitHub Actions：推送 GHCR + 打包 tar

工作流文件：`.github/workflows/docker-build-push.yml`

### 触发方式

- push 到 `main` / `master` 分支（打 `latest` + 分支名 + `sha-<短哈希>` 标签）
- push 标签 `v*`（如 `v0.1.0`，打 `0.1.0`、`0.1` 等 semver 标签）
- 仓库页面手动 `Actions → Build & Push DSH Image → Run workflow`，可现场指定：
  - `plugins`：插件列表（默认 `default` 用 Dockerfile 内置清单）
  - `dsh_version` / `allow_plugin_failures` / `platforms`（默认 `linux/amd64,linux/arm64`）

### 产物

1. **GHCR 镜像**：`ghcr.io/<owner>/<repo>:latest` 等标签，多架构（amd64 + arm64）。
   DSH 沙箱用的原生模块 `node-addon-landlock-run` 同时提供了
   `-linux-x64` 和 `-linux-arm64` 两个可选依赖，arm64 可正常构建。
2. **tar 工件**：`dsh-image-linux-amd64.tar.gz`（+ sha256），30 天保留，
   在 Actions 运行页 Artifacts 里下载，离线导入：

   ```bash
   docker load < dsh-image-linux-amd64.tar.gz
   ```

### 使用前提

1. 把 `dsh-docker` 目录内容作为仓库根目录提交（`docker build` 的上下文就是它）。
   若 `dsh-docker` 是仓库的子目录，把 workflow 里 `env.BUILD_CONTEXT` 改成 `dsh-docker`。
2. GHCR 登录用的是内置的 `GITHUB_TOKEN`（workflow 已声明 `packages: write`），
   无需额外配置 Secret。
3. 推送后到 `https://github.com/<owner>/<repo>/pkgs/container/<repo>` 检查包；
   仓库为私有时包默认私有，需要公开可到包设置页改 visibility。

## 与博客原文的差异说明

1. **`--patch` 参数**：博客称启动要加 `dsh web --patch`。当前版本里
   `--patch <path>` 是"额外补丁文件"参数（裸写会报错），通过
   `dsh plugin` 安装的插件会写入 profile 清单（`dsh.profile.bundles`）并在启动时
   自动加载，**不需要** `--patch`。本镜像入口直接 `dsh web` 即可。
2. **`0.0.0.0` 被拒绝**：DSH 出于安全拒绝绑定 `0.0.0.0`（会暴露远程代码执行）。
   所以入口脚本自动探测容器 IP 并绑定到该 IP，配合 `docker run -p` 即可从宿主机访问；
   如需自定义绑定地址，设 `DSH_WEB_HOST`。
3. **desktop 插件未默认安装**：`anywhere-labs/dsh-desktop` 是 Electron 桌面客户端
   （系统托盘/独立窗口），无头容器里无法使用且会拉取 Electron 二进制、显著增大镜像。
   确需安装见上文构建参数示例。
4. **插件安装命令做了两处兼容修正**（本镜像已内置，均经实测验证）：
   - `pnpm >= 9.9` 对 workspace 根目录 `add` 要求显式 `-w`
     （`dsh plugin --profile web add -w github:...`），否则报
     `ERR_PNPM_ADDING_TO_ROOT`；
   - `pnpm 10` 默认阻止 git 依赖的 `prepare` 构建脚本（allowBuilds 门禁），
     会让安装失败，因此镜像固定 `pnpm@9`。
5. **插件包名以实际为准**：个别仓库的包名/`dsh.bundle` 声明以安装时输出为准；
   若某插件未声明 `dsh.bundle`，`dsh plugin` 会提示"作为普通依赖安装"，属正常现象。

## 验证（本机实测过的部分）

在隔离 `DSH_HOME` 下用 pnpm 9.15.9 实测通过：

```bash
# dsh plugin add 能正常安装并写入 bundle 栈
dsh plugin --profile web add -w "github:omdsh-dev/DSH-better-sidebar"   # + dsh-better-sidebar 0.18.0-alpha.0（node-pty 原生模块编译通过）
dsh plugin --profile web add -w "github:Zhenyu98/dsh-context-doctor#main"  # + dsh-context-doctor 0.6.1

# profile 清单核对（dependencies 与 dsh.profile.bundles）
python3 -c "import json; m=json.load(open('$DSH_HOME/profiles/web/package.json')); print(m['dsh']['profile']['bundles'])"

# 启动组合校验
dsh --profile web --dump-default-config   # 能看到各 bundle 层的补丁条目
```
