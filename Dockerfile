# syntax=docker/dockerfile:1
# =============================================================================
# DeepSeek Harness (DSH) 容器镜像
#
# 内容：
#   - node:22-bookworm-slim 基础镜像
#   - 全局安装 @deepseek-ai/dsh 与 pnpm（`dsh plugin` 是 pnpm 转发器）
#   - 初始化 web profile 并安装博客推荐的常用插件
#     https://www.cnblogs.com/xiezhr/p/22560344
#   - 入口直接启动 `dsh web`（Web GUI）
#
# 构建：
#   docker build -t dsh:latest .
#   插件清单固定在下方 RUN 行，增删插件直接改对应行
#   允许个别插件失败继续构建：docker build --build-arg ALLOW_PLUGIN_FAILURES=1 .
#
# 运行：
#   docker run -d -p 3080:3080 -v dsh-data:/opt/dsh dsh:latest
# =============================================================================
FROM node:24-bookworm-slim

# 系统依赖：
#   git            —— pnpm 拉取 github: 依赖需要
#   curl           —— 健康检查
#   ca-certificates—— HTTPS 证书
#   python3/make/g++—— 部分插件含原生模块，node-gyp 编译需要（保留在镜像里）
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      ca-certificates \
      curl \
      git \
      make \
      g++ \
      python3 \
 && rm -rf /var/lib/apt/lists/*

# pnpm：`dsh plugin` 把参数原样转发给 pnpm，必须在 PATH 上。
# 固定 pnpm@9 的原因（实测）：
#   - pnpm >= 9.9 对 workspace 根目录 add 要求显式 -w，否则 ERR_PNPM_ADDING_TO_ROOT
#     （下方安装命令已内置 -w）；
#   - pnpm 10 默认阻止 git 依赖的 prepare 构建脚本（allowBuilds 门禁），
#     pnpm 9 默认允许，插件才能装得上。
RUN npm install -g --no-audit --no-fund pnpm@9

# DeepSeek Harness（可覆盖版本，例如 --build-arg DSH_VERSION=0.1.1-rc.2）
RUN npm install -g --no-audit --no-fund "@deepseek-ai/dsh"

# DSH 数据目录（profiles、会话、日志都放在这里）；运行时挂载卷持久化
ENV DSH_HOME=/opt/dsh

# -----------------------------------------------------------------------------
# 常用插件（博客 15 款中去掉 deepseek-harness-desktop：
#   它是 Electron 桌面客户端，headless 容器里无法运行且体积巨大）
# 每个插件一行 RUN、一次安装；github: 未带 ref 时由 pnpm 直接使用仓库默认分支
# -----------------------------------------------------------------------------
# 1 = 某个插件安装失败时继续构建（记录警告），0 = 严格失败
ARG ALLOW_PLUGIN_FAILURES=0

# 初始化 web profile：profile 目录本身是 pnpm workspace 根。
# pnpm 9 要求 pnpm-workspace.yaml 必须带 packages 字段（可以为空列表），
# 否则每个 `pnpm add` 都报 "packages field missing or empty"；
# 同时预写 allowBuilds，允许 dsh-computer-use 的 prepare 构建脚本
# RUN mkdir -p /opt/dsh/profiles/web \
#  && printf 'packages: []\nallowBuilds:\n  dsh-computer-use: true\n' > /opt/dsh/profiles/web/pnpm-workspace.yaml

# -w：解决 pnpm >= 9.9 的 ERR_PNPM_ADDING_TO_ROOT（profile 目录即 workspace 根）
# 失败时默认终止构建；ALLOW_PLUGIN_FAILURES=1 则记警告后继续
#RUN dsh plugin --profile web add -w github:zhu1090093659/dsh-web || { echo "!! FAILED: github:zhu1090093659/dsh-web" >&2; [ "${ALLOW_PLUGIN_FAILURES}" = "1" ]; }
RUN dsh plugin --profile web add -w github:omdsh-dev/DSH-better-sidebar || { echo "!! FAILED: github:omdsh-dev/DSH-better-sidebar" >&2; [ "${ALLOW_PLUGIN_FAILURES}" = "1" ]; }
RUN dsh plugin --profile web add -w github:ccch1mneyyy/dsh-TUI || { echo "!! FAILED: github:ccch1mneyyy/dsh-TUI" >&2; [ "${ALLOW_PLUGIN_FAILURES}" = "1" ]; }
RUN dsh plugin --profile web add -w github:dsh-market/dsh-market || { echo "!! FAILED: github:dsh-market/dsh-market" >&2; [ "${ALLOW_PLUGIN_FAILURES}" = "1" ]; }
RUN dsh plugin --profile web add -w github:liustack/modlens || { echo "!! FAILED: github:liustack/modlens" >&2; [ "${ALLOW_PLUGIN_FAILURES}" = "1" ]; }
RUN dsh plugin --profile web add -w github:liustack/modsearch || { echo "!! FAILED: github:liustack/modsearch" >&2; [ "${ALLOW_PLUGIN_FAILURES}" = "1" ]; }
RUN dsh plugin --profile web add -w github:dickpy/dsh-imagegen || { echo "!! FAILED: github:dickpy/dsh-imagegen" >&2; [ "${ALLOW_PLUGIN_FAILURES}" = "1" ]; }
RUN dsh plugin --profile web add -w github:NanmiCoder/dsh-agent-teams || { echo "!! FAILED: github:NanmiCoder/dsh-agent-teams" >&2; [ "${ALLOW_PLUGIN_FAILURES}" = "1" ]; }
RUN dsh plugin --profile web add -w github:FSMargoo/dsh-at-file || { echo "!! FAILED: github:FSMargoo/dsh-at-file" >&2; [ "${ALLOW_PLUGIN_FAILURES}" = "1" ]; }
RUN dsh plugin --profile web add -w github:tsonglew/dsh-workspace-search || { echo "!! FAILED: github:tsonglew/dsh-workspace-search" >&2; [ "${ALLOW_PLUGIN_FAILURES}" = "1" ]; }
RUN dsh plugin --profile web add -w github:Make0209/dsh-usage-stats || { echo "!! FAILED: github:Make0209/dsh-usage-stats" >&2; [ "${ALLOW_PLUGIN_FAILURES}" = "1" ]; }
RUN dsh plugin --profile web add -w github:Zhenyu98/dsh-context-doctor || { echo "!! FAILED: github:Zhenyu98/dsh-context-doctor" >&2; [ "${ALLOW_PLUGIN_FAILURES}" = "1" ]; }
RUN dsh plugin --profile web add -w github:ZRui-C/dsh-computer-use || { echo "!! FAILED: github:ZRui-C/dsh-computer-use" >&2; [ "${ALLOW_PLUGIN_FAILURES}" = "1" ]; }
RUN dsh plugin --profile web add -w github:dhicoc/dsh-reverse-skill || { echo "!! FAILED: github:dhicoc/dsh-reverse-skill" >&2; [ "${ALLOW_PLUGIN_FAILURES}" = "1" ]; }


# 种子快照：运行时若挂载了空卷（-v dsh-data:/opt/dsh），
# 入口脚本会先把这份含插件的 profile 复制过去，避免空卷遮掉已装插件
RUN cp -a /opt/dsh /opt/dsh-seed

# 工作区（放项目文件，方便 agent 读写）
WORKDIR /workspace

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3080

# 健康检查：DSH 拒绝绑定 0.0.0.0，入口脚本自动绑定容器 IP，这里用 node 探测同一 IP
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD IP=$(node -e "const os=require('os');for(const a of Object.values(os.networkInterfaces()).flat()){if(a&&a.family==='IPv4'&&!a.internal){console.log(a.address);process.exit(0)}}" 2>/dev/null || echo 127.0.0.1); curl -fsS "http://${IP}:${DSH_WEB_PORT:-3080}/" || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]
