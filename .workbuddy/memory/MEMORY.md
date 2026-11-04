# 生活语文练习台 · 项目长期约定

（2026-11-04 压缩。数字以 `docs/STATE.md` 和脚本实跑为准，这里只留规则与踩过的坑。）

## 一、产物与发布
- 产物 `build/生活语文练习台.html`：单文件全内联 15 段（`p1 p2 p_open p_sfx p_art p_stroke lib p4 p8 p5 p_so p6 p7 p_close` + `p_voice.json`）；节点 `nU41kHmAoelqM2mGxWRFll` → https://workbuddy.link/p/nU41kHmAoelqM2mGxWRFll
- 构建 `cd build && python build_html.py`（`newline=''` 固定 LF，md5 可复现）。数据在本机 `localStorage['wb2_data_v1']`，云端只是镜像（断网可用）。
- 发布细节见 `docs/01-HARNESS.md`，几条不能忘：① 用 `build/upload_curl.py`，**别用 `upload_page_artifact.py`**（urllib 走代理必 502）；② `commit_page_transaction.py` **必须带 `--message`**（缺了直接报错，不是网络问题）；③ **成功标志认 `KS_PAGE_COMMIT`，不是 "COMMITTED"**——认错会白跑重试、后面全报 `transaction not found`；④ commit/publish/download 都随机 `TEMPORARY_ERROR`，**循环 1~6 次 + 10~12s 退避**，别单发一次判死；⑤ 两个入口（`index.html` + 中文名）都要传，两份 md5 不同正常（每路径 pnid 不同），只对齐版本与大小。
- **线上不能字节比对**：平台注入 pnid 并重排属性（大 ~24 KB 正常）→ 抽 `<style>`/各 `<script>` 逐块比，**两边都过滤空块**（线上多一个空 `inject.js`）。
- 静态直链：新版用 `list_page_publish_artifacts.py` 取 `data.url`（`create_page_transaction` 给的是旧目录）；给用户前 curl grep 一次 **`APP_VER` 的值**。**别 grep 角标 `>v31<`**（平台往 `#appVer` 插了 pnid 注释）。
- `lint_page_quality.py` 在 >2 MB 上要 16 分钟（后台跑或跳过）；**分享卡/二维码**细则见 `DETAIL-语音笔顺词库.md`。
- **git**：`http.proxy` 每次开机都变 → fetch/push 一律 6~8 次重试。**走沙箱代理打 GitHub 必 502**（`curl` 走代理 000 / `--noproxy '*'` 200）→ 去掉 proxy 并 `env -u http_proxy … git push`；直连遇 HTTP2 framing / 吊销检查 → `-c http.version=HTTP/1.1 -c http.lowSpeedLimit=1000 -c http.lowSpeedTime=25 -c http.schannelCheckRevoke=false`。别在同一档参数上死磕。

## 二、教学口径与数据结构
**字表**：出题**只认 `stu.chars`**，`groups` 只是来源标签；**空字表不回退全库**（G1 禁回潮）。字库 700 条仅 561 个不重复字 → 按字去重、走 `expandGroups`。云端 schema 无字表列 → `mergeCloudStudents` 必须继承本机 `chars`（`off` 同理）。`migrateStuChars` 是一次性快照（刻意）。测试字表必须在内置字库查得到，否则不足 4 个时 `startQuiz` 静默 return。

**进度**：**分母永远是 `stu.chars`**。四态「已掌握/练习中/需巩固/待学」；`stuProfile()` 一次算计数、掌握率、逐字明细、建议顺序（需巩固 → 练习中 prompts≥2 → 练习中 → 待学）。抽练 `QUIZ_FOCUS` 只缩目标字，**干扰项仍取整张字表**。**百分比落代码前先手算期望值**（这类 bug 不报错、数还看着合理）。进度条容器别嵌套（`#profBar` 自带 `.prog-bar`；`progSegsHTML()` 只产 `<i>`）。

