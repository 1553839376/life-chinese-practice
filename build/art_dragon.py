# -*- coding: utf-8 -*-
"""龙：中国传统神话龙（蛇身、鹿角、牛吻、鹰爪、背鳍、长须）。
身体用 ribbon 生成，从颈部到尾部逐渐变细。
"""
from art_lib import ribbon

_SPINE = [(84, 46), (71, 50), (59, 60), (50, 72), (41, 84), (29, 94)]
_W = [14, 19, 22, 20, 13, 3]

_D_EDGE = ribbon(_SPINE, [w + 3 for w in _W])
_D_BODY = ribbon(_SPINE, _W)
_D_LEG1 = ribbon([(67, 58), (65, 68), (63, 76)], [10, 9, 6])
_D_LEG2 = ribbon([(45, 80), (43, 90), (41, 97)], [10, 9, 6])

D = ''.join([
    # 尾鳍（火焰状）
    '<path d="M32 96 C27 103 18 106 7 104 C15 99 19 92 19 85 C24 92 27 95 33 94 Z" fill="#C9922F"/>',
    # 后腿 + 爪
    '<path d="%s" fill="#C9922F"/>' % _D_LEG2,
    '<path d="%s" fill="#E8B84B"/>' % _D_LEG2,
    '<path d="M41 97 l-6 4 M41 97 l0 7 M41 97 l6 3" stroke="#C9922F" stroke-width="2.6" stroke-linecap="round"/>',
    # 前腿 + 爪
    '<path d="%s" fill="#C9922F"/>' % _D_LEG1,
    '<path d="%s" fill="#E8B84B"/>' % _D_LEG1,
    '<path d="M63 76 l-6 4 M63 76 l0 7 M63 76 l6 3" stroke="#C9922F" stroke-width="2.6" stroke-linecap="round"/>',
    # 龙身
    '<path d="%s" fill="#C9922F"/>' % _D_EDGE,
    '<path d="%s" fill="#E8B84B"/>' % _D_BODY,
    # 腹甲
    '<path d="M87 53 C74 57 62 66 53 77 C47 85 39 91 31 95" stroke="#F7DFA8" stroke-width="4" '
    'fill="none" stroke-linecap="round" stroke-dasharray="6 4" opacity="0.9"/>',
    # 分节横纹
    '<path d="M76 42 l-5 13 M64 50 l-5 14 M53 62 l-4 14 M43 74 l-4 13" stroke="#C9922F" '
    'stroke-width="2.4" opacity="0.35" stroke-linecap="round"/>',
    # 背鳍
    '<path d="M78 40 l-9 -5 5 -8 Z M66 49 l-9 -4 4 -9 Z M55 60 l-9 -4 4 -9 Z M45 72 l-9 -3 3 -9 Z" '
    'fill="#C9922F"/>',
    # 鬃毛
    '<path d="M83 38 C73 28 65 33 67 44 C72 39 77 41 80 47 Z" fill="#C9922F"/>',
    '<path d="M81 49 C70 49 65 57 68 64 C72 58 77 58 81 60 Z" fill="#C9922F"/>',
    # 鹿角
    '<path d="M89 26 C86 17 79 12 71 12" stroke="#C9922F" stroke-width="4" fill="none" stroke-linecap="round"/>',
    '<path d="M84 19 C80 17 78 14 78 9" stroke="#C9922F" stroke-width="3" fill="none" stroke-linecap="round"/>',
    '<path d="M100 24 C101 14 106 8 113 6" stroke="#C9922F" stroke-width="4" fill="none" stroke-linecap="round"/>',
    '<path d="M106 13 C110 11 112 8 112 5" stroke="#C9922F" stroke-width="3" fill="none" stroke-linecap="round"/>',
    # 头
    '<path d="M80 48 C78 34 88 24 101 26 L113 32 C118 35 116 44 110 46 L97 53 C89 55 81 55 80 48 Z" '
    'fill="#E8B84B"/>',
    '<path d="M110 46 C113 46 115 44 115 42 C112 42 110 44 110 45 Z" fill="#F7DFA8"/>',
    '<ellipse cx="109" cy="38" rx="5.5" ry="4.6" fill="#F7DFA8"/>',
    '<circle cx="106" cy="37" r="1.5" fill="#8A5A1E"/>',
    '<path d="M111 44 q5 2 3 6" stroke="#C9922F" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
    # 眼
    '<circle cx="91" cy="34" r="3.8" fill="#2E2118"/>',
    '<circle cx="92.2" cy="33" r="1.4" fill="#FFFFFF"/>',
    '<path d="M85 28 q7 -4 12 -1" stroke="#C9922F" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
    '<path d="M101 42 q5 2 7 -1" stroke="#C9922F" stroke-width="2" fill="none" stroke-linecap="round"/>',
    '<path d="M102 42 l1 6 l-4 -1 Z" fill="#FFFFFF"/>',
    '<path d="M83 52 q9 3 13 -2" stroke="#C9922F" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
    # 长须
    '<path d="M111 45 C117 49 119 55 117 62" stroke="#C9922F" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
    '<path d="M111 42 C118 39 121 43 120 48" stroke="#C9922F" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
])
