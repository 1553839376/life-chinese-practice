# 生活语文练习台 · 项目长期约定

（2026-10-30 压缩重写，原 19.6 KB → 本文。数字一律以 `docs/STATE.md` 与脚本实跑为准，这里只留规则和踩过的坑。）

## 一、产物与发布
- 交付 `build/生活语文练习台.html`（单文件全内联，15 段：`p1 p2 p_open p_sfx p_art p_stroke lib p4 p8 p5 p_so p6 p7 p_close` + `p_voice.json`）。节点 `nU41kHmAoelqM2mGxWRFll` → https://workbuddy.link/p/nU41kHmAoelqM2mGxWRFll
- 构建 `cd build && python build_html.py`（`newline=''` 固定 LF，md5 可复现）
- 数据全存本机 `localStorage['wb2_data_v1']`，云端只当镜像（断网可用）
- 发布：`create_page_transaction` →（curl 取基线，**urllib 走代理必 502**）→ `build/upload_curl.py`（**别用 `upload_page_artifact.py`**）→ commit → publish。后两步随机 `TEMPORARY_ERROR`，**循环重试 1~6 次、10~12s 退避**；`download_page_artifacts.py` 也会偶发失败，别单发一次判死
- **线上产物不能字节比对**：平台注入 `data-page-node-id` 并重排属性（大 ~20 KB 正常）→ 抽出 `<style>` 与各 `<script>` 逐块比，**两边都要过滤空块**（线上多一个空 `inject.js`，只滤一侧会索引错位）
- 静态直链：`create_page_transaction` 返回的是 baseVersion 旧目录，新版用 `list_page_publish_artifacts.py` 取 `data.url`；给用户前 curl grep 一次 `APP_VER = 'v27'` 这类**值**（别 grep 属性组合，顺序会变）
- `lint_page_quality.py` 在 >2 MB 上要 16 分钟，后台跑或跳过
- **git 的 `http.proxy` 每次开机都变**：先比 `env | grep -i http_proxy` 与 `git config --get http.proxy`，不一致就同步；fetch/push 一律 6~8 次重试，单发一次判「断网」必误判

## 二、数据结构与教学口径
**字表**
- 出题**只认 `stu.chars`**；`groups` 只是来源标签；**空字表不回退全库**（G1 禁回潮）
- 字库 700 条只有 561 个不重复字 → 一切计数按字去重、走 `expandGroups`
- 云端 schema 无字表列 → `mergeCloudStudents` 必须继承本机 `chars`（同理 `off`）
- `migrateStuChars` 是一次性快照，之后字库新增的字不会进已有字表（刻意）
- 测试字表的字**必须在内置字库查得到**，否则 `charsOf` 过滤后不足 4 个、`startQuiz` 静默 return

**进度**
- **分母永远是 `stu.chars`**（v11 拿字库那一册当分母，学会 9/20 显示 3%）
- 四态：已掌握/练习中/需巩固/待学；`stuProfile` 一次算计数、掌握率、逐字明细、建议顺序
- 建议顺序：需巩固 → 练习中且 prompts≥2 → 练习中 → 待学；已掌握不进名单
- 抽练 `QUIZ_FOCUS`：目标字取子集，**干扰项仍取整张字表**
- **百分比落代码前先手算期望值**（这类 bug 不报错、不崩、数还看着合理）
- **进度条容器不要嵌套**：`#profBar` 自带 `.prog-bar`，再套同类 div 内层宽度塌成 0；`progSegsHTML()` 只产 `<i>`

**在学上限（v19/T-020）**
- 不新增 `cap`：`stu.count` 升格「在学字数」（3–10，默认 6）；`stu.active` 在学名单、`stu.lock` 锁定、`stu.off` 手动移出
- `levelOf`（练得怎么样）与状态机（排没排进这批）是两个维度，档案页分两行写
- **在学名单永远补满**：空位有三种 —— 学会让出 / 字表后来变大 / 在学字数调大；老师手动移出的记 `stu.off`，补位跳过，`actAdd` 加回来时删掉
- 手动加入 unshift 到最前；已掌握手动拉回＝复习，自动锁定；`openStuProfile` 先 `syncActive` 再画

**今日字卡（v18）／学生主页（v24）**
- 流程：点照片 → 主页 → 今日字卡 → 正式练习；`enterStudent`/`homeGo` 都**不许直接 `startQuiz`**
- 预习**不写 `logs`**，点卡只打勾；字单按 `stuProfile().focus`，绝不用 `weightOf`（那里「待学」=0 排最前）
- **出题必须收敛到 `PRE.list`**，否则刚认完 8 个、做题是另外 8 个
- 预习态 `.is-pre` 藏起「提示/读对了/跳过」（按了没动静比特需孩子没按钮更糟）
- 星星按掌握率每 20% 一颗（`rate>0` 至少 1 颗）；连续天数按**本地日**（`logs.last` 是 UTC，要 `Date.parse` + `dayKey`），今天没练从昨天数不清零
- 主页藏题号 `.is-home .qcount{display:none}`
- 点击委托里 `[data-pre]`/`#preGo`/`[data-wg-act]` 必须排在 `.opt` 之前（那几屏 `STATE.quiz` 是 null）

