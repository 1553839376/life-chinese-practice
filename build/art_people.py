# -*- coding: utf-8 -*-
"""人物 / 身体动作图示（viewBox 0 0 120 120）。

三条原则，专门治"看着诡异"：
1. 不画五官（眼、鼻、嘴、腮红一律不画），头部只有头发轮廓
2. 人物统一比例：头 22、躯干 32、腿 30，有脖子和肩线；四肢用圆头线段画，
   关节是圆的，不会出现被剪断或白洞的感觉
3. 每个动作只留"最少但准确"的姿势，配一个道具提示（椅子/桌子/绳子/球）
身体部位（手、足、耳、牙）改用写实插画位图，另一支脚本处理。
"""
import math

SKIN = '#F6C89F'
SKIN_D = '#E3AC81'
HAIR = '#4B3B33'
TOP = '#5B8DEF'
PANTS = '#3E4C63'
PANTS_D = '#33405A'
SHOE = '#1B2430'
SOLE = '#DDE4EC'


def seg(pts, w, color):
    d = 'M%.1f %.1f' % pts[0] + ''.join(' L%.1f %.1f' % p for p in pts[1:])
    return ('<path d="%s" fill="none" stroke="%s" stroke-width="%.1f" '
            'stroke-linecap="round" stroke-linejoin="round"/>' % (d, color, w))


def head(x, y, r=11.0, hair=HAIR):
    return (
        '<circle cx="%.1f" cy="%.1f" r="%.1f" fill="%s"/>' % (x, y, r, SKIN)
        + '<path d="M%.1f %.1f A%.1f %.1f 0 0 1 %.1f %.1f Q%.1f %.1f %.1f %.1f '
          'Q%.1f %.1f %.1f %.1f Z" fill="%s"/>'
        % (x - r, y - r * 0.1, r, r, x + r, y - r * 0.1,
           x + r * 0.5, y - r * 0.98, x, y - r * 0.88,
           x - r * 0.6, y - r * 0.94, x - r, y - r * 0.1, hair)
    )


def torso(cx, y0, y1, sw, hw, color=TOP):
    a, b = cx - sw / 2, cx + sw / 2
    c, d = cx + hw / 2, cx - hw / 2
    r = 7
    return ('<path d="M%.1f %.1f Q%.1f %.1f %.1f %.1f L%.1f %.1f Q%.1f %.1f %.1f %.1f '
            'L%.1f %.1f Q%.1f %.1f %.1f %.1f L%.1f %.1f Q%.1f %.1f %.1f %.1f Z" fill="%s"/>'
            % (a, y0 + r, a, y0, a + r, y0,
               b - r, y0, b, y0, b, y0 + r,
               c, y1 - r, c, y1, c - r, y1,
               d + r, y1, d, y1, d, y1 - r,
               color))


def neck(cx, y0, y1, w=9):
    return ('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" rx="%.1f" fill="%s"/>'
            % (cx - w / 2, y0, w, y1 - y0, w / 2, SKIN_D))


def hand(x, y, r=4.8):
    return '<circle cx="%.1f" cy="%.1f" r="%.1f" fill="%s"/>' % (x, y, r, SKIN)


def shoe(x, y, ang=0, w=18, h=9):
    """x 是脚跟，鞋头朝 +x 方向；带浅色鞋底，跟裤子区分开。"""
    return ('<g transform="rotate(%.1f %.1f %.1f)">'
            '<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" rx="%.1f" fill="%s"/>'
            '<rect x="%.1f" y="%.1f" width="%.1f" height="2.6" rx="1.3" fill="%s"/>'
            '</g>'
            % (ang, x, y, x, y - h / 2, w, h, h / 2, SHOE,
               x + 1, y + h / 2 - 3.2, w - 2, SOLE))


def person(pose):
    o = []
    if 'leg_b' in pose:
        p, w = pose['leg_b'][:2]
        o.append(seg(p, w, PANTS_D))
        o.append(shoe(p[-1][0] - 4, p[-1][1] + 5.2, pose['leg_b'][2] if len(pose['leg_b']) > 2 else 0))
    if 'arm_b' in pose:
        p, w = pose['arm_b'][:2]
        o.append(seg(p, w, SKIN_D))
        o.append(hand(*p[-1]))
    o.append(neck(*pose['neck']))
    o.append(torso(*pose['torso']))
    if 'leg_f' in pose:
        p, w = pose['leg_f'][:2]
        o.append(seg(p, w, PANTS))
        o.append(shoe(p[-1][0] - 4, p[-1][1] + 5.2, pose['leg_f'][2] if len(pose['leg_f']) > 2 else 0))
    if 'arm_f' in pose:
        p, w = pose['arm_f'][:2]
        o.append(seg(p, w, SKIN))
        o.append(hand(*p[-1]))
    o.append(head(*pose['head']))
    if 'extra' in pose:
        o.append(pose['extra'])
    return ''.join(o)


