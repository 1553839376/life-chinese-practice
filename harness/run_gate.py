# -*- coding: utf-8 -*-
"""生活语文练习台 · 一键门禁（HARNESS）

用法：
    python harness/run_gate.py            # 构建 → 静态护栏 → 自动测试 → 生成报告
    python harness/run_gate.py --no-build # 跳过构建（只验现有产物）
    python harness/run_gate.py --quick    # 只跑 G0/G1，不跑 jsdom 测试（30 秒内出结果）

四道关口：
    G0 构建    build_html.py 成功、产物存在、体积 <= manifest.max_bytes、12 分片齐全
    G1 静态    manifest 关键符号全在、资产条数不低于下限、无外部资源引用
    G2 测试    5 套 jsdom 测试 0 失败，项数不低于 manifest 下限
    G3 报告    写 harness/reports/gate-YYYYMMDD-HHMM.md

退出码：0 全绿；1 有红。
"""
import io
import json
import os
import re
import shutil
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ROOT = Path(__file__).resolve().parent.parent
BUILD = ROOT / 'build'
HARNESS = ROOT / 'harness'
REPORTS = HARNESS / 'reports'
MANIFEST = json.loads(io.open(HARNESS / 'manifest.json', encoding='utf-8').read())

def _find_node():
    """找 node：环境变量 → PATH → 各机器上的常见安装位置。

    2026-10-23 加：原来这里写死了 C:\\Users\\xnxxPC2\\...，换台电脑（例如家里）就跑不起来。
    门禁必须能在任何一台机器上直接跑，否则「clone 下来接着干」是空话。
    """
    cands = []
    env = os.environ.get('NODE_BIN')
    if env:
        cands.append(env)
    w = shutil.which('node')
    if w:
        cands.append(w)
    home = Path.home()
    # WorkBuddy 托管运行时：版本号会变，用通配找最新的
    cands += [str(p) for p in sorted(
        (home / '.workbuddy' / 'binaries' / 'node' / 'versions').glob('*/node.exe'), reverse=True)]
    cands += [r'C:\Program Files\nodejs\node.exe',
              r'C:\Program Files (x86)\nodejs\node.exe',
              '/usr/local/bin/node', '/usr/bin/node']
    for c in cands:
        if c and Path(c).exists():
            return str(c)
    return 'node'      # 最后交给 PATH；真要没有，测试会报「找不到 node」，比静默失败好


def _find_node_path(node_bin):
    """找 node_modules（jsdom 装在哪）：环境变量 → 仓库本地 → 托管工作区 → node 旁边。"""
    env = os.environ.get('NODE_PATH')
    if env and Path(env).exists():
        return env
    here = ROOT / 'node_modules'
    if here.exists():
        return str(here)
    home = Path.home()
    for p in sorted((home / '.workbuddy' / 'binaries' / 'node' / 'workspace').glob('node_modules'),
                    reverse=True):
        if p.exists():
            return str(p)
    nb = Path(node_bin).parent
    for p in (nb / 'node_modules', nb.parent / 'lib' / 'node_modules'):
        if p.exists():
            return str(p)
    return ''


NODE = _find_node()
NODE_PATH = _find_node_path(NODE)

PARTS = ['p1.html', 'p2.html', 'p_open.txt', 'p_sfx.js', 'p_art.js', 'p_stroke.js',
         'lib.js', 'p4.js', 'p8.js', 'p5.js', 'p_so.js', 'p6.js', 'p7.js', 'p_close.txt']
# v27 起多了两个分片：p_stroke.js（561 字笔顺数据，558 KB）与 p_so.js（笔顺动画 + 描写界面）。
# 少任何一个，产物照样能打开（脚本报 ReferenceError 后整页死在 boot），所以必须在这里卡住。
# 语音是 JSON 分片（v8 起惰性解析），不算在 12 段里，但构建同样必需。
# 2026-10-23 修正：这里原来写着 p_voice.js（旧格式），本机因为那文件还在所以一直"通过"，
# 直到在全新 clone 上跑门禁才暴露——旧文件不入库，检查就红了。
VOICE_PART = 'p_voice.json'

results = []   # [{gate, name, ok, detail}]


def rec(gate, name, ok, detail=''):
    results.append({'gate': gate, 'name': name, 'ok': bool(ok), 'detail': str(detail)})
    mark = 'PASS' if ok else 'FAIL'
    print('  [%s] %-4s %s%s' % (mark, gate, name, ('  — ' + str(detail)) if detail else ''))
    return ok


def read(p):
    return io.open(p, encoding='utf-8').read()


# ---------------------------------------------------------------- G0 构建
def gate_build(do_build=True):
    print('\n=== G0 构建 ===')
    if do_build:
        t0 = time.time()
        proc = subprocess.run([sys.executable, 'build_html.py'], cwd=str(BUILD),
                              capture_output=True)
        out = (proc.stdout or b'').decode('utf-8', 'replace').strip()
        err = (proc.stderr or b'').decode('utf-8', 'replace').strip()
        if not rec('G0', 'build_html.py 退出码 0', proc.returncode == 0,
                   out.splitlines()[-1] if out else err[:300]):
            return None
        print('       耗时 %.1f s' % (time.time() - t0))

    missing = [p for p in PARTS if not (BUILD / p).exists()]
    if not (BUILD / VOICE_PART).exists():
        missing.append(VOICE_PART)
    rec('G0', '%d 个分片齐全' % (len(PARTS) + 1), not missing,
        '缺：' + ','.join(missing) if missing else '%d/%d' % (len(PARTS) + 1, len(PARTS) + 1))

    prod = ROOT / MANIFEST['product']
    if not rec('G0', '产物存在', prod.exists(), str(prod)):
        return None
    size = prod.stat().st_size
    cap = MANIFEST['max_bytes']
    rec('G0', '体积 %.2f MB <= %.1f MB' % (size / 1e6, cap / 1e6), size <= cap)
    rec('G0', '体积合理（> 1 MB）', size > 1048576)
    return read(prod)


