# 生活语文练习台 · 项目长期约定

（2026-10-28 压缩整理。数字以 `docs/STATE.md` 与脚本实跑为准，本文只留「必须遵守的规则」和「踩过的坑」。）

## 一、产物与发布
- 交付 `build/生活语文练习台.html`（单文件全内联）。节点 `nU41kHmAoelqM2mGxWRFll` → https://workbuddy.link/p/nU41kHmAoelqM2mGxWRFll
- 构建 `cd build && python build_html.py`（13 段，`newline=''`，md5 可复现）
- 数据全存本机 `localStorage['wb2_data_v1']`，云端只当镜像（断网可用）
- 发布：`create_page_transaction` →（curl 下基线，**urllib 走代理必 502**）→ `build/upload_curl.py`（**别用 `upload_page_artifact.py`**）→ `commit` → `publish`。后两步随机 `TEMPORARY_ERROR`，**循环重试 1~6 次、10~12s 退避**
- 校验 `download_page_artifacts.py --source publish`（`workbuddy.link` 直连 502）
- **线上产物不能字节比对**：平台注入 `data-page-node-id`/`pnid` 注释并重排属性（大 ~19 KB 正常）→ 抽出 `<style>` 与各 `<script>` 逐块比；**两边都要过滤空块**（线上多一个空 `inject.js`，只滤本地侧会索引错位）
- **静态直链**：`create_page_transaction` 的 `url` 是 baseVersion（旧版），新版目录用 `list_page_publish_artifacts.py` 取 `data.url`；给用户前 curl 抓一次 grep 特征符号
- **线上校验 grep 值本身**（`APP_VER = 'v25'`、`>v25<`），别 grep 属性组合（顺序会变）
- `lint_page_quality.py` 在 >2 MB 上要 16 分钟，后台跑或跳过
- **跨机器 git**：`http.proxy` 存的端口每次启动都变，502 先比对 `env | grep -i http_proxy` 与 `git config http.proxy`；代理**间歇 502 且 git 与 curl 表现不同** → fetch/push 一律 6~8 次重试循环，单发一次判「断网」必误判
- 现状：**v25 已构建、门禁全绿，线上仍是 v24（newVersion 21）**

## 二、数据结构与教学口径
**字表**
- 出题**只认 `stu.chars`**；`groups` 只是来源标签；**空字表不回退全库**（G1 禁回潮）
- 字库 700 条**只有 561 个不重复字** → 一切计数按字去重、走 `expandGroups`
- 云端 schema 无字表列 → `mergeCloudStudents` 必须继承本机 `chars`
- `migrateStuChars` 是一次性快照；之后字库新增的字**不会**进已有字表（刻意）
- 测试字表的字**必须在内置字库查得到**，否则 `charsOf` 过滤后不足 4 个、`startQuiz` 静默 return

**进度**
- **分母永远是 `stu.chars`**（v11 拿字库那一册当分母，学会 9/20 显示 3%）
- 四态：已掌握/练习中/需巩固/待学；`stuProfile` 一次算计数、掌握率、逐字明细、建议顺序
- 建议顺序：需巩固 → 练习中且 prompts≥2 → 练习中 → 待学；已掌握不进名单
- 抽练 `QUIZ_FOCUS`：**目标字**取子集，**干扰项仍取整张字表**
- **百分比落代码前先手算期望值**（3% vs 45% 这类 bug 不报错、不崩、数还看着合理）
- **进度条容器不要嵌套**：`#profBar` 自带 `.prog-bar`，再套同类 div 内层宽度塌成 0；`progSegsHTML()` 只产出 `<i>`

**在学上限（v19）**
- **不新增 `cap`**：`stu.count` 升格「在学字数」（3–10，默认 6）；`stu.active` 在学名单、`stu.lock` 锁定
- **`levelOf` 与状态机是两个维度**：前者「练得怎么样」，后者「排没排进这批」，档案页分两行写
- **补位只补「因学会让出」的名额**；手动加入 **unshift 到最前**；已掌握手动拉回＝复习，**自动锁定**
- `openStuProfile` 必须先 `syncActive` 再画