def ball(cx, cy, r, fill_a='#E24B4A', fill_b='#FFFFFF'):
    """沙滩球：三段彩色瓣，一眼是"球"不是南瓜。"""
    o = ['<circle cx="%.1f" cy="%.1f" r="%.1f" fill="%s"/>' % (cx, cy, r, fill_b)]
    for k in range(3):
        a1 = math.radians(k * 120 + 12)
        a2 = math.radians(k * 120 + 48)
        x1, y1 = cx + r * math.cos(a1), cy - r * math.sin(a1)
        x2, y2 = cx + r * math.cos(a2), cy - r * math.sin(a2)
        o.append('<path d="M%.1f %.1f L%.1f %.1f A%.1f %.1f 0 0 1 %.1f %.1f Z" fill="%s"/>'
                 % (cx, cy, x1, y1, r, r, x2, y2, fill_a))
    o.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="none" stroke="#C9821A" '
             'stroke-width="2.2"/>' % (cx, cy, r))
    o.append('<circle cx="%.1f" cy="%.1f" r="3" fill="#F7C13B"/>' % (cx, cy))
    return ''.join(o)


# ================= 动作 =================
WALK = person({
    'head': (61, 24, 11),
    'neck': (61, 33, 40),
    'torso': (61, 38, 70, 30, 24),
    'leg_b': ([(53, 68), (45, 81), (40, 92)], 10, -14),
    'leg_f': ([(70, 68), (75, 81), (78, 92)], 10, 8),
    'arm_b': ([(47, 42), (41, 55), (38, 66)], 7.6),
    'arm_f': ([(76, 42), (82, 55), (85, 66)], 7.6),
    'extra': '<g stroke="#C9D2DE" stroke-width="4" stroke-linecap="round">'
             '<path d="M12 54 h10"/><path d="M7 64 h7"/><path d="M13 74 h9"/></g>',
})

RUN = ('<g transform="rotate(-14 62 66)">' + person({
    'head': (68, 20, 11),
    'neck': (66, 29, 36),
    'torso': (63, 34, 64, 30, 24),
    'leg_b': ([(55, 62), (42, 70), (34, 76)], 10, -34),
    'leg_f': ([(70, 62), (80, 70), (89, 72)], 10, 6),
    'arm_b': ([(49, 38), (38, 40), (31, 30)], 7.6),
    'arm_f': ([(77, 38), (86, 46), (90, 56)], 7.6),
}) + '</g>'
    '<g stroke="#C9D2DE" stroke-width="4" stroke-linecap="round">'
    '<path d="M10 42 h13"/><path d="M5 54 h9"/><path d="M11 66 h11"/></g>')

JUMP = person({
    'head': (60, 22, 11),
    'neck': (60, 31, 38),
    'torso': (60, 36, 68, 30, 24),
    'leg_b': ([(54, 66), (44, 76), (48, 86)], 10, -8),
    'leg_f': ([(67, 66), (77, 76), (73, 86)], 10, 8),
    'arm_b': ([(46, 40), (35, 31), (28, 20)], 7.6),
    'arm_f': ([(75, 40), (86, 31), (93, 20)], 7.6),
    'extra': '<path d="M14 102 q46 -14 92 0" stroke="#C9D2DE" stroke-width="4" '
             'stroke-dasharray="7 7" fill="none"/>',
})

SIT = (
    # 椅子（椅背在左侧，人朝右坐）
    '<rect x="30" y="34" width="11" height="52" rx="5" fill="#A9784A"/>'
    '<rect x="34" y="74" width="58" height="10" rx="4" fill="#C9A67A"/>'
    + person({
        'head': (58, 28, 11),
        'neck': (57, 37, 44),
        'torso': (56, 42, 72, 30, 25),
        'leg_b': ([(62, 72), (80, 74), (82, 94)], 10, 4),
        'leg_f': ([(52, 73), (74, 76), (77, 96)], 10, 4),
        'arm_b': ([(44, 48), (48, 60), (58, 72)], 7.6),
        'arm_f': ([(68, 48), (73, 60), (82, 72)], 7.6),
    })
    # 椅腿压在腿前，把"坐"坐实
    + '<rect x="36" y="84" width="9" height="22" rx="4" fill="#A9784A"/>'
    '<rect x="78" y="84" width="9" height="22" rx="4" fill="#A9784A"/>'
)

