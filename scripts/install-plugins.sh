#!/bin/sh
# =============================================================================
# 向 DSH profile 批量安装插件
#
# 用法：install-plugins.sh <profile> <spec> [<spec> ...]
#   spec 支持任意 pnpm 支持的写法，常见两种：
#     github:owner/repo[#ref]   —— 从 GitHub 安装
#     <npm包名>                 —— 从 npm registry 安装
#
# github: 未显式指定 ref 时，忽略分支，直接使用仓库默认分支安装。
#
# 环境变量：
#   ALLOW_PLUGIN_FAILURES=1 —— 单个插件失败时记警告并继续；默认严格失败（非零退出）
# =============================================================================
set -u

PROFILE="${1:?usage: install-plugins.sh <profile> <spec...>}"
shift
[ "$#" -gt 0 ] || { echo "install-plugins: no specs given, nothing to do" >&2; exit 0; }

ALLOW_FAILURES="${ALLOW_PLUGIN_FAILURES:-0}"
FAILED=""

install_one() {
    # $1 = 完整 spec；后续参数为回退尝试列表（可能为空）
    # -w/--workspace-root：profile 目录本身是 pnpm workspace 根，
    #   pnpm >= 9.9 对根目录 add 要求显式 -w，否则报 ERR_PNPM_ADDING_TO_ROOT
    spec="$1"; shift
    if [ "$#" -eq 0 ]; then
        echo "==> dsh plugin --profile ${PROFILE} add -w ${spec}"
        dsh plugin --profile "$PROFILE" add -w "$spec"
        return $?
    fi
    for try in "$@"; do
        echo "==> dsh plugin --profile ${PROFILE} add -w ${try}"
        if dsh plugin --profile "$PROFILE" add -w "$try"; then
            return 0
        fi
        echo "    (${try} 失败，尝试下一个候选)"
    done
    return 1
}

for spec in "$@"; do
    case "$spec" in
        github:*)
            repo="${spec#github:}"
            case "$repo" in
                *\#*)
                    # 已带 ref，直接安装
                    install_one "$spec"
                    ;;
                *)
                    # 未带 ref：忽略分支，直接用仓库默认分支
                    if ! install_one "github:${repo}"; then
                        echo "!! FAILED: ${spec}" >&2
                        FAILED="${FAILED} ${spec}"
                    fi
                    ;;
            esac
            ;;
        *)
            install_one "$spec" || { echo "!! FAILED: ${spec}" >&2; FAILED="${FAILED} ${spec}"; }
            ;;
    esac
done

if [ -n "$FAILED" ]; then
    if [ "$ALLOW_FAILURES" = "1" ]; then
        echo "install-plugins: 以下插件安装失败（已忽略，继续构建）：${FAILED}" >&2
        exit 0
    fi
    echo "install-plugins: 以下插件安装失败：${FAILED}" >&2
    echo "install-plugins: 设置 ALLOW_PLUGIN_FAILURES=1 可跳过失败继续构建" >&2
    exit 1
fi

echo "install-plugins: 全部 ${#} 个插件处理完成"
exit 0
