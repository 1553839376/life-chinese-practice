# -*- coding: utf-8 -*-
"""剩余字词的扁平 SVG 图示（viewBox 0 0 120 120）。
REUSE：从 v1 直接搬来且checks合格的 21 个
FRESH：新画 / 重画的 60 个
"""
import io
import json

V1 = json.load(io.open('v1_art.json', encoding='utf-8'))

REUSE = {
    '云': 'cloud', '山': 'mountain', '水': 'water', '田': 'field',
    '门': 'door', '心': 'heart', '手': 'hand', '足': 'foot', '花': 'flower',
    '车': 'car', '书': 'book', '衣': 'clothes', '果': 'fruit', '蛋': 'egg',
    '房': 'house', '雨': 'rain', '目': 'eye', '树': 'tree', '阳': 'sun',
    '火': 'fire',
}

F = {}

# ---------------- 自然 / 场所 ----------------
F['月'] = (
    '<path d="M74 14 A46 46 0 1 0 74 106 A52 52 0 1 1 74 14 Z" fill="#F2D25C"/>'
    '<circle cx="24" cy="28" r="4" fill="#F7C13B"/>'
    '<circle cx="34" cy="16" r="2.6" fill="#F7C13B"/>'
)
F['日'] = (
    '<circle cx="60" cy="60" r="32" fill="#F7C13B"/>'
    '<circle cx="60" cy="60" r="32" fill="none" stroke="#E8A61C" stroke-width="3"/>'
    '<circle cx="50" cy="50" r="8" fill="#FFE07A" opacity="0.75"/>'
)
F['土'] = (
    '<path d="M6 102 q8 -26 32 -30 q10 -12 24 -10 q20 2 28 18 q12 6 16 22z" fill="#A9784A"/>'
    '<path d="M6 102 h110" stroke="#8B6A45" stroke-width="3.4"/>'
    '<ellipse cx="34" cy="84" rx="6.5" ry="4" fill="#8B6A45" opacity="0.8"/>'
    '<ellipse cx="72" cy="78" rx="5" ry="3.2" fill="#8B6A45" opacity="0.8"/>'
    '<ellipse cx="96" cy="92" rx="4" ry="2.6" fill="#8B6A45" opacity="0.8"/>'
    '<path d="M26 72 q16 -10 30 -4" stroke="#8B6A45" stroke-width="2.6" fill="none" opacity="0.45"/>'
)
F['石'] = (
    '<path d="M20 86 L32 50 L54 36 L80 44 L100 66 L94 86z" fill="#B9BFC7"/>'
    '<path d="M32 50 L54 60 L80 44" fill="none" stroke="#8E96A0" stroke-width="3.4" stroke-linejoin="round"/>'
    '<path d="M54 60 L52 86" stroke="#8E96A0" stroke-width="3" opacity="0.7"/>'
)
F['草'] = (
    '<ellipse cx="60" cy="100" rx="42" ry="8" fill="#C9A67A"/>'
    '<g stroke="#6EC07E" stroke-width="9" fill="none" stroke-linecap="round">'
    '<path d="M60 98 V44"/><path d="M38 98 C38 72 30 58 22 48"/>'
    '<path d="M82 98 C82 72 90 58 98 48"/><path d="M48 98 C46 72 40 60 34 46"/>'
    '<path d="M72 98 C74 72 80 60 86 46"/></g>'
)
F['井'] = (
    '<ellipse cx="60" cy="80" rx="40" ry="14" fill="#C9D2DE"/>'
    '<ellipse cx="60" cy="75" rx="40" ry="14" fill="#E6EBF1"/>'
    '<ellipse cx="60" cy="75" rx="27" ry="9.5" fill="#2F6FA8"/>'
    '<path d="M24 74 V42 M96 74 V42" stroke="#A9784A" stroke-width="8" stroke-linecap="round"/>'
    '<rect x="18" y="32" width="84" height="9" rx="4.5" fill="#8B6A45"/>'
    '<path d="M60 41 V56" stroke="#8B6A45" stroke-width="3"/>'
    '<path d="M46 56 h28 l-5 20 h-18 z" fill="#C9A67A"/>'
    '<path d="M47 62 h26" stroke="#8B6A45" stroke-width="2.4" opacity="0.55"/>'
)
F['风'] = (
    '<g stroke="#8EC4E8" stroke-width="6" fill="none" stroke-linecap="round">'
    '<path d="M10 44 q26 -16 48 -2 t40 -6"/><path d="M14 66 q22 12 42 0"/><path d="M10 86 q18 8 28 0"/></g>'
    '<ellipse cx="94" cy="26" rx="10" ry="5.5" fill="#6EC07E" transform="rotate(-28 94 26)"/>'
    '<ellipse cx="104" cy="70" rx="8" ry="4.5" fill="#7CCB8B" transform="rotate(24 104 70)"/>'
)
F['窗'] = (
    '<rect x="18" y="24" width="84" height="76" rx="6" fill="#BFE3F5" stroke="#C9D2DE" stroke-width="5"/>'
    '<circle cx="84" cy="44" r="9" fill="#F7C13B"/>'
    '<path d="M18 88 q22 -20 42 -2 q20 14 42 -6 v20 H18z" fill="#6EC07E"/>'
    '<path d="M60 24 v76 M18 62 H102" stroke="#FFFFFF" stroke-width="6"/>'
)
F['桥'] = (
    '<path d="M4 88 h112" stroke="#5FA8E8" stroke-width="10" stroke-linecap="round"/>'
    '<path d="M10 74 q50 -40 100 0 v10 H10z" fill="#C9A67A"/>'
    '<path d="M34 84 q26 -26 52 0z" fill="#5FA8E8"/>'
    '<path d="M14 68 q46 -34 92 0" stroke="#A9784A" stroke-width="4" fill="none"/>'
    '<path d="M28 60 v14 M60 48 v26 M92 60 v14" stroke="#A9784A" stroke-width="4" stroke-linecap="round"/>'
)
F['光'] = (
    '<g stroke="#F7C13B" stroke-width="5" stroke-linecap="round">'
    '<path d="M28 22 L20 14 M92 22 L100 14 M12 50 H2 M108 50 h10"/></g>'
    '<path d="M60 16a25 25 0 0 1 14 45v8H46v-8A25 25 0 0 1 60 16z" fill="#FFE07A"/>'
    '<path d="M60 34 l-8 12 h16 l-8 12" stroke="#E8A61C" stroke-width="3" fill="none" stroke-linecap="round"/>'
    '<rect x="46" y="70" width="28" height="8" rx="3" fill="#9AA3AE"/>'
    '<rect x="49" y="80" width="22" height="7" rx="3" fill="#B9BFC7"/>'
    '<rect x="53" y="89" width="14" height="7" rx="3.5" fill="#9AA3AE"/>'
)
F['灯'] = (
    '<ellipse cx="46" cy="102" rx="24" ry="7" fill="#9AA3AE"/>'
    '<path d="M46 98 V44" stroke="#9AA3AE" stroke-width="8" stroke-linecap="round"/>'
    '<path d="M46 46 L74 32" stroke="#9AA3AE" stroke-width="8" stroke-linecap="round"/>'
    '<path d="M68 18 L100 34 L86 56 L56 40z" fill="#F0902B"/>'
    '<path d="M86 54 L112 70 L98 92 L74 76z" fill="#FFE07A" opacity="0.6"/>'
    '<ellipse cx="96" cy="94" rx="18" ry="5" fill="#FFE07A" opacity="0.6"/>'
)

