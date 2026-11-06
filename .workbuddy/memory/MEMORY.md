# 生活语文练习台 · 项目长期约定

（2026-11-06 三次压缩。具体数字以 `docs/STATE.md` 与脚本实跑为准，这里只留规则和坑。细则见 `docs/tasks/`、`docs/DETAIL-语音笔顺词库.md`。）

## 一、产物与发布
- 产物 `build/生活语文练习台.html`：15 段全内联（`p1 p2 p_open p_sfx p_art p_stroke lib p4 p8 p5 p_so p6 p7 p_close` + `p_voice.json`）；节点 `nU41kHmAoelqM2mGxWRFll`。构建 `cd build && python build_html.py`（`newline=''` 固定 LF，md5 可复现）。数据在本机 `localStorage['wb2_data_v1']`，云端只当镜像。
- 发布流程见 `docs/01-HARNESS.md`。① 用 `upload_curl.py`，**别用 `upload_page_artifact.py`**（urllib 走代理必 502）；② `commit_page_transaction.py` **必须带 `--message`**；③ 成功标志认 `KS_PAGE_COMMIT`；④ commit/publish/download 都随机 `TEMPORARY_ERROR` → **循环 1~6 次 + 10~12s 退避**；⑤ 两个入口都要传，md5 不同正常（pnid 不同）。⑥ 本机 curl 走 schannel，上传/下载**都要加 `--ssl-no-revoke`**（否则 `CRYPT_E_REVOCATION_OFFLINE`、HTTP 000 且「上传 0 字节」，看着像代理挂了）；⑦ 静态直链**目录 URL 直接取是 404，要带 `index.html`**。
- **线上不能字节比对**：平台注入 pnid、重排属性（大 ~24 KB 正常）→ 抽 `<style>`/各 `<script>` 逐块比，**两边都过滤空块**（线上多一个空 `inject.js`）。静态直链用 `list_page_publish_artifacts.py` 取 `data.url`；给用户前 curl grep **`APP_VER` 的值**，别 grep 角标。
- `lint_page_quality.py` 在 >2 MB 上要 16 分钟（后台跑或跳过）。
- **git**：`http.proxy` 和 `https.proxy` **两个都要设**成当前 `$https_proxy`（只设一个会 `Could not resolve host`）；走沙箱代理打 GitHub 必 502 → `env -u http_proxy …`；遇 `git-upload-pack unexpected disconnect` → `-c http.version=HTTP/1.1 -c http.lowSpeedLimit=1000 -c http.lowSpeedTime=25 -c http.schannelCheckRevoke=false`。**判断成功看 `git` 退出码，别 `| tail` 完看 `$?`**（管道永远 0）；失败别判死，6~8 次重试。

## 二、教学口径与数据结构
**字表**：出题**只认 `stu.chars`**，`groups` 只是来源标签；**空字表不回退全库**（G1 禁回潮）。字库 700 条仅 561 个不重复字 → 按字去重、走 `expandGroups`。云端 schema 无字表列 → `mergeCloudStudents` 必须继承本机 `chars`（`off` 同理）。`migrateStuChars` 是一次性快照（刻意）。测试字表必须在内置字库查得到，否则不足 4 个时 `startQuiz` 静默 return。

**进度**：**分母永远是 `stu.chars`**。四态「已掌握/练习中/需巩固/待学」；`stuProfile()` 一次算计数、掌握率、逐字明细、建议顺序（需巩固 → 练习中 prompts≥2 → 练习中 → 待学）。抽练 `QUIZ_FOCUS` 只缩目标字，**干扰项仍取整张字表**。**百分比落代码前先手算期望值**。进度条容器别嵌套（`#profBar` 自带 `.prog-bar`）。

**在学上限（v19）**：不新增 `cap`——`stu.count` 就是「在学字数」（3–10，默认 6），另有 `stu.active` 名单、`stu.lock`、`stu.off`。**在学名单永远补满**（学会让位 / 字表变大 / 上限调大三种空位都补）；手动加入 unshift 到最前，移出记 `off` 且补位跳过；`openStuProfile` 先 `syncActive` 再画。