**答错可重试（v22）**
- 点错**不判死**：只加 `.opt.miss`（灰+虚线+shake+`pointer-events:none`），题目继续
- 第一次错绝不念答案；**连错 2 次**才 `.glow` 正确项并念读音
- 一题最多记 1 次错；`alone+hinted+wrong===n` 不变量保持；重试后答对算 `alone++` 但 `wrong` 也 +1 → 停在「练习中」（刻意）
- 不加 `retry` 字段落库（云端无此列），只在 `STATE.quiz.retried` 报一句
- 每道新题必须 `resetQState()` 清 `missed/wrongLogged/picked/checked`

**手写题型（v25/v27）**
- 三个题型：`汉字听写`（听单字、一个方框）、`词语听写`（听整词、一字一格）、`描红汉字`（灰楷体照着描）
- **没有手写识别，就不假装判分**（离线单文件做不了）：亮答案 + 人核对
- **描红记 `hinted`/`prompts`，不记 `alone`**（`promptUsed=1` 再 `gradeAnswer(true)`），否则描两遍就「已掌握」，档案骗老师
- 手写题型**不要求 4 个字**、一次最多 6 个、读题**念词不念单字**
- 画布：按 DPR 放大再 `setTransform` 缩回；`touch-action:none`；笔迹存笔画数组（擦除＝清空）；尺寸由 `wgLayout()` 算 px（**不用 `aspect-ratio`**），字号＝0.76 格宽；量宽量两次（80ms 后），**不挂 rAF**
- **jsdom 没有 canvas**（`getContext` 返回 null）→ 绘制全部先判空，结构测试不依赖画布

## 三、语音与音效
**语音（v21 豆包，定稿）**
- `zh_female_zhixingnv_uranus_bigtts`（知性女声），`speed_ratio 0.85`；**不要绘本腔/角色扮演**
- 直出 24 kHz 无损 WAV → 只编码一次 **48 kbps AAC/mono/MP4**（旧 Safari `decodeAudioData` 对 opus 不可靠；课堂没声音比多几 MB 严重）
- 链路：`gen_doubao_voice.py`（断点续传，`ONLY_KEYS=` 单条重做）→ `pack_doubao_voice.py`（裁 50/150ms、RMS −20 dBFS；增量 `DOUBAO_MERGE=1`）→ 构建；`DOUBAO_APPID/TOKEN` 走环境变量，不落仓库
- 接口偶尔返回垃圾音频 → `VERIFY=1` 必须跑，**「0 失败」≠「全对」**；顽固的用 `TEXT_OVERRIDE`
- 判语速别看总时长（尾部垫 0.3~0.5s 静音），按 10ms RMS 去首尾再比；**词语必须整词合成**（`w`+每字 4 位 hex）
- 1695 条（701 单字 + 972 整词 + 22 指令句），`p_voice.json` 12.90 MB，预算 16 MB
- **加一条语音改三处**：`gen_doubao_voice.py` 的 SENTS、`p_voice.json`、`p8.js` 的 `SENT_FULL`。漏一处的表现不是「没声」而是**逐字蹦**（`sayParts` 退化到 3/2 字词再退单字）。已进 G1 与 smoke2【27】

**音效（v23 A 版）**
- 总线增益 1，**不压总线**，用每音 `vol`；正确音 0.26/0.24/0.21/0.18，连对 0.18/0.16；低于 0.15 教室听不见
- 错误音：**方波两级下滑 + 闷响**，233→175→131→147→110，峰值 **0.32/0.30/0.30**，0.62 s
- **「响度够」≠「听得见」**：98 Hz 在小喇叭没声压 → 全部 ≥100 Hz、主音 ≥200 Hz，靠方波泛音顶到中高频
- **音色比对错更重要**：triangle 下行＝叹气（会被听成明亮上行），方波差频＝嗡嗡
- G1「错误音不比正确音轻」必须 `synthTone` 与 `synthBuzz` 都数
- 试听页 `build/错误音对比.html`（已定 A；再被说「不明显/太吵」先翻它换档）

## 四、UI 与视觉
**老师端表单（v13）**
- 长列表**容器内滚动**（`.list-wrap{max-height:min(56vh,620px)}`），表单 DOM 排在列表之前，`revealForm()` 滚动+聚焦，保存行 sticky
- 校验失败用 `markField()` 红框+抖动+滚进视线，**不要只靠 toast**
- 「按钮不能用」三种：①没跑 ②报错 ③跑了但结果在视口外 —— **③ 最常被误判成 ①**

