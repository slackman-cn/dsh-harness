#!/bin/sh
# =============================================================================
# dsh web 容器入口
#
# 环境变量：
#   DSH_WEB_PORT  监听端口，默认 3080
#   DSH_WEB_HOST  绑定地址，默认 auto（自动取容器首个非回环 IPv4）；
#                 DSH 出于安全拒绝 0.0.0.0，所以不能直接绑全网卡
#   DSH_WEB_EXTRA_ARGS  追加给 `dsh web` 的参数，例如
#                 "--trusted-host myhost.example.com"
# =============================================================================
set -eu

DSH_WEB_PORT="${DSH_WEB_PORT:-3080}"
DSH_WEB_HOST="${DSH_WEB_HOST:-auto}"

# 种子恢复：$DSH_HOME 若被空卷遮住（或指向全新目录），
# 把镜像里预装的 profile（含插件）复制过去
if [ ! -f "${DSH_HOME:-/opt/dsh}/profiles/web/package.json" ] && [ -f /opt/dsh-seed/profiles/web/package.json ]; then
    echo "dsh: seeding ${DSH_HOME:-/opt/dsh} from /opt/dsh-seed (fresh DSH home)"
    mkdir -p "${DSH_HOME:-/opt/dsh}"
    cp -a /opt/dsh-seed/. "${DSH_HOME:-/opt/dsh}"/
fi

if [ "$DSH_WEB_HOST" = "auto" ]; then
    DSH_WEB_HOST="$(node -e '
        const os = require("os");
        for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
            for (const a of addrs || []) {
                if (a.family === "IPv4" && !a.internal) {
                    process.stdout.write(a.address);
                    process.exit(0);
                }
            }
        }
    ' 2>/dev/null || true)"
    DSH_WEB_HOST="${DSH_WEB_HOST:-127.0.0.1}"
fi

echo "dsh web -> http://${DSH_WEB_HOST}:${DSH_WEB_PORT}"
# shellcheck disable=SC2086 -- DSH_WEB_EXTRA_ARGS 有意按词拆分
exec dsh web --host "$DSH_WEB_HOST" --port "$DSH_WEB_PORT" --no-open $DSH_WEB_EXTRA_ARGS "$@"