**今日字卡 / 主页（v18/v24）**：流程「点照片 → 主页 → 今日字卡 → 练习」，`enterStudent`/`homeGo` **不许直接 `startQuiz`**。预习**不写 `logs`**；字单按 `stuProfile().focus`，绝不用 `weightOf`（那里「待学」=0 排最前）。**出题必须收敛到 `PRE.list`**；`.is-pre` 藏「提示/读对了/跳过」。星星按掌握率每 20% 一颗；连续天数按**本地日**（`logs.last` 是 UTC），今天没练从昨天数不清零。点击委托里 `[data-pre]`/`#preGo`/`[data-wg-act]` 要排在 `.opt` 之前（那几屏 `STATE.quiz` 是 null）。

**答错可重试（v22）**：点错不判死，只加 `.opt.miss`（灰+虚线+shake+`pointer-events:none`）；**第一次错绝不念答案，连错 2 次**才 `.glow` 正确项并念读音。一题最多记 1 次错；重试答对算 `alone++` 但 `wrong` 也 +1 → 停在「练习中」（刻意）。不加 `retry` 字段落库；每道新题必须 `resetQState()`。

**同音干扰项（v38）**：听音找字/看拼音写字**不许同音**（读 hé 时选项里有「禾」「和」，选哪个都对、程序只认一个）。判据 `pyKey = noTone(p)`（**声调去掉**）；`pickDistract` 三层「字表不同音 → 全库不同音 → 字表兜底」，保 4 个选项，**目标字不许回退全库**。「找一样的字」「图字配对」不改。`SAME_SOUND_TYPES` 只有这两个题型。

**手写三题型（v25/v27）**：`汉字听写`、`词语听写`、`描红汉字`。**没有手写识别就不假装判分**：亮答案 + 人核对。描红记 `hinted`/`prompts`、**不记 `alone`**。手写题型不要求 4 个字、一次最多 6 个、读题**念词不念单字**。画布按 DPR 放大再 `setTransform` 缩回；尺寸由 `wgLayout()` 算 px（**不用 `aspect-ratio`**），字号＝0.76 格宽；量宽两次（80ms 后），**不挂 rAF**。**jsdom 没有 canvas** → 绘制先判空。**「看一眼」**：亮 **3 秒自动合上**、每题一次、记 `promptUsed`；老师辅助栏「提示一下」**反过来永久亮**——区别是**谁按的**，**别串成一条**（v38 初版串了当天被退回）。窄屏听写四个按钮 **2×2 等宽网格**（`flex-wrap` 会折成 3+1）。

**听写与默写（v40，见 T-035）**：乐园第六张卡 `data-gp="dict"` 整行实线（虚线是「随便玩」专用）、**不进 `GAME_KEYS`**；`#scrGame.is-dict` 下 `.ga-word`/`#gameHint` 必须 `display:none`（否则答案摆屏幕上）。**计分只有 `gameAward()` 一处**，`gameRight` 体内不许再记 `oneTry/retried`。听写**不写学习记录**。默写 `.blind` 要藏**两层灰字**（`#soBase`+`.so-ghost`）**和顶上「木 mù」**——后者用 `visibility:hidden`（`display:none` 会塌行、格子往上跳）；「再看一遍」＝放弃默写。

**游戏正确率（v39）**：`gameRight()` 按**这题错过没有**（`GAME.miss > 0`）分 `oneTry`/`retried`；正确率 = `oneTry / 总题数`，星数 `>=90/>=70/>=40`。点错过的**就不算对**（老师选的）。**练习结算页刻意不跟**（那边「重试不扣分」），两处不同口径，别顺手统一。

**结算列错字（v45）**：一处组件 `wrongBodyHTML(list,label)`（`p4.js`：按 `c.w` 去重、`n<12`、空表返回 `''`）+ 一处开关 `WRONG_LIST_TYPES`（只开听音找字）。游戏侧 `GAME.wrongs` 在 `gameAward()` 里按 `GAME.miss>0` 记 **`GAME.queue[GAME.i]`（目标字）**，**绝不是点错的干扰项**；练习侧 `STATE.quiz.wrongChars` 记 `q.target`，跟 `wrongLogged` 一题一次。全对时整块不出现。`.game-over` 必须 `justify-content:safe center` + `overflow-y:auto`——390 上场高 312px，原来的 `center` 会把标题裁到屏外。