**今日字卡（v18）／学生主页（v24）**
- 流程：点照片 → 主页 → 今日字卡 → 正式练习；`enterStudent`/`homeGo` 都**不许直接 `startQuiz`**
- 预习**不写 `logs`**，点卡只打勾；**字单按 `stuProfile().focus`**，绝不用 `weightOf`（那里「待学」=0 排最前）
- **出题必须收敛到 `PRE.list`**，否则刚认完 8 个、做题是另外 8 个
- 预习态 `.is-pre` 藏起「提示/读对了/跳过」（按了没动静比特需孩子没按钮更糟）
- **星星按掌握率每 20% 一颗**（`rate>0` 至少 1 颗），不是「每 5 字一颗」
- **连续天数**：`logs.last` 是 UTC 串，必须 `Date.parse` 后按本地日（`dayKey`）取整；今天没练**从昨天数、不清零**
- 主页藏题号 `.is-home .qcount{display:none}`
- 点击委托里 `[data-pre]`/`#preGo`/`[data-wg-act]` 必须排在 `.opt` 之前（那几屏 `STATE.quiz` 还是 null）

**答错可重试（v22）**
- 点错**不判死**：只加 `.opt.miss`（灰+虚线+shake+`pointer-events:none`），题目继续
- **第一次错绝不念答案**；**连错 2 次**才 `.glow` 正确项并念读音
- 一题**最多记 1 次错**；`n` 错 +1、对再 +1，`alone+hinted+wrong===n` 不变量保持
- 重试后答对算 `alone++` 但 `wrong` 也 +1 → 停在「练习中」，刻意（`levelOf` 一行没改）
- **不加 `retry` 字段落库**（云端 logs 无此列），只在 `STATE.quiz.retried` 报一句
- 每道新题必须 `resetQState()` 清 `missed/wrongLogged/picked/checked`

**手写题型（v25）**
- `汉字听写`：听词（取组词栏第一个词，没有就听单字）→ 田字格写 → 「写好了」亮**浅绿答案叠在笔迹下** → 「写对了」/「没写好，重写」
- `描红汉字`：格子底下浅灰**楷体**字照着描（黑体笔画位置是错的），「提示一下」加深底字
- **没有手写识别，就不假装判分**（离线单文件做不了）；「亮答案 + 人核对」
- **描红记 `hinted`/`prompts`，不记 `alone`**（做法：`promptUsed=1` 再 `gradeAnswer(true)`）。照着描≠认出来，否则描两遍就「已掌握」，档案骗老师
- 手写题型**不要求 4 个字**、一次最多 6 个、读题**念词不念单字**
- 画布：按 DPR 放大再 `setTransform` 缩回；`touch-action:none`；笔迹存笔画数组（擦除＝清空，不做 undo）；尺寸由 `wgLayout()` 算 px（**不用 `aspect-ratio`**），字号＝0.76 格宽；量宽要量两次（80ms 后再量，**不挂 rAF**）
- **jsdom 没有 canvas**（`getContext` 返回 null）→ 绘制全部先判空，结构不依赖画布也能测

**奖励机制（T-017，未动代码）**
- 支点：星星/掌握率是**能力刻度**，学得慢的孩子半年停在 2/12 → 奖励要给一条**人人都能拉满的轨道**（「今天我来了」）
- **按天计价**（按题量会诱发「专挑会的字刷成长」）；5 天一个循环，不清零、不倒退、不补
- **载体＝孩子已经在意的对象**（班里爱小火车/地铁/美食）→ 推荐「我的线路图」5 站一线，站名用生活场景词（学校/公园/超市/医院/菜场），线路图本身即复习材料
- **别用「我们自己觉得好看」的**（花、宠物）代替孩子兴趣；宠物成本最高（4 阶段×3 情绪、有照顾义务＝惩罚缺席）
- **已否决**：集卡（变成孩子间比较）、盲盒/抽奖（可变比率强化易成固着）
- **架构：状态只存「练过的日期数组」，皮肤是可替换渲染层**（换皮零迁移）——比选哪个皮肤更重要
- 待拍板：载体线路/厨房、站名场景词/序号、5 站/6 站