**进度页（v17）／结算页（v26）**
- 结构：`ringHTML(rate)` 圆环（`r=52`、`rotate(-90 60 60)`）+ `stackHTML(p)` 四段条 + 带色数字 `.slg` + 胶囊 `.hp`；每人一行
- 说明文字一律 11.5px 灰字 `.prog-note` 或删掉
- **一屏只能有一个主按钮**：鼓励语用 `.fb-say`（透明底 21px 纯文字），主按钮实心深绿+白字+`0 4px 0`；**`.next-type` 必须写在 `.primary` 之后**（同优先级后写者胜，已进 G1 下标比较）
- 题型进度：`wb2_sess_v1` = `{day,name,done}`（不进 STATE、不碰云端 schema），跨天清零、换学生换一份；全做完也要保留正确率

**游戏美术（v9/v10）**
- 鱼头右尾左，`fishSVG` viewBox `200×116`，身体 `cx=106 rx=54`，尾鳍 `M58 58 L14 24 Q36 58 14 92 Z`
- 果树用整棵 `treeSVG()`（`400×250`），别退回 div 树干
- `.game-field` 有 `max-height:min(620px,80vw)`；动效要有可见幅度（±20px/3.4s、摆尾 ±13°），`transform-box:fill-box`
- **先分「没播」和「幅度太小」**；画面会被看图验收，报「画得不对」先核 SVG 坐标

**截图探针**
- 造数据用 **`STATE.chars`，不是 `CHARS`**（`c.w` 是组词串 → 出「正在学 0」假 bug）
- `--virtual-time-budget=4000` 必加，否则注入脚本还没跑就截图（四张图一样大就是没跑）
- headless 窗口宽度被钳到 ~500px：`--window-size=430` 右边被裁是假象，判溢出读 `scrollWidth === innerWidth`
- Mac：`"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --no-sandbox --disable-gpu`；Windows 用 Edge
- 想量数值又没 driver：把结果写进 `document.title`，`--dump-dom | grep '<title>'` 读出来
- **headless 截图的 canvas 层不刷新**：静态 `soPaint` 一帧再截图仍是动画最后一帧（同时刻 `getImageData` 却是对的）→ 判 canvas 只信像素统计

**节奏**：全在 `p8.js` 的 `PACE`/`PACE_GAP`。用户敏感、多次返工——**调之前先问**。

## 五、笔顺与描写（v27/T-023）
- 数据 `p_stroke.js`：561 字 / 4168 笔 / 558 KB，来自 hanzi-writer-data@2.0.1（Make Me a Hanzi，**Arphic Public License**）；编码「每个数字 → 2 字符 base36（`v+128`）」，`gen_stroke_data.py` 带往返校验
- **数据 y 轴朝上、基线 y=900，canvas 朝下**：`soFit` 必须 `setTransform(dpr*w/1024, 0, 0, -dpr*h/1024, 0, dpr*h*900/1024)`；清屏先退回单位矩阵（否则最底一条清不掉）。第一版照抄导致「上」整字上下颠倒
- **这类错 jsdom 测不出来**（没有 canvas），结构断言全绿也是倒的 → 只能无头浏览器截图 + `getImageData` 数像素
- **肉眼判断 canvas 图形不可靠**：把每一笔单独画到临时 canvas 数像素（`木[1172,2055,1104,1455]`）才确认填充正常
- 三层画法：灰底整字（`#DCD4BE`）→ 已写完的填红（`#C0392B`）→ 当前笔 `ctx.clip(paths[lit])` 后画 `lineWidth 300` 粗线（裁剪防糊笔，粗线填满轮廓）
- 播完整字红着停 `SO_HOLD_MS=700` 再淡回灰底（提示语写「照着灰字描一遍」，底字不能是红的）；`SO_GEN` 让上一轮定时器作废
- 描写**不判分、不写记录**（无档案、无识别）；G1 禁 `traceDoneTap` 里出现 `gradeAnswer`/`saveSnap`
- 听写拆两题：`writesWord()` 只认「词语听写」，`isDictation()` 认两个；老学生由 `migrateTypes()` 补一项（幂等 + `bak-T023`）

## 六、工程纪律
**文档**
- `docs/`：`STATE.md`(先读) `00-功能清单.md` `01-HARNESS.md` `02-验收清单.md` `03-变更日志.md` `tasks/` `logs/`。每个任务一卡 + 一日志 + 变更一条，**不改文档等于没做完**
- **发版铁律：先改 5 处 → 构建 → 门禁 → 发布**（`p4.js` 的 `APP_VER`、`p2.html` 角标、`STATE.md` 现状文案、`00-功能清单.md` 4.3.8、`docs/README.md` 当前版本）
- `build/check_docs.py` 已进 G1（版本号/角标/语音条数/测试数/任务卡引用）