## 三、语音 / 笔顺 / 词库
**细则见 `docs/DETAIL-语音笔顺词库.md`**（豆包音色与链路、1695 条、「加语音改三处」；错误音方波；`soFit` 基线 900 与三层画法；`builtinWords()`、硬软冲突、按册次相对难度、`repairCharWords()` 三处必调）。**改这三块之前先读它。**

**语音必须和首屏同时到（v43 教训，别再试第二次）**：`boot()` 是 `p6.js` 末行 `else boot();` **同步执行**的，不是 `DOMContentLoaded`。v41/v42 把语音包挪到 `</body>` 前 → 首屏 2.4 MB 就活了、语音到 14.5 MB 才落地，这段窗口里 `voicePack` 是 null → `vaB64()` 空串 → `vaPlay` 走 `onEmpty` → `saySystem()` 用**浏览器自带语音**。首屏越快，没声音的窗口越长，已整体撤回。**「拿声音换速度」对课堂不成立。**

## 四、UI 与视觉
**表单（v13）**：长列表**容器内滚动**（`.list-wrap{max-height:min(56vh,620px)}`），表单 DOM 排在列表之前，`revealForm()` 滚动+聚焦，保存行 sticky；校验失败用 `markField()` 红框+抖动+滚进视线，**别只靠 toast**。「按钮不能用」三种：①没跑 ②报错 ③跑了但结果在视口外——**③ 最常被误判成 ①**。

**进度页 / 结算页（v17/v31）**：`ringHTML(rate)` 圆环 + `stackHTML(p)` 四段条 + `.slg` + `.hp`，每人一行。**一屏只能有一个主按钮**；`.next-type` 必须写在 `.primary` **之后**；鼓励语用 `.fb-say`（透明底），**不许用 `.feedback`**（有底色像按钮）。题型进度存 `wb2_sess_v1`（不进 STATE、不碰云端 schema），跨天清零。**主按钮别整行拉满** → `inline-flex` 圆角胶囊 + **SVG 箭头**（「→」基线会歪）。**进度条长在被描述的东西上**：题型名下面挂圆点，每格自画一段横线，首格切左半、末格切右半；完成＝**填满**；`.on` 写在 `.done` **之后**。**「一多就折行」用等宽网格治**：`grid-auto-flow:column + minmax(0,1fr)`。

**手写操作条（v33，两界面共用）**：一行三个「再听/再看 → 擦掉 → 写好了」（主按钮最后），`min-height:56 / radius:16`，主按钮只宽一圈，**白按钮也垫 `0 3px 0` 实色**。说明单独一行 `.hw-tip`。**同一动作只许一套按钮、一个词**。

**钓鱼「钓上来」（v44）**：`fishReel()` 方向用「竿尖→鱼」、位移用「鱼→竿尖」，符号写反线就甩到画面外；竿上本来画着一条 57px 装饰曲线，截图里看着「像连上了」，**连看两轮没发现**，只有量 `line.height == hypot(ax,ay)` 才抓得住。`.fish` 挂着 `animation:swim`，关键帧 transform 压过 inline → 必须先 `animation:none` + `void offsetWidth` 再量坐标（否则差 20~25px）。水花要等「钩住」（180ms）才炸。**收线＝整条线以竿尖为心等比缩**（`translate(tip)·scale(k)·translate(-tip)`，鱼位移 `弦×(k−1)`，`k = 竿尖到浮标距离/弦长`）：弧画死只缩 `stroke-dasharray` 会让线头沿死弧滑、鱼沿弦走，中途偏出 `sag`≈40px；线画在鱼**下面**（`.reel-svg` z-index 7 < 鱼 9）。**起点必须放在竿尖（112,29）而不是浮标**（老师第三次点出来）：竿的 SVG 里本来就画着 `.rod-string` `M112 29 Q122 58 116 86` + `.rod-bob`，从浮标起笔＝场上两根线；做法是起点挪到竿尖、起手切线沿用竿上那条线、把旧线与浮标 `opacity:0` 藏到收完再放回。二次贝塞尔管不住两头切线 → 用三次（C1 沿竿上切线×0.30 弦长、C2 沿弦×0.22）。