**在学上限（v19）**：不新增 `cap`——`stu.count` 就是「在学字数」（3–10，默认 6），`stu.active` 名单、`stu.lock` 锁定、`stu.off` 手动移出。`levelOf` 与状态机是两个维度，档案页分两行写。**在学名单永远补满**（学会让位 / 字表变大 / 上限调大三种空位都要补）；手动加入 unshift 到最前，移出记 `stu.off` 且补位跳过；`openStuProfile` 先 `syncActive` 再画。

**今日字卡 / 主页（v18/v24）**：流程「点照片 → 主页 → 今日字卡 → 练习」，`enterStudent`/`homeGo` **不许直接 `startQuiz`**。预习**不写 `logs`**；字单按 `stuProfile().focus`，绝不用 `weightOf`（那里「待学」=0 排最前）。**出题必须收敛到 `PRE.list`**；`.is-pre` 藏「提示/读对了/跳过」。星星按掌握率每 20% 一颗；连续天数按**本地日**（`logs.last` 是 UTC），今天没练从昨天数不清零。点击委托里 `[data-pre]`/`#preGo`/`[data-wg-act]` 要排在 `.opt` 之前（那几屏 `STATE.quiz` 是 null）。

**答错可重试（v22）**：点错不判死，只加 `.opt.miss`（灰+虚线+shake+`pointer-events:none`）；**第一次错绝不念答案，连错 2 次**才 `.glow` 正确项并念读音。一题最多记 1 次错，保持 `alone+hinted+wrong===n`；重试答对算 `alone++` 但 `wrong` 也 +1 → 停在「练习中」（刻意）。不加 `retry` 字段落库；每道新题必须 `resetQState()`。

**同音干扰项（v38）**：听音找字/看拼音写字的干扰项**不许同音**——读 hé 时选项里有「禾」和「和」，孩子选哪个都对、程序只认一个。判据 `pyKey = noTone(p)`（**声调一起去掉**，hé/hē 同组）；`pickDistract` 三层「字表不同音 → 全库不同音 → 字表兜底」，保证 4 个选项，**目标字不许回退全库**。「找一样的字」「图字配对」不改（线索是字形/实物）。`SAME_SOUND_TYPES` 只有这两个题型。

**手写三题型（v25/v27）**：`汉字听写`（听单字一框）、`词语听写`（听整词一字一格）、`描红汉字`（灰楷体照着描）。**没有手写识别就不假装判分**：亮答案 + 人核对。描红记 `hinted`/`prompts`、**不记 `alone`**。手写题型不要求 4 个字、一次最多 6 个、读题**念词不念单字**。画布按 DPR 放大再 `setTransform` 缩回；尺寸由 `wgLayout()` 算 px（**不用 `aspect-ratio`**），字号＝0.76 格宽；量宽两次（80ms 后），**不挂 rAF**。**jsdom 没有 canvas** → 绘制先判空。**「看一眼」（v38）**：亮 **3 秒自动合上**、按钮倒数、**每题一次**、记 `promptUsed`；老师辅助栏「提示一下」**反过来永久亮**——区别不是动作而是**谁按的**，**别把两条串成一条**（v38 初版串了当天被退回）。窄屏听写四个按钮 **2×2 等宽网格**（`flex-wrap` 会折成 3+1）。

**游戏正确率（v39）**：`gameRight()` 按**这一题错没过**（`GAME.miss > 0`）分两个账：`oneTry`（一次就点对）/`retried`（试过才找到）；正确率 = `oneTry / 总题数`，星数 `>=90 / >=70 / >=40`（与练习结算页同尺）。点错过的**就不算对**（老师选的），结算框直接写「正确率 83% · 得了 90 分」+ `.go-note`「找到 6 / 6 个，有 1 个是试了才找到的」；**分数公式不动**（答错本来就断连击）。**练习结算页刻意不跟**：那边是 v22 口径「重试不扣分、只补一行『其中 N 题是试了再答对的』」——两处不同口径，别顺手统一。

## 三、语音与音效
**细则见 `DETAIL-语音笔顺词库.md`**（豆包音色/链路/1695 条/「加语音改三处」；错误音方波参数与试听页）。改之前先读。

