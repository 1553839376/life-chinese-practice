# -*- coding: utf-8 -*-
"""组装单文件页面：生活语文练习台.html

顺序（v41 起语音包移到最末尾，见下）：
  p1 样式 → p2 结构 → <script> 音效包 → 图库 → 字库 → 数据层 → 语音内核 → 练习 → 老师端 → 认字+游戏 </script>
  → <script type="application/json" id="voicePack"> 语音包 → <script> 触发解析 </script>

为什么语音包放最后（v41）：浏览器必须读完一个 <script> 元素才能执行它。语音包原来夹在结构
和脚本之间，12.9 MB 音频把后面 2.5 MB 的脚本全堵住了 —— 教室 10 Mbps 下要等约 8 秒才出现
第一张照片。移到末尾后，前面 2.5 MB 一到脚本就能跑、界面立刻可用，音频在后台继续下，
下完由紧跟着的一行小脚本触发 JSON.parse（实测首屏字节 15.4 MB → 2.5 MB）。

写入用 newline='' 固定为 LF，保证不同平台构建出的字节一致。
"""
import io, os

os.chdir(os.path.dirname(os.path.abspath(__file__)))

HEAD = ['p1.html', 'p2.html']
TAIL = ['p_open.txt', 'p_sfx.js', 'p_art.js', 'p_stroke.js', 'lib.js', 'p4.js',
        'p8.js', 'p5.js', 'p_so.js', 'p6.js', 'p7.js', 'p_close.txt']
VOICE = 'p_voice.json'
OUT = '生活语文练习台.html'


def read(p):
    return io.open(p, encoding='utf-8').read()


voice = read(VOICE)
block = ('<script type="application/json" id="voicePack">' + voice + '</script>\n'
         '<script>if (window.voicePackWarm) voicePackWarm();</script>\n')

# p_close.txt = '</script>\n</body>\n</html>\n'。语音块必须落在「主脚本关闭之后、</body> 之前」：
# 放在 </html> 后面浏览器虽然会容错解析，但那是不合规的文档结构（也容易被平台重排）。
close = read(TAIL[-1])
cut = close.index('</body>')

parts = [read(p) for p in HEAD]
parts += [read(p) for p in TAIL[:-1]]
parts.append(close[:cut] + block + close[cut:])

html = ''.join(parts)
io.open(OUT, 'w', encoding='utf-8', newline='').write(html)
print('%s  %d KB  （%d 段，语音 JSON %.2f MB）'
      % (OUT, len(html.encode('utf-8')) // 1024, len(HEAD) + len(TAIL) + 1,
         len(voice.encode('utf-8')) / 1048576))
