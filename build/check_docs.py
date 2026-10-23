# -*- coding: utf-8 -*-
"""文档一致性核对：文档里写的数字，必须和产物/代码里的真值一致。

起因（2026-10-23）：用户问「每次对话要做好 md 记录你是不是忘记了」，
盘出来四个问题——版本角标漏改、语音条数停在 v14 之前的 1690/17、
backlog 引用了不存在的 T-009、两件口头承诺没登记。
这些都不影响功能，但会让下一次开工读到错的前提，所以做成脚本卡住。

用法：python build/check_docs.py
退出码：0 全对 / 1 有偏差
"""
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(ROOT, 'docs')


def read(p):
    return io.open(p, encoding='utf-8').read()


def main():
    bad = []
    warn = []

    st = read(os.path.join(DOCS, 'STATE.md'))
    fn = read(os.path.join(DOCS, '00-功能清单.md'))
    log = read(os.path.join(DOCS, '03-变更日志.md'))
    readme = read(os.path.join(DOCS, 'README.md'))
    p4 = read(os.path.join(ROOT, 'build', 'p4.js'))

    # ---------- ① 版本号：代码 / STATE / 功能清单 / README 必须同一个 ----------
    m = re.search(r"var APP_VER = '(v\d+)'", p4)
    ver = m.group(1) if m else '(找不到)'
    v_state = re.search(r'\| 版本 \| \*\*(v\d+)\*\* \|', st)
    v_fn = re.search(r'\| 当前版本 \| \*\*(v\d+)\*\* \|', fn)
    v_rd = re.search(r'当前版本\*\*：(v\d+)', readme)
    for name, got in [('STATE.md', v_state), ('00-功能清单.md', v_fn), ('README.md', v_rd)]:
        if not got:
            bad.append('%s 里找不到版本号' % name)
        elif got.group(1) != ver:
            bad.append('%s 版本号 %s ≠ 代码 APP_VER %s' % (name, got.group(1), ver))

    # ---------- ② 版本角标文案：当前状态描述里写的必须是当前版本 ----------
    # 只查「一句话现状」和功能清单的功能表——版本表里的历史条目一律保留原文，
    # 那是当时的事实，改了反而把历史抹掉。
    head = st.split('## 一句话现状')[1].split('## 关键坐标')[0] \
        if '## 一句话现状' in st else ''
    for name, text in [('STATE.md 一句话现状', head), ('00-功能清单.md', fn)]:
        for mm in re.finditer(r'`(v\d+) · 内置词', text):
            if mm.group(1) != ver:
                bad.append('%s 里的角标文案还写着 %s · 内置词（应为 %s）'
                           % (name, mm.group(1), ver))

    # ---------- ③ 语音条数：p_voice.json 真值 vs 文档描述 ----------
    voice = json.load(io.open(os.path.join(ROOT, 'build', 'p_voice.json'), encoding='utf-8'))
    n_all = len(voice)
    n_han = sum(1 for k in voice if k.startswith('u'))
    n_word = sum(1 for k in voice if k.startswith('w'))
    n_sent = n_all - n_han - n_word
    for name, text in [('STATE.md', st), ('00-功能清单.md', fn)]:
        for mm in re.finditer(r'(\d{4})\s*条[（(]([^）)]*?)(\d+)\s*指令句', text):
            if int(mm.group(1)) != n_all:
                bad.append('%s 写语音 %s 条，真值 %d 条' % (name, mm.group(1), n_all))
            if int(mm.group(3)) != n_sent:
                bad.append('%s 写 %s 个指令句，真值 %d 个' % (name, mm.group(3), n_sent))
        for mm in re.finditer(r'p_voice\.json`?\(语音 (\d+)\)', text):
            if int(mm.group(1)) != n_all:
                bad.append('%s 的分片清单写语音 %s 条，真值 %d 条'
                           % (name, mm.group(1), n_all))

    # ---------- ④ 测试项数与产物大小 ----------
    gp = None
    repdir = os.path.join(ROOT, 'harness', 'reports')
    reps = sorted(os.listdir(repdir)) if os.path.isdir(repdir) else []
    if reps:
        gp = read(os.path.join(repdir, reps[-1]))
    if gp:
        total = re.search(r'合计 (\d+) 项', gp)
        size = re.search(r'产物：`build/生活语文练习台\.html`\s+[\d.]+ MB（(\d+) B）', gp)
        # 这两项「发布后才定」，开发过程中每构建一次就变一次，
        # 所以只提示不判红 —— 判红会把真正的漂移（版本号、任务卡）淹掉。
        if total:
            for name, text in [('STATE.md', st)]:
                mm = re.search(r'\| 测试 \| 5 套 / (\d+) 项', text)
                if mm and mm.group(1) != total.group(1):
                    warn.append('%s 写测试 %s 项，最新门禁 %s 项（发布时记得同步）'
                                % (name, mm.group(1), total.group(1)))
        if size:
            mm = re.search(r'— ([\d,]+) B ≈', st)
            if mm and mm.group(1).replace(',', '') != size.group(1):
                warn.append('STATE 写产物 %s B，最新门禁 %s B（发布时记得同步）'
                            % (mm.group(1), size.group(1)))
    else:
        warn.append('没找到门禁报告，跳过大小的核对')

    # ---------- ⑤ backlog 里引用的任务卡必须真的存在 ----------
    tdir = os.path.join(DOCS, 'tasks')
    cards = set()
    for f in os.listdir(tdir):
        mm = re.match(r'(T-\d{3})', f)
        if mm:
            cards.add(mm.group(1))
    for mm in re.finditer(r'(T-\d{3})', st):
        if mm.group(1) not in cards:
            bad.append('STATE 引用了不存在的任务卡 %s' % mm.group(1))

    # ---------- ⑥ 每个版本都要有变更日志条目 ----------
    versions = re.findall(r'^## \[(v\d+)\]', log, re.M)
    if ver not in versions:
        bad.append('03-变更日志.md 里没有 %s 的条目' % ver)

    # ---------- ⑦ 每天的工作日志 ----------
    ldir = os.path.join(DOCS, 'logs')
    logs = sorted(os.listdir(ldir)) if os.path.isdir(ldir) else []
    if not logs:
        bad.append('docs/logs/ 里一份日志都没有')

    # ---------- 输出 ----------
    print('=' * 58)
    print('文档一致性核对')
    print('=' * 58)
    print('代码 APP_VER : %s' % ver)
    print('语音真值     : %d 条（%d 单字 + %d 整词 + %d 指令句）'
          % (n_all, n_han, n_word, n_sent))
    print('任务卡       : %d 张 %s' % (len(cards), ' '.join(sorted(cards))))
    print('变更日志版本 : %d 条（最新 %s）' % (len(versions), versions[0] if versions else '无'))
    print('日志文件     : %s' % (' '.join(logs) if logs else '无'))
    print()
    for w in warn:
        print('  WARN ' + w)
    for b in bad:
        print('  BAD  ' + b)
    if not bad:
        print('  全部一致 ✅')
    print()
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
