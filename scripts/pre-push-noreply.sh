#!/bin/sh
# pre-push-noreply.sh -- ★押す 前に、まだ 遠くに 無い commit の 作者と commit した 人の メールが noreply か 見る★（2026-10-11）
#   なぜ：公開 repo の commit の 欄に 受信箱や 司さんの メールが 出て いた（司さん 10-11「アドレスが分からんようにしろや」）。
#         repo の 設定（--local）の user.email は GitHub の noreply に した。設定が 抜けた 席で 押すと また 出るので 止める。
#   通す：<名前>@users.noreply.github.com と GitHub 自身（noreply@github.com＝画面の merge の commit した 人）だけ。
#   出す：SHA と「作者／commit した 人」だけ（メールの 字は 出さない）。
#   置き方：cp scripts/pre-push-noreply.sh .git/hooks/pre-push（git と sh だけで 動く＝古い 枝の 作業場所でも 同じ）
#   読む物：pre-push の 標準入力「<手元の ref> <手元の sha> <遠くの ref> <遠くの sha>」
zero=0000000000000000000000000000000000000000
bad=0
seen=0
while read lref lsha rref rsha; do
  [ -z "$lsha" ] && continue
  [ "$lsha" = "$zero" ] && continue          # 消す 押しは 見る commit 無し
  list=$(git log --format='%H %ae %ce' "$lsha" --not --remotes 2>/dev/null) || { echo "★作者の 門：commit を 並べられない＝押さない★" >&2; exit 1; }
  # 改行で 区切って 見る（パイプの while は 子の 中に なるので 使わない）
  old_ifs=$IFS; IFS='
'
  for line in $list; do
    IFS=$old_ifs
    set -- $line
    seen=$((seen + 1))
    for who in a c; do
      if [ "$who" = a ]; then m=$2; label='作者'; else m=$3; label='commit した 人'; fi
      m=$(printf '%s' "$m" | tr 'A-Z' 'a-z')
      case "$m" in
        *@users.noreply.github.com|noreply@github.com) : ;;
        *) bad=$((bad + 1)); echo "  $(printf '%s' "$1" | cut -c1-12) の $label" >&2 ;;
      esac
    done
    IFS='
'
  done
  IFS=$old_ifs
done
if [ "$bad" -gt 0 ]; then
  echo "★押すのを 止めた★ メールが noreply で ない 欄が $bad 件（字は 出さない）" >&2
  echo "  ⇒ git config --local user.email <id>+<口>@users.noreply.github.com にして commit を 作り直す（--amend --reset-author）" >&2
  exit 1
fi
echo "pre-push-noreply: 見た commit $seen 本・全部 noreply"
exit 0