## 四、UI 与视觉
**表单（v13）**：长列表**容器内滚动**（`.list-wrap{max-height:min(56vh,620px)}`），表单 DOM 排在列表之前，`revealForm()` 滚动+聚焦，保存行 sticky；校验失败用 `markField()` 红框+抖动+滚进视线，**别只靠 toast**。「按钮不能用」三种：①没跑 ②报错 ③跑了但结果在视口外——**③ 最常被误判成 ①**。

**进度页 / 结算页（v17/v31）**：`ringHTML(rate)` 圆环 + `stackHTML(p)` 四段条 + `.slg` 数字 + `.hp` 胶囊，每人一行。**一屏只能有一个主按钮**；`.next-type` 必须写在 `.primary` **之后**（同优先级后写者胜，已进 G1）；鼓励语用 `.fb-say`（透明底），**不许用 `.feedback`**（有底色像按钮）。题型进度存 `wb2_sess_v1`（不进 STATE、不碰云端 schema），跨天清零、换学生换一份。**主按钮不要整行拉满** → `inline-flex` 圆角胶囊，小字 + 大字 + **SVG 箭头**（「→」字符基线会歪）。**进度条要长在被描述的东西上**：题型名下面挂圆点，每格自画一段横线，首格切左半、末格切右半；完成＝**填满**，不打勾不塞数字；`.on` 写在 `.done` **之后**。**「一多就折行」用等宽网格治**：`grid-auto-flow:column + minmax(0,1fr)`。

**手写操作条（v33，两界面共用）**：`.hw-acts` 一行三个「再听/再看 → 擦掉 → 写好了」（主按钮最后），全部 `min-height:56 / radius:16`，主按钮只宽一圈，**白按钮也垫 `0 3px 0` 实色**。说明**单独一行** `.hw-tip`。**同一动作只许一套按钮、一个词**（擦掉就叫「擦掉」，不随状态改字）。

**游戏美术（v9/v10）**：鱼头右尾左，`fishSVG` viewBox `200×116`；果树用整棵 `treeSVG()`。`.game-field` 有 `max-height:min(620px,80vw)`；动效要看得见幅度（±20px/3.4s、摆尾 ±13°），`transform-box:fill-box`。**先分「没播」和「幅度太小」**；报「画得不对」先核 SVG 坐标。**结算框窄屏**：390 的手机上场高只有 312px，四行字 + 按钮会顶边 → `@media(max-width:480px)` 收一档（title 24 / stars 38 / 按钮 46）。

**游戏乐园（v35→v36）**：顶部三个入口「认字 / 游戏乐园 / 学生练习」是**同一屏的两个模式**（`LEARN.mode`），**导航高亮必须看 mode 不看 phase**；字格/搜索/册次/勾选圆圈全部复用，不另做字表。玩法卡走 `data-gp`，**不许复用 `data-gk`**（那条委托读 `CARD_CH`，乐园里是 null → 只会弹「先选一个字」什么也不发生）。`#gpMask` 遮罩 v36 已拆（玩法卡直接摆页面），「全班一起玩」变第五张「随便玩」卡（`playAny`）。选字态 `PICK.on` + 底部 `#pickBar`（`position:fixed`）→ **`showScreen` 里必须兜一道 `pickEnd()`**，否则飘到老师端/练习页上。`startGame(kind, chars)` 本来就收数组，整批交进去即可，**别改引擎签名**。

**截图探针**：造数据用 **`STATE.chars`，不是 `CHARS`**（`c.w` 是组词串 → 假 bug）。`--virtual-time-budget` 必加。headless 窗口宽度被钳到 **492**（`--window-size=390` 会「看起来溢出」，其实是截图裁掉了右边）→ 判溢出读 `scrollWidth === innerWidth`；**要验真实 390 排版：把场/容器 inline 设成 390 宽并量 `scrollHeight vs clientHeight`**，验媒体查询就把断点临时调大让 492 也命中。量数值写进 `document.title` 再 `--dump-dom` 读；**headless 截图的 canvas 层不刷新** → 判 canvas 只信 `getImageData` 像素统计。

**节奏**：全在 `p8.js` 的 `PACE`/`PACE_GAP`。用户敏感、多次返工——**调之前先问**。