# ---------------- 身体 ----------------
F['口'] = (
    '<ellipse cx="60" cy="60" rx="40" ry="26" fill="#E4637B"/>'
    '<ellipse cx="60" cy="61" rx="30" ry="18" fill="#8E2F3C"/>'
    '<path d="M34 50 q26 -9 52 0" fill="none" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round"/>'
    '<ellipse cx="60" cy="72" rx="12" ry="6" fill="#E4707A"/>'
)
F['牙'] = (
    '<path d="M60 14 C40 14 28 26 28 46 C28 62 34 106 44 106 C53 106 50 78 60 78 '
    'C70 78 67 106 76 106 C86 106 92 62 92 46 C92 26 80 14 60 14z" '
    'fill="#FFFFFF" stroke="#C9D2DE" stroke-width="3.4" stroke-linejoin="round"/>'
    '<path d="M42 30 q8 -6 16 -5" stroke="#E8F0F7" stroke-width="4" fill="none" stroke-linecap="round"/>'
)
EAR = (
    '<path d="M98 10 C72 10 56 30 56 56 C56 84 70 110 98 110z" fill="#F5C79A"/>'
    '<ellipse cx="80" cy="58" rx="16" ry="24" fill="#EFB98F"/>'
    '<path d="M86 42 C72 44 68 58 75 68 C80 76 77 86 71 88" '
    'fill="none" stroke="#D2895E" stroke-width="4.4" stroke-linecap="round"/>'
)
F['耳'] = EAR
F['头'] = (
    '<path d="M42 108 V84 C34 76 32 66 32 56 C32 30 52 12 76 12 C98 12 110 28 110 48 '
    'C110 62 104 70 100 76 V108z" fill="#F5C79A"/>'
    '<ellipse cx="66" cy="62" rx="8" ry="10" fill="#F0B98F"/>'
    '<path d="M96 46 q9 2 9 8 q-4 4 -9 1" fill="#F0B98F"/>'
    '<path d="M40 44 C44 24 60 12 78 14 C96 16 106 30 106 44 q-10 -12 -26 -14 q-20 -2 -40 14z" fill="#4A3B33"/>'
    '<circle cx="84" cy="52" r="4.2" fill="#3F4A56"/>'
    '<path d="M78 70 q8 4 14 -1" stroke="#C9665F" stroke-width="3" fill="none" stroke-linecap="round"/>'
)
F['脸'] = (
    '<circle cx="60" cy="60" r="34" fill="#F5C79A"/>'
    '<path d="M26 44 q10 -24 34 -24 t34 24 q-10 -6 -34 -6 t-34 6z" fill="#4A3B33"/>'
    '<circle cx="48" cy="58" r="4.4" fill="#3F4A56"/><circle cx="72" cy="58" r="4.4" fill="#3F4A56"/>'
    '<circle cx="49.5" cy="56.5" r="1.6" fill="#FFFFFF"/><circle cx="73.5" cy="56.5" r="1.6" fill="#FFFFFF"/>'
    '<path d="M60 62 v7 q-4 3 -7 1" stroke="#D89A6B" stroke-width="3" fill="none" stroke-linecap="round"/>'
    '<path d="M50 76 q10 8 20 0" stroke="#C9665F" stroke-width="3.5" fill="none" stroke-linecap="round"/>'
    '<ellipse cx="38" cy="70" rx="7" ry="4.5" fill="#F7A0B0" opacity="0.65"/>'
    '<ellipse cx="82" cy="70" rx="7" ry="4.5" fill="#F7A0B0" opacity="0.65"/>'
)

