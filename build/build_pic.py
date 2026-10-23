# -*- coding: utf-8 -*-
"""把 AI 生成的动物位图裁边、压缩，输出 art_img.json（字 -> dataURL）。"""
import io, json, os, base64, fitz

HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(HERE)
GEN = '../generated-images/'

MAP = {
    '马': GEN + '一匹马_全身侧面站立_长长的脖子和长脸_棕色鬃毛_尾巴自然下_2026-10-21T01-19-32.png',
    '牛': GEN + '一头黄牛_全身侧面站立_身体宽厚_头上有两只弯曲的角_口鼻宽_2026-10-21T01-19-55.png',
    '羊': GEN + '一只绵羊_全身侧面站立_蓬松卷曲的白色羊毛_深灰色的脸_耳朵_2026-10-21T01-20-11.png',
    '虎': GEN + '一只老虎_全身侧面站立_橙黄色毛皮上有黑色条纹_头部有圆形小_2026-10-21T01-20-26.png',
    '熊': GEN + '一只棕熊_全身侧面站立_体型粗壮_圆圆的耳朵_突出的口鼻_四_2026-10-21T01-20-45.png',
    '龙': GEN + '中国龙_全身侧面_金黄鳞片身体_鹿角_长须_四只鹰爪_火焰状_2026-10-21T00-19-20.png',
    '兔': GEN + '一只白兔_侧面坐姿_红眼睛_长耳朵_短尾巴_前爪收起_写实比_2026-10-21T01-21-19.png',
    '虫': GEN + '一条绿色毛毛虫_侧面_身体分节_头上有小触角_身体下方有很多_2026-10-21T01-21-34.png',
    '猫': GEN + '一只橘色小猫_全身侧面站立_尖尖的耳朵_长尾巴向上翘起_四条_2026-10-21T01-21-51.png',
    '鸭': GEN + '一只黄色鸭子_全身侧面站立_橙色的扁嘴_橙色的蹼足_身体丰满_2026-10-21T01-22-08.png',
    '狗': GEN + '一只棕色小狗_全身侧面站立_下垂的耳朵_向上翘起的短尾巴_四_2026-10-21T01-22-21.png',
    '鸡': GEN + '一只公鸡_全身侧面站立_白色羽毛_红色鸡冠和肉垂_橙色的爪__2026-10-21T01-22-39.png',
    '蜂': GEN + '一只蜜蜂_侧面_黄黑相间的条纹身体_两对透明翅膀_头上有触角_2026-10-21T01-22-54.png',
    '蛙': GEN + '一只绿色青蛙_侧面蹲坐_突出的圆眼睛_长长的后腿_蹼足_身上_2026-10-21T01-23-11.png',
    '鼠': GEN + '一只灰色老鼠_侧面站立_圆圆的耳朵_尖嘴长胡须_细长尾巴_四_2026-10-21T01-23-26.png',
    '蛇': GEN + '一条绿色的蛇_身体弯曲成S形趴在地上_身上有鳞片纹路_头抬起_2026-10-21T01-23-44.png',
    '猴': GEN + '一只可爱的小猴子_全身侧面坐姿_圆脸_浅色脸部皮肤_细长尾巴_2026-10-21T01-24-48.png',
    '猪': GEN + '一只粉红色的猪_全身侧面站立_大耳朵_扁平的鼻子_卷曲的小尾_2026-10-21T01-24-17.png',
    '鱼': GEN + '一条鱼_全身侧面_橙红色鳞片_背鳍胸鳍尾鳍完整_圆眼睛_张着_2026-10-21T01-31-10.png',
    '鸟': GEN + '一只小鸟_全身侧面站立在横枝上_灰蓝色羽毛_橙色的喙_翅膀收_2026-10-21T01-31-26.png',
    # 身体部位（写实一点更像人体器官，比手绘清楚）
    '手': GEN + '一只人的手掌_正面_五指自然张开_只有一只手掌_不含手臂_不_2026-10-21T01-46-16.png',
    '足': GEN + '一只人的脚_侧面视角_光脚_脚跟_脚背_五个脚趾结构清楚_只_2026-10-21T01-46-35.png',
    '耳': GEN + '一只人的耳朵_只有单独的耳朵侧视_不含脸_不含头部_耳朵的耳_2026-10-21T01-45-55.png',
    '牙': GEN + '一颗白色的牙齿_龋齿卡通造型加强版不要_只有单颗牙齿_牙冠和_2026-10-21T01-47-06.png',
    # 人物 / 动作（手绘怎么画都别扭，改成同一套插画）
    '走': GEN + '一个小孩全身侧面正在向前走路_一条腿在前一条腿在后迈开_手臂_2026-10-21T02-11-38.png',
    '跑': GEN + '一个小孩全身侧面正在向前跑步_身体前倾_后腿向后蹬起离地_前_2026-10-21T02-11-53.png',
    '跳': GEN + '一个小孩全身侧面正在向上跳跃_双腿屈膝离地_双臂向上举起_身_2026-10-21T02-12-13.png',
    '坐': GEN + '一个小孩全身侧面坐在一把简单的木椅子上_大腿平放_小腿自然垂_2026-10-21T02-12-31.png',
    '吃': GEN + '一只白色的碗里盛满白米饭_一双木质筷子斜插进米饭里夹起一小撮_2026-10-21T02-12-51.png',
    '听': GEN + '一个小孩全身侧面戴着大大的头戴式耳机在听音乐_一只手扶着耳机_2026-10-21T02-13-22.png',
    '唱': GEN + '一个小孩全身侧面手里握着一支麦克风在唱歌_嘴巴张开_头旁飘两_2026-10-21T02-13-47.png',
    '喝': GEN + '一个透明的圆形玻璃杯_杯里装着淡蓝色的水_杯里插着一根红白条_2026-10-21T02-23-37.png',
    '看': GEN + '一个小孩全身侧面坐着双手捧着一本打开的书在看_头低下看着书__2026-10-21T02-14-25.png',
    '睡': GEN + '一个小孩全身侧面躺在床上盖着被子睡觉_头枕在白枕头上_眼睛闭_2026-10-21T02-14-48.png',
    '写': GEN + '一个小孩侧身坐在书桌前用铅笔在本子上写字_另一只手压着本子__2026-10-21T02-15-12.png',
    '洗': GEN + '两只手掌在水龙头下面冲洗_银色水龙头向下流出水柱_手掌上有白_2026-10-21T02-15-34.png',
    '扫': GEN + '一个小孩全身侧面双手握着长柄扫帚在扫地_身体微微前倾_地上有_2026-10-21T02-15-54.png',
    '抱': GEN + '一个小孩全身侧面站着_双臂环抱一只完整的棕色泰迪熊玩偶_泰迪_2026-10-21T02-22-37.png',
    '拉': GEN + '一个小孩在画面左侧双手握着一根短的绷紧的绳子向后拉_身体向后_2026-10-21T02-26-12.png',
    '飞': GEN + '一架白色的客机在天上飞_机身侧面_机翼展开_后面有速度线和小_2026-10-21T02-17-00.png',
}

