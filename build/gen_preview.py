# -*- coding: utf-8 -*-
"""生成图示总览页：图示预览-全部.html（111 个图示，其中 40 张插画位图）"""
import json, io
from pypinyin import lazy_pinyin, Style

ART = json.load(io.open('art_pack1.json', encoding='utf-8'))

OVERRIDE = {'卜': 'bo', '茄': 'qié'}


def py(ch):
    if ch in OVERRIDE:
        return OVERRIDE[ch]
    return lazy_pinyin(ch, style=Style.TONE)[0]


GROUPS = [
    ('动物', '20 个 · 插画位图', ['马', '牛', '羊', '兔', '猫', '狗', '猪', '鸡', '鸭', '鸟',
                           '鱼', '鼠', '虎', '熊', '龙', '蛇', '猴', '蛙', '虫', '蜂']),
    ('人物 · 动作', '16 个 · 插画位图', ['走', '跑', '跳', '坐', '吃', '喝',
                                  '听', '唱', '看', '睡', '写', '洗',
                                  '扫', '抱', '拉', '飞']),
    ('自然 · 天气', '', ['日', '月', '星', '阳', '云', '雨', '风', '光', '火', '水',
                     '山', '土', '田', '石', '井', '河', '湖', '海', '岛', '林',
                     '树', '木', '竹', '叶', '花', '草', '苗']),
    ('身体', '5 个 · 插画位图', ['手', '足', '耳', '口', '牙', '目', '心']),
    ('吃的', '', ['果', '桃', '杏', '瓜', '菜', '萝', '茄', '禾', '米', '肉', '蛋', '饼', '汤']),
    ('用的', '', ['书', '笔', '刀', '尺', '卡', '包', '币', '钱', '弓', '球', '珠', '伞',
                '灯', '钟', '锅', '碗', '盘', '桌', '床', '窗', '门', '桥', '房', '家',
                '衣', '鞋', '巾', '车']),
]

# 不画图，走词语标红的字（画脸一定诡异，不如直接给词）
FALLBACK = [
    ('卜', '萝卜', 'bo', '萝卜'),
    ('毛', '羊毛', 'máo', '羊毛'),
    ('头', '头发', 'tóu', '头发'),
    ('脸', '洗脸', 'liǎn', '洗脸'),
]

assigned = set()
for _, _, lst in GROUPS:
    assigned |= set(lst)
leftover = [c for c in ART if c not in assigned]
if leftover:
    GROUPS.append(('其他', '', leftover))
print('未分组', ''.join(leftover))


def svg(ch, size):
    return ('<svg viewBox="0 0 120 120" width="%d" height="%d" aria-label="%s">%s</svg>'
            % (size, size, ch, ART[ch]))


def cell(ch):
    return ('<figure class="cell">%s<figcaption><b>%s</b><span>%s</span></figcaption></figure>'
            % (svg(ch, 104), ch, py(ch)))


H = '''<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>图示总览 · 111 个</title>
<style>
*{box-sizing:border-box}
body{margin:0;padding:24px 18px 64px;background:#F6F7F9;color:#243244;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}
.wrap{max-width:1080px;margin:0 auto}
h1{font-size:24px;margin:0 0 8px}
.sub{color:#66748A;font-size:14px;margin:0 0 16px;line-height:1.8}
.chips{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 8px}
.chip{background:#fff;border-radius:999px;padding:6px 13px;font-size:12.5px;color:#4A5A70;
  box-shadow:0 1px 2px rgba(24,40,64,.06)}
.chip b{color:#1E6BFF}
h2{font-size:17px;margin:34px 0 12px;display:flex;align-items:baseline;gap:8px}
h2 em{font-style:normal;font-size:12px;color:#8A96A8;font-weight:400}
.note{background:#fff;border-radius:14px;padding:14px 16px;font-size:13px;color:#4A5A70;
  line-height:1.9;box-shadow:0 1px 3px rgba(24,40,64,.06)}
.note b{color:#1E6BFF}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(122px,1fr));gap:10px}
.cell{background:#fff;border-radius:14px;padding:10px 6px 6px;margin:0;text-align:center;
  box-shadow:0 1px 3px rgba(24,40,64,.06)}
.cell svg{display:block;width:100%;height:auto;max-width:104px;margin:0 auto 4px}
.cell figcaption{font-size:13px}
.cell figcaption b{font-weight:600}
.cell figcaption span{color:#8A96A8;font-size:11px;margin-left:4px}
.demo{background:#fff;border-radius:16px;padding:16px 18px;box-shadow:0 1px 3px rgba(24,40,64,.06);
  margin-bottom:12px}
.dl{margin:0 0 10px;font-size:13px;color:#8A96A8}
.dstem{display:flex;justify-content:center;padding:4px 0 12px}
.dstem svg{width:140px;height:140px}
.dopts{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.dopt{background:#F6F8FB;border-radius:12px;padding:8px 2px 4px;text-align:center}
.dopt svg{display:block;width:100%;height:auto;max-width:64px;margin:0 auto 3px}
.dopt b{font-size:14px}
.wd{display:flex;gap:12px;flex-wrap:wrap;margin-top:4px}
.wcard{flex:1 1 200px;background:#FFFDF7;border:1px dashed #E8DCC0;border-radius:14px;
  padding:16px;text-align:center}
.wcard .big{font-size:44px;letter-spacing:6px;font-weight:600;color:#2C3A4E}
.wcard .big i{font-style:normal;color:#E23D3D}
.wcard p{margin:8px 0 0;font-size:12px;color:#9A8862;line-height:1.7}
@media(max-width:520px){.dstem svg{width:118px;height:118px}}
</style></head><body><div class="wrap">
'''

