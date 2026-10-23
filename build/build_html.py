# -*- coding: utf-8 -*-
"""组装单文件页面：生活语文练习台.html

顺序：
  p1 样式 → p2 结构
  → <script type="application/json" id="voicePack"> 语音包（不参与脚本编译，首屏不等它）
  → <script> 音效包 → 图库 → 字库 → 数据层 → 语音内核 → 练习 → 老师端 → 认字+游戏 </script>

写入用 newline='' 固定为 LF，保证不同平台构建出的字节一致。
"""
import io, os

os.chdir(os.path.dirname(os.path.abspath(__file__)))

HEAD = ['p1.html', 'p2.html']
TAIL = ['p_open.txt', 'p_sfx.js', 'p_art.js', 'lib.js', 'p4.js',
        'p8.js', 'p5.js', 'p6.js', 'p7.js', 'p_close.txt']
VOICE = 'p_voice.json'
OUT = '生活语文练习台.html'


def read(p):
    return io.open(p, encoding='utf-8').read()


parts = [read(p) for p in HEAD]
voice = read(VOICE)
parts.append('<script type="application/json" id="voicePack">' + voice + '</script>\n')
parts += [read(p) for p in TAIL]

html = ''.join(parts)
io.open(OUT, 'w', encoding='utf-8', newline='').write(html)
print('%s  %d KB  （%d 段，语音 JSON %.2f MB）'
      % (OUT, len(html.encode('utf-8')) // 1024, len(HEAD) + len(TAIL) + 1,
         len(voice.encode('utf-8')) / 1048576))
