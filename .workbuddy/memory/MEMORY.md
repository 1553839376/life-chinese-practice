# 生活语文练习台 · 项目长期约定

（2026-11-09 四次压缩。数字以 `docs/STATE.md` 与实跑为准；这里只留规则、口径、坑。
细节全在 `docs/tasks/T-0xx`、`docs/DETAIL-语音笔顺词库.md`、`docs/01-HARNESS.md`。）

## 一、产物与发布
- 产物 `build/生活语文练习台.html`：15 段全内联（`p1 p2 p_open p_sfx p_art p_stroke lib p4 p8 p5 p_so p6 p7 p_close` + `p_voice.json`）；节点 `nU41kHmAoelqM2mGxWRFll`。构建 `cd build && python build_html.py`（`newline=''` 固定 LF，md5 可复现）。本机数据 `wb2_data_v1`，云端只当镜像。
- 发布见 `docs/01-HARNESS.md`：① 用 `upload_curl.py` 不用 `upload_page_artifact.py`（urllib 走代理必 502）；② `commit_page_transaction.py` **必须带 `--message`**；③ 认 `KS_PAGE_COMMIT`；④ commit/publish/download 随机 `TEMPORARY_ERROR` → 循环 1~6 次 + 10~12s 退避；⑤ 两个入口都传，md5 不同正常；⑥ 本机 curl 走 schannel，上传/下载**都加 `--ssl-no-revoke`**（否则 HTTP 000「上传 0 字节」，像代理挂了）；⑦ 静态直链**目录 URL 是 404，要带 `index.html`**。
- **线上不能字节比对**：平台注入 pnid + 属性重排（大 ~24 KB 正常）→ 抽 `<style>`/各 `<script>` 逐块比，两边都过滤空块（线上多一个空 `inject.js`）。直链用 `list_page_publish_artifacts.py` 取 `data.url`；给用户前 curl grep **`APP_VER` 的值**，别 grep 角标。**短链 `/p/<id>` 现在只回一个 ~5.8 KB 壳页（取不到 `APP_VER`）**，核版本必须走静态直链 + `index.html`（v51 实证）。**角标 `<span id="appVer">` 被平台塞 `data-page-node-id` 属性和 `<!--pnid:…-->` 注释**，只核**值 `v51`**，grep 裸 `<span …>v51<` 会假阴。抽块比对要用 `m.group(3)`（内容），别用 `group(2)`（属性）——后者两边必然 0 命中。
- `lint_page_quality.py` 在 >2 MB 上要 16 分钟（后台跑/跳过）。
- **git**：`http.proxy` 和 `https.proxy` **都要设**成 `$https_proxy`（只设一个 `Could not resolve host`）；沙箱代理打 GitHub 必 502 → `env -u http_proxy …`；`unexpected disconnect` → `-c http.version=HTTP/1.1 -c http.lowSpeedLimit=1000 -c http.lowSpeedTime=25 -c http.schannelCheckRevoke=false`。**成功看 git 退出码，别 `| tail` 后看 `$?`**；失败别判死，6~8 次重试。**平台页面发布走另一条通道，GitHub 断了照样发得出去**（v50 实证）。`curl -w "%{http_code}"` 超时退出非 0 却仍打印 `200`，拼 `|| echo 000` 会变成 `200000` 造成误判——判网络别只看探测字符串，直接试一次 push。
- **本地做完 ≠ 老师能用**：推 GitHub 与线上发布是两条链路。用户再提一遍已实现的功能，先 curl 线上 `APP_VER`，别重做（v49 教训）。