**果树 / 摘果子（v46，三版）**：树画布 `320×300` + `preserveAspectRatio="xMidYMid meet"`（旧版 400×250 配 `none` 被拉宽）；树冠 10 团叶簇并成 **284×224（1.27:1）**（第三版老师「树冠可以再大一点」→ 以 (161,123) 为心放大 1.13 倍，**只改 `CROWN` 数组就够**，树干/果子网格/掉落都不用动），轮廓圈用「圆按 r+2.5 涂深绿 + 并集 clip」画，别手画闭合路径。树/果子/果篮必须在同一个 `.tree-stage` 里（`width:min(96%,calc(var(--gh)*0.9))` + `aspect-ratio:320/300`），**`--gh` 必须和 `.game-field` 的 height/max-height 同一条公式**。掉落用 `fruitDropTo()` 量 rect 写 `--fd-x/--fd-y`，**先算落点再加 `.hit`**；keyframes 写死位移落不进篮子。**树干衔接（第二版被打回）**：主干与枝条**不许两种画法**——多边形填充 + 渐变配描边线段，交界必出平顶两个尖角；全部改圆头线段、**深色永远比面色粗一圈**（40/30、30/20），圆头露出来自动长成树杈；分叉 69°、分叉点 y=236 让树冠盖住上半截，「腋窝」补同色圆点填小三角。**高光用 `linecap="butt"` 且别画到主干顶**。**果子 `clamp(84px,11vw,118px)`／字 46**（104 太小，原话「整个树冠一片绿色就挂四个果子好空」）。单独放大核对用 `build/shot_tree_zoom.py`。jsdom 把 `<circle/>` 序列化成成对标签 → 断言用 `querySelector('circle[cx=…][cy=…]')`。

**早读模式（v47）**：乐园第七张卡 `data-gp="read"`，**不进 `GAME_KEYS`**（随便玩不随机到带读）；`pickStart()` 里 `kind==='read'` 交给 `startRead()`，不进游戏引擎；按钮文案走 `pickVerb()`。**5 秒只有一个来源**：`READ_HOLD=5000` → 写 `--hold` → CSS `animation:rdHold var(--hold,5s)`。**暂停必须存两样**：`readWait(ms,fn)` 同时存 `left`+`job`，否则「5 秒跟读」和「1.7 秒换批」接不上；进度条用 `animation-play-state:paused` 同步停。**一批用 `list.slice(READ.i, READ.i + READ_TAKE)`**，不许取余凑满四张。**新屏起类名先 grep**：`.read-next`/`.read-tip` 撞了 v18 今日字卡 → 整套改 `rd-` 前缀。牌桌高度别写死 vh（宽屏空桌面）用 `height:auto`；窄屏 2×2 反过来必须给死高度。`showScreen` 里兜「离开 read 就 `readStop(false)`」。早读不判分、不写 logs。

**游戏美术（v9/v10）**：鱼头右尾左，`fishSVG` viewBox `200×116`；`.game-field` `max-height:min(620px,80vw)`；动效要看得见幅度（±20px/3.4s、摆尾 ±13°），`transform-box:fill-box`。**先分「没播」和「幅度太小」**；报「画得不对」先核 SVG 坐标。**结算框窄屏**：390 场高 312px → `@media(max-width:480px)` 收一档（title 24 / stars 38 / 按钮 46）。

**游戏乐园（v35→v36）**：顶部三个入口「认字 / 游戏乐园 / 学生练习」是**同一屏的两个模式**（`LEARN.mode`），**导航高亮看 mode 不看 phase**；字格/搜索/册次/勾选全部复用。玩法卡走 `data-gp`，**不许复用 `data-gk`**（那条委托读 `CARD_CH`，乐园里是 null）。选字态 `PICK.on` + 底部 `#pickBar`（`position:fixed`）→ **`showScreen` 里必须兜 `pickEnd()`**。`startGame(kind, chars)` 收数组，**别改引擎签名**。