OUT = 240
PROBE = 400
MARGIN = 0.06


def bbox_of(path):
    doc = fitz.open(path)
    page = doc[0]
    ow, oh = page.rect.width, page.rect.height
    s = PROBE / max(ow, oh)
    pix = page.get_pixmap(matrix=fitz.Matrix(s, s), alpha=False)
    w, h, n = pix.width, pix.height, pix.n
    buf = pix.samples
    x0, y0, x1, y1 = w, h, 0, 0
    for y in range(0, h, 2):
        row = y * w * n
        for x in range(0, w, 2):
            i = row + x * n
            if buf[i] < 244 or buf[i + 1] < 244 or buf[i + 2] < 244:
                if x < x0: x0 = x
                if x > x1: x1 = x
                if y < y0: y0 = y
                if y > y1: y1 = y
    doc.close()
    if x1 <= x0 or y1 <= y0:
        return 0, 0, ow, oh
    k = ow / w
    return x0 * k, y0 * k, (x1 + 2) * k, (y1 + 2) * k


res = {}
total = 0
for ch, path in MAP.items():
    if not os.path.exists(path):
        print('缺失', ch, path)
        continue
    x0, y0, x1, y1 = bbox_of(path)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    side = max(x1 - x0, y1 - y0) * (1 + MARGIN * 2)
    clip = fitz.Rect(cx - side / 2, cy - side / 2, cx + side / 2, cy + side / 2)
    doc = fitz.open()
    page = doc.new_page(width=OUT, height=OUT)
    page.draw_rect(fitz.Rect(0, 0, OUT, OUT), color=None, fill=(1, 1, 1))
    src = fitz.open(path)
    srcpdf = fitz.open('pdf', src.convert_to_pdf())
    page.show_pdf_page(fitz.Rect(0, 0, OUT, OUT), srcpdf, 0, clip=clip)
    pix = page.get_pixmap(dpi=96, alpha=False)
    pix.save('_pic_tmp.jpg', jpg_quality=84)
    raw = io.open('_pic_tmp.jpg', 'rb').read()
    res[ch] = 'data:image/jpeg;base64,' + base64.b64encode(raw).decode()
    total += len(raw)
    print(ch, len(raw) // 1024, 'KB')
    srcpdf.close()
    src.close()
    doc.close()

io.open('art_img.json', 'w', encoding='utf-8').write(
    json.dumps(res, ensure_ascii=False, indent=0))
print('共', len(res), '张，原始总大小', total // 1024, 'KB；json', os.path.getsize('art_img.json') // 1024, 'KB')
