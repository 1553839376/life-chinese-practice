# -*- coding: utf-8 -*-
"""用豆包语音合成 2.0（火山引擎）全量重生成 1691 条语音，输出无损 WAV。

为什么换成豆包（2026-10-24 用户决定）：
  edge-tts 晓晓「大部分还可以」，但（a）三声（耳 ěr / 雨 yǔ）读得模糊，
  （b）读单字偏快（江、京），（c）当年打包压到 24 kbps MP3 发闷。
  用户听豆包 App 觉得"每个音调都读得准确"，故改用它。

关键参数：
  VOICE  zh_female_zhixingnv_uranus_bigtts  知性女声——用户从 6 个通用音色里选定
         （明确不要儿童绘本/少儿故事那类带情感的）
  SPEED  0.85  用户 2026-10-24 定：知性女声原速的实际发音比 Vivi 短 8%~25%，
               放慢到 0.85 才够从容（0.90 是"一丢丢"，0.85 再稳一点）
  ENCODING wav  这一步只要无损母版（原生 24 kHz 单声道 s16le）。
                注意：ogg_opus 输出是 48 kHz 上采样的 267 kbps，属于虚高，
                二次压缩反而掉细节；所以这里拿 WAV，由 pack_doubao_voice.py
                一次性编码成成品格式。

断点续传：目标 WAV 存在且 > 2000 字节即跳过，中断后重跑即可。
鉴权：DOUBAO_APPID + DOUBAO_TOKEN 环境变量（不进仓库、不进日志）。
"""
import json
import os
import re
import sys
import time
import uuid
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '_tts', 'doubao')
os.makedirs(OUT, exist_ok=True)

APPID = os.environ.get('DOUBAO_APPID', '').strip()
TOKEN = os.environ.get('DOUBAO_TOKEN', '').strip()
VOICE = os.environ.get('DOUBAO_VOICE', 'zh_female_zhixingnv_uranus_bigtts')
SPEED = float(os.environ.get('DOUBAO_SPEED', '0.85'))
ENCODING = 'wav'
CLUSTER = os.environ.get('DOUBAO_CLUSTER', 'volcano_tts')
CONC = int(os.environ.get('DOUBAO_CONC', '4'))

SENTS = [
    ('q_find', '找出这个字。'),
    ('q_same', '找出一样的字。'),
    ('q_pinyin', '看拼音。找出这个字。'),
    ('q_pic', '看看图。这是什么。找出它的名字。'),
    ('q_picw', '看看红色的那个字。找出它。'),
    ('q_word', '找出下面的词语。'),
    # v27：两个手写题型的题面原来是逐字拼的（听 一 听 写 下 来），
    # 「照」「遍」两个字根本不在字库里，那两句就是无声的——必须整句合成。
    ('q_dict', '听一听，写下来。'),
    ('q_trace', '照着描一遍。'),
    ('g_bubble', '把这个字戳掉。'),
    ('g_fish', '把这个字钓上来。'),
    ('g_fruit', '把这个字摘下来。'),
    ('g_feed', '小动物要吃这个字，喂给它。'),
    ('fb_win', '太棒了！'),
    ('fb_mid', '做得不错，继续加油。'),
    ('fb_low', '再来一次会更好。'),
    ('fb_again', '再试一试。'),
    ('fb_right', '答对了！'),
    ('fb_write', '写好了！'),
    ('sess_all', '今天的练习全部完成。'),
    ('av_on', '朗读打开了。'),
    ('av_off', '朗读关掉了。'),
    ('g_start', '准备好啦，开始吧。'),
]


# 接口偶发怪癖的覆盖表（键 -> 实际送合成引擎的文本）。
# 2026-10-24 全量时发现：「到了」单独合成会被拉长到 3.2 s（正常应 ~0.55 s），
# 加一个空格后恢复正常。键不变，只是换个写法喂进去。
# 教训：豆包接口**偶发返回垃圾音频**（同参数重请求就正常），所以每批生成完
#       必须跑 VERIFY=1 的时长自检，不能默认「0 失败 = 全对」。
TEXT_OVERRIDE = {
    'w52304e86': '到 了',
}


def text_for(key, text):
    return TEXT_OVERRIDE.get(key, text)


def build_tasks():
    """与 gen_tts.py 完全同源的键规则：单字 u%04x、整词 w+每字%04x、指令句原名。"""
    chars = json.load(open(os.path.join(HERE, '_tts_chars.json'), encoding='utf-8'))
    extra = json.load(open(os.path.join(HERE, '_tts_extra.json'), encoding='utf-8'))
    words = json.load(open(os.path.join(HERE, '_tts_words.json'), encoding='utf-8'))
    tasks = list(SENTS)
    for ch in chars + extra:
        tasks.append(('u%04x' % ord(ch), ch))
    for wd in words:
        tasks.append(('w' + ''.join('%04x' % ord(c) for c in wd), wd))
    return tasks