# ---------------------------------------------------------------- G1 静态
def count_lines_matching(text, pattern):
    return len(re.findall(pattern, text, re.M))


def asset_counts():
    out = {}
    for key, cfg in MANIFEST['assets'].items():
        text = read(ROOT / cfg['file'])
        if cfg['file'].endswith('.json'):
            out[key] = len(json.loads(text))          # 语音包是纯 JSON
        elif key == 'stroke_chars':
            m = re.search(r'var STROKE_PACK = (\{.*?\});', text, re.S)
            out[key] = len(json.loads(m.group(1))) if m else 0
        elif key == 'chars':
            out[key] = count_lines_matching(text, r"^\{c:'")
        elif key == 'stages':
            m = re.search(r'var STAGES = \[(.*?)\]', text, re.S)
            out[key] = len(re.findall(r"'", m.group(1))) // 2 if m else 0
        else:
            out[key] = count_lines_matching(text, r'^"[^"]+":')
    return out


def gate_static(html):
    print('\n=== G1 静态护栏 ===')

    # 符号：function/var/const/let 声明 或 id="X"
    lacks = []
    total = 0
    for group, syms in MANIFEST['symbols'].items():
        for s in syms:
            total += 1
            decl = re.search(r'\b(?:function|var|const|let)\s+' + re.escape(s) + r'\b', html)
            dom = re.search(r'id="' + re.escape(s) + r'"', html)
            if not (decl or dom):
                lacks.append(group + '/' + s)
    rec('G1', '关键符号 %d 个全在' % total, not lacks,
        ('缺 ' + str(len(lacks)) + '：' + ', '.join(lacks[:8])) if lacks else '')

    counts = asset_counts()
    for key, cfg in MANIFEST['assets'].items():
        n = counts.get(key, 0)
        rec('G1', '%s = %d（下限 %d）' % (key, n, cfg['min']), n >= cfg['min'])

    # 外链：排除 SVG 命名空间
    ext = []
    for m in re.finditer(r'(?:src|href)\s*=\s*["\'](https?://[^"\']+)', html):
        u = m.group(1)
        if 'www.w3.org' in u:
            continue
        ext.append(u)
    for m in re.finditer(r'url\(\s*["\']?(https?://[^)"\']+)', html):
        ext.append(m.group(1))
    rec('G1', '零外部资源引用', not ext, ', '.join(ext[:3]) if ext else '无外链')

    # 节奏常量必须在产物里
    rec('G1', '节奏常量集中在 PACE', 'var PACE' in html and 'PACE_GAP' in html)

    # 观感护栏：这三样掉了，孩子会以为画面是死的 / 找不到下一步
    marks = ['@keyframes tailWag', '@keyframes finFlap', '.read-next', 'btnReadNext']
    miss = [m for m in marks if m not in html]
    rec('G1', '观感标记全在（摆尾/划鳍/跟读大按钮）', not miss,
        ('缺 ' + ', '.join(miss)) if miss else '')

    # 字表护栏：把「空字表回退全库 700 字」这条危险默认值钉死，不许回潮
    tmarks = ['fStuCharList', 'char-chip', 'migrateStuChars', 'stuCharToggle']
    tmiss = [m for m in tmarks if m not in html]
    rec('G1', '学生字表标记全在（组头/chip/迁移）', not tmiss,
        ('缺 ' + ', '.join(tmiss)) if tmiss else '')
    # 旧版 charsOf 会遍历全库兜底；新版只按字表取字，函数体里不该再出现 STATE.chars.length
    cbody = html.split('function charsOf')[1].split('function artOf')[0] if 'function charsOf' in html else ''
    rec('G1', 'charsOf 只读字表，不再扫全库兜底', bool(cbody) and 'STATE.chars.length' not in cbody,
        '' if cbody else '找不到 charsOf')

    # 档案/进度护栏：v12 的进度一律以「学生自己字表」为分母，
    # 旧版「学生 × 22 册次、分母扫全库」的矩阵不许回潮
    pmarks = ['stuProfile', 'profGrid', 'progHard', 'drillBar', 'progBarHTML', 'btnProfDrill']
    pmiss = [m for m in pmarks if m not in html]
    rec('G1', '学生档案/抽练标记全在', not pmiss,
        ('缺 ' + ', '.join(pmiss)) if pmiss else '')

    prbody = html.split('function renderProgress')[1].split('function wireEvents')[0] \
        if 'function renderProgress' in html else ''
    rec('G1', '进度页不再拿字库当分母（renderProgress 体内无 STATE.chars）',
        bool(prbody) and 'STATE.chars' not in prbody,
        '' if prbody else '找不到 renderProgress')

    spbody = html.split('function stuProfile')[1].split('function sinceText')[0] \
        if 'function stuProfile' in html else ''
    rec('G1', 'stuProfile 的分母取学生字表（体内必须有 s.chars）',
        bool(spbody) and 's.chars' in spbody, '' if spbody else '找不到 stuProfile')

    # 表单可用性护栏（v13）：字库 700 行如果不在容器里滚动，整页会被撑到 4 万多像素，
    # 「新增/编辑」表单被顶到最底下 —— 老师点完按钮什么都看不见，等于按钮坏了
    vmarks = ['revealForm', 'markField', 'field-err-box', '_lwQuery']
    vmiss = [m for m in vmarks if m not in html]
    rec('G1', '表单定位/校验高亮标记全在', not vmiss,
        ('缺 ' + ', '.join(vmiss)) if vmiss else '')

    has_scroll = '#tpLib .list-wrap,#tpWord .list-wrap{max-height:' in html
    rec('G1', '字库/词库列表在容器里滚动（不把整页撑长）', has_scroll,
        '' if has_scroll else '找不到 #tpLib/#tpWord 的 max-height 规则')

    # 表单必须排在列表前面，否则点「新增」后表单出现在 700 行表格底下
    order_ok = True
    order_msg = ''
    for form_id, tbody_id in (('libForm', 'libTbody'), ('wdForm', 'wdTbody'), ('stuForm', 'stuTbody')):
        fi = html.find('id="%s"' % form_id)
        ti = html.find('id="%s"' % tbody_id)
        if fi < 0 or ti < 0 or fi > ti:
            order_ok = False
            order_msg += '%s 不在 %s 之前；' % (form_id, tbody_id)
    rec('G1', '新增/编辑表单排在列表之前（点完就能看见）', order_ok, order_msg)

    # 拼词语护栏（v14）
    wmarks = ['wordBank', 'buildWordGroups', 'wbCrossHit', 'renderWordBuild',
              'wbPick', 'wbCheck', 'wbLogWord', 'wbHint',
              'wb-tile', 'wb-slot', 'wb-slots', 'wbTip']
    wmiss = [m for m in wmarks if m not in html]
    rec('G1', '拼词语标记全在（词表/出题/字块/提示）', not wmiss,
        ('缺 ' + ', '.join(wmiss)) if wmiss else '')

    # 读题不能把答案念出来：拼词语的分支必须直接 return 一句指令，不能带 q.words
    qsbody = html.split("function quizSay(")[1].split("function quizSentence(")[0] \
        if 'function quizSay(' in html else ''
    wbranch = qsbody.split("type === '拼词语'")[1].split('return null')[0] \
        if "type === '拼词语'" in qsbody else ''
    rec('G1', '拼词语读题不念答案（quizSay 分支不含 q.words）',
        bool(wbranch) and 'q.words' not in wbranch and 'q_word' in html,
        '' if wbranch else '找不到 quizSay 的拼词语分支')

    # 记分只认学生字表：词的另一半可能是没学过的字，记进档案会把进度弄虚
    lbbody = html.split('function wbLogWord')[1].split('function wbHint')[0] \
        if 'function wbLogWord' in html else ''
    rec('G1', '拼词语只给字表里的字记分（wbLogWord 体内有 charsOf）',
        bool(lbbody) and 'charsOf' in lbbody, '' if lbbody else '找不到 wbLogWord')

    # 词表必须从字库「组词」栏派生，不能另存一份会过期的副本。
    # v15 起派生点挪到 builtinWords（wordBank 复用它，再把老师自建的词并进来），
    # 所以护栏改成「builtinWords 读字库 + wordBank 复用 builtinWords」，测的是新结构。
    btbody = html.split('function builtinWords')[1].split('function repairCharWords')[0] \
        if 'function builtinWords' in html else ''
    wbbody = html.split('function wordBank')[1].split('function wordOf')[0] \
        if 'function wordBank' in html else ''
    rec('G1', '内置词表由字库组词栏派生（builtinWords 体内有 STATE.chars，wordBank 复用）',
        bool(btbody) and 'STATE.chars' in btbody and 'builtinWords(' in wbbody,
        '' if btbody else '找不到 builtinWords')

    # 词库页不能是空表：内置词必须渲染出来，并给一条「收进词库」的路
    wrbody = html.split('function wordRowsHTML')[1].split('function fillWordFilter')[0] \
        if 'function wordRowsHTML' in html else ''
    rec('G1', '词库页把内置组词渲染出来（wordRowsHTML 有 builtinWords + tr-builtin + data-wcopy）',
        bool(wrbody) and 'builtinWords(' in wrbody and 'tr-builtin' in wrbody
        and 'data-wcopy' in wrbody,
        '' if wrbody else '找不到 wordRowsHTML')

    # 收进词库必须真落进 STATE.words 并落盘，否则刷新就没了
    cbbody = html.split('function copyBuiltinWord')[1].split('function deleteWord')[0] \
        if 'function copyBuiltinWord' in html else ''
    rec('G1', '收进词库会写进 STATE.words 并落盘（copyBuiltinWord 体内有 mine.push + saveSnap）',
        bool(cbbody) and 'mine.push' in cbbody and 'saveSnap' in cbbody,
        '' if cbbody else '找不到 copyBuiltinWord')

    # v16 词库空表抢救：老师报「词库还是空的」，只有两种真因——
    # ① 打开的是旧页面（靠角标版本号暴露）② 字库「组词」栏被抹了（靠体检+兜底）
    rec('G1', '老师端有版本角标（id=appVer，报「还是老样子」时先看这个）',
        'id="appVer"' in html and 'class="app-ver"' in html)

    rcbody = html.split('function repairCharWords')[1].split('function wordBank')[0] \
        if 'function repairCharWords' in html else ''
    rec('G1', '字库组词栏体检存在（repairCharWords 体内读 STATE.chars 与内置字表 CHARS）',
        bool(rcbody) and 'STATE.chars' in rcbody and 'CHARS' in rcbody,
        '' if rcbody else '找不到 repairCharWords')

    rec('G1', 'builtinWords 有兜底（体内出现 CHARS，组词栏被抹也不会空表）',
        bool(btbody) and 'CHARS' in btbody)

    rec('G1', '启动/云端载入/导入备份三条路都做组词体检（否则重启又空）',
        html.count('repairCharWords();') >= 3,
        '调用点 %d 处' % html.count('repairCharWords();'))

    # v17 进度页改版护栏：老师嫌「6 张数字卡堆在一起、解释文字太显眼」，
    # 改成一圈掌握率 + 一条四段占比 + 三个小胶囊。钉住新结构，别回潮成数字卡。
    prbody2 = html.split('function renderProgress')[1].split('function wireEvents')[0] \
        if 'function renderProgress' in html else ''
    rec('G1', '进度页头图是圆环+四段条（renderProgress 体内有 ringHTML( 与 stackHTML(）',
        'ringHTML(' in prbody2 and 'stackHTML(' in prbody2,
        '' if prbody2 else '找不到 renderProgress')
    rec('G1', '进度页不再回潮成 6 张同款数字卡（.stat-cards / #progStats .stat 已撤）',
        '.stat-cards' not in html and 'class="stat"' not in html)
    rec('G1', '进度页说明文字退成小字（.prog-note 存在，#tpProg 内无 .tips）',
        '.prog-note' in html and 'progScope' not in html)

    # v18 今日字卡护栏：用户要求「点进学生先看今天的字卡，每个读一下，再去做练习」。
    # v24 起前面多了一屏「我的主页」（T-014 第 2 期），所以判的是 renderStuHome；
    # 仍然钉住「不许绕过认字环节直接开题」这件事。
    entbody = html.split('function enterStudent')[1].split('function leaveStudent')[0] \
        if 'function enterStudent' in html else ''
    rec('G1', '点学生先出我的主页（enterStudent 体内调 renderStuHome，不直接 startQuiz）',
        'renderStuHome(' in entbody and 'startQuiz(' not in entbody,
        '' if entbody else '找不到 enterStudent')
    tcbody = html.split('function todayChars')[1].split('function preReadN')[0] \
        if 'function todayChars' in html else ''
    # v19 改了字单来源：v18 是「按建议顺序取 N 个」，v19 起读状态机维护的在学名单。
    # 按项目约定，改设计就改判新结构，项数不减。
    rec('G1', '今日字单来自在学名单（todayChars 体内有 stuActive）',
        'stuActive(' in tcbody, '' if tcbody else '找不到 todayChars')
    sybody = html.split('function syncActive')[1].split('function stuActive')[0] \
        if 'function syncActive' in html else ''
    rec('G1', '在学补位按档案建议顺序（syncActive 体内有 stuProfile 的 focus）',
        'stuProfile(' in sybody and 'focus' in sybody,
        '' if sybody else '找不到 syncActive')
    rec('G1', '在学上限有钳制（stuCap 用 3–10 三个常量，不许写死）',
        all(k in html for k in ['STU_CAP_MIN', 'STU_CAP_MAX', 'STU_CAP_DEF'])
        and 'stuCap' in html)
    rec('G1', '掌握的字会自动退出在学（syncActive 体内判 levelOf 已掌握且看锁定）',
        "levelOf(r) === '已掌握'" in sybody and 'locks.indexOf' in sybody
        and 'lockList' in html, '' if sybody else '找不到 syncActive')
    rec('G1', '启动时迁移老数据（boot 里调 migrateCap，旧题量 20 会收到 10）',
        'migrateCap()' in html and 'LS_DATA_BAK_T009' in html)
    sqbody = html.split('function startQuiz')[1].split('function curQ')[0] \
        if 'function startQuiz' in html else ''
    rec('G1', '出题只从今日字单里抽（startQuiz 体内必须有 PRE.list）',
        'PRE.list' in sqbody, '' if sqbody else '找不到 startQuiz')
    psbody = html.split('function preSay')[1].split('function preStart')[0] \
        if 'function preSay' in html else ''
    rec('G1', '点字卡真播放且打勾（preSay 体内有 say( 与 PRE.read），且不写学习记录',
        'say(' in psbody and 'PRE.read' in psbody
        and 'getLog' not in psbody and 'saveSnap' not in psbody,
        '' if psbody else '找不到 preSay')
    rec('G1', '今日字卡结构齐全（.pre-wrap/.pre-card/.pre-char/#preGo 都在）',
        all(k in html for k in ['.pre-wrap', '.pre-card', '.pre-char', 'id="preGo"']))
    rec('G1', '预习态藏起老师辅助，开题后放回（.is-pre 规则 + preMode 两处调用）',
        '.is-pre #btnHint' in html and 'preMode(true)' in html and 'preMode(false)' in html)

    # v24 我的主页（T-014 第 2 期）：用户原话「学生端应该有自己的界面，看到自己的进度…
    # 然后才是按钮开启今日学习」。钉的是「先看清再开练」这条顺序，以及几个数字的口径。
    hmbody = html.split('function renderStuHome')[1].split('function homeGo')[0] \
        if 'function renderStuHome' in html else ''
    rec('G1', '我的主页用掌握率圆环 + 今日字（renderStuHome 体内有 ringHTML( 与 todayChars(）',
        'ringHTML(' in hmbody and 'todayChars(' in hmbody and 'stuProfile(' in hmbody,
        '' if hmbody else '找不到 renderStuHome')
    hgbody = html.split('function homeGo')[1].split('function preFootRefresh')[0] \
        if 'function homeGo' in html else ''
    rec('G1', '主页大按钮进字卡不走捷径（homeGo 体内调 renderPreStudy，不直接 startQuiz）',
        'renderPreStudy(' in hgbody and 'startQuiz(' not in hgbody,
        '' if hgbody else '找不到 homeGo')
    stbody = html.split('function streakOf')[1].split('function starsOf')[0] \
        if 'function streakOf' in html else ''
    rec('G1', '连续天数从练习记录算，且按本地日取整（streakOf 读 STATE.logs + dayKey(）',
        'STATE.logs' in stbody and 'Date.parse' in stbody and 'dayKey(' in stbody,
        '' if stbody else '找不到 streakOf')
    ssbody = html.split('function starsOf')[1].split('function homeFootRefresh')[0] \
        if 'function starsOf' in html else ''
    rec('G1', '星星按掌握率分档（starsOf 按 /20 折算，字表只有十几个字也够得着）',
        '/ 20' in ssbody and 'Math.min(5' in ssbody,
        '' if ssbody else '找不到 starsOf')
    rec('G1', '主页面结构齐全（.home-wrap/.home-hero/.home-chips/#homeGo/星星）',
        all(k in html for k in ['.home-wrap', '.home-hero', '.home-chips',
                                'id="homeGo"', '.home-star']))
    rec('G1', '字卡能退回主页（#preBack 在，且点击绑定 renderStuHome）',
        'id="preBack"' in html and "closest('#preBack')" in html
        and 'pbk){ renderStuHome();' in html)

    # v22 答错可重试（T-014 第 1 期）：用户原话「点错了就没办法再试，而是要点下一题」。
    # 钉四件事：点错不判死、一题最多记 1 次错、只灰一个不锁整题、错误音不再比正确音轻。
    pobody = html.split('function pickOption')[1].split('function gradeAnswer')[0] \
        if 'function pickOption' in html else ''
    rec('G1', '点错不判死（pickOption 转给 missOption，不回退到 gradeAnswer(false)）',
        'missOption(ch)' in pobody and 'gradeAnswer(ch === q.target.w)' not in pobody,
        '' if pobody else '找不到 pickOption')
    mobody = html.split('function missOption')[1].split('function gradeAnswer')[0] \
        if 'function missOption' in html else ''
    rec('G1', '一题最多记 1 次错（missOption 用 wrongLogged 挡住重复记账）',
        'wrongLogged' in mobody and 'r.wrong++' in mobody,
        '' if mobody else '找不到 missOption')
    _misscss = html.split('.opt.miss')[1][:260] if '.opt.miss' in html else ''
    rec('G1', '点错只灰一个、题目不结束（.opt.miss 不可点，missOption 不许置 answered）',
        'pointer-events:none' in _misscss and 'STATE.quiz.answered = true' not in mobody,
        '' if _misscss else '找不到 .opt.miss 样式')
    sfbody = html.split('function sfxNo')[1].split('function sfxStreak')[0] \
        if 'function sfxNo' in html else ''
    _vols = [float(x) for x in re.findall(
        r"synthTone\(ctx,\s*[\d.]+,\s*[^,]+,\s*[\d.]+,\s*(0\.\d+)", sfbody)]
    # v23 起错误音的主干改用 synthBuzz（双路差频方波打拍）。规则跟着设计改：
    # 两种发声器都要数，否则只数 synthTone 会把真正发声的那两层漏掉（v23 就被这儿挡住过一次）。
    # synthBuzz 的签名是 (ctx, freq, at, dur, vol, beatHz, bendTo)，vol 仍在第 5 位。
    _vols += [float(x) for x in re.findall(
        r"synthBuzz\(ctx,\s*[\d.]+,\s*[^,]+,\s*[\d.]+,\s*(0\.\d+)", sfbody)]
    rec('G1', '错误音不比正确音轻（三层以上且每层 vol ≥ 0.26）',
        len(_vols) >= 3 and min(_vols) >= 0.26,
        ('sfxNo 各层音量实测 %s' % _vols) if sfbody else '找不到 sfxNo')
    # v23：错误音必须「扎」得出去。方波泛音一直排到高频，手机/平板外放才放得出来；
    # v22 用 triangle + 98 Hz「咚」，老师两次反馈「不明显」——低频那层在小喇叭上没有声压。
    _buzzbody = html.split('function synthBuzz')[1][:1400] \
        if 'function synthBuzz' in html else ''
    rec('G1', '错误音用方波打拍（synthBuzz 里有 square + 两路差频，别退回圆润的 triangle）',
        "'square'" in _buzzbody and 'freq + (beatHz' in _buzzbody and 'synthBuzz(ctx' in sfbody,
        '' if _buzzbody else '找不到 synthBuzz')

    # 语音「三处同步」（2026-10-30 加）：老师原话「最近改的很多都没有语音…你是单字组合的很奇怪」。
    # 新题面只写进了 p5.js，没进 gen_doubao_voice.py 的 SENTS、也没进 p8.js 的 SENT_FULL，
    # 于是 sayParts 退回逐字拼（听 / 一 / 听 / 写 / 下 / 来），而「照」「遍」两个字
    # 根本不在字库里 —— 那两句在教室里干脆是没声音的。
    # 这里把三份清单对齐：SENTS ↔ SENT_FULL ↔ p_voice.json，任一处漏了就红。
    import json as _json
    _sent_src = (BUILD / 'gen_doubao_voice.py').read_text(encoding='utf-8')
    _sent_py = re.findall(r"\('([a-z_]+)', '([^']+)'\)", _sent_src)
    _smap = re.findall(r"'([^']+)': '([a-z_]+)'", html.split('var SENT_FULL = {')[1]
                       .split('};')[0]) if 'var SENT_FULL = {' in html else []
    _sf = dict(_smap)                       # 文案 -> 键
    # SENT_FULL 里的写法不一定带句号（'做得不错，继续加油'），运行时靠 SENT_BARE 去掉标点再对，
    # 所以这里也按同一口径比，别拿标点差异报假红。
    _bare = lambda s: re.sub(r'[。！？，,]', '', s)
    _sfb = {_bare(k): v for k, v in _sf.items()}
    _voice = _json.loads((BUILD / 'p_voice.json').read_text(encoding='utf-8'))
    _no_clip = [k for k, _t in _sent_py if k not in _voice]
    rec('G1', 'SENTS 每句都真录过（%d 句 ↔ p_voice.json）' % len(_sent_py), not _no_clip,
        ('没录的键：' + ', '.join(_no_clip[:6])) if _no_clip else '')
    _no_map = [(k, t) for k, t in _sent_py if _sfb.get(_bare(t)) != k]
    rec('G1', 'SENTS 每句都登记进 SENT_FULL（文案→键，漏了就会退化成逐字念）',
        not _no_map, ('没登记的：%s' % '; '.join('%s=%s' % x for x in _no_map[:4]))
        if _no_map else '')
    _bad_key = [k for k in _sf.values() if k not in _voice]
    rec('G1', 'SENT_FULL 指向的键都在语音包里（别指到不存在的音频）',
        not _bad_key, ('幽灵键：' + ', '.join(sorted(set(_bad_key))[:6])) if _bad_key else '')
    # 代码里写死的题面句（{ t: '…' }）必须都是整句录音，不许靠字块拼
    _asks = set(re.findall(r"\{ t: '([^']*[\u4e00-\u9fff][^']*)'", html))
    _no_ask = sorted(a for a in _asks if a not in _sf)
    rec('G1', '题面句都录过整句（%d 句，%s）' % (len(_asks), '全部命中' if not _no_ask else '有漏'),
        not _no_ask, ('没录的题面：' + ' / '.join(_no_ask[:5])) if _no_ask else '')

    # v26 题型进度与结算页（T-021）：用户原话「完成一个练习后应该给一个选项比较明显一点的
    # 让学生进入下一个题型」「总的上面也应该有一个进度条…让学生理解还有几个题型没完成」。
    # 后来又补一刀：「学生等下在那一直点做的不错怎么办，这两个都没有区分开来」——
    # 鼓励语和主按钮长得一模一样（都有底色+描边），孩子会一直戳那句表扬。
    # 所以这里钉两件事：进度可见、鼓励语不许再长成按钮。
    rec('G1', '顶部有题型进度（#typeProg + .tp-dot 圆点 + renderTypeProg）',
        all(k in html for k in ['id="typeProg"', '.tp-dot', 'function renderTypeProg'])
        and 'renderTypeProg()' in html)
    rec('G1', '结算页给「下一个题型」入口（#btnNextType + sessNext(）',
        'id="btnNextType"' in html and 'sessNext(' in html and 'sessMark(' in html)
    rsbody = html.split('function renderSummary')[1].split('function renderProgress')[0] \
        if 'function renderSummary' in html else ''
    rec('G1', '结算页鼓励语不当按钮（用 .fb-say，不用带底色描边的 .feedback）',
        'class="fb-say"' in rsbody and 'class="feedback' not in rsbody,
        '' if rsbody else '找不到 renderSummary')
    _sayss = html.split('.fb-say')[1].split('}')[0] if '.fb-say' in html else ''
    rec('G1', '.fb-say 是纯文字（没有 background / border，别又做成胶囊）',
        bool(_sayss) and 'background' not in _sayss and 'border' not in _sayss,
        ('样式实测 ' + _sayss.replace('\n', ' ')[:120]) if _sayss else '找不到 .fb-say 样式')
    # 同优先级单类选择器，后写者胜：.next-type 必须写在 .primary 后面，
    # 否则实心大按钮会被 .primary 的浅底小字按键压回去（v26 第一版就这么翻车）。
    _ord_p = html.find('.primary{border')
    _ord_n = html.find('.next-type{')
    rec('G1', '.next-type 写在 .primary 之后（否则实心按钮被浅底按钮盖掉）',
        _ord_p >= 0 and _ord_n > _ord_p, '下标 %d vs %d' % (_ord_p, _ord_n))

    # v27 笔顺与描写（T-023）：用户原话「在最开始的全班都可以学习的地方应该增加一个描写，
    # 就像练习那样的。而且应该有笔顺才对。笔顺是用灰色底图汉字上的动画变红色来先呈现怎么写，
    # 再让学生描写」。这里钉六件事：数据在、坐标没翻错、三层画法没被简化、逐笔推进、播完淡回灰、入口在。
    rec('G1', '笔顺数据与查表函数在（STROKE_PACK / soHas / soParse）',
        all(k in html for k in ['STROKE_PACK', 'function soHas', 'function soParse']))
    # y 轴：hanzi-writer 的数据 y 朝上、canvas y 朝下。写成 900 − y 才正。
    # 踩过：第一版按 y 直接画，截「上」时长横跑到最上面，整个字上下颠倒。
    # jsdom 没有 canvas，测试测不出来，只能靠这条静态护栏钉住公式。
    ftbody = html.split('function soFit')[1].split('function openTrace')[0] \
        if 'function soFit' in html else ''
    rec('G1', '笔顺坐标系把 y 翻过来（soFit 体内 -dpr * h / 1024 与 SO_BASE 平移）',
        '-dpr * h / 1024' in ftbody and 'SO_BASE' in ftbody,
        '' if ftbody else '找不到 soFit')
    # 三层画法：灰底整字 → 已写完的填红 → 当前笔裁剪到自己轮廓再画粗线。
    # 少了第三层的裁剪，红色会糊到相邻笔画上（「大」的撇捺直接连成一片）。
    ptbody = html.split('function soPaint')[1].split('function soFit')[0] \
        if 'function soPaint' in html else ''
    rec('G1', '三层画法没被简化（soPaint 体内有灰底 / 填红 / clip 当前笔）',
        'SO_GRAY' in ptbody and 'SO_RED' in ptbody and 'ctx.clip(paths[lit])' in ptbody
        and 'lineWidth = 300' in ptbody,
        '' if ptbody else '找不到 soPaint')
    tkbody = html.split('function soTick')[1].split('function soStop')[0] \
        if 'function soTick' in html else ''
    rec('G1', '笔顺是逐笔长出来的（soTick 每帧画 s.lit / s.frac，不是整字闪烁）',
        'soPaint(ctx, SO.ch, s.lit, s.frac)' in tkbody,
        '' if tkbody else '找不到 soTick')
    # 播完留一帧整字红，再淡回灰底——提示语写的是「照着灰字描一遍」，
    # 底字要是红的就自相矛盾，孩子也无从下笔。
    rec('G1', '播完淡回灰底再让孩子描（soTick 收尾有 SO_HOLD_MS 与重画灰字）',
        'SO_HOLD_MS' in tkbody and 'soPaint(c2, SO.ch, 0, 0)' in tkbody
        and 'gen !== SO_GEN' in tkbody,
        '' if tkbody else '找不到 soTick')
    rec('G1', '学字卡上有描写入口（#sheetTrace / #traceMask / soWire 已绑）',
        all(k in html for k in ['id="sheetTrace"', 'id="traceMask"', 'id="soBase"',
                                'id="soInk"', 'function soWire'])
        and 'soWire();' in html)
    # 描写页没有学生档案、也没有手写识别，所以不能判分、不能写学习记录。
    # 一旦有人「顺手」加个 gradeAnswer / saveSnap，进度就会出现凭空的「已掌握」。
    tdbody = html.split('function traceDoneTap')[1].split('function traceAgainTap')[0] \
        if 'function traceDoneTap' in html else ''
    rec('G1', '描写不判分、不写学习记录（traceDoneTap 体内无 gradeAnswer / logs / saveSnap）',
        bool(tdbody) and 'gradeAnswer' not in tdbody and 'saveSnap' not in tdbody
        and 'getLog' not in tdbody, '' if tdbody else '找不到 traceDoneTap')
    # 听写拆成两个（v27）：汉字听写只听单字、词语听写听整词。
    # 老师原话「上次让你增加了汉字听写，但是你是词语听写，我建议可以分开来」。
    rec('G1', '听写分成单字 / 词语两个题型（writesWord 只认词语听写，renderStage 走 isDictation）',
        "function writesWord(t){ return t === '词语听写'; }" in html
        and 'function isDictation' in html and 'isDictation(type)' in html)
    bwbody = html.split('function buildWriteQuestions')[1].split('function wgSize')[0] \
        if 'function buildWriteQuestions' in html else ''
    rec('G1', '词语听写先筛出真有词的字（buildWriteQuestions 体内 writeWordOf 且长度 2~4）',
        'writeWordOf' in bwbody and 'w.length >= 2' in bwbody,
        '' if bwbody else '找不到 buildWriteQuestions')
    rec('G1', '老学生的题型会自动补上词语听写（migrateTypes + T023 备份 + boot 里调用）',
        'function migrateTypes' in html and 'LS_DATA_BAK_T023' in html
        and 'migrateTypes();' in html)

    # v28 学字卡瘦身 + 笔顺放慢。老师 2026-10-30 三条反馈：
    # 「不需要什么只看拼音和再听一遍这些词语，你直接在这个字旁边放一个喇叭的标志就好了」
    # 「这个描写的位置很奇怪，这么大个框横在这也不是很好看」
    # 「描写我点进去看了下，速度太快了，学生无法反应」
    rec('G1', '字卡上听只剩一个喇叭（不再有「听一听 / 只看拼音」两个大按钮）',
        'id="sheetSpeak"' in html and 'class="sheet-spk"' in html
        and 'id="sheetRead"' not in html and 'sheet-actions' not in html)
    # 描写入口从「占满整行的绿框」改成「汉字本身就是入口」：字有 86px，
    # 是这张卡上最大的点击目标，特需孩子不用瞄准。别再塞回一条横框。
    rec('G1', '汉字本身就是描写入口（点字进描写，不再有占满整行的 .sheet-wbtn）',
        "$('sheetChar').addEventListener('click'" in html
        and 'openTrace(CARD_CH)' in html and 'sheet-wbtn' not in html)
    # 节奏：v27 是一笔 300ms、笔间 0 停顿（SO_GAP_MS 声明了却没接进 seq），
    # 6 笔字 1.8 秒播完，老师反馈「学生无法反应」。这条钉住下限，别又被调回去。
    plbody = html.split('function soPlay')[1].split('function soTick')[0] \
        if 'function soPlay' in html else ''
    def _so_ms(name):
        m = re.search(r'var %s = (\d+)' % name, html)
        return int(m.group(1)) if m else 0
    _s, _g, _st = _so_ms('SO_STROKE_MS'), _so_ms('SO_GAP_MS'), _so_ms('SO_START_MS')
    rec('G1', '笔顺节奏够慢（一笔 ≥500ms、笔间 ≥200ms、起手 ≥400ms，且每笔后真插了 gap 帧）',
        _s >= 500 and _g >= 200 and _st >= 400 and 'wait: SO_GAP_MS' in plbody,
        '一笔 %dms / 停 %dms / 起手 %dms' % (_s, _g, _st) if plbody else '找不到 soPlay')
    rec('G1', '笔顺先停一下再动笔（soPlay 用 SO_START_MS 起手，不是立刻开画）',
        'setTimeout(soTick, SO_START_MS)' in plbody, '' if plbody else '找不到 soPlay')

    # 文档纪律（2026-10-23 加）：用户问「每次对话要做好 md 记录是不是忘了」，
    # 盘出来的是文档数字漂移——角标停在 v17、语音停在 1690/17 句、backlog 引用不存在的 T-009。
    # 这类问题不影响功能，但会让下一次开工读到错前提，所以让它进门禁。
    _d = subprocess.run([sys.executable, str(BUILD / 'check_docs.py')],
                        capture_output=True, text=True, encoding='utf-8', errors='replace')
    _bad = [l.strip() for l in (_d.stdout or '').splitlines() if l.strip().startswith('BAD')]
    rec('G1', '文档与真值一致（版本号/角标/语音条数/测试数/任务卡引用）',
        _d.returncode == 0, ('; '.join(_bad))[:170])

    _b = subprocess.run([sys.executable, str(BUILD / 'check_buttons.py')],
                        capture_output=True, text=True, encoding='utf-8', errors='replace')
    rec('G1', '按钮体检：没有点不动的孤儿控件，也没有绑了不存在的幽灵',
        _b.returncode == 0, (('; '.join(
            l.strip() for l in (_b.stdout or '').splitlines()
            if l.strip().startswith('- ')))[:170]))

    return (not lacks and not ext and not miss and not tmiss and not pmiss
            and not wmiss)