## 二、教学口径与数据结构
- **字表**：出题只认 `stu.chars`，`groups` 只是来源标签；**空字表不回退全库**（G1 禁回潮）。700 条字库仅 561 不重复字 → 按字去重走 `expandGroups`。云端 schema 无字表列 → `mergeCloudStudents` 必须继承本机 `chars`（`off` 同理）；`migrateStuChars` 是一次性快照。测试字表必须在内置字库查得到，否则不足 4 个时 `startQuiz` 静默 return。
- **进度**：分母永远是 `stu.chars`。四态「已掌握/练习中/需巩固/待学」；`stuProfile()` 一次算计数、掌握率、逐字明细、建议顺序（需巩固 → 练习中 prompts≥2 → 练习中 → 待学）。抽练 `QUIZ_FOCUS` 只缩目标字，**干扰项仍取整张字表**。百分比落代码前先手算期望值；进度条容器别嵌套（`#profBar` 自带 `.prog-bar`）。
- **掌握判定（v50 / T-043）**：`levelOf(r)` 在 `r.alone>=3 && r.wrong<=1` 时还要**至少两个不同本地日**独立答对过。日期存本机独立键 `wb2_solo_days_v1`（`soloLoad/soloDays/soloMark`，按 `学生|字` 去重，只记**独立答对**，`todayKey()` 本地日）。老云端 `r.level==='已掌握'`、无日期记录的老本机数据**不追溯**、沿用旧口径，别把老师现有字表整批打乱。只改判定，**不动 `syncActive` 补位**；不进 STATE / 云端 / 导出导入。
- **在学上限（v19）**：不新增 `cap`——`stu.count` 就是在学字数（3–10，默认 6），另有 `stu.active`/`stu.lock`/`stu.off`。**名单永远补满**（学会让位/字表变大/上限调大）；手动加入 unshift 最前，移出记 `off` 且补位跳过；`openStuProfile` 先 `syncActive` 再画。
- **今日字卡 / 主页（v18/v24）**：流程「点照片 → 主页 → 今日字卡 → 练习」，`enterStudent`/`homeGo` **不许直接 `startQuiz`**。预习**不写 logs**；字单按 `stuProfile().focus`，绝不用 `weightOf`（那里「待学」=0 排最前）。**出题必须收敛到 `PRE.list`**；`.is-pre` 藏「提示/读对了/跳过」。星星按掌握率每 20% 一颗；连续天数按**本地日**（`logs.last` 是 UTC）。点击委托里 `[data-pre]`/`#preGo`/`[data-wg-act]` 排在 `.opt` 之前（那几屏 `STATE.quiz` 是 null）。
- **答错可重试（v22）**：点错不判死，只 `.opt.miss`（灰+虚线+shake+`pointer-events:none`）；**第一次错绝不念答案，连错 2 次**才 `.glow` 正确项并念读音。一题最多记 1 次错；重试答对算 `alone++` 但 `wrong` 也 +1 → 停在「练习中」（刻意）。不加 `retry` 落库；每道新题 `resetQState()`。
- **同音干扰项（v38）**：听音找字/看拼音写字**不许同音**，判据 `pyKey=noTone(p)`（**声调去掉**）；`pickDistract` 三层「字表不同音 → 全库不同音 → 字表兜底」，保 4 选项，**目标字不许回退全库**。`SAME_SOUND_TYPES` 只这两个题型。
- **手写三题型（v25/v27）**：`汉字听写`/`词语听写`/`描红汉字`。**没有手写识别就不假装判分**：亮答案 + 人核对。描红记 `hinted`/`prompts`、**不记 `alone`**。手写不要求 4 个字、一次最多 6 个、读题**念词不念单字**。画布按 DPR 放大再 `setTransform` 缩回；尺寸 `wgLayout()` 算 px（**不用 `aspect-ratio`**），字号＝0.76 格宽；量宽两次（80ms 后）、**不挂 rAF**；**jsdom 没有 canvas** → 绘制先判空。**「看一眼」**亮 3 秒自动合上、每题一次、记 `promptUsed`；老师辅助栏「提示一下」**反过来永久亮**——区别是**谁按的**，别串成一条（v38 被打回）。窄屏四按钮 **2×2 等宽网格**（`flex-wrap` 会折成 3+1）。
- **听写与默写（v40 / T-035）**：乐园第六卡 `data-gp="dict"` 整行实线（虚线是「随便玩」专用）、**不进 `GAME_KEYS`**；`#scrGame.is-dict` 下 `.ga-word`/`#gameHint` 必须 `display:none`。**计分只有 `gameAward()` 一处**。听写**不写学习记录**。默写 `.blind` 要藏两层灰字（`#soBase`+`.so-ghost`）**和顶上「木 mù」**（后者 `visibility:hidden`，`display:none` 会塌行）；「再看一遍」＝放弃默写。
- **正确率两处同尺（v39 游戏 / v51 练习）**：`gameRight()` 按**这题错过没有**（`GAME.miss>0`）分 `oneTry`/`retried`；正确率 = `oneTry/总题数`，星数 `>=90/>=70/>=40`，点错过的就不算对。**v51 起练习结算页跟游戏一致**：`renderSummary()` 用 `oneTry = right - z.retried`、`rate = oneTry/denom`，`retried` 由 `gradeAnswer()` 按 `wrongLogged` 累加（一题一次，不落库）；`allDone && rate>=90` 才夸「太棒了」。原因：v22 答错可重试使 `right` 恒等于题数 → 旧口径必然 100%。**旧约定「练习结算页刻意不跟、重试不扣分」已作废**，别再按它改回去；G1 有防回潮护栏（不许 `right*100/denom`、游戏侧不许动）。
- **结算列错字（v45）**：一处组件 `wrongBodyHTML(list,label)`（按 `c.w` 去重、n<12、空表 `''`）+ 一处开关 `WRONG_LIST_TYPES`（只开听音找字）。游戏侧 `GAME.wrongs` 记 **`GAME.queue[GAME.i]`（目标字）**，不是点错的干扰项；练习侧 `STATE.quiz.wrongChars` 记 `q.target`，跟 `wrongLogged` 一题一次。全对整块不出现。`.game-over` 必须 `justify-content:safe center` + `overflow-y:auto`（390 场高 312px）。