SLEEP = (
    '<rect x="6" y="88" width="110" height="9" rx="4" fill="#C9A67A"/>'
    '<rect x="8" y="58" width="9" height="31" rx="4" fill="#A9784A"/>'
    '<rect x="106" y="70" width="9" height="19" rx="4" fill="#A9784A"/>'
    '<path d="M44 86 V70 q0 -7 7 -7 h56 q7 0 7 7 v16z" fill="#8FC4EA"/>'
    '<path d="M44 74 h70" stroke="#FFFFFF" stroke-width="4" opacity="0.6"/>'
    '<rect x="15" y="64" width="36" height="19" rx="9" fill="#FFFFFF"/>'
    '<circle cx="34" cy="63" r="11" fill="%s"/>' % SKIN
    + '<path d="M23 63 A11 11 0 0 1 45 63 Z" fill="%s"/>' % HAIR
    + '<path d="M92 14a11 11 0 1 0 0 21 8.5 8.5 0 1 1 0-21z" fill="#F2D25C"/>'
    '<circle cx="73" cy="18" r="2.8" fill="#F7C13B"/>'
    '<circle cx="66" cy="30" r="2" fill="#F7C13B"/>'
)

EAT = (
    # 桌子
    '<rect x="74" y="72" width="44" height="7" rx="3" fill="#C9A67A"/>'
    '<rect x="80" y="79" width="6" height="28" rx="3" fill="#A9784A"/>'
    '<rect x="108" y="79" width="6" height="28" rx="3" fill="#A9784A"/>'
    # 凳子
    '<rect x="30" y="72" width="30" height="8" rx="3" fill="#C9A67A"/>'
    '<rect x="34" y="80" width="7" height="28" rx="3" fill="#A9784A"/>'
    '<rect x="56" y="80" width="7" height="28" rx="3" fill="#A9784A"/>'
    # 碗（碗口横搁一双筷子）
    '<path d="M84 64 h30 a15 14 0 0 1 -30 0z" fill="#E8F4FD" stroke="#A9C7DE" stroke-width="2.4"/>'
    '<ellipse cx="99" cy="64" rx="15" ry="4.4" fill="#FFFFFF" stroke="#A9C7DE" stroke-width="2.2"/>'
    '<path d="M88 62 q11 -6 22 0" fill="#F7F1E4"/>'
    + person({
        'head': (38, 24, 11),
        'neck': (40, 33, 40),
        'torso': (44, 38, 68, 30, 25),
        'leg_b': ([(52, 68), (68, 70), (70, 94)], 10, 4),
        'leg_f': ([(42, 69), (64, 72), (66, 96)], 10, 4),
        'arm_f': ([(58, 42), (72, 48), (84, 62)], 7.6),
    })
    # 筷子横搁在碗口
    + '<path d="M84 58 L106 54" stroke="#A9784A" stroke-width="3.6" stroke-linecap="round"/>'
    '<path d="M84 61 L106 57" stroke="#8B6A45" stroke-width="3.6" stroke-linecap="round"/>'
)

HUG = (
    person({
        'head': (60, 18, 9.5),
        'neck': (60, 26, 32),
        'torso': (60, 30, 44, 27, 22),
        'leg_b': ([(55, 44), (53, 76), (52, 96)], 9.5, 2),
        'leg_f': ([(65, 44), (67, 76), (68, 96)], 9.5, 2),
    })
    # 抱着的布熊
    + '<circle cx="49" cy="44" r="6" fill="#C98B4B"/>'
    '<circle cx="71" cy="44" r="6" fill="#C98B4B"/>'
    '<circle cx="60" cy="52" r="12" fill="#D99A57"/>'
    '<ellipse cx="60" cy="56" rx="6" ry="4.6" fill="#F6E3C6"/>'
    '<circle cx="57" cy="55" r="1.8" fill="#4A3B33"/>'
    '<circle cx="63" cy="55" r="1.8" fill="#4A3B33"/>'
    '<ellipse cx="60" cy="78" rx="16" ry="17" fill="#D99A57"/>'
    '<ellipse cx="60" cy="80" rx="8.5" ry="9" fill="#F6E3C6"/>'
    # 手臂绕到熊身前
    + seg([(47, 38), (34, 58), (44, 80)], 7.6, SKIN)
    + seg([(73, 38), (86, 58), (76, 80)], 7.6, SKIN)
    + hand(45, 82) + hand(75, 82)
)