# ---------------------------------------------------------------- G2 测试
def run_one(t):
    script = BUILD / t['script']
    if not script.exists():
        return {'ok': False, 'pass': 0, 'fail': 1, 'out': '脚本缺失'}
    env = dict(os.environ)
    env['NODE_PATH'] = NODE_PATH
    t0 = time.time()
    proc = subprocess.run([NODE, script.name] + t['args'], cwd=str(BUILD),
                          capture_output=True, env=env, timeout=600)
    out = (proc.stdout or b'').decode('utf-8', 'replace')
    err = (proc.stderr or b'').decode('utf-8', 'replace')
    npass = len(re.findall(r'^\s*PASS\b', out, re.M))
    nfail = len(re.findall(r'^\s*FAIL\b', out, re.M))
    if proc.returncode != 0 and nfail == 0:
        nfail = 1
    return {'ok': nfail == 0 and proc.returncode == 0, 'pass': npass, 'fail': nfail,
            'sec': time.time() - t0, 'out': out[-1500:] + (('\n[stderr]\n' + err[-800:]) if err.strip() else '')}


def gate_tests():
    print('\n=== G2 自动测试 ===')
    rows = []
    all_ok = True
    for t in MANIFEST['tests']:
        r = run_one(t)
        rows.append({'name': t['name'], **r, 'min': t['min_cases']})
        need = t['min_cases']
        ok = r['ok'] and r['pass'] >= need
        all_ok = all_ok and ok
        rec('G2', '%-11s %d 通过 / %d 失败（要求 >= %d 项、0 失败）'
            % (t['name'], r['pass'], r['fail'], need),
            ok, '' if ok else (r['out'][-400:] if r['pass'] < need else '失败'))
    total_pass = sum(r['pass'] for r in rows)
    total_need = sum(t['min_cases'] for t in MANIFEST['tests'])
    rec('G2', '合计 %d 项（基线 %d）' % (total_pass, total_need), total_pass >= total_need)
    return all_ok, rows