**门禁**
- `python harness/run_gate.py`（G0 构建/体积/分片、G1 静态护栏、G2 五套测试、G3 报告）；全绿＝做完。当前 **84 项 / 620 项测试**
- 新增功能必须在 `harness/manifest.json` 登记符号、抬 `min_cases`、必要时加 assets 下限
- **红了先看是不是自己改了设计**：改断言测新行为、项数净增，**不能删断言过关**
- **「0 失败但项数少了几条」＝有断言没跑到**：任何 `for` 里 `ok()`、`if (...) ok()` 都是定时炸弹（出题随机、计数会漂）→ 固定成「循环只动手、末尾一次性核对」
- 取函数体 `split('function X')[1].split('function Y')[0]` —— **Y 必须排在 X 之后**，取反会切空串
- **先怀疑工具口径**（第一版按钮体检把委托控件误报成孤儿）
- `smoke2.js`/`check_lib.js` 要传 HTML 文件名，需 `NODE_PATH=~/.workbuddy/binaries/node/workspace/node_modules`

**数字与副作用**
- **数字必须脚本现算**，别抄上一版
- 必须发生的副作用别挂 `requestAnimationFrame`，用 `setTimeout`
- 新增 STATE 字段要同时改 `saveSnap`/`loadSnap`/导出/导入（少一处静默丢）；云端 schema 没列的字段**一律不落库**

## 七、词库与拼词语
- 词库页 = 只读派生 `builtinWords()` + `STATE.words` 两源渲染；**内置词绝不写进 `STATE.words`**（会分叉、备份大 87 KB），要改就「收进词库」复制
- `wordBank()` 从字库组词栏 + 自建词库现抽（969 双字词），**另存副本必然分叉**
- 词库表窄屏**必须砍列**，别用 `min-width` 横滚
- 拼词语：一屏 3 词 6 字块两两点选；同组不共用；反序也算对；**读题绝不念词**，拼对后才整词朗读
- **冲突分硬软**：硬＝同屏能拼出词库另一个词（永不接受）；软＝能拼出「常见搭配表」里的词（一人/人头/人大，尽量避开）。`fillGroup()` **凑到 2 个词就收手**，预算 K 只在连 2 个都凑不出时才递增 —— **宁可少一个词也不放宽冲突**
- 反例：一刀切「凑不满就退回只查词库」会让撞词率反升（75%）；为凑满 3 个词抬预算会被老师看见撞词
- `CROSS_TEXT`（1734 条搭配）**只做互斥、不进题库**，两字都必须落在字库字里才收；补词口子在 `docs/tasks/T-019` 第五节
- **判分口径不许自己改**（2026-10-29 用户否掉我自作主张的「不判错」版）：拼不上照旧 `sfxNo()` + `.shake` + 「这两个字拼不成词，再试试」，题面「点两个字，拼成一个词」，**不是照着示例拼**
- **词的难度是相对的，不做全局黑名单**：按册次算 —— `charStage(字)`（跨册取最早）＋ `stuStageLevel(stu)`（字表册次**中间值**）＋ `wordFitsStu`（两字都在字表就放行；只有一个在字表时超纲最多高 `WB_STAGE_GAP`=4 册）。老师再报「太难」先查 `charStage` 是否反直觉，别加黑名单
- **测量必须固定尺子**并分高频/随机两种字表分别报（`ALL.slice(0,8)` 与随机 20 字结论相反）
- 只给词里属于学生字表的字记分；结算按词算
- 老师报「词库空的」先分：数据在不在 vs 界面没渲染；**同一症状第二次出现一定往下游找**（v16 真因是 `STATE.chars[*].words` 为空）
- `repairCharWords()` **三处必调**（`boot`/`loadAllData`/`importBackup`），只在整表一条都没有时补；`builtinWords()` 兜底界面直说「已用内置」，**不许装正常**
- 老师端角标 `v27 · 内置词 969`（兜底标「（兜底）」）。报「还是老样子」先问这一句

## 八、用户偏好与不做清单
- 特需学生：点击目标大、单指点击、**不要拖拽**；语音慢、句间有停顿
- 字卡主次：汉字 86px 主角，组词 22px 次要；没图不留空图位
- 图示覆盖率 16%，**游戏不依赖图片**是刻意设计
- **不做**：排行榜/花园墙、虚拟货币、枯萎饥饿、抽奖盲盒、多页签
- **奖励机制（小火车/花园/厨房/集卡/宠物）用户已明确放弃，不要再提、不要自己写进产品**（2026-10-28 原话「我已经放弃了没有说要启用，你就自己启用这些」）；相关方案文档与任务卡已删
- 用户是特需班语文老师，讨厌重复手工排版，偏好「一键生成 + 可直接用」