**截图探针**：造数据用 **`STATE.chars`，不是 `CHARS`**（`c.w` 是组词串 → 假 bug）。`--virtual-time-budget` 必加。headless 宽度被钳到 **492**（`--window-size=390` 只裁右边）→ 判溢出读 `scrollWidth === innerWidth`；验真实 390 用容器 inline 设 390 宽量 `scrollHeight vs clientHeight`。量数值写进 `document.title` 再 `--dump-dom` 读；**headless 的 canvas 与合成层都不跟虚拟时间**：给元素摆帧后 rect 变了、截出来还是旧位置（带 `filter:drop-shadow` 的元素必踩，`.fish` 三次误判都是它）→ **核位移只信 rect；要看真实观感就别摆帧，写个只点一下的副本（`_click_only.html`）拍两帧。**

**节奏**：全在 `p8.js` 的 `PACE`/`PACE_GAP`。用户敏感、多次返工——**调之前先问**。

## 五、工程纪律
**文档**：`docs/` 的 `STATE.md`（先读）`00-功能清单` `01-HARNESS` `02-验收清单` `03-变更日志` `tasks/` `logs/`；每个任务一卡 + 一日志 + 变更一条，**不改文档等于没做完**。**发版铁律：先改 5 处 → 构建 → 门禁 → 发布**（`APP_VER`、`p2.html` 角标、`STATE.md` 现状、功能清单、`docs/README.md`）。`build/check_docs.py` 在 G1 里，**改完文档要复跑**。

**门禁**：`python harness/run_gate.py`（G0 构建/体积/分片、G1 静态护栏、G2 五套测试、G3 报告），全绿才算做完；新增功能必须登记 `harness/manifest.json`、抬 `min_cases`。**红了先看是不是自己改了设计**：改断言测新行为、项数净增，**不能删断言过关**。**核线上不必截图**：下载回来直接 `node smoke2.js <文件>`；**无头 Chrome 在 15 MB 页面上被 SIGKILL（exit 137）**。**「0 失败但项数少几条」＝有断言没跑到**：`for` 里 `ok()` 都是炸弹，写成「循环只动手、末尾一次性核对」。取函数体 `split('function X')[1].split('function Y')[0]`——**Y 必须在 X 之后**。**判「旧类名已清掉」别判裸词**（注释里的历史说明会假红）；判样式先看是否被 `@media` 或 `max-width:100%` 干扰。`smoke2.js`/`check_lib.js` 要传 HTML 文件名，需 `NODE_PATH=~/.workbuddy/binaries/node/workspace/node_modules`。

**数字与副作用**：数字必须脚本现算，别抄上一版。必须发生的副作用别挂 `requestAnimationFrame`，用 `setTimeout`。新增 STATE 字段要同时改 `saveSnap`/`loadSnap`/导出/导入；**云端 schema 没列的字段一律不落库**（`GAME` 这类纯运行时对象也别写进字对象——`GAME.queue` 装的是 `STATE.chars` 的**引用**）。

## 六、用户偏好与不做清单
- 特需学生：点击目标大、单指点击、**不要拖拽**；语音慢、句间有停顿。字卡主次：汉字 86px 主角、组词 22px 次要，没图不留空图位。图示覆盖 16%，**游戏不依赖图片**是刻意的。
- **不做**：排行榜/花园墙、虚拟货币、枯萎饥饿、抽奖盲盒、多页签。**奖励机制（小火车/花园/厨房/集卡/宠物）用户已放弃，不要再提**。
- 用户是特需班语文老师，讨厌重复手工排版，偏好「一键生成 + 可直接用」；**判分口径、节奏这类敏感参数先问再改**。
- **看截图判美观先归因再改**：说「乱」多半是对齐线不齐 / 同一动作多套样式，不是配色；改完必须自己截图看一遍。
- **范围要守住**：说「优化部分页面」就只改那一处。生成图形类任务先问积分。
- **老师入口（v48）**：希沃智慧屏上只发 `pointerup` 的旧版点两次进不去 → 现在四路兜底（按设备挑 touchend/pointerup/mouseup + `click` 兜底 + `dblclick` + 按住 900ms），`ENTRY_GAP=800`/`ENTRY_SLOP=80`/`ENTRY_HOLD=900`；`click` 分支必须传 `false` 不刷新 `used`，否则第二次 click 被自己的 700ms 去重挡掉。**长按不再算废弃，是三条并列的进法之一。**
- 窄屏收法缺一不可：≤640 导航字号 15 + 留白 12、≤420「学生练习」只显示「练习」，否则 360/390 上导航从 60px 折成 80px。
