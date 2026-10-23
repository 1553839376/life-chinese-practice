# -*- coding: utf-8 -*-
"""重画版动物图示（贴近真实比例：四足站立、头部有结构、尾巴自然）。
视框 120x120，地面线 y≈106，白底，无文字。
"""

A = {}

# ---------------- 马 ----------------
A['马'] = (
    '<path d="M31 57 C22 60 18 74 20 87 C21 95 24 101 29 105 L36 103 C31 97 28 90 29 82 C30 74 34 66 39 60 Z" fill="#6B4527"/>'
    '<rect x="46" y="74" width="7" height="28" rx="3" fill="#9A6A3E"/>'
    '<rect x="45" y="99" width="9" height="6" rx="2" fill="#4A3527"/>'
    '<rect x="76" y="72" width="7" height="30" rx="3" fill="#9A6A3E"/>'
    '<rect x="75" y="99" width="9" height="6" rx="2" fill="#4A3527"/>'
    '<path d="M28 60 C28 50 38 45 52 46 C66 47 78 51 81 61 C84 74 72 82 54 82 C36 82 27 72 28 60 Z" fill="#C08A5A"/>'
    '<path d="M36 70 C33 78 33 90 35 98 L34 105 L42 105 L42 98 C43 90 44 78 45 71 Z" fill="#C08A5A"/>'
    '<path d="M66 70 C63 78 63 90 65 98 L64 105 L72 105 L72 98 C73 90 74 78 75 71 Z" fill="#C08A5A"/>'
    '<rect x="33" y="102" width="10" height="6" rx="2" fill="#4A3527"/>'
    '<rect x="63" y="102" width="10" height="6" rx="2" fill="#4A3527"/>'
    '<path d="M67 58 C70 45 77 33 86 25 L98 33 C90 41 84 52 82 63 Z" fill="#C08A5A"/>'
    '<path d="M83 22 C83 17 89 14 95 18 L108 31 C112 35 111 41 106 43 L96 44 C87 43 82 32 83 22 Z" fill="#C08A5A"/>'
    '<ellipse cx="104" cy="38" rx="6" ry="5" fill="#D4A177"/>'
    '<path d="M85 19 L82 8 L93 16 Z" fill="#C08A5A"/>'
    '<path d="M86 18 L85 12 L90 17 Z" fill="#9A6A3E"/>'
    '<path d="M85 16 C75 21 68 34 64 48 C61 58 57 66 52 71 L58 75 C63 70 67 61 70 51 C74 37 80 26 88 22 Z" fill="#6B4527"/>'
    '<ellipse cx="94" cy="28" rx="2.8" ry="3.2" fill="#2E2118"/>'
    '<circle cx="95" cy="27" r="1" fill="#FFFFFF"/>'
    '<circle cx="102" cy="37" r="1.6" fill="#8B5E3C"/>'
)

# ---------------- 虎 ----------------
A['虎'] = (
    '<path d="M29 60 C19 64 15 80 17 91 C18 98 22 103 27 105" stroke="#F0A32B" stroke-width="11" fill="none" stroke-linecap="round"/>'
    '<path d="M15 73 h12 M13 85 h12 M16 95 h12" stroke="#3A3A3A" stroke-width="3" stroke-linecap="round"/>'
    '<path d="M47 70 C44 78 44 90 46 98 L46 103 L56 103 L56 98 C58 90 58 78 59 71 Z" fill="#D08E22"/>'
    '<rect x="44" y="99" width="14" height="6" rx="2.5" fill="#C9821A"/>'
    '<path d="M78 68 C75 76 75 90 77 98 L77 103 L87 103 L87 98 C89 90 89 76 90 69 Z" fill="#D08E22"/>'
    '<rect x="75" y="99" width="14" height="6" rx="2.5" fill="#C9821A"/>'
    '<path d="M25 60 C25 50 36 45 52 45 C70 45 84 50 87 61 C90 75 74 84 54 84 C33 84 24 73 25 60 Z" fill="#F0A32B"/>'
    '<path d="M30 72 C27 80 27 92 29 99 L29 104 L40 104 L40 99 C42 92 42 80 43 73 Z" fill="#F7B03C"/>'
    '<path d="M65 72 C62 80 62 92 64 99 L64 104 L75 104 L75 99 C77 92 77 80 78 73 Z" fill="#F7B03C"/>'
    '<rect x="27" y="100" width="15" height="6" rx="2.5" fill="#E0951F"/>'
    '<rect x="62" y="100" width="15" height="6" rx="2.5" fill="#E0951F"/>'
    '<circle cx="78" cy="36" r="6.5" fill="#F0A32B"/>'
    '<circle cx="94" cy="34" r="6.5" fill="#F0A32B"/>'
    '<circle cx="78" cy="36" r="3" fill="#E8D2B0"/>'
    '<circle cx="94" cy="34" r="3" fill="#E8D2B0"/>'
    '<circle cx="86" cy="47" r="16" fill="#F0A32B"/>'
    '<ellipse cx="91" cy="56" rx="10" ry="6.5" fill="#FAF3E0"/>'
    '<path d="M91 51 l-4 3.5 h8 z" fill="#C9705A"/>'
    '<path d="M91 55.5 v3 M87 59 q4 3 8 0" stroke="#8B6A45" stroke-width="1.6" fill="none" stroke-linecap="round"/>'
    '<circle cx="80" cy="45" r="2.8" fill="#3A3A3A"/>'
    '<circle cx="95" cy="44" r="2.8" fill="#3A3A3A"/>'
    '<path d="M80 34 h12 M83 33 v7 M86 33 v7 M89 33 v7" stroke="#3A3A3A" stroke-width="2.2" stroke-linecap="round"/>'
    '<path d="M72 44 v9 M72 49 l-5 2 M100 46 v8" stroke="#3A3A3A" stroke-width="2.4" stroke-linecap="round"/>'
    '<path d="M34 51 q-3 10 -1 18 M45 47 q-2 11 0 20 M57 45 v21 M69 47 q2 11 1 20 M80 51 q2 9 1 16" stroke="#3A3A3A" stroke-width="3.6" fill="none" stroke-linecap="round"/>'
)

