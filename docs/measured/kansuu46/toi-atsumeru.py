# -*- coding: utf-8 -*-
# ★溜まって いる 問いを 1枠に まとめる★（★紙から 読む＝手で 書き写さない★）
import io, os, re
D = 'C:/Users/zeroa/exally-prod/docs/measured/kansuu46'
紙たち = ['junretsu-kiku-koto.md', 'xmatch-kiku-koto.md', 'percentrank-kiku-koto.md',
          'asc-dbcs-kiku-koto.md', 'lenb-kiku-koto.md', 'textafter-kiku-koto.md',
          'aggregate-kiku-koto.md']
出 = []
for f in 紙たち:
    p = os.path.join(D, f)
    if not os.path.exists(p): 
        print('NG missing ' + f); continue
    t = io.open(p, encoding='utf-8').read()
    # 「次の 枠で 聞く 式」の 節だけ 取る
    i = t.find(u'\u6b21\u306e \u67a0\u3067 \u805e\u304f \u5f0f')
    本文 = t[i:] if i >= 0 else t
    式 = []
    for l in 本文.split(u'\n'):
        s = l.strip()
        if s.startswith(u'=') and u'(' in s:
            # 覚書きの 添え字を 落とす
            式.append(s.split(u'  ')[0].strip())
    式 = [x for x in 式 if x]
    出.append((f, 式))
    print(u'%-34s %d\u672c' % (f, len(式)))
合 = sum(len(x[1]) for x in 出)
print(u'\u2605\u5408\u8a08 %d\u672c\u2605' % 合)
io.open('C:/Users/zeroa/AppData/Local/Temp/claude/C--WINDOWS-System32-WindowsPowerShell-v1-0/99bd8909-7111-4a26-b739-c2029ed344d1/scratchpad/toi.txt',
        'w', encoding='utf-8', newline='').write(
    u'\n'.join([f + u'\t' + x for f, 式 in 出 for x in 式]))