PULL = (
    # 被拉的箱子（左侧），顶上有个提手
    '<rect x="4" y="62" width="24" height="26" rx="4" fill="#D9A05B"/>'
    '<path d="M6 70 h20" stroke="#B9813F" stroke-width="2.6" opacity="0.7"/>'
    '<path d="M16 62 V56" stroke="#B9813F" stroke-width="3.4" stroke-linecap="round"/>'
    # 绷紧的绳子：提手 -> 手
    '<path d="M16 56 L47 51" stroke="#C99448" stroke-width="4.2" stroke-linecap="round"/>'
    + '<g transform="rotate(16 68 98)">' + person({
        'head': (62, 28, 11),
        'neck': (61, 37, 44),
        'torso': (60, 42, 72, 30, 24),
        'leg_b': ([(54, 70), (46, 84), (44, 96)], 10, -8),
        'leg_f': ([(67, 70), (73, 84), (79, 96)], 10, 8),
        'arm_b': ([(47, 47), (39, 55), (35, 57)], 7.6),
        'arm_f': ([(73, 47), (56, 55), (35, 59)], 7.6),
    }) + '</g>'
    # 往拉的方向
    '<path d="M32 98 H10" stroke="#5B8DEF" stroke-width="4.4" fill="none" stroke-linecap="round"/>'
    '<path d="M10 98 l8 -6 M10 98 l8 6" stroke="#5B8DEF" stroke-width="4.4" fill="none" '
    'stroke-linecap="round" stroke-linejoin="round"/>'
)

# ================= 需要道具的抽象动作 =================
LISTEN = (
    # 耳机
    '<path d="M28 58 V48 a32 32 0 0 1 64 0 v10" stroke="#3E4C63" stroke-width="8" '
    'fill="none" stroke-linecap="round"/>'
    '<rect x="18" y="52" width="16" height="30" rx="8" fill="#5B8DEF"/>'
    '<rect x="86" y="52" width="16" height="30" rx="8" fill="#5B8DEF"/>'
    '<rect x="22" y="60" width="8" height="14" rx="4" fill="#A8C6F5"/>'
    '<rect x="90" y="60" width="8" height="14" rx="4" fill="#A8C6F5"/>'
    '<g stroke="#5B8DEF" stroke-width="3.6" fill="none" stroke-linecap="round" opacity="0.9">'
    '<path d="M46 40 a10 10 0 0 1 0 14"/><path d="M56 34 a18 18 0 0 1 0 26"/></g>'
)

SEE = (
    '<path d="M12 58 q28 -27 56 0 q-28 27 -56 0z" fill="#FFFFFF" stroke="#3F4A56" '
    'stroke-width="3.4" stroke-linejoin="round"/>'
    '<circle cx="40" cy="58" r="12" fill="#5FA8E8"/>'
    '<circle cx="40" cy="58" r="5.6" fill="#3F4A56"/>'
    '<circle cx="43" cy="54" r="3" fill="#FFFFFF"/>'
    '<g stroke="#C2CBD6" stroke-width="2.6" stroke-dasharray="3 5" fill="none" '
    'stroke-linecap="round"><path d="M71 54 l7 -3"/><path d="M72 62 h7"/></g>'
    '<g transform="translate(97 56)">'
    '<g fill="#F5808F"><circle cx="0" cy="-14" r="7.5"/><circle cx="13" cy="-4.5" r="7.5"/>'
    '<circle cx="8" cy="11" r="7.5"/><circle cx="-8" cy="11" r="7.5"/>'
    '<circle cx="-13" cy="-4.5" r="7.5"/></g>'
    '<circle cx="0" cy="0" r="6.5" fill="#F7C13B"/></g>'
    '<path d="M97 72 v26" stroke="#6EC07E" stroke-width="4" stroke-linecap="round"/>'
    '<path d="M97 88 q-10 -6 -12 -15 q11 0 12 9" fill="#8FD49C"/>'
)

SING = (
    # 手持麦克风
    '<g transform="rotate(18 50 52)">'
    '<circle cx="50" cy="40" r="15" fill="#5B6B80"/>'
    '<g stroke="#93A4B9" stroke-width="2">'
    '<path d="M38 34 h24"/><path d="M38 40 h24"/><path d="M38 46 h24"/></g>'
    '<rect x="42" y="53" width="16" height="8" rx="3" fill="#4A5A70"/>'
    '<path d="M45 61 h10 l5 42 q-10 4 -20 0z" fill="#3E4C63"/>'
    '</g>'
    '<g fill="#5B8DEF"><ellipse cx="90" cy="30" rx="7.5" ry="5.5"/>'
    '<rect x="95" y="8" width="4" height="22"/>'
    '<path d="M99 8 q11 4 11 12 q-5 -6 -11 -6z"/></g>'
    '<g fill="#E24B4A"><ellipse cx="100" cy="58" rx="6" ry="4.5"/>'
    '<rect x="104" y="40" width="3.6" height="18"/></g>'
)

