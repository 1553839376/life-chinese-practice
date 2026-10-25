# -*- coding: utf-8 -*-
"""上传页面产物：复用 library skill 的凭证与预签名 URL，但用 curl 发 PUT。

原因：urllib 在当前环境会被强制走代理隧道，上传大 body 到对象存储直接失败；
curl 走默认代理是通的（下载基线、拉素材都验证过）。
"""
import os
import subprocess
import sys
import time
from pathlib import Path

# 两个平台都要能跑：教室那台是 Windows，家里/开发机是 macOS
_CANDIDATES = [
    r'D:\职称参考\workbuddy\resources\app.asar.unpacked\resources\plugins\workbuddy-builtin\skills\library\page',
    '/Applications/WorkBuddy.app/Contents/Resources/app.asar.unpacked'
    '/resources/plugins/workbuddy-builtin/skills/library/page',
]
PAGE_DIR = next((p for p in _CANDIDATES if Path(p).is_dir()), '')
if not PAGE_DIR:
    print('ERROR 找不到 library/page 目录，先确认 WorkBuddy 安装位置')
    raise SystemExit(1)
sys.path.insert(0, PAGE_DIR)
import upload_page_artifact as up  # noqa: E402


def main():
    tx_id, rel, src = sys.argv[1], sys.argv[2], sys.argv[3]
    body = Path(src).read_bytes()
    print('本地大小 %d 字节' % len(body))

    data = None
    for attempt in range(6):
        try:
            data = up.unwrap_data(up.http_request(
                'POST', up.API_PATH,
                body={'transactionId': tx_id, 'path': rel},
                timeout=25.0,
            ))
            break
        except Exception as e:
            print('取凭证第 %d 次失败：%s' % (attempt + 1, e))
            data = None
            time.sleep(2 + attempt * 2)
    if not data:
        print('ERROR 没拿到上传凭证')
        return 1
    url = str(data.get('uploadUrl') or '').strip()
    if not url:
        print('ERROR 没拿到 uploadUrl')
        return 1
    print('已取得上传凭证，开始 PUT')

    r = subprocess.run(
        ['curl', '-sS', '-X', 'PUT', '--data-binary', '@' + src,
         '-H', 'Content-Type: text/html; charset=utf-8',
         url, '-o', os.devnull, '-w', 'HTTP %{http_code} 上传 %{size_upload} 字节'],
        capture_output=True, text=True,
    )
    print(r.stdout.strip() or r.stderr.strip())
    code = 0
    for tok in (r.stdout or '').split():
        if tok.startswith('HTTP'):
            continue
    if 'HTTP 2' not in (r.stdout or ''):
        print('ERROR 上传失败')
        return 1
    print('OK 上传完成')
    return 0


if __name__ == '__main__':
    sys.exit(main())