# ---------------- 衣物 / 器皿 ----------------
F['衣'] = V1['clothes']
F['鞋'] = (
    '<path d="M10 80 q2 -16 16 -16 h10 l16 -20 q8 -8 16 0 l8 10 q8 8 20 10 q10 2 10 12 v6 H10z" fill="#4A7BD0"/>'
    '<path d="M42 64 l9 9 M51 56 l9 9" stroke="#FFFFFF" stroke-width="3.4" stroke-linecap="round"/>'
    '<rect x="10" y="84" width="96" height="10" rx="4" fill="#F7F7F2" stroke="#DCE3EC" stroke-width="2.4"/>'
)
F['碗'] = (
    '<path d="M14 54 h92 q-6 44 -46 44 T14 54z" fill="#FFFFFF" stroke="#C9D2DE" stroke-width="3"/>'
    '<ellipse cx="60" cy="54" rx="46" ry="7.5" fill="#EDF2F7"/>'
    '<path d="M14 54 h92" stroke="#5FA8E8" stroke-width="5" stroke-linecap="round"/>'
)
F['盘'] = (
    '<ellipse cx="60" cy="68" rx="48" ry="21" fill="#FFFFFF" stroke="#C9D2DE" stroke-width="3"/>'
    '<ellipse cx="60" cy="65" rx="33" ry="13" fill="#EDF2F7"/>'
)
F['汤'] = (
    '<path d="M16 52 h88 q-7 46 -44 46 T16 52z" fill="#FFFFFF" stroke="#C9D2DE" stroke-width="3"/>'
    '<ellipse cx="60" cy="53" rx="44" ry="9" fill="#F0A63B"/>'
    '<path d="M40 40 q-6 -8 0 -14 M60 38 q-6 -8 0 -14 M80 40 q-6 -8 0 -14" '
    'stroke="#C9D2DE" stroke-width="4" fill="none" stroke-linecap="round"/>'
    '<path d="M92 22 l-6 26" stroke="#A9B7C6" stroke-width="6" stroke-linecap="round"/>'
    '<ellipse cx="85" cy="52" rx="7" ry="5" fill="#A9B7C6"/>'
)
F['锅'] = V1.get('bowl', '')
del F['锅']
F['巾'] = (
    '<path d="M6 22 H114" stroke="#B9BFC7" stroke-width="5" stroke-linecap="round"/>'
    '<path d="M36 22 h48 v56 q-12 10 -24 1 q-12 -9 -24 0z" fill="#7ECBD6"/>'
    '<path d="M48 30 v46 M60 30 v48 M72 30 v46" stroke="#57AEBE" stroke-width="3" opacity="0.6"/>'
)
F['桌'] = (
    '<rect x="10" y="44" width="100" height="11" rx="5" fill="#C9A67A"/>'
    '<rect x="20" y="55" width="9" height="48" rx="3.5" fill="#A9784A"/>'
    '<rect x="91" y="55" width="9" height="48" rx="3.5" fill="#A9784A"/>'
    '<rect x="29" y="62" width="62" height="7" rx="3" fill="#B98F55"/>'
)