WASH = (
    # 水龙头（左侧管子，向右伸出弯头，出水口朝下）
    '<path d="M18 20 v22 h30 q8 0 8 8 t-8 8" stroke="#B9BFC7" stroke-width="9" fill="none" '
    'stroke-linecap="round" stroke-linejoin="round"/>'
    '<rect x="44" y="52" width="24" height="8" rx="4" fill="#8A939F"/>'
    # 水流
    '<path d="M52 60 v10 M62 60 v12" stroke="#5FA8E8" stroke-width="5" stroke-linecap="round"/>'
    '<circle cx="50" cy="78" r="3.4" fill="#BBDCF7"/>'
    '<circle cx="64" cy="82" r="3" fill="#BBDCF7"/>'
    # 一只手（掌心向上，五指张开接水）
    '<g fill="' + SKIN + '">'
    '<rect x="34" y="60" width="5.4" height="16" rx="2.7" transform="rotate(-38 37 68)"/>'
    '<rect x="44" y="56" width="5.6" height="20" rx="2.8" transform="rotate(-18 47 66)"/>'
    '<rect x="55" y="54" width="5.6" height="21" rx="2.8"/>'
    '<rect x="65" y="57" width="5.6" height="19" rx="2.8" transform="rotate(18 68 66)"/>'
    '<rect x="74" y="62" width="5.2" height="15" rx="2.6" transform="rotate(38 76 69)"/>'
    '<ellipse cx="62" cy="82" rx="17" ry="13"/>'
    '<path d="M48 92 h28 v10 q0 4 -4 4 H52 q-4 0 -4 -4z"/></g>'
    '<path d="M54 80 q8 6 16 1" stroke="' + SKIN_D + '" stroke-width="2.4" fill="none" '
    'stroke-linecap="round"/>'
    # 泡沫
    '<circle cx="36" cy="52" r="5.4" fill="#FFFFFF" stroke="#BFD9F2" stroke-width="2"/>'
    '<circle cx="84" cy="48" r="4.4" fill="#FFFFFF" stroke="#BFD9F2" stroke-width="2"/>'
    '<circle cx="92" cy="62" r="3.2" fill="#FFFFFF" stroke="#BFD9F2" stroke-width="2"/>'
    # 水盆
    '<path d="M10 96 h100 a10 10 0 0 1 -10 12 H20 a10 10 0 0 1 -10 -12z" fill="#DCEBF7"/>'
    '<path d="M14 99 h92" stroke="#A9C7DE" stroke-width="2.6" stroke-linecap="round"/>'
)

SWEEP = (
    '<path d="M86 12 L66 54" stroke="#A9784A" stroke-width="8" stroke-linecap="round"/>'
    '<path d="M50 50 h24 l6 48 H44z" fill="#E8C27A"/>'
    '<path d="M57 54 v42 M64 54 v44 M71 54 v42" stroke="#C99448" stroke-width="2.8" '
    'opacity="0.6"/>'
    '<path d="M16 100 q13 -15 28 -3 q-13 9 -28 3z" fill="#C9D2DE"/>'
    '<g stroke="#C9D2DE" stroke-width="4" stroke-linecap="round">'
    '<path d="M10 74 h9"/><path d="M6 84 h8"/></g>'
)

# ================= 只用道具的身体部位 =================
MOUTH = (
    '<path d="M20 58 q40 -22 80 0 q-40 28 -80 0z" fill="#E4637B"/>'
    '<path d="M25 59 q35 -13 70 0 q-35 19 -70 0z" fill="#7E2733"/>'
    '<path d="M26 58 q34 -11 68 0 q-34 6 -68 0z" fill="#FFFFFF"/>'
)

CARDS = {
    '走': WALK, '跑': RUN, '跳': JUMP, '坐': SIT, '睡': SLEEP,
    '吃': EAT, '抱': HUG, '拉': PULL,
    '听': LISTEN, '看': SEE, '唱': SING, '洗': WASH, '扫': SWEEP,
    '口': MOUTH,
}

if __name__ == '__main__':
    import xml.etree.ElementTree as ET
    bad = []
    for ch, body in CARDS.items():
        try:
            ET.fromstring('<svg xmlns="http://www.w3.org/2000/svg">%s</svg>' % body)
        except Exception as e:
            bad.append((ch, str(e)[:90]))
    print('人物卡', len(CARDS), '个；损坏', len(bad))
    for b in bad:
        print('  ', b)