# ---------------------------------------------------------------- G3 报告
def write_report(html_size, counts, test_rows, elapsed, quick):
    REPORTS.mkdir(parents=True, exist_ok=True)
    ts = datetime.now()
    p = REPORTS / ('gate-%s.md' % ts.strftime('%Y%m%d-%H%M'))
    bad = [r for r in results if not r['ok']]
    lines = []
    lines.append('# 门禁报告 %s\n' % ts.strftime('%Y-%m-%d %H:%M'))
    lines.append('**结论：%s**　耗时 %.1f s　（%d 项检查，%d 红）\n'
                 % ('全绿 ✅' if not bad else '有红 ❌', elapsed, len(results), len(bad)))
    lines.append('| 关口 | 检查项 | 结果 | 说明 |')
    lines.append('|---|---|---|---|')
    for r in results:
        lines.append('| %s | %s | %s | %s |' % (r['gate'], r['name'],
                                                'PASS' if r['ok'] else '**FAIL**',
                                                r['detail'].replace('\n', ' ')[:160]))
    if counts:
        lines.append('\n## 资产实测\n')
        lines.append('| 资源 | 数量 |')
        lines.append('|---|---|')
        for k, v in counts.items():
            lines.append('| %s | %d |' % (k, v))
    if test_rows:
        lines.append('\n## 测试明细\n')
        lines.append('| 脚本 | 通过 | 失败 | 耗时 | 基线 |')
        lines.append('|---|---|---|---|---|')
        for r in test_rows:
            lines.append('| %s | %d | %d | %.1f s | %d |'
                         % (r['name'], r['pass'], r['fail'], r.get('sec', 0), r['min']))
    if html_size:
        lines.append('\n产物：`%s`　%.2f MB（%d B）\n'
                     % (MANIFEST['product'], html_size / 1e6, html_size))
    if bad:
        lines.append('\n## 失败详情\n')
        for r in bad:
            lines.append('### %s · %s\n\n```\n%s\n```\n' % (r['gate'], r['name'], r['detail'][:1200]))
    lines.append('\n---\n由 `harness/run_gate.py` 自动生成。')
    io.open(p, 'w', encoding='utf-8').write('\n'.join(lines))
    return p


# ---------------------------------------------------------------- main
def main():
    quick = '--quick' in sys.argv
    do_build = '--no-build' not in sys.argv
    t0 = time.time()
    print('生活语文练习台 · 门禁')

    html = gate_build(do_build)
    if html is None:
        print('\n构建失败，门禁中止。')
        write_report(0, None, None, time.time() - t0, quick)
        return 1

    gate_static(html)
    counts = asset_counts()
    test_rows = None
    if not quick:
        _, test_rows = gate_tests()
    else:
        print('\n=== G2 自动测试：已跳过（--quick）===')
        rec('G2', '跳过测试（--quick）', True, '仅构建与静态检查')

    size = (ROOT / MANIFEST['product']).stat().st_size
    p = write_report(size, counts, test_rows, time.time() - t0, quick)
    bad = [r for r in results if not r['ok']]
    print('\n' + '-' * 60)
    print('结论：%s　%d 项检查，%d 红　耗时 %.1f s'
          % ('全绿' if not bad else '有红', len(results), len(bad), time.time() - t0))
    print('报告：%s' % p)
    return 0 if not bad else 1


if __name__ == '__main__':
    sys.exit(main())