## 三、语音 / 笔顺 / 词库
- **细则见 `docs/DETAIL-语音笔顺词库.md`**（豆包音色与链路、1695 条、「加语音改三处」；错误音方波；`soFit` 基线 900 与三层画法；`builtinWords()`、硬软冲突、按册次相对难度、`repairCharWords()` 三处必调）。**改这三块之前先读它。**
- **语音必须和首屏同时到（v43，别再试第二次）**：`boot()` 是 `p6.js` 末行 `else boot();` **同步执行**，不是 `DOMContentLoaded`。v41/v42 把语音包挪到 `</body>` 前 → 首屏 2.4 MB 就活了、语音 14.5 MB 才落地，窗口里 `voicePack` 是 null → `vaB64()` 空串 → `vaPlay` 走 `onEmpty` → `saySystem()` 浏览器自带语音。首屏越快没声音的窗口越长，已整体撤回。**「拿声音换速度」对课堂不成立。**

## 四、UI 与视觉（细节都在对应任务卡）
- **表单（v13）**：长列表容器内滚动（`.list-wrap{max-height:min(56vh,620px)}`），表单 DOM 排在列表前，`revealForm()` 滚动+聚焦，保存行 sticky；校验失败 `markField()` 红框+抖动+滚进视线。**「按钮不能用」三种：没跑 / 报错 / 跑了但结果在视口外——第三种最常被误判成第一种。**
- **进度页 / 结算页（v17/v31）**：`ringHTML(rate)` + `stackHTML(p)` + `.slg` + `.hp`，每人一行。**一屏只能有一个主按钮**；`.next-type` 写在 `.primary` 之后；鼓励语用 `.fb-say`（透明底），**不许 `.feedback`**。题型进度存 `wb2_sess_v1`（不进 STATE / 云端），跨天清零。主按钮 `inline-flex` 胶囊 + **SVG 箭头**（「→」基线会歪）。进度条长在题型名下面、每格自画横线、完成＝填满、`.on` 写在 `.done` 之后；**折行用等宽网格**：`grid-auto-flow:column + minmax(0,1fr)`。
- **手写操作条（v33）**：一行三个「再听/再看 → 擦掉 → 写好了」，`min-height:56 / radius:16`，白按钮也垫 `0 3px 0` 实色，说明单独一行 `.hw-tip`。**同一动作只许一套按钮、一个词。**
- **钓鱼（v44 / T-037）、果树（v46 / T-039）**：量位移只信 rect；收线＝整条线以竿尖为心等比缩、起点必须竿尖 (112,29)；`.fish` 动画关键帧压过 inline → 先 `animation:none` + `void offsetWidth` 再量。树画布 `320×300` + `meet`、树冠只改 `CROWN` 数组、`--gh` 与 `.game-field` 同公式、落叶先算落点再加 `.hit`；树干枝条**不许两种画法**（全圆头线段、深色粗一圈）。jsdom 把 `<circle/>` 序列化成成对标签 → 断言用属性选择器。**改这两块前先读任务卡。**
- **早读（v47 / T-040）**：第七卡 `data-gp="read"`，**不进 `GAME_KEYS`**；`pickStart()` 里 `kind==='read'` 交给 `startRead()`。**5 秒只有一个来源**：`READ_HOLD=5000` → `--hold` → CSS。**暂停必须存两样**：`readWait(ms,fn)` 同存 `left`+`job`。一批 `list.slice(READ.i, i+READ_TAKE)`，不许取余凑满四张。**新屏起类名先 grep**（`.read-next` 撞过 v18 → 改 `rd-` 前缀）。`showScreen` 兜「离开 read 就 `readStop(false)`」。不判分、不写 logs。
- **早读选字记忆（v49 / T-042）**：本机独立键 `wb2_read_pick_v1`，**只存汉字字符串**、按 `w` 回 `STATE.chars` 查（查不到跳过）；`pickBegin('read')` 预勾、`pickStart()` 只在 read 落盘，别的玩法仍从空开始；不进 STATE / 云端 / logs / 导出导入。`PICK.restored` 管提示，一改勾选就复位。
- **老师入口（v48 / T-041）**：希沃智慧屏旧版只发 `pointerup` 点两次进不去 → 四路兜底（按设备挑 touchend/pointerup/mouseup + `click` 兜底 + `dblclick` + 按住 900ms），`ENTRY_GAP=800`/`SLOP=80`/`HOLD=900`；**`click` 分支必须传 `false` 不刷新 `used`**，否则第二次 click 被自己的 700ms 去重挡掉。
- **游戏乐园（v35/v36）**：顶部三入口是**同一屏两个模式**（`LEARN.mode`），**导航高亮看 mode 不看 phase**；玩法卡走 `data-gp` 不复用 `data-gk`（那条读 `CARD_CH`）；选字态 `#pickBar` 是 `position:fixed` → **`showScreen` 必须兜 `pickEnd()`**；`startGame(kind, chars)` 收数组，别改引擎签名。
- **美术与窄屏**：鱼头右尾左、`fishSVG` viewBox `200×116`；动效幅度要看得见（±20px/3.4s、摆尾 ±13°）并用 `transform-box:fill-box`；**先分「没播」和「幅度太小」**。结算框 390 场高 312px → `@media(max-width:480px)` 收一档。≤640 导航字号 15 + 留白 12、≤420「学生练习」只留「练习」，否则 360/390 上导航折行。
- **截图探针**：造数据用 **`STATE.chars` 不是 `CHARS`**（`c.w` 是组词串 → 假 bug）。`--virtual-time-budget` 必加；headless 宽度被钳到 **492**（`--window-size=390` 只裁右边）→ 判溢出读 `scrollWidth === innerWidth`；验真实 390 用容器 inline 设宽量 `scrollHeight vs clientHeight`。量数值写进 `document.title` 再 `--dump-dom`。**headless 的 canvas 与合成层不跟虚拟时间**（带 `filter:drop-shadow` 必踩）→ 核位移只信 rect，看观感就别摆帧、写只点一下的副本拍两帧。
- **节奏**：全在 `p8.js` 的 `PACE`/`PACE_GAP`。用户敏感、多次返工——**调之前先问**。