# ---------------- 学习 / 工具 ----------------
F['写'] = (
    '<path d="M16 28 h50 l18 18 v50 H16z" fill="#FFFFFF" stroke="#C9D2DE" stroke-width="3"/>'
    '<path d="M66 28 v18 h18" fill="#EDF2F7" stroke="#C9D2DE" stroke-width="3"/>'
    '<path d="M26 56 h32 M26 68 h26" stroke="#D8DEE9" stroke-width="5" stroke-linecap="round"/>'
    '<g transform="rotate(40 92 44)">'
    '<rect x="85" y="6" width="14" height="52" fill="#F7C13B"/>'
    '<rect x="85" y="6" width="14" height="10" fill="#E24B4A"/>'
    '<path d="M85 58 h14 l-7 14z" fill="#F5D9A8"/>'
    '<path d="M90 66 l2 6 2-6z" fill="#3F4A56"/>'
    '</g>'
)
F['笔'] = (
    '<g transform="rotate(-40 60 60)">'
    '<rect x="52" y="10" width="16" height="70" fill="#F7C13B"/>'
    '<rect x="52" y="10" width="16" height="12" fill="#E24B4A"/>'
    '<path d="M52 80 h16 l-8 18z" fill="#F5D9A8"/>'
    '<path d="M57 91 l3 7 3-7z" fill="#3F4A56"/>'
    '<rect x="52" y="24" width="16" height="4" fill="#E8A61C" opacity="0.6"/>'
    '</g>'
)
F['刀'] = (
    '<path d="M10 30 h62 q8 0 8 8 v40 q0 8 -8 8 H10 q-6 0 -6 -6 V36 q0 -6 6 -6z" fill="#DCE4ED"/>'
    '<path d="M4 78 h76" stroke="#A9B7C6" stroke-width="3.6"/>'
    '<path d="M18 36 h48" stroke="#F2F6FA" stroke-width="5" stroke-linecap="round"/>'
    '<rect x="80" y="42" width="32" height="16" rx="7" fill="#3F4A56"/>'
    '<circle cx="22" cy="52" r="3.4" fill="#B9C6D2"/>'
)
F['尺'] = (
    '<rect x="8" y="42" width="104" height="32" rx="6" fill="#F7D46B" stroke="#D9AE33" stroke-width="2.5"/>'
    '<path d="M24 42 v12 M40 42 v16 M56 42 v12 M72 42 v16 M88 42 v12 M100 42 v16" '
    'stroke="#C99448" stroke-width="3" stroke-linecap="round"/>'
)
F['卡'] = (
    '<rect x="14" y="28" width="92" height="64" rx="9" fill="#FFFFFF" stroke="#C9D2DE" stroke-width="3"/>'
    '<rect x="24" y="38" width="72" height="32" rx="5" fill="#BFE3F5"/>'
    '<circle cx="42" cy="48" r="5.5" fill="#F7C13B"/>'
    '<path d="M24 70 l20 -16 14 12 12 -8 26 12z" fill="#6EC07E"/>'
    '<rect x="24" y="76" width="42" height="6" rx="3" fill="#DCE3EC"/>'
)
F['包'] = (
    '<path d="M40 52 V42 a20 20 0 0 1 40 0 v10" fill="none" stroke="#B85A1C" stroke-width="7" stroke-linecap="round"/>'
    '<path d="M26 52h68a9 9 0 0 1 9 9l-5 40a9 9 0 0 1-9 8H31a9 9 0 0 1-9-8l-5-40a9 9 0 0 1 9-9z" fill="#E0722B"/>'
    '<path d="M22 62 h76" stroke="#C05E1E" stroke-width="3" opacity="0.5"/>'
    '<rect x="50" y="68" width="20" height="14" rx="4" fill="#F7C13B"/>'
)
F['币'] = (
    '<circle cx="60" cy="62" r="34" fill="#F2C14E"/>'
    '<circle cx="60" cy="62" r="34" fill="none" stroke="#D9A32A" stroke-width="4"/>'
    '<circle cx="60" cy="62" r="23" fill="none" stroke="#D9A32A" stroke-width="2.5" opacity="0.85"/>'
    '<path d="M50 50 L60 64 L70 50 M60 64 V76 M50 60 H70 M52 68 H68" '
    'stroke="#B8860B" stroke-width="4.5" fill="none" stroke-linecap="round"/>'
)
F['钱'] = (
    '<rect x="6" y="40" width="88" height="48" rx="6" fill="#8FD1A8" stroke="#5FA87C" stroke-width="3"/>'
    '<circle cx="50" cy="64" r="14" fill="#EAF7EF" stroke="#5FA87C" stroke-width="2.5"/>'
    '<path d="M18 52 h10 M18 64 h9 M18 76 h10 M74 52 h12 M78 64 h8 M74 76 h12" '
    'stroke="#5FA87C" stroke-width="3.2" opacity="0.75" stroke-linecap="round"/>'
    '<circle cx="98" cy="88" r="13" fill="#F2C14E" stroke="#D9A32A" stroke-width="2.5"/>'
    '<circle cx="98" cy="88" r="6" fill="none" stroke="#D9A32A" stroke-width="2"/>'
)
F['弓'] = (
    '<path d="M46 10 C78 30 78 90 46 110" stroke="#A9784A" stroke-width="10" fill="none" stroke-linecap="round"/>'
    '<path d="M46 10 V110" stroke="#D8DEE9" stroke-width="2.5"/>'
    '<rect x="40" y="52" width="12" height="16" rx="5" fill="#3F4A56"/>'
)
F['球'] = (
    '<path d="M60 60 L60 24 A36 36 0 0 1 84 36 Z" fill="#5FA8E8"/>'
    '<path d="M60 60 L84 36 A36 36 0 0 1 96 60 Z" fill="#E24B4A"/>'
    '<path d="M60 60 L96 60 A36 36 0 0 1 84 84 Z" fill="#F7C13B"/>'
    '<path d="M60 60 L84 84 A36 36 0 0 1 60 96 Z" fill="#5FA8E8"/>'
    '<path d="M60 60 L60 96 A36 36 0 0 1 36 84 Z" fill="#E24B4A"/>'
    '<path d="M60 60 L36 84 A36 36 0 0 1 24 60 Z" fill="#F7C13B"/>'
    '<path d="M60 60 L24 60 A36 36 0 0 1 36 36 Z" fill="#5FA8E8"/>'
    '<path d="M60 60 L36 36 A36 36 0 0 1 60 24 Z" fill="#E24B4A"/>'
    '<circle cx="60" cy="60" r="36" fill="none" stroke="#C9D2DE" stroke-width="3"/>'
    '<circle cx="60" cy="60" r="5" fill="#FFFFFF"/>'
)
F['珠'] = (
    '<path d="M14 44 q46 -18 92 0" stroke="#C98AA8" stroke-width="3.4" fill="none"/>'
    '<circle cx="26" cy="48" r="9" fill="#F7C6DA"/><circle cx="94" cy="48" r="9" fill="#F7C6DA"/>'
    '<circle cx="60" cy="72" r="28" fill="#F0A6C8"/>'
    '<ellipse cx="48" cy="60" rx="9" ry="5.5" fill="#FFFFFF" opacity="0.7" transform="rotate(-35 48 60)"/>'
    '<circle cx="60" cy="72" r="5.5" fill="#D98AAE"/>'
)