def tts_once(text, retries=4):
    url = 'https://openspeech.bytedance.com/api/v1/tts'
    payload = {
        'app': {'appid': APPID, 'token': TOKEN, 'cluster': CLUSTER},
        'user': {'uid': 'lifechinese'},
        'audio': {
            'voice_type': VOICE,
            'encoding': ENCODING,
            'speed_ratio': SPEED,
            'volume_ratio': 1.0,
            'pitch_ratio': 1.0,
        },
        'request': {
            'reqid': str(uuid.uuid4()),
            'text': text,
            'text_type': 'plain',
            'operation': 'query',
            'with_frontend': 1,
        },
    }
    headers = {'Authorization': 'Bearer;%s' % TOKEN, 'Content-Type': 'application/json'}
    data = json.dumps(payload).encode('utf-8')
    last = None
    for i in range(retries):
        try:
            req = urllib.request.Request(url, data=data, headers=headers, method='POST')
            with urllib.request.urlopen(req, timeout=40) as r:
                raw = r.read()
            if raw[:4] == b'RIFF':
                return raw
            try:
                j = json.loads(raw.decode('utf-8'))
                code = j.get('code')
                if code == 3000 and isinstance(j.get('data'), str):
                    import base64
                    b = base64.b64decode(j['data'])
                    if b[:4] == b'RIFF':
                        return b
                last = 'code=%s msg=%s' % (code, j.get('message'))
            except Exception:
                last = 'unexpected %d bytes: %r' % (len(raw), raw[:100])
        except urllib.error.HTTPError as e:
            last = 'HTTP %s %r' % (e.code, e.read()[:200])
        except Exception as e:
            last = '%s: %s' % (type(e).__name__, e)
        time.sleep(1.0 * (i + 1))
    raise RuntimeError(last)


def job(item):
    key, text = item
    fp = os.path.join(OUT, key + '.wav')
    if os.path.exists(fp) and os.path.getsize(fp) > 2000:
        return ('skip', key, os.path.getsize(fp))
    try:
        raw = tts_once(text_for(key, text))
        with open(fp, 'wb') as f:
            f.write(raw)
        return ('ok', key, len(raw))
    except Exception as e:
        return ('err', key, str(e))


def speech_seconds(path):
    """有效发音时长（去掉首尾静音），用来抓「接口返回垃圾音频」。"""
    import wave

    import numpy as np
    w = wave.open(path, 'rb')
    n = w.getnframes()
    rate = w.getframerate()
    a = np.frombuffer(w.readframes(n), dtype='<i2').astype(np.float32) / 32768.0
    w.close()
    if len(a) == 0:
        return 0.0
    win = max(1, int(rate * 0.01))
    m = len(a) // win
    if m < 2:
        return 0.0
    r = np.sqrt((a[:m * win].reshape(m, win) ** 2).mean(axis=1))
    idx = np.where(r > max(r.max() * 0.02, 1e-4))[0]
    return (idx[-1] + 1 - idx[0]) * win / rate if len(idx) else 0.0


def verify(tasks):
    """按时长抓异常：正常语音每秒约 3 个音节，超出上限就是接口抽风。"""
    bad = []
    for key, text in tasks:
        fp = os.path.join(OUT, key + '.wav')
        if not os.path.exists(fp):
            continue
        d = speech_seconds(fp)
        n = len(re.sub(r'\s', '', text))
        if d > 0.75 * n + 0.55 or d < 0.12 * n:
            bad.append((key, text, d, n))
    print('时长自检：%d 条，异常 %d 条' % (len(tasks), len(bad)))
    for key, text, d, n in bad[:20]:
        print('  %-11s %-10s %.2fs（%d 字，正常约 %.2fs）'
              % (key, text, d, n, 0.34 * n))
    return bad


def main():
    only = os.environ.get('ONLY_KEYS', '').strip()
    tasks = build_tasks()
    if only:
        tasks = [t for t in tasks if t[0] in set(only.split(','))]

    # 自检不需要联网，放在鉴权检查之前
    if os.environ.get('VERIFY') == '1':
        return 0 if not verify(tasks) else 4

    if not (APPID and TOKEN):
        print('缺少鉴权：export DOUBAO_APPID=xxx DOUBAO_TOKEN=yyy', file=sys.stderr)
        return 1
    limit = int(os.environ.get('LIMIT', '0') or 0)
    if limit:
        tasks = tasks[:limit]

    print('音色 %s | speed %s | %d 条 | 并发 %d' % (VOICE, SPEED, len(tasks), CONC), flush=True)
    done = {'ok': 0, 'skip': 0}
    errs = []
    t0 = time.time()
    with ThreadPoolExecutor(max_workers=CONC) as ex:
        for n, (st, key, info) in enumerate(ex.map(job, tasks), 1):
            if st == 'err':
                errs.append((key, info))
            else:
                done[st] += 1
            if n % 100 == 0 or n == len(tasks):
                print('  %d/%d  ok=%d skip=%d err=%d  %.0fs'
                      % (n, len(tasks), done['ok'], done['skip'], len(errs),
                         time.time() - t0), flush=True)
    print('DONE 新生成 %d / 跳过 %d / 失败 %d' % (done['ok'], done['skip'], len(errs)))
    for k, e in errs[:10]:
        print('  ERR', k, e, file=sys.stderr)
    return 0 if not errs else 2


if __name__ == '__main__':
    sys.exit(main())
