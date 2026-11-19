#!/usr/bin/env bash
# 把本仓库的插件文件同步到本机 DSH 实际加载的目录。
#
#   tools/sync-to-dsh.sh           # 先 node --check，再复制
#   tools/sync-to-dsh.sh --check   # 只对比，不一致时退出码 1
#
# 可覆盖的目录（一般不用）：
#   DSH_PROFILE_DIR   默认 ~/.dsh/profiles/desktop（DSH 自己导出的就是它）
#   DSH_RUN_DIR       默认 $DSH_PROFILE_DIR/created-plugins/<本机插件 id>
#   DSH_MIRROR_DIR    默认 工作区里的 .dsh-created-plugins/<本机插件 id>
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
ID='8c716ee6-17d5-46ae-b021-c82f36d0f6c1'
# 注意：不要用 $DSH_PROFILE，DSH 把它设成档名（desktop），拿来拼路径会变成相对路径。
PROFILE="${DSH_PROFILE_DIR:-$HOME/.dsh/profiles/desktop}"
RUN="${DSH_RUN_DIR:-$PROFILE/created-plugins/$ID}"
MIRROR="${DSH_MIRROR_DIR:-/Users/lnq/Documents/DSH 工作区/.dsh-created-plugins/$ID}"
FILES=(
  client.js
  index.js
  package.json
  cordis.patch.yml
  icon.svg
  locale/zh.json
  locale/en.json
)

mode='copy'
case "${1:-}" in
  '' ) ;;
  --check|-n ) mode='check' ;;
  * ) echo "用法：$0 [--check]" >&2; exit 2 ;;
esac

# 坏代码不往下游推：语法先过一遍。
node --check "$ROOT/client.js"

differ=''
for dir in "$RUN" "$MIRROR"; do
  [ -d "$dir" ] || continue
  for file in "${FILES[@]}"; do
    if ! cmp -s "$ROOT/$file" "$dir/$file"; then
      differ+="$dir/$file"$'\n'
    fi
  done
done

if [ "$mode" = 'check' ]; then
  if [ -z "$differ" ]; then
    echo '一致：仓库与两份加载副本相同。'
    exit 0
  fi
  echo '有差异（仓库 → 加载副本）：'
  printf '%s' "$differ"
  exit 1
fi

for dir in "$RUN" "$MIRROR"; do
  if [ ! -d "$dir" ]; then
    echo "跳过（目录不存在）：$dir"
    continue
  fi
  for file in "${FILES[@]}"; do
    mkdir -p "$dir/$(dirname "$file")"
    cp "$ROOT/$file" "$dir/$file"
  done
  echo "已同步：$dir"
done

echo
echo '下一步：回 DSH 界面点右上角那个打圈的刷新按钮（解除卡顿）；'
echo '或者直接点侧栏「最近任务」，它会发现代码变了、自动刷一次再回到这一页。'
