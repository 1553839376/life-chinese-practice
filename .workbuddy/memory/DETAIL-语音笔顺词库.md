# 细化：语音与音效 / 笔顺描写 / 词库与拼词语

> 2026-11-04 从 `MEMORY.md` 拆出：这三节是稳定的实现细则，不需要每次开工都读。
> 动手改这三块之前先读本文。

## 三、语音与音效
**语音（v21 豆包，定稿）**：`zh_female_zhixingnv_uranus_bigtts` + `speed_ratio 0.85`，**不要绘本腔/角色扮演**。24 kHz WAV → 只编码一次 **48 kbps AAC/mono/MP4**（旧 Safari 对 opus 不可靠）。链路 `gen_doubao_voice.py`（断点续传 `ONLY_KEYS=`）→ `pack_doubao_voice.py`（裁静音、RMS −20 dBFS；增量 `DOUBAO_MERGE=1`）→ 构建；`VERIFY=1` 必跑（接口偶发垃圾音频，**「0 失败」≠「全对」**）。判语速按 10ms RMS 去首尾，别看总时长；**词语必须整词合成**。共 1695 条（701 单字 + 972 整词 + 22 句），`p_voice.json` 12.90 MB，预算 16 MB。**加语音改三处**：`gen_doubao_voice.py` 的 SENTS、`p_voice.json`、`p8.js` 的 `SENT_FULL`——漏一处不是「没声」而是**逐字蹦**。密钥走 `DOUBAO_APPID`/`DOUBAO_TOKEN` 环境变量，不落仓库。

**音效（v23 A 版）**：总线增益 1，用每音 `vol`；正确音 0.26/0.24/0.21/0.18，连对 0.18/0.16，低于 0.15 教室听不见。错误音＝**方波两级下滑 + 闷响**（233→175→131→147→110，峰值 0.32/0.30/0.30，0.62 s）。**「响度够」≠「听得见」**：98 Hz 在小喇叭没声压 → 全部 ≥100 Hz、主音 ≥200 Hz；**音色比对错更重要**（triangle 下行＝叹气，方波差频＝嗡嗡）。试听页 `build/错误音对比.html`，被说「不明显/太吵」先翻它换档。

## 五、笔顺与描写（v27）
- 数据 `p_stroke.js`：561 字 / 4168 笔 / 558 KB，来自 hanzi-writer-data@2.0.1（Make Me a Hanzi，**Arphic Public License**）；编码「每数字 → 2 字符 base36（`v+128`）」，生成脚本带往返校验。
- **数据 y 轴朝上、基线 y=900，canvas 朝下**：`soFit` 必须 `setTransform(dpr*w/1024, 0, 0, -dpr*h/1024, 0, dpr*h*900/1024)`，清屏先退回单位矩阵（第一版照抄导致「上」颠倒）。
- **这类错 jsdom 测不出** → 无头截图 + `getImageData` 数像素；**肉眼判断 canvas 图形不可靠**。
- 三层画法：灰底整字 → 已写完填红 → 当前笔 `ctx.clip(paths[lit])` 再画粗线。播完红着停 `SO_HOLD_MS` 再淡回；`SO_GEN` 让上一轮定时器作废。节奏：一笔 640ms + 笔间 340ms + 起手 600ms。
- 描写**不判分、不写记录**（G1 禁 `traceDoneTap` 里出现 `gradeAnswer`/`saveSnap`）。
- 听写拆两题：`writesWord()` 只认「词语听写」、`isDictation()` 认两个；老学生 `migrateTypes()` 补一项（幂等 + `bak-T023`）。
- **笔迹层只有一块**：`TRACE.box` 复用同一 canvas + 同一份 `strokes`；`openTrace` 换字必须**先 `traceClearInk()` 再改 `#traceChar`**（v32 修的 bug）。
- **同一图形两处上线最容易漏**：橡皮擦在 `p2.html`（静态 SVG）与 `p5.js`（`ICO_ERASE`）各一份，改一处必须同步（已进 G1）。

## 七、词库与拼词语（细则 `docs/tasks/T-019`）
- 词库页 = 只读派生 `builtinWords()` + `STATE.words` 两源；`wordBank()` 从字库组词栏现抽（969 双字词）。**另存副本必然分叉**：内置词绝不写进 `STATE.words`，要改就「收进词库」复制；窄屏**必须砍列**。
- 拼词语：一屏 3 词 6 字块两两点选，同组不共用，反序也算对；**读题绝不念词**，拼对后才整词朗读。
- **冲突分硬软**：硬＝同屏能拼出词库另一个词（永不接受）；软＝能拼出「常见搭配表」的词（一人/人头/人大，尽量避开）。`fillGroup()` **凑到 2 个词就收手**，预算 K 只在连 2 个都凑不出时才涨——**宁可少一个词也不放宽冲突**。`CROSS_TEXT` 只做互斥、不进题库。
- **判分口径不许自己改**：拼不上照旧 `sfxNo()` + `.shake` + 「这两个字拼不成词，再试试」。
- **词的难度是相对的**：`charStage()`（跨册取最早）＋`stuStageLevel()`（字表册次**中间值**）＋`wordFitsStu`（两字都在字表就放行；只一个在字表时超纲 ≤ `WB_STAGE_GAP`=4 册）。老师说「太难」先查 `charStage`，别加黑名单；**测量固定尺子**。
- 老师报「词库空的」先分数据在不在 vs 界面没渲染；**同一症状第二次出现一定往下游找**。`repairCharWords()` **三处必调**（`boot`/`loadAllData`/`importBackup`），只在整表一条都没有时补，兜底界面直说「已用内置」。
- 角标 `v39 · 内置词 969`（兜底标「（兜底）」）；报「还是老样子」先问这一句。

## 发布工具补充（分享卡 / lint）
- `lint_page_quality.py` 在 >2 MB 上要 16 分钟，后台跑或跳过。
- **分享卡 / 二维码**：`build/gen_share_card_v34.py`（segno 在本机 default python；HTML→本机 Chrome `--headless=new --force-device-scale-factor=2` 截图）。**量高度别用 `documentElement.scrollHeight`**（视口比内容高时返回视口高度，底下拖空白）→ 量 `卡片.getBoundingClientRect().height + body 上下 padding`；截完 `build/decode_qr2.js`（jsQR+pngjs）解一遍核对，`sips -Z 620` 缩到微信缩略图尺寸再解一次。
