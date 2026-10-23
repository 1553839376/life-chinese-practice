# -*- coding: utf-8 -*-
"""分页拉回字词库全量，核对导入结果"""
import subprocess, json, io, time
from collections import Counter

PY = r'C:/Users/xnxxPC2/.workbuddy/binaries/python/versions/3.13.12/python.exe'
SC = r'D:/职称参考/workbuddy/resources/app.asar.unpacked/resources/plugins/workbuddy-builtin/skills/library/database/query_database_record.py'
DB = 'xNa5qeVuLMCljcIzP5Ey5V'


def page(cursor=''):
    args = [PY, SC, '--database-id', DB, '--page-size', '200']
    if cursor:
        args += ['--start-cursor', cursor]
    for _ in range(4):
        p = subprocess.run(args, capture_output=True)
        out = p.stdout.decode('utf-8', 'replace').strip()
        if out.startswith('{'):
            try:
                return json.loads(out)
            except Exception:
                pass
        time.sleep(3)
    return {}


def main():
    rows, cursor = [], ''
    for i in range(10):
        d = page(cursor)
        rs = d.get('results', [])
        rows += rs
        if not d.get('has_more'):
            break
        cursor = d.get('next_cursor', '')
        if not cursor:
            break
        time.sleep(1)
    print('实际写入总数:', len(rows))
    g = Counter(r.get('分组', '（空）') for r in rows)
    print('分组数:', len(g))
    for k, v in sorted(g.items(), key=lambda x: -x[1]):
        print('  %-14s %d' % (k, v))
    no_word = [r for r in rows if not r.get('组词')]
    no_py = [r for r in rows if not r.get('拼音')]
    print('缺组词:', len(no_word), ' 缺拼音:', len(no_py))
    chars = [r.get('字词', '') for r in rows]
    print('唯一字:', len(set(chars)), ' 重复条目:', len(chars) - len(set(chars)))
    print('--- 抽样 ---')
    for i in (0, 1, 2, 300, 400, 699):
        if i < len(rows):
            r = rows[i]
            print('  %s %s | %s | %s' % (r.get('字词'), r.get('拼音'), r.get('组词'), r.get('分组')))
    io.open(r'C:/Users/xnxxPC2/WorkBuddy/2026-10-13-08-49-54/build/_verify_lib.json', 'w', encoding='utf-8').write(
        json.dumps(rows, ensure_ascii=False))


if __name__ == '__main__':
    main()