H += '<h1>图示总览 · 111 个</h1>\n'
H += ('<p class="sub">动物、人物动作、身体部位共 40 个用插画位图，其余 67 个用手绘扁平 SVG（简单、清楚）。'
      '全部图片都内联在页面里，不依赖外网。</p>\n')
H += ('<div class="chips"><span class="chip">插画位图 <b>40</b></span>'
      '<span class="chip">扁平手绘 <b>67</b></span>'
      '<span class="chip">词语降级 <b>4</b>（卜 · 毛 · 头 · 脸）</span>'
      '<span class="chip">合计 <b>111</b> 个字</span></div>\n')

H += ('<div class="note">这一版专门改"人"和"头"这些图。原来的问题是：'
      '<b>脑袋画得太大、还带眼睛嘴巴</b>，身子又像一根粗棒，所以看着诡异。'
      '现在的做法是——<b>人一律不画五官</b>，只留发型轮廓；比例按真人调整（头 22、躯干 32、腿 30），'
      '四肢分开画、肘膝带弯，动作配椅子、桌子、绳子这些道具来提示。'
      '<br><b>手、足、耳、牙</b>这 4 张改成写实插画，比手绘清楚；'
      '<b>头、脸</b>两个一定要画脸的字，改成词语（头<i style="font-style:normal;color:#E23D3D">发</i>、洗<i style="font-style:normal;color:#E23D3D">脸</i>）。</div>\n')

# 题目示例
H += '<h2>孩子看到的题目 <em>看图选字</em></h2>\n'
H += '<div class="demo"><p class="dl">上面一张图是题目，下面四个选项选一个字</p>'
H += '<div class="dstem">%s</div><div class="dopts">' % svg('灯', 140)
for c in ['灯', '碗', '钟', '锅']:
    H += '<div class="dopt">%s<b>%s</b></div>' % (svg(c, 64), c)
H += '</div></div>\n'

H += '<div class="demo"><p class="dl">没有图可画的字，用词语代替，要认的字标红</p><div class="wd">'
for ch, word, pyw, _ in FALLBACK:
    a, b = word[0], word[1]
    H += ('<div class="wcard"><div class="big">%s<i>%s</i></div>'
          '<p>%s · %s<br>目标字标红，靠位置也能记住</p></div>' % (a, b, ch, pyw))
H += '</div></div>\n'

for name, note, lst in GROUPS:
    lst = [c for c in lst if c in ART]
    if not lst:
        continue
    H += '<h2>%s <em>%s</em></h2>\n<div class="grid">\n' % (name, note or ('%d 个' % len(lst)))
    H += '\n'.join(cell(c) for c in lst)
    H += '\n</div>\n'

H += '</div></body></html>'

io.open('图示预览-全部.html', 'w', encoding='utf-8').write(H)
io.open('preview.html', 'w', encoding='utf-8').write(H)
print('生成 图示预览-全部.html，字数', len(ART))