# ---------------- 食物 / 植物 ----------------
F['米'] = (
    '<path d="M14 62 q12 -26 46 -26 t46 26z" fill="#FFFDF2" stroke="#D9CDAE" stroke-width="2.8"/>'
    '<path d="M14 62 h92 l-11 32 a9 9 0 0 1 -9 6 H34 a9 9 0 0 1 -9 -6z" fill="#D8B27A"/>'
    '<path d="M18 74 h84 M24 88 h72" stroke="#B98F55" stroke-width="2.8" opacity="0.6"/>'
    '<g fill="#E8DFC8"><ellipse cx="46" cy="52" rx="6" ry="3.4"/><ellipse cx="62" cy="46" rx="6" ry="3.4"/>'
    '<ellipse cx="78" cy="54" rx="6" ry="3.4"/></g>'
)
F['肉'] = (
    '<path d="M20 56 C18 40 34 28 52 30 C72 28 92 36 96 52 C100 68 86 84 66 84 '
    'C44 86 22 74 20 56z" fill="#E08A7A"/>'
    '<path d="M20 56 C18 40 34 28 52 30 C72 28 92 36 96 52" fill="none" stroke="#F2C9BE" '
    'stroke-width="7" stroke-linecap="round"/>'
    '<path d="M40 46 q16 -6 26 4" stroke="#F5B9AC" stroke-width="4" fill="none" stroke-linecap="round"/>'
    '<path d="M80 80 l12 12" stroke="#FFF6E8" stroke-width="10" stroke-linecap="round"/>'
    '<circle cx="88" cy="88" r="6.5" fill="#FFF6E8"/><circle cx="96" cy="96" r="6.5" fill="#FFF6E8"/>'
)
F['饼'] = (
    '<circle cx="60" cy="60" r="34" fill="#E8B76A" stroke="#C99448" stroke-width="3"/>'
    '<g fill="#8B5A3C"><circle cx="48" cy="48" r="5"/><circle cx="70" cy="54" r="5.5"/>'
    '<circle cx="56" cy="72" r="5"/><circle cx="78" cy="74" r="4"/><circle cx="38" cy="68" r="4"/></g>'
)
F['瓜'] = (
    '<path d="M14 46 a46 46 0 0 0 92 0z" fill="#5FB271"/>'
    '<path d="M22 46 a38 38 0 0 0 76 0z" fill="#F7F7F2"/>'
    '<path d="M28 46 a32 32 0 0 0 64 0z" fill="#E8555E"/>'
    '<g fill="#3F3A36"><ellipse cx="46" cy="62" rx="3.5" ry="5" transform="rotate(-20 46 62)"/>'
    '<ellipse cx="60" cy="68" rx="3.5" ry="5"/>'
    '<ellipse cx="74" cy="62" rx="3.5" ry="5" transform="rotate(20 74 62)"/>'
    '<ellipse cx="60" cy="52" rx="3.5" ry="5"/></g>'
)
F['菜'] = (
    '<path d="M60 104 C46 96 42 76 44 60 h32 c2 16 -2 36 -16 44z" fill="#F7F7E8" stroke="#DCE3EC" stroke-width="2.6"/>'
    '<path d="M44 62 C28 54 22 32 34 20 C48 30 50 50 44 62z" fill="#6EC07E"/>'
    '<path d="M76 62 C92 54 98 32 86 20 C72 30 70 50 76 62z" fill="#7CCB8B"/>'
    '<path d="M60 58 C58 40 62 22 74 14 C80 30 72 48 60 58z" fill="#5FB271"/>'
)
F['木'] = (
    '<rect x="16" y="40" width="70" height="42" rx="8" fill="#A9784A"/>'
    '<ellipse cx="86" cy="61" rx="16" ry="21" fill="#D8B27A"/>'
    '<ellipse cx="86" cy="61" rx="9.5" ry="13" fill="none" stroke="#B98F55" stroke-width="2.5"/>'
    '<ellipse cx="86" cy="61" rx="3.5" ry="5" fill="#B98F55"/>'
    '<path d="M22 48 h56" stroke="#965F35" stroke-width="3" opacity="0.5"/>'
)
F['杏'] = (
    '<circle cx="60" cy="68" r="30" fill="#F5A623"/>'
    '<path d="M60 40 q5 28 0 56" stroke="#D9861A" stroke-width="2.6" fill="none"/>'
    '<path d="M60 40 V28" stroke="#8B6A45" stroke-width="5" stroke-linecap="round"/>'
    '<path d="M62 36 q16 -14 27 -6 q-9 16 -27 6z" fill="#6EC07E"/>'
)
F['桃'] = (
    '<path d="M60 98 C34 84 24 68 26 56 a18 18 0 0 1 34 -10 a18 18 0 0 1 34 10 c2 12 -8 28 -34 42z" fill="#F7A0B0"/>'
    '<path d="M60 48 q-6 26 0 46" stroke="#E27E93" stroke-width="2.6" fill="none"/>'
    '<path d="M58 40 q-12 -14 -26 -10 q6 14 26 10z" fill="#6EC07E"/>'
    '<path d="M60 40 V26" stroke="#8B6A45" stroke-width="5" stroke-linecap="round"/>'
)
F['苗'] = (
    '<path d="M20 98 h80 q-8 -14 -40 -14 T20 98z" fill="#A9784A"/>'
    '<path d="M60 94 V56" stroke="#4E9A5C" stroke-width="6" stroke-linecap="round"/>'
    '<path d="M60 68 q-24 -2 -27 -22 q23 -1 27 22z" fill="#6EC07E"/>'
    '<path d="M60 60 q24 -6 27 -26 q-23 0 -27 26z" fill="#7CCB8B"/>'
)
F['茄'] = (
    '<path d="M60 34 C50 40 44 54 44 68 C44 86 52 100 62 100 C72 100 80 86 80 68 '
    'C80 54 70 40 60 34z" fill="#8E6BC8"/>'
    '<path d="M60 36 q-12 1 -16 -8 q12 -6 18 2 q6 -10 20 -6 q-4 10 -22 12z" fill="#4E9A5C"/>'
    '<path d="M60 26 V14" stroke="#4E9A5C" stroke-width="5" stroke-linecap="round"/>'
    '<ellipse cx="52" cy="58" rx="6" ry="14" fill="#A98BE0" opacity="0.55" transform="rotate(-16 52 58)"/>'
)
F['萝'] = (
    '<path d="M60 44 C42 50 34 66 38 82 C42 96 78 96 82 82 C86 66 78 50 60 44z" '
    'fill="#F7FAEF" stroke="#C9D2DE" stroke-width="3"/>'
    '<path d="M60 44 q-16 -5 -22 -21 q18 0 24 15 q5 -18 22 -20 q-2 17 -16 24z" fill="#6EC07E"/>'
    '<path d="M60 30 V14" stroke="#4E9A5C" stroke-width="5" stroke-linecap="round"/>'
    '<path d="M58 94 q2 10 2 14" stroke="#DCE3EC" stroke-width="4" stroke-linecap="round"/>'
)
F['禾'] = (
    '<path d="M60 108 V36" stroke="#7FA94E" stroke-width="7" stroke-linecap="round"/>'
    '<g fill="#F0C64B">'
    '<ellipse cx="46" cy="44" rx="10" ry="6" transform="rotate(-28 46 44)"/>'
    '<ellipse cx="74" cy="44" rx="10" ry="6" transform="rotate(28 74 44)"/>'
    '<ellipse cx="48" cy="60" rx="10" ry="6" transform="rotate(-24 48 60)"/>'
    '<ellipse cx="72" cy="60" rx="10" ry="6" transform="rotate(24 72 60)"/>'
    '<ellipse cx="52" cy="76" rx="9" ry="5.5" transform="rotate(-20 52 76)"/>'
    '<ellipse cx="68" cy="76" rx="9" ry="5.5" transform="rotate(20 68 76)"/>'
    '<ellipse cx="60" cy="30" rx="8" ry="12"/></g>'
)
F['家'] = (
    '<path d="M60 14 L104 48 H94 V104 H26 V48 H16z" fill="#F0C070"/>'
    '<path d="M60 14 L104 48 H94 L60 30 L26 48 H16z" fill="#D9822B"/>'
    '<rect x="50" y="70" width="22" height="34" rx="3" fill="#A9784A"/>'
    '<path d="M60 56 C52 50 44 46 44 40 a6 6 0 0 1 16 -3 a6 6 0 0 1 16 3 c0 6 -8 10 -16 16z" fill="#E24B4A"/>'
)