## 五、笔顺与描写（v27）
**细则见 `DETAIL-语音笔顺词库.md`**（y 轴朝上基线 900 的 `soFit`、三层画法、笔迹层只有一块、橡皮擦两处同步）。改之前先读。

## 六、工程纪律
**文档**：`docs/` 的 `STATE.md`（先读）`00-功能清单` `01-HARNESS` `02-验收清单` `03-变更日志` `tasks/` `logs/`；每个任务一卡 + 一日志 + 变更一条，**不改文档等于没做完**。**发版铁律：先改 5 处 → 构建 → 门禁 → 发布**（`APP_VER`、`p2.html` 角标、`STATE.md` 现状、功能清单 4.3.8、`docs/README.md`）。`build/check_docs.py` 在 G1 里，**改完文档要复跑**（先门禁后改文档必红）。

**门禁**：`python harness/run_gate.py`（G0 构建/体积/分片、G1 静态护栏、G2 五套测试、G3 报告），全绿才算做完；新增功能必须登记 `harness/manifest.json` 符号、抬 `min_cases`。当前基线 **149 项 / 812 项测试**。**红了先看是不是自己改了设计**：改断言测新行为、项数净增，**不能删断言过关**。**核线上不必非截图**：把线上那份下载回来直接 `node smoke2.js <文件>`，比截图硬；**无头 Chrome 在 15 MB 页面上会被 SIGKILL（exit 137）**，不是环境坏。

**「0 失败但项数少几条」＝有断言没跑到**：`for` 里 `ok()`、`if(...) ok()` 都是定时炸弹，写成「循环只动手、末尾一次性核对」。取函数体 `split('function X')[1].split('function Y')[0]`——**Y 必须在 X 之后**。**判「旧类名/旧文案已清掉」别判裸词**：注释里的历史说明会假红，只判 `class="X"` / `.X{` / 带 ASCII 引号的字面量 / `>X<`；判样式先看是否被 `@media` 或 `max-width:100%` 干扰。**先怀疑工具口径**；`smoke2.js`/`check_lib.js` 要传 HTML 文件名，需 `NODE_PATH=~/.workbuddy/binaries/node/workspace/node_modules`。

**数字与副作用**：数字必须脚本现算，别抄上一版。必须发生的副作用别挂 `requestAnimationFrame`，用 `setTimeout`。新增 STATE 字段要同时改 `saveSnap`/`loadSnap`/导出/导入；**云端 schema 没列的字段一律不落库**（`GAME` 这类纯运行时对象也别写进字对象——`GAME.queue` 装的是 `STATE.chars` 的**引用**，写 `q.retried = 1` 会污染字表存档）。

## 七、词库与拼词语
**细则见 `DETAIL-语音笔顺词库.md`**（只读派生 `builtinWords()`、硬软冲突、按册次的相对难度、`repairCharWords()` 三处必调）。**判分口径不许自己改**。

## 八、用户偏好与不做清单
- 特需学生：点击目标大、单指点击、**不要拖拽**；语音慢、句间有停顿。字卡主次：汉字 86px 主角、组词 22px 次要，没图不留空图位。图示覆盖 16%，**游戏不依赖图片**是刻意的。
- **不做**：排行榜/花园墙、虚拟货币、枯萎饥饿、抽奖盲盒、多页签。**奖励机制（小火车/花园/厨房/集卡/宠物）用户已明确放弃，不要再提**。
- 用户是特需班语文老师，讨厌重复手工排版，偏好「一键生成 + 可直接用」；**判分口径、节奏这类敏感参数先问再改**，别自作主张「优化」。
- **看截图判美观先归因再改**：说「乱」多半是对齐线不齐 / 同一动作多套样式，不是配色；改完必须自己截图看一遍。
- 老师入口是「连点两下」（v34，520ms 内两次 `pointerup`、落点 40px 内）；长按已废弃，别再改回去。
- 窄屏收法缺一不可：≤640 导航字号 15 + 留白 12、≤420「学生练习」只显示「练习」，否则 360/390 上导航从 60px 折成 80px。