## 三、语音与音效
**语音（v21 豆包，定稿）**
- 豆包 TTS 2.0，`zh_female_zhixingnv_uranus_bigtts`（知性女声），`speed_ratio 0.85`；**不要绘本腔/角色扮演**
- 直出 24 kHz 无损 WAV → 只编码一次 **48 kbps AAC/mono/MP4**（不用 ogg_opus；**旧 Safari `decodeAudioData` 对 opus 不可靠**，课堂没声音比多几 MB 严重）
- 链路：`gen_doubao_voice.py`（断点续传，`ONLY_KEYS=` 单条重做）→ `pack_doubao_voice.py`（裁 50/150ms、RMS −20 dBFS）→ 构建；`DOUBAO_APPID/TOKEN` 走环境变量
- 接口偶尔返回垃圾音频（同参数重请求就正常）→ `VERIFY=1` 必须跑，**「0 失败」≠「全对」**；顽固的用 `TEXT_OVERRIDE`
- **判语速别看总时长**（尾部垫 0.3~0.5s 静音），按 10ms RMS 去首尾再比
- **词语必须整词合成**（`w`+每字 4 位 hex）
- 1691 条（701 单字 + 972 整词 + 18 指令句），`p_voice.json` 12.85 MB；预算 16 MB
- **加一条语音改三处**：`gen_doubao_voice.py` 的 SENTS、`p_voice.json`、`p8.js` 的 `SENT_FULL`（漏第三处静默回退逐字念）

**音效（v23 定稿 A 版）**
- 总线增益 = 1，**不压总线**，用每音 `vol`
- 正确音 0.26/0.24/0.21/0.18，连对 0.18/0.16；低于 0.15 教室听不见
- 错误音：**方波两级下滑 + 闷响**，`233→175`→`175→131`→`147→110`，峰值 **0.32/0.30/0.30**，0.62 s
- **「响度够」≠「听得见」**：98 Hz 在小喇叭没声压 → **全部 ≥100 Hz、主音 ≥200 Hz**，靠方波泛音顶到中高频
- **音色比对错更重要**：triangle 下行＝叹气，会被听成「明亮上行」；方波差频＝嗡嗡
- G1「错误音不比正确音轻」必须 `synthTone` 与 `synthBuzz` 都数
- 试听页 `build/错误音对比.html`（已定 A；C/D 留退路，再被说「不明显/太吵」先翻它换档）

## 四、UI 与视觉
**老师端表单（v13）**
- 长列表**容器内滚动**（`.list-wrap{max-height:min(56vh,620px)}`）；否则 700 行 4.4 万像素、表单被顶到底 → 报「按钮不能用」
- 表单 DOM **排在列表之前**；`revealForm()` 滚动+聚焦；保存行 sticky
- 校验失败用 `markField()` 红框+抖动+滚进视线，**不要只靠 toast**
- 「按钮不能用」三种：① 没跑 ② 报错 ③ 跑了但结果在视口外 —— **③ 最常被误判成 ①**

**进度页（v17）**
- 结构：`ringHTML(rate)` 圆环 + `stackHTML(p)` 四段条 + 带色数字 `.slg` + 胶囊 `.hp`；每人一行 `.pn-txt` / `.prog-mini`(12px, width:100%) / `.prow-rate` / 档案
- **说明文字一律 11.5px 灰字 `.prog-note` 或删掉**；圆环 `r=52`、`rotate(-90 60 60)`

**游戏美术（v9/v10）**
- 鱼：头右尾左，`fishSVG` viewBox `200×116`，身体 `cx=106 rx=54`，眼 `cx=142`，尾鳍 `M58 58 L14 24 Q36 58 14 92 Z`
- 果树：整棵 `treeSVG()`（`400×250`），**别退回 div 树干+div 树冠**
- `.game-field` 有 `max-height:min(620px,80vw)`
- **动效必须有可见幅度**（游动 ±20px/3.4s、摆尾 ±13°），都要 `transform-box:fill-box`
- **先分「没播」和「幅度太小」**；**画面会看图验收**，报「画得不对」都是真画错，先核 SVG 坐标

**截图探针**
- 造数据用 **`STATE.chars`，不是 `CHARS`**（`c.w` 是组词串 → 出「正在学 0」假 bug）
- **headless 窗口宽度会被钳住**（Chrome 钳到 ~500px）：`--window-size=430` 右边被裁是假象，判溢出读 `scrollWidth === innerWidth`
- Mac：`"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --no-sandbox --disable-gpu --screenshot=...`
- **Windows 本机没装 Chrome，用 Edge**：`"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --no-sandbox --disable-gpu --screenshot=...`
- 想量数值又没 driver：注入脚本把测量结果写进 `document.title`，用 `--dump-dom | grep '<title>'` 读出来