# ---------------- 牛 ----------------
A['牛'] = (
    '<path d="M26 56 C21 68 21 84 24 95" stroke="#A8825A" stroke-width="3.6" fill="none" stroke-linecap="round"/>'
    '<ellipse cx="25" cy="99" rx="3.4" ry="5.5" fill="#8A6440"/>'
    '<rect x="38" y="72" width="12" height="30" rx="4" fill="#A8825A"/>'
    '<rect x="36" y="99" width="14" height="6" rx="2" fill="#8A6440"/>'
    '<rect x="72" y="70" width="12" height="32" rx="4" fill="#A8825A"/>'
    '<rect x="70" y="99" width="14" height="6" rx="2" fill="#8A6440"/>'
    '<path d="M23 58 C23 47 35 42 54 42 C73 42 85 48 86 58 C87 72 75 82 54 82 C33 82 22 72 23 58 Z" fill="#C9A06A"/>'
    '<path d="M36 51 q12 -5 21 2 q-11 6 -21 -2 Z" fill="#B08F5C"/>'
    '<path d="M63 64 q11 -2 16 3 q-10 5 -16 -3 Z" fill="#B08F5C"/>'
    '<rect x="29" y="74" width="13" height="28" rx="4.5" fill="#C9A06A"/>'
    '<rect x="63" y="74" width="13" height="28" rx="4.5" fill="#C9A06A"/>'
    '<rect x="28" y="99" width="15" height="6" rx="2" fill="#A8825A"/>'
    '<rect x="62" y="99" width="15" height="6" rx="2" fill="#A8825A"/>'
    # 颈（粗短）+ 方头
    '<path d="M74 46 C80 42 88 42 92 45 L94 63 C88 68 79 66 75 61 Z" fill="#C9A06A"/>'
    '<path d="M85 42 C85 33 93 28 102 30 L113 36 C117 39 116 48 110 51 L98 57 C90 58 84 51 85 42 Z" fill="#C9A06A"/>'
    # 角（向外弯的粗角，像牛不像羚羊）
    '<path d="M91 33 C83 30 77 33 75 40" stroke="#EDD6A0" stroke-width="8" fill="none" stroke-linecap="round"/>'
    '<path d="M102 32 C104 25 108 21 113 22" stroke="#E0C48A" stroke-width="5.4" fill="none" stroke-linecap="round"/>'
    # 耳（大而横伸）
    '<ellipse cx="84" cy="44" rx="9" ry="4.6" fill="#A8825A" transform="rotate(-26 84 44)"/>'
    '<ellipse cx="84" cy="44" rx="5" ry="2.4" fill="#8A6440" transform="rotate(-26 84 44)"/>'
    # 吻 + 五官
    '<ellipse cx="104" cy="49" rx="8" ry="6.5" fill="#E8D2B0"/>'
    '<circle cx="101" cy="48" r="1.8" fill="#8A6440"/>'
    '<circle cx="108" cy="49" r="1.8" fill="#8A6440"/>'
    '<circle cx="96" cy="41" r="2.6" fill="#3A2A1E"/>'
)