# ---------------- 动作 ----------------
F['吃'] = (
    '<circle cx="52" cy="50" r="27" fill="#F5C79A"/>'
    '<circle cx="42" cy="44" r="3.8" fill="#3F4A56"/><circle cx="64" cy="44" r="3.8" fill="#3F4A56"/>'
    '<ellipse cx="54" cy="66" rx="12" ry="9" fill="#8E2F3C"/>'
    '<ellipse cx="54" cy="68" rx="7" ry="4" fill="#E4707A"/>'
    '<path d="M100 108 L74 76" stroke="#A9784A" stroke-width="5" stroke-linecap="round"/>'
    '<path d="M112 104 L86 72" stroke="#8B6A45" stroke-width="5" stroke-linecap="round"/>'
    '<circle cx="80" cy="66" r="11" fill="#F5D9A8" stroke="#E0BE83" stroke-width="2.4"/>'
    '<path d="M72 64 q8 -7 16 0" stroke="#E0BE83" stroke-width="2.2" fill="none"/>'
)
F['喝'] = (
    '<path d="M36 28 h48 l-7 66 a8 8 0 0 1 -8 7 H51 a8 8 0 0 1 -8 -7z" fill="#E8F4FD" stroke="#A9C7DE" stroke-width="3"/>'
    '<path d="M41 50 h38 l-5 44 a5 5 0 0 1 -5 4 H51 a5 5 0 0 1 -5 -4z" fill="#5FA8E8"/>'
    '<path d="M78 16 L64 60" stroke="#E24B4A" stroke-width="6" stroke-linecap="round"/>'
    '<path d="M36 28 h48" stroke="#A9C7DE" stroke-width="4" stroke-linecap="round"/>'
)
F['听'] = (
    EAR +
    '<g stroke="#5B8DEF" stroke-width="4.4" fill="none" stroke-linecap="round">'
    '<path d="M44 46 a14 14 0 0 0 0 22"/><path d="M30 36 a28 28 0 0 0 0 42"/></g>'
)
F['唱'] = (
    '<circle cx="50" cy="66" r="27" fill="#F5C79A"/>'
    '<path d="M38 58 q6 -5 11 0" stroke="#3F4A56" stroke-width="3" fill="none" stroke-linecap="round"/>'
    '<ellipse cx="54" cy="78" rx="8" ry="10" fill="#8E2F3C"/>'
    '<g fill="#5B8DEF"><ellipse cx="88" cy="40" rx="7.5" ry="5.5"/>'
    '<rect x="93" y="16" width="4" height="24"/>'
    '<path d="M97 16 q11 4 11 13 q-5 -7 -11 -7z"/></g>'
    '<g fill="#E24B4A"><ellipse cx="100" cy="66" rx="6" ry="4.5"/>'
    '<rect x="104" y="46" width="3.5" height="20"/></g>'
)
F['看'] = (
    '<path d="M4 68 q26 -24 52 0 q-26 24 -52 0z" fill="#FFFFFF" stroke="#3F4A56" stroke-width="3"/>'
    '<circle cx="30" cy="68" r="11" fill="#5FA8E8"/>'
    '<circle cx="30" cy="68" r="5" fill="#3F4A56"/>'
    '<circle cx="33" cy="64" r="2.4" fill="#FFFFFF"/>'
    '<path d="M58 60 q12 -8 18 -6" stroke="#9AA3AE" stroke-width="3" stroke-dasharray="4 5" fill="none"/>'
    '<g transform="translate(92 44)">'
    '<path d="M0 2 C-11 -16 -24 -12 -20 0 C-25 9 -10 15 0 6z" fill="#F0902B"/>'
    '<path d="M0 2 C11 -16 24 -12 20 0 C25 9 10 15 0 6z" fill="#F5B03F"/>'
    '<path d="M-1 7 C-9 20 -18 20 -16 11 C-20 4 -8 3 -1 6z" fill="#F0902B"/>'
    '<path d="M1 7 C9 20 18 20 16 11 C20 4 8 3 1 6z" fill="#F5B03F"/>'
    '<path d="M0 -6 v14" stroke="#8B5A3C" stroke-width="2.6" stroke-linecap="round"/></g>'
)
F['睡'] = (
    '<rect x="4" y="60" width="48" height="30" rx="14" fill="#DCEBF7" stroke="#B7D4E8" stroke-width="2.5"/>'
    '<circle cx="70" cy="64" r="26" fill="#F5C79A"/>'
    '<path d="M58 60 q6 6 11 0" stroke="#3F4A56" stroke-width="3" fill="none" stroke-linecap="round"/>'
    '<path d="M72 60 q6 6 11 0" stroke="#3F4A56" stroke-width="3" fill="none" stroke-linecap="round"/>'
    '<path d="M64 78 q7 5 14 0" stroke="#C9885B" stroke-width="3" fill="none" stroke-linecap="round"/>'
    '<path d="M94 10a12 12 0 1 0 0 22 9 9 0 1 1 0 -22z" fill="#F2D25C"/>'
    '<circle cx="20" cy="26" r="3.4" fill="#F7C13B"/><circle cx="36" cy="14" r="2.6" fill="#F7C13B"/>'
)
F['坐'] = (
    '<rect x="82" y="26" width="11" height="56" rx="4.5" fill="#A9784A"/>'
    '<rect x="24" y="70" width="74" height="11" rx="4.5" fill="#C9A67A"/>'
    '<rect x="30" y="81" width="9" height="28" rx="3.5" fill="#A9784A"/>'
    '<rect x="86" y="81" width="9" height="28" rx="3.5" fill="#A9784A"/>'
    '<circle cx="54" cy="32" r="13" fill="#F5C79A"/>'
    '<path d="M42 70 q0 -24 12 -24 t12 24z" fill="#5B8DEF"/>'
    '<path d="M50 70 v12 q0 6 -8 6 H38" stroke="#3F5080" stroke-width="9" fill="none" stroke-linecap="round"/>'
    '<path d="M62 70 v20 q0 6 -6 6" stroke="#3F5080" stroke-width="9" fill="none" stroke-linecap="round"/>'
)
F['走'] = (
    '<circle cx="56" cy="22" r="12" fill="#F5C79A"/>'
    '<path d="M56 34 v28" stroke="#5B8DEF" stroke-width="17" stroke-linecap="round"/>'
    '<path d="M56 42 l-15 13" stroke="#F5C79A" stroke-width="7" stroke-linecap="round"/>'
    '<path d="M56 42 l14 14" stroke="#F5C79A" stroke-width="7" stroke-linecap="round"/>'
    '<path d="M55 60 l-16 24" stroke="#3F5080" stroke-width="9" stroke-linecap="round"/>'
    '<path d="M57 60 l15 24" stroke="#3F5080" stroke-width="9" stroke-linecap="round"/>'
    '<path d="M39 84 h-10 M72 84 h9" stroke="#3F4A56" stroke-width="6" stroke-linecap="round"/>'
    '<path d="M16 42 h10 M12 54 h8" stroke="#C9D2DE" stroke-width="4" stroke-linecap="round"/>'
)
F['跑'] = (
    '<g transform="rotate(-14 60 60)">'
    '<circle cx="66" cy="20" r="12" fill="#F5C79A"/>'
    '<path d="M64 32 l-8 26" stroke="#E24B4A" stroke-width="17" stroke-linecap="round"/>'
    '<path d="M58 40 l-18 8" stroke="#F5C79A" stroke-width="7" stroke-linecap="round"/>'
    '<path d="M60 38 l16 10" stroke="#F5C79A" stroke-width="7" stroke-linecap="round"/>'
    '<path d="M55 57 l-18 14" stroke="#3F5080" stroke-width="9" stroke-linecap="round"/>'
    '<path d="M56 57 l14 10 q6 8 -2 14" stroke="#3F5080" stroke-width="9" fill="none" stroke-linecap="round"/>'
    '<path d="M37 71 h-9 M68 83 h9" stroke="#3F4A56" stroke-width="6" stroke-linecap="round"/>'
    '</g>'
    '<path d="M10 40 h12 M6 52 h9 M10 64 h10" stroke="#C9D2DE" stroke-width="4" stroke-linecap="round"/>'
)
F['跳'] = (
    '<circle cx="60" cy="20" r="12" fill="#F5C79A"/>'
    '<path d="M60 32 v24" stroke="#6EC07E" stroke-width="17" stroke-linecap="round"/>'
    '<path d="M60 36 l-15 -12 M60 36 l15 -12" stroke="#F5C79A" stroke-width="7" stroke-linecap="round"/>'
    '<path d="M60 54 l-14 12" stroke="#3F5080" stroke-width="9" stroke-linecap="round"/>'
    '<path d="M60 54 l14 12" stroke="#3F5080" stroke-width="9" stroke-linecap="round"/>'
    '<path d="M46 66 v10 M74 66 v10" stroke="#3F5080" stroke-width="9" stroke-linecap="round"/>'
    '<path d="M46 76 h-9 M74 76 h9" stroke="#3F4A56" stroke-width="6" stroke-linecap="round"/>'
    '<path d="M22 100 q38 -16 76 0" stroke="#C9D2DE" stroke-width="4" stroke-dasharray="7 7" fill="none"/>'
)
F['扫'] = (
    '<path d="M84 16 L60 62" stroke="#A9784A" stroke-width="8" stroke-linecap="round"/>'
    '<path d="M46 58 h26 l6 42H40z" fill="#E8C27A"/>'
    '<path d="M52 62 v34 M59 62 v36 M66 62 v34" stroke="#C99448" stroke-width="2.8" opacity="0.7"/>'
    '<path d="M26 98 q10 -12 22 -2" fill="#C9D2DE"/>'
    '<path d="M16 78 h9 M12 88 h8" stroke="#C9D2DE" stroke-width="4" stroke-linecap="round"/>'
)
F['抱'] = (
    '<path d="M60 100 C26 78 14 62 14 50 a20 20 0 0 1 46 -10 a20 20 0 0 1 46 10 c0 12 -12 28 -46 50z" fill="#E24B4A"/>'
    '<path d="M18 56 q14 18 42 18 t42 -18" stroke="#F5C79A" stroke-width="10" fill="none" stroke-linecap="round"/>'
    '<circle cx="20" cy="60" r="8" fill="#F5C79A"/><circle cx="100" cy="60" r="8" fill="#F5C79A"/>'
    '<ellipse cx="46" cy="44" rx="9" ry="5" fill="#FFFFFF" opacity="0.35" transform="rotate(-30 46 44)"/>'
)
F['拉'] = (
    '<path d="M2 58 H120" stroke="#A9784A" stroke-width="7" stroke-linecap="round"/>'
    '<path d="M100 26 q18 8 18 30 v42 h-18z" fill="#5B8DEF"/>'
    '<g fill="#F5C79A" stroke="#E8AC7C" stroke-width="2.2">'
    '<rect x="52" y="38" width="38" height="12" rx="6"/>'
    '<rect x="50" y="51" width="40" height="12" rx="6"/>'
    '<rect x="52" y="64" width="38" height="12" rx="6"/>'
    '<rect x="55" y="77" width="34" height="12" rx="6"/></g>'
    '<path d="M92 38 q10 6 10 20 v34 h-8z" fill="#EFB98F"/>'
    '<path d="M44 96 H18 M18 96 l8 -7 M18 96 l8 7" stroke="#5B8DEF" stroke-width="4.5" '
    'fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
)
F['洗'] = (
    '<path d="M74 10 v16 h-24 v14" stroke="#B9BFC7" stroke-width="10" fill="none" stroke-linecap="round"/>'
    '<rect x="38" y="36" width="12" height="14" rx="4" fill="#9AA3AE"/>'
    '<path d="M44 52 v16 M54 52 v12" stroke="#5FA8E8" stroke-width="5" stroke-linecap="round"/>'
    '<ellipse cx="60" cy="96" rx="38" ry="10" fill="#DCEBF7"/>'
    '<path d="M28 92 q0 -24 14 -24 h16 q14 0 14 24z" fill="#F5C79A"/>'
    '<path d="M30 76 q4 -10 10 -4 M44 74 q4 -10 10 -4 M58 74 q4 -10 10 -4" '
    'stroke="#E8AC7C" stroke-width="4" fill="none" stroke-linecap="round"/>'
    '<circle cx="86" cy="28" r="6" fill="#FFFFFF" stroke="#BFD9F2" stroke-width="2"/>'
    '<circle cx="96" cy="16" r="4" fill="#FFFFFF" stroke="#BFD9F2" stroke-width="2"/>'
)
F['飞'] = (
    '<path d="M12 62 L106 22 L70 98 L54 70z" fill="#FFFFFF" stroke="#5B8DEF" stroke-width="3.5" stroke-linejoin="round"/>'
    '<path d="M12 62 L54 70 L106 22" fill="none" stroke="#5B8DEF" stroke-width="3" stroke-linejoin="round"/>'
    '<path d="M10 94 q28 12 48 -2" stroke="#9AA3AE" stroke-width="3.5" stroke-dasharray="7 7" fill="none"/>'
    '<path d="M96 40 l6 -6 M104 54 l8 -4" stroke="#8EC4E8" stroke-width="4" stroke-linecap="round"/>'
)


