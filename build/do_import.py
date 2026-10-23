# -*- coding: utf-8 -*-
"""分批把 _seed_new.json 写入字词库（每批 100 条，遇 TEMPORARY_ERROR 自动重试）"""
import subprocess, json, io, time, sys

PY = r'C:/Users/xnxxPC2/.workbuddy/binaries/python/versions/3.13.12/python.exe'
SC = r'D:/职称参考/workbuddy/resources/app.asar.unpacked/resources/plugins/workbuddy-builtin/skills/library/database/batch_add_database_records.py'
DB = 'xNa5qeVuLMCljcIzP5Ey5V'
BASE = r'C:/Users/xnxxPC2/WorkBuddy/2026-10-13-08-49-54/build/'


def run_batch(recs, label):
    payload = json.dumps({'database_id': DB, 'records': recs}, ensure_ascii=False)
    data = payload.encode('utf-8')
    last = ''
    for attempt in range(1, 5):
        p = subprocess.run([PY, SC, '--stdin'], input=data, capture_output=True)
        out = p.stdout.decode('utf-8', 'replace').strip()
        err = p.stderr.decode('utf-8', 'replace').strip()
        if not out and err:
            last = 'stderr: ' + err[:160]
        elif out.startswith('{'):
            try:
                d = json.loads(out)
            except Exception as e:
                last = 'json fail: ' + out[:120]
            else:
                if 'results' in d:
                    rs = d['results']
                    ok = sum(1 for r in rs if r.get('success'))
                    fail = [r for r in rs if not r.get('success')]
                    return ok, len(recs), fail[:2]
                msg = d.get('error', '')
                last = msg
                if 'TEMPORARY' not in msg and 'timeout' not in msg.lower():
                    return 0, len(recs), msg
        time.sleep(3 * attempt)
    return 0, len(recs), last


def main():
    recs = json.load(io.open(BASE + '_seed_new.json', encoding='utf-8'))
    total = len(recs)
    step = 100
    all_ok, all_fail = 0, []
    for i in range(0, total, step):
        chunk = recs[i:i + step]
        label = '%d-%d' % (i + 1, min(i + step, total))
        ok, n, fail = run_batch(chunk, label)
        all_ok += ok
        if ok < n:
            all_fail.append((label, n - ok, fail))
        print('批次 %-9s 成功 %d/%d %s' % (label, ok, n, '' if ok == n else ('失败: ' + str(fail)[:150])))
        sys.stdout.flush()
        time.sleep(2)
    print('=' * 40)
    print('合计成功 %d / %d' % (all_ok, total))
    if all_fail:
        print('失败批次:', all_fail)


if __name__ == '__main__':
    main()
