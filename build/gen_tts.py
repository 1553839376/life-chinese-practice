# -*- coding: utf-8 -*-
"""用 edge-tts 的神经语音批量生成读音与指令句。

产物：_tts/raw/{key}.mp3（原始 48kbps）
key 规则：
  - 单字：u4e2d（"中" 的 unicode 码位）
  - 固定句：句名，如 q_find
断点续传：已存在且大于 300 字节就跳过。
"""
import asyncio
import json
import os
import sys

import edge_tts

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, '_tts', os.environ.get('TTS_DIR', 'raw'))
VOICE = 'zh-CN-XiaoxiaoNeural'   # 晓晓：用户 2026-10-21 从四个候选里选定，勿随意更换
# 语速默认 -10%（接近自然、比标准略慢）。
# 曾经用过 -30%，用户反馈「太慢而且拖腔」，不要再用。
RATE = os.environ.get('TTS_RATE', '-10%')
CONC = 6

SENTS = [
    ('q_find', '找出这个字。'),
    ('q_same', '找出一样的字。'),
    ('q_pinyin', '看拼音。找出这个字。'),
    ('q_pic', '看看图。这是什么。找出它的名字。'),
    ('q_picw', '看看红色的那个字。找出它。'),
    ('q_word', '找出下面的词语。'),
    ('g_bubble', '把这个字戳掉。'),
    ('g_fish', '把这个字钓上来。'),
    ('g_fruit', '把这个字摘下来。'),
    ('g_feed', '小动物要吃这个字，喂给它。'),
    ('fb_win', '太棒了！'),
    ('fb_mid', '做得不错，继续加油。'),
    ('fb_low', '再来一次会更好。'),
    ('fb_again', '再试一试。'),
    ('fb_right', '答对了！'),
    ('av_on', '朗读打开了。'),
    ('av_off', '朗读关掉了。'),
    ('g_start', '准备好啦，开始吧。'),
]


async def one(sem, key, text, done):
    path = os.path.join(RAW, key + '.mp3')
    if os.path.exists(path) and os.path.getsize(path) > 300:
        done.append(key)
        return
    async with sem:
        for attempt in range(4):
            try:
                c = edge_tts.Communicate(text, VOICE, rate=RATE)
                await c.save(path)
                if os.path.getsize(path) > 300:
                    done.append(key)
                    return
            except Exception as e:
                await asyncio.sleep(0.8 + attempt * 1.2)
        fail.append((key, text))


fail = []


async def main():
    os.makedirs(RAW, exist_ok=True)
    chars = json.load(open(os.path.join(HERE, '_tts_chars.json'), encoding='utf-8'))
    extra = json.load(open(os.path.join(HERE, '_tts_extra.json'), encoding='utf-8'))
    tasks = [(k, t) for k, t in SENTS]
    for ch in chars + extra:
        tasks.append(('u%04x' % ord(ch), ch))
    # 整词录音：词语逐字拼出来会一字一顿，必须整词合成
    wpath = os.path.join(HERE, '_tts_words.json')
    if os.path.exists(wpath):
        words = json.load(open(wpath, encoding='utf-8'))
        for wd in words:
            key = 'w' + ''.join('%04x' % ord(ch) for ch in wd)
            tasks.append((key, wd))

    sem = asyncio.Semaphore(CONC)
    done = []
    step = 200
    for i in range(0, len(tasks), step):
        batch = tasks[i:i + step]
        await asyncio.gather(*[one(sem, k, t, done) for k, t in batch])
        print('progress %d/%d ok=%d fail=%d' % (
            min(i + step, len(tasks)), len(tasks), len(done), len(fail)), flush=True)

    if fail:
        print('RETRY FAILED:', len(fail), file=sys.stderr)
        for k, t in fail[:10]:
            print('  ', k, t, file=sys.stderr)
    print('DONE total=%d have=%d fail=%d' % (len(tasks), len(done), len(fail)), flush=True)


if __name__ == '__main__':
    asyncio.run(main())