FLAT = {}
for ch, key in REUSE.items():
    if key in V1:
        FLAT[ch] = V1[key]
FLAT.update(F)

# 人物 / 动作统一用 art_people 里的图（不画五官，比例统一）
from art_people import CARDS as PEOPLE  # noqa: E402

FLAT.update(PEOPLE)

# 这些字已经改成插画位图，手绘版从图库里剔掉，避免重复占体积
AI_COVERED = ('走', '跑', '跳', '坐', '吃', '听', '唱', '喝', '看', '睡',
              '写', '洗', '扫', '抱', '拉', '飞', '手', '足', '耳', '牙')
for ch in AI_COVERED:
    FLAT.pop(ch, None)

# 头、脸这种"必须画一张脸"的字，改成词语降级，不画图
FALLBACK = ('头', '脸')
for ch in FALLBACK:
    FLAT.pop(ch, None)

if __name__ == '__main__':
    import xml.etree.ElementTree as ET
    bad = []
    for ch, body in FLAT.items():
        try:
            ET.fromstring('<svg xmlns="http://www.w3.org/2000/svg">%s</svg>' % body)
        except Exception as e:
            bad.append((ch, str(e)[:80]))
    print('合计', len(FLAT), '个；损坏', len(bad))
    for b in bad:
        print('  ', b)
    io.open('art_flat.json', 'w', encoding='utf-8').write(
        json.dumps(FLAT, ensure_ascii=False, indent=1))