# ---------------- 熊 ----------------
A['熊'] = (
    '<ellipse cx="27" cy="62" rx="5" ry="4" fill="#7A5236"/>'
    '<rect x="42" y="72" width="13" height="30" rx="5" fill="#5E3E27"/>'
    '<ellipse cx="48" cy="102" rx="8" ry="5" fill="#4A2F1D"/>'
    '<rect x="70" y="72" width="13" height="30" rx="5" fill="#5E3E27"/>'
    '<ellipse cx="76" cy="102" rx="8" ry="5" fill="#4A2F1D"/>'
    '<path d="M26 62 C26 49 36 39 48 37 C60 35 71 39 78 47 C85 55 86 72 82 80 C71 84 37 84 27 78 C25 73 26 66 26 62 Z" fill="#7A5236"/>'
    '<rect x="30" y="74" width="14" height="28" rx="5" fill="#7A5236"/>'
    '<rect x="60" y="74" width="14" height="28" rx="5" fill="#7A5236"/>'
    '<ellipse cx="37" cy="103" rx="8.5" ry="5" fill="#5E3E27"/>'
    '<ellipse cx="67" cy="103" rx="8.5" ry="5" fill="#5E3E27"/>'
    '<circle cx="78" cy="27" r="6.5" fill="#7A5236"/>'
    '<circle cx="96" cy="27" r="6.5" fill="#7A5236"/>'
    '<circle cx="78" cy="27" r="3.2" fill="#5E3E27"/>'
    '<circle cx="96" cy="27" r="3.2" fill="#5E3E27"/>'
    '<circle cx="87" cy="43" r="16" fill="#7A5236"/>'
    '<path d="M95 38 C102 37 108 41 108 46 C108 52 102 55 96 54 C92 53 91 48 95 38 Z" fill="#C9A67A"/>'
    '<ellipse cx="105" cy="43" rx="3.6" ry="3" fill="#2E2118"/>'
    '<path d="M104 50 q3 3 -1 5" stroke="#8A6440" stroke-width="1.8" fill="none" stroke-linecap="round"/>'
    '<circle cx="89" cy="38" r="2.7" fill="#2E2118"/>'
    '<circle cx="90" cy="37" r="1" fill="#FFFFFF"/>'
)

# ---------------- 羊 ----------------
A['羊'] = (
    # 远侧腿
    '<path d="M59 68 C57 78 58 94 60 100 L60 103 L68 103 L68 100 C70 94 70 78 71 69 Z" fill="#6B6B6B"/>'
    # 短尾
    '<circle cx="25" cy="57" r="6.5" fill="#F7F6F1"/>'
    # 羊毛：不规则蓬松轮廓（沿椭圆一圈毛卷）+ 中心填充
    '<circle cx="79" cy="62" r="7.5" fill="#F7F6F1"/>'
    '<circle cx="76" cy="70" r="7.5" fill="#F7F6F1"/>'
    '<circle cx="66" cy="75" r="7.5" fill="#F7F6F1"/>'
    '<circle cx="53" cy="77" r="7.5" fill="#F7F6F1"/>'
    '<circle cx="40" cy="75" r="7.5" fill="#F7F6F1"/>'
    '<circle cx="31" cy="70" r="7.5" fill="#F7F6F1"/>'
    '<circle cx="27" cy="62" r="7.5" fill="#F7F6F1"/>'
    '<circle cx="31" cy="55" r="7.5" fill="#F7F6F1"/>'
    '<circle cx="40" cy="49" r="8" fill="#F7F6F1"/>'
    '<circle cx="53" cy="46" r="8" fill="#F7F6F1"/>'
    '<circle cx="66" cy="49" r="7.5" fill="#F7F6F1"/>'
    '<circle cx="76" cy="55" r="7.5" fill="#F7F6F1"/>'
    '<ellipse cx="53" cy="62" rx="25" ry="15" fill="#F7F6F1"/>'
    # 近侧腿（上粗下细 + 黑蹄）
    '<path d="M34 70 C32 80 33 94 35 100 L35 104 L44 104 L44 100 C46 93 46 80 47 71 Z" fill="#7A7A7A"/>'
    '<path d="M58 70 C56 80 57 94 59 100 L59 104 L68 104 L68 100 C70 93 70 80 71 72 Z" fill="#7A7A7A"/>'
    '<rect x="34" y="100" width="11" height="7" rx="2" fill="#3A3A3A"/>'
    '<rect x="58" y="100" width="11" height="7" rx="2" fill="#3A3A3A"/>'
    # 颈 + 深色脸
    '<path d="M77 58 C81 54 86 53 90 54 L92 66 C87 69 81 67 78 64 Z" fill="#4A4A4A"/>'
    '<ellipse cx="94" cy="60" rx="13" ry="12" fill="#4A4A4A"/>'
    # 耳
    '<ellipse cx="83" cy="51" rx="8" ry="4.2" fill="#4A4A4A" transform="rotate(-22 83 51)"/>'
    '<ellipse cx="104" cy="53" rx="7.5" ry="4" fill="#4A4A4A" transform="rotate(18 104 53)"/>'
    # 额前毛 + 五官
    '<circle cx="91" cy="49" r="6.5" fill="#F7F6F1"/>'
    '<circle cx="98" cy="50" r="5.5" fill="#F7F6F1"/>'
    '<circle cx="89" cy="57" r="2.3" fill="#FFFFFF"/>'
    '<circle cx="98" cy="57" r="2.3" fill="#FFFFFF"/>'
    '<ellipse cx="95" cy="68" rx="5" ry="4" fill="#333333"/>'
)

# ---------------- 龙 ----------------
from art_dragon import D

A['龙'] = D