## 五、工程纪律
- **文档**：`docs/` 的 `STATE.md`（先读）`00-功能清单` `01-HARNESS` `02-验收清单` `03-变更日志` `tasks/` `logs/`；每个任务一卡 + 一日志 + 变更一条，**不改文档等于没做完**。**发版铁律：先改 5 处 → 构建 → 门禁 → 发布**（`APP_VER`、`p2.html` 角标、`STATE.md`、功能清单、`README.md`）。`check_docs.py` 在 G1 里，改完文档要复跑。
- **门禁**：`python harness/run_gate.py`（G0 构建/体积/分片、G1 静态护栏、G2 五套测试、G3 报告）全绿才算做完；新增功能必须登记 `harness/manifest.json`、抬 `min_cases`。**红了先看是不是自己改了设计**：改断言测新行为、项数净增，**不能删断言过关**。核线上下载回来直接 `node smoke2.js <文件>`；**无头 Chrome 在 15 MB 页面上被 SIGKILL（exit 137）**。「0 失败但项数少几条」＝有断言没跑到：`for` 里 `ok()` 是炸弹，写成「循环只动手、末尾一次性核对」。取函数体 `split('function X')[1].split('function Y')[0]`——**Y 必须在 X 之后**。**判「旧类名已清掉」别判裸词**（注释会假红）；判样式先看是否被 `@media` / `max-width:100%` 干扰。`smoke2.js`/`check_lib.js` 要传 HTML 文件名，需 `NODE_PATH=~/.workbuddy/binaries/node/workspace/node_modules`。**`manifest.json` 关键符号表只认 `function/var/const/let` 声明或 `id="X"`**：`STATE.quiz.wrongLogged` 这类**属性**登记进去永远判红（v51 踩过）；改成同一条链上真有声明的函数（如 `pickOption`），属性另用 G1 行为护栏 + 测试覆盖，别删断言。
- **数字与副作用**：数字必须脚本现算，别抄上一版。必须发生的副作用别挂 `requestAnimationFrame`，用 `setTimeout`。新增 STATE 字段要同时改 `saveSnap`/`loadSnap`/导出/导入；**云端 schema 没列的字段一律不落库**（`GAME.queue` 装的是 `STATE.chars` 的**引用**）。

## 六、用户偏好与不做清单
- 特需学生：点击目标大、单指点击、**不要拖拽**；语音慢、句间有停顿。字卡主次：汉字 86px 主角、组词 22px 次要，没图不留空图位。图示覆盖 16%，**游戏不依赖图片**是刻意的。
- **不做**：排行榜/花园墙、虚拟货币、枯萎饥饿、抽奖盲盒、多页签。**奖励机制（小火车/花园/厨房/集卡/宠物）用户已放弃，不要再提**。
- 用户是特需班语文老师，讨厌重复手工排版，偏好「一键生成 + 可直接用」；**判分口径、节奏这类敏感参数先问再改**。
- **看截图判美观先归因再改**：说「乱」多半是对齐线不齐 / 同一动作多套样式，不是配色；改完必须自己截图看一遍。
- **范围要守住**：说「优化部分页面」就只改那一处。生成图形（图片/视频/3D）前**先二次确认张数与积分消耗**，>100 积分一律先停；一次一张，不并行。