**节奏**：全在 `p8.js` 的 `PACE`/`PACE_GAP`。用户敏感、多次返工——**调之前先问**。

## 五、工程纪律
**文档**
- `docs/`：`STATE.md`(先读) `00-功能清单.md` `01-HARNESS.md` `02-验收清单.md` `03-变更日志.md` `tasks/` `logs/`。每个任务一卡+一日志+变更一条，**不改文档等于没做完**
- **发版铁律：先改 5 处 → 构建 → 门禁 → 发布**。5 处 = `p4.js` `APP_VER`、`p2.html` 角标、`STATE.md` 现状角标文案、`00-功能清单.md` 4.3.8、`docs/README.md` 当前版本
- `build/check_docs.py` 已接进 G1（版本号/角标/语音条数/任务卡引用）
- **说了要做的事必须当天下到 `tasks/` 或 backlog**

**门禁**
- `python harness/run_gate.py`（G0 构建/体积、G1 静态护栏、G2 五套测试、G3 报告）；全绿＝做完
- 新增功能必须在 `harness/manifest.json` 登记符号 + 抬 `min_cases`
- 基线以脚本实跑为准：当前 36+98+319+16+19=**488 项**，门禁 **64 项**
- **红了先看是不是自己改了设计**：改断言测新行为、项数净增，**不能删断言过关**
- 取函数体 `split('function X')[1].split('function Y')[0]` —— **Y 必须在文件里排在 X 之后**，取反会切空串
- **先怀疑工具口径**（按钮体检第一版把委托控件误报成孤儿）
- `smoke2.js`/`check_lib.js` 要传 HTML 文件名；需设 `NODE_PATH`（本机 `~/.workbuddy/binaries/node/workspace/node_modules`）

**数字与副作用**
- **数字必须脚本现算**，别抄上一版（犯过两次）
- 必须发生的副作用**别挂 `requestAnimationFrame`**，用 `setTimeout`
- 新增 STATE 字段要同时改 `saveSnap`/`loadSnap`/导出/导入（少一处静默丢）
- 云端 schema 没列的字段**一律不落库**

## 六、词库与拼词语
- 词库页 = 只读派生 `builtinWords()` + `STATE.words`，由 `wordRowsHTML()` 两源渲染
- **内置词绝不写进 `STATE.words`**（会分叉、备份多 87 KB）；要改就「收进词库」复制（`copyBuiltinWord`），出题按 `byW` 去重
- `wordBank()` 从字库组词栏 + 自建词库现抽（969 双字词），**另存副本必然分叉**
- 词库表窄屏**必须砍列**，别用 `min-width` 横滚（按钮会被滚出屏幕）
- 拼词语：一屏 3 词 6 字块两两点选；同组不共用；**任取两字不能拼成本组外的词**（`wbCrossHit`）；反序也算对
- 只给词里**属于学生字表**的字记分；结算按**词**算；**读题绝不念词**，拼对后才整词朗读
- 老师报「词库是空的」先分：数据在不在 vs 界面没渲染；**同一症状第二次出现一定往下游找**（v16 真因是 `STATE.chars[*].words` 为空）
- `repairCharWords()` **三处必调**（`boot`/`loadAllData`/`importBackup`），边界：**只在整表一条都没有时才补**
- `builtinWords()` 兜底用内置字表 `CHARS`，界面直说「组词栏是空的，已用内置」，**不许装正常**
- 老师端角标 `v25 · 内置词 969`（兜底标「（兜底）」）。报「还是老样子」先问这一句

## 七、用户偏好与不做清单
- 特需学生：点击目标大、单指点击、**不要拖拽**；语音慢、句间有停顿
- 字卡主次：汉字 86px 是主角，组词 22px 次要；没图不留空图位
- 图示覆盖率 16%，**游戏不依赖图片**是刻意设计
- **不做**：排行榜/班级花园墙、虚拟货币商店、枯萎降级饥饿、抽奖盲盒、多页签
- 用户是特需班语文老师，讨厌重复手工排版，偏好「一键生成 + 可直接用」
