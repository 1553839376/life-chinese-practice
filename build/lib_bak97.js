/* ================= 内置字库与图示素材（种子数据，首次可一键导入数据表） ================= */
var CL = '<' + '/';
/* ================= 字库与图示素材（全部内联，零外部依赖） ================= */
var STAGES = ['象形基础', '数字方位', '家人身体', '生活常用'];
var STAGE_FULL = ['象形基础', '数字方位', '家人身体', '生活常用'];

/* a = 图示 key；an = 图示参数；w = 组词；s = 例句 */
var CHARS = [
/* ---------- 阶段一：象形基础 24 ---------- */
{c:'日',p:'rì',st:0,a:'sun',w:'太阳、日光',s:'太阳也叫「日」。'},
{c:'月',p:'yuè',st:0,a:'moon',w:'月亮、月光',s:'月亮弯弯像小船。'},
{c:'山',p:'shān',st:0,a:'mountain',w:'大山、上山',s:'周末我们去爬山。'},
{c:'水',p:'shuǐ',st:0,a:'water',w:'喝水、河水',s:'渴了要多喝水。'},
{c:'火',p:'huǒ',st:0,a:'fire',w:'火苗、大火',s:'火很危险，不能用手碰。'},
{c:'木',p:'mù',st:0,a:'tree',w:'木头、树木',s:'桌子是木头做的。'},
{c:'人',p:'rén',st:0,a:'person',w:'大人、好人',s:'我是一个好孩子。'},
{c:'口',p:'kǒu',st:0,a:'mouth',w:'开口、人口',s:'「口」就是嘴巴。'},
{c:'目',p:'mù',st:0,a:'eye',w:'目光、耳目',s:'「目」就是眼睛。'},
{c:'手',p:'shǒu',st:0,a:'hand',w:'小手、手心',s:'吃饭前要洗小手。'},
{c:'田',p:'tián',st:0,a:'field',w:'田地、水田',s:'田里种着稻子。'},
{c:'土',p:'tǔ',st:0,a:'soil',w:'泥土、土地',s:'花草长在土里。'},
{c:'上',p:'shàng',st:0,a:'up',w:'上面、上山',s:'书本放在桌子上。'},
{c:'下',p:'xià',st:0,a:'down',w:'下面、下雨',s:'小猫躲在桌子下。'},
{c:'大',p:'dà',st:0,a:'big',w:'大人、大米',s:'大象的身体很大。'},
{c:'小',p:'xiǎo',st:0,a:'small',w:'小鸟、小心',s:'小鸟在树上叫。'},
{c:'中',p:'zhōng',st:0,a:'middle',w:'中间、中午',s:'中午要好好吃饭。'},
{c:'天',p:'tiān',st:0,a:'sky',w:'天空、白天',s:'天上有白白的云。'},
{c:'云',p:'yún',st:0,a:'cloud',w:'白云、云朵',s:'白云像一朵棉花。'},
{c:'雨',p:'yǔ',st:0,a:'rain',w:'下雨、雨水',s:'下雨了要带雨伞。'},
{c:'石',p:'shí',st:0,a:'stone',w:'石头、大石',s:'路边有一块石头。'},
{c:'门',p:'mén',st:0,a:'door',w:'大门、开门',s:'回家要先开大门。'},
{c:'鸟',p:'niǎo',st:0,a:'bird',w:'小鸟、鸟叫',s:'小鸟有翅膀会飞。'},
{c:'鱼',p:'yú',st:0,a:'fish',w:'小鱼、金鱼',s:'鱼在水里游来游去。'},
/* ---------- 阶段二：数字方位 20 ---------- */
{c:'一',p:'yī',st:1,a:'dots',an:1,w:'一个、一起',s:'我有一本新书。'},
{c:'二',p:'èr',st:1,a:'dots',an:2,w:'二月、二个',s:'我有二只手。'},
{c:'三',p:'sān',st:1,a:'dots',an:3,w:'三天、三个',s:'桌上有三个苹果。'},
{c:'四',p:'sì',st:1,a:'dots',an:4,w:'四季、四个',s:'小凳子有四条腿。'},
{c:'五',p:'wǔ',st:1,a:'dots',an:5,w:'五月、五个',s:'一只手有五个手指。'},
{c:'六',p:'liù',st:1,a:'dots',an:6,w:'六月、六个',s:'树上有六只小鸟。'},
{c:'七',p:'qī',st:1,a:'dots',an:7,w:'七月、七个',s:'草地上开了七朵花。'},
{c:'八',p:'bā',st:1,a:'dots',an:8,w:'八月、八个',s:'天上有八颗星星。'},
{c:'九',p:'jiǔ',st:1,a:'dots',an:9,w:'九月、九个',s:'鱼缸里有九条鱼。'},
{c:'十',p:'shí',st:1,a:'dots',an:10,w:'十月、十个',s:'十是个整数。'},
{c:'百',p:'bǎi',st:1,a:'dots',an:40,w:'一百、百花',s:'一百比十大很多。'},
{c:'千',p:'qiān',st:1,a:'dots',an:70,w:'一千、千里',s:'一千比一百还要多。'},
{c:'万',p:'wàn',st:1,a:'dots',an:100,w:'一万、万里',s:'一万是最大的一个。'},
{c:'多',p:'duō',st:1,a:'dots',an:14,w:'很多、多少',s:'糖盒里的糖很多。'},
{c:'少',p:'shǎo',st:1,a:'dots',an:2,w:'很少、多少',s:'杯里的水太少了。'},
{c:'长',p:'cháng',st:1,a:'long',w:'长短、长大',s:'长颈鹿的脖子很长。'},
{c:'短',p:'duǎn',st:1,a:'short',w:'短裤、长短',s:'铅笔写短了要换新的。'},
{c:'高',p:'gāo',st:1,a:'tall',w:'身高、高山',s:'爸爸个子很高。'},
{c:'低',p:'dī',st:1,a:'low',w:'低头、高低',s:'小草长得低低的。'},
{c:'半',p:'bàn',st:1,a:'half',w:'一半、半天',s:'我吃了半个苹果。'},
/* ---------- 阶段三：家人身体 24 ---------- */
{c:'爸',p:'bà',st:2,a:'family',w:'爸爸、爸妈',s:'爸爸下班回来了。'},
{c:'妈',p:'mā',st:2,a:'family',w:'妈妈、妈咪',s:'妈妈给我做好吃的。'},
{c:'爷',p:'yé',st:2,a:'family',w:'爷爷、老爷',s:'爷爷带我去公园。'},
{c:'奶',p:'nǎi',st:2,a:'family',w:'奶奶、牛奶',s:'奶奶给我讲故事。'},
{c:'哥',p:'gē',st:2,a:'family',w:'哥哥、大哥',s:'哥哥陪我一起玩。'},
{c:'姐',p:'jiě',st:2,a:'family',w:'姐姐、大姐',s:'姐姐教我写字。'},
{c:'弟',p:'dì',st:2,a:'family',w:'弟弟、小弟',s:'弟弟还很小。'},
{c:'妹',p:'mèi',st:2,a:'family',w:'妹妹、小妹',s:'妹妹喜欢画画。'},
{c:'我',p:'wǒ',st:2,a:'person',w:'我们、自我',s:'我要自己穿衣服。'},
{c:'你',p:'nǐ',st:2,a:'person',w:'你好、你们',s:'你好，我叫小明。'},
{c:'他',p:'tā',st:2,a:'person',w:'他们、他的',s:'他是我的好朋友。'},
{c:'家',p:'jiā',st:2,a:'house',w:'回家、家人',s:'放学要按时回家。'},
{c:'头',p:'tóu',st:2,a:'head',w:'头发、点头',s:'我点点头说「好」。'},
{c:'耳',p:'ěr',st:2,a:'ear',w:'耳朵、木耳',s:'耳朵用来听声音。'},
{c:'鼻',p:'bí',st:2,a:'nose',w:'鼻子、鼻涕',s:'鼻子用来闻味道。'},
{c:'嘴',p:'zuǐ',st:2,a:'mouth',w:'嘴巴、张嘴',s:'嘴巴用来吃饭说话。'},
{c:'牙',p:'yá',st:2,a:'tooth',w:'牙齿、刷牙',s:'每天早晚要刷牙。'},
{c:'舌',p:'shé',st:2,a:'tongue',w:'舌头、口舌',s:'舌头能尝出甜味。'},
{c:'心',p:'xīn',st:2,a:'heart',w:'开心、小心',s:'今天我很开心。'},
{c:'脸',p:'liǎn',st:2,a:'head',w:'洗脸、笑脸',s:'早上起来要洗脸。'},
{c:'身',p:'shēn',st:2,a:'body',w:'身体、身子',s:'多运动身体好。'},
{c:'力',p:'lì',st:2,a:'body',w:'力气、用力',s:'我用力推开大门。'},
{c:'脚',p:'jiǎo',st:2,a:'foot',w:'小脚、脚步',s:'我用小脚走路。'},
{c:'眼',p:'yǎn',st:2,a:'eye',w:'眼睛、眼泪',s:'眼睛要好好保护。'},
/* ---------- 阶段四：生活常用 29 ---------- */
{c:'吃',p:'chī',st:3,a:'bowl',w:'吃饭、好吃',s:'到点要好好吃饭。'},
{c:'喝',p:'hē',st:3,a:'cup',w:'喝水、喝汤',s:'天热要多喝水。'},
{c:'走',p:'zǒu',st:3,a:'run',w:'走路、走开',s:'过马路要慢慢走。'},
{c:'跑',p:'pǎo',st:3,a:'run',w:'跑步、快跑',s:'在操场上跑一跑。'},
{c:'看',p:'kàn',st:3,a:'eye',w:'看书、看见',s:'我最喜欢看图画书。'},
{c:'听',p:'tīng',st:3,a:'ear',w:'听话、好听',s:'要认真听老师说话。'},
{c:'说',p:'shuō',st:3,a:'mouth',w:'说话、说话',s:'有事要好好说。'},
{c:'笑',p:'xiào',st:3,a:'smile',w:'笑脸、大笑',s:'小朋友笑得很开心。'},
{c:'哭',p:'kū',st:3,a:'cry',w:'哭泣、大哭',s:'摔倒了不哭，站起来。'},
{c:'好',p:'hǎo',st:3,a:'smile',w:'好人、好看',s:'你做得真好！'},
{c:'坏',p:'huài',st:3,a:'sad',w:'坏了、好坏',s:'玩具坏了要修一修。'},
{c:'早',p:'zǎo',st:3,a:'sun',w:'早上、早安',s:'早上好，起床啦。'},
{c:'晚',p:'wǎn',st:3,a:'moon',w:'晚上、晚安',s:'晚上要早点睡觉。'},
{c:'白',p:'bái',st:3,a:'swatch',an:'#FFFFFF',w:'白色、白天',s:'白云是白色的。'},
{c:'黑',p:'hēi',st:3,a:'swatch',an:'#3B4250',w:'黑色、黑夜',s:'晚上天就变黑了。'},
{c:'红',p:'hóng',st:3,a:'swatch',an:'#E0483F',w:'红色、红花',s:'红红的苹果真好看。'},
{c:'黄',p:'huáng',st:3,a:'swatch',an:'#F0B320',w:'黄色、黄牛',s:'香蕉是黄颜色的。'},
{c:'绿',p:'lǜ',st:3,a:'swatch',an:'#3E9E52',w:'绿色、绿叶',s:'小草是绿绿的。'},
{c:'花',p:'huā',st:3,a:'flower',w:'花朵、红花',s:'公园里开满了花。'},
{c:'草',p:'cǎo',st:3,a:'grass',w:'小草、草地',s:'小草从土里钻出来。'},
{c:'树',p:'shù',st:3,a:'tree',w:'大树、树叶',s:'大树下很凉快。'},
{c:'车',p:'chē',st:3,a:'car',w:'汽车、火车',s:'爸爸开车去上班。'},
{c:'书',p:'shū',st:3,a:'book',w:'看书、书包',s:'我把书放进书包。'},
{c:'衣',p:'yī',st:3,a:'clothes',w:'衣服、毛衣',s:'天冷了要多穿衣服。'},
{c:'鞋',p:'xié',st:3,a:'shoe',w:'鞋子、穿鞋',s:'出门要自己穿鞋。'},
{c:'饭',p:'fàn',st:3,a:'bowl',w:'吃饭、米饭',s:'一碗热饭真香。'},
{c:'菜',p:'cài',st:3,a:'veg',w:'青菜、蔬菜',s:'多吃青菜身体好。'},
{c:'果',p:'guǒ',st:3,a:'fruit',w:'水果、苹果',s:'苹果是我爱吃的水果。'},
{c:'蛋',p:'dàn',st:3,a:'egg',w:'鸡蛋、蛋糕',s:'早上吃一个鸡蛋。'}
];

/* ================= 内联 SVG 图示（viewBox 0 0 120 120） ================= */
var ART = {
sun:'<circle cx="60" cy="60" r="24" fill="#F7C13B"/><g stroke="#E9A400" stroke-width="6" stroke-linecap="round"><path d="M60 26V12M60 94v14M26 60H12M94 60h14M36 36 26 26M84 84l10 10M84 36l10-10M36 84l-10 10"/>' + CL + 'g>',
moon:'<path d="M72 16a42 42 0 1 0 0 88 34 34 0 1 1 0-88z" fill="#F2D25C"/><circle cx="86" cy="34" r="5" fill="#E8C33F"/><circle cx="92" cy="58" r="3.5" fill="#E8C33F"/>',
mountain:'<path d="M4 100 44 36l22 34 12-18 38 48z" fill="#8FB6DE"/><path d="M44 36 55 53l-11 6-8-8z" fill="#FFFFFF"/><circle cx="92" cy="26" r="13" fill="#F7C13B"/>',
water:'<path d="M60 12c24 28 36 44 36 58a36 36 0 0 1-72 0c0-14 12-30 36-58z" fill="#5FA8E8"/><path d="M42 70a18 18 0 0 0 14 18" stroke="#FFFFFF" stroke-width="6" fill="none" stroke-linecap="round"/>',
fire:'<path d="M60 10c5 22-18 26-18 48a18 18 0 0 0 36 0c0-10-7-15-4-25 10 9 18 19 18 32a32 32 0 0 1-64 0C28 42 56 34 60 10z" fill="#EF6A33"/><path d="M60 58c3 11-9 13-9 24a9 9 0 0 0 18 0c0-9-9-13-9-24z" fill="#FFD25E"/>',
tree:'<rect x="53" y="66" width="14" height="42" rx="6" fill="#9A6A3C"/><circle cx="42" cy="58" r="21" fill="#6EC07E"/><circle cx="78" cy="58" r="21" fill="#6EC07E"/><circle cx="60" cy="40" r="27" fill="#5FB271"/>',
person:'<circle cx="60" cy="32" r="17" fill="#F5C79A"/><path d="M27 108c0-20 15-34 33-34s33 14 33 34z" fill="#5B8DEF"/>',
mouth:'<path d="M20 54c0-9 14-16 40-16s40 7 40 16c0 19-18 32-40 32S20 73 20 54z" fill="#E4637B"/><path d="M28 46h64" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round"/>',
eye:'<path d="M10 60c15-23 33-34 50-34s35 11 50 34c-15 23-33 34-50 34S25 83 10 60z" fill="#FFFFFF" stroke="#4A5468" stroke-width="5"/><circle cx="60" cy="60" r="17" fill="#4A5468"/><circle cx="67" cy="53" r="5.5" fill="#FFFFFF"/>',
hand:'<path d="M40 108V64h-8a9 9 0 0 1 0-18h8V36a10 10 0 0 1 20 0v10h4V28a10 10 0 0 1 20 0v18h4V40a10 10 0 0 1 20 0v30c0 22-15 38-34 38z" fill="#F5C79A"/>',
field:'<rect x="12" y="18" width="96" height="84" rx="9" fill="#8CC97C"/><path d="M60 18v84M12 60h96" stroke="#5FA84C" stroke-width="7"/>',
soil:'<path d="M26 66c0-9 7-16 16-16s16 7 16 16M64 60c0-11 8-20 18-20s18 9 18 20" stroke="#5FB271" stroke-width="8" fill="none" stroke-linecap="round"/><rect x="8" y="72" width="104" height="34" rx="9" fill="#A0723F"/><circle cx="40" cy="90" r="4" fill="#8A5F33"/><circle cx="72" cy="86" r="4" fill="#8A5F33"/>',
up:'<path d="M60 100V26" stroke="#2B62D9" stroke-width="14" stroke-linecap="round"/><path d="M30 56 60 24l30 32" stroke="#2B62D9" stroke-width="14" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
down:'<path d="M60 20v74" stroke="#2B62D9" stroke-width="14" stroke-linecap="round"/><path d="M30 64 60 96l30-32" stroke="#2B62D9" stroke-width="14" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
big:'<circle cx="60" cy="60" r="46" fill="#5B8DEF"/>',
small:'<circle cx="60" cy="60" r="46" fill="none" stroke="#D5DFEF" stroke-width="5" stroke-dasharray="9 9"/><circle cx="60" cy="60" r="15" fill="#5B8DEF"/>',
middle:'<rect x="26" y="26" width="68" height="68" rx="12" fill="none" stroke="#2B62D9" stroke-width="10"/><path d="M60 10v100" stroke="#2B62D9" stroke-width="10" stroke-linecap="round"/>',
sky:'<circle cx="34" cy="32" r="15" fill="#F7C13B"/><g fill="#FFFFFF"><circle cx="52" cy="70" r="20"/><circle cx="78" cy="62" r="25"/><circle cx="98" cy="74" r="16"/><rect x="52" y="68" width="46" height="22" rx="11"/>' + CL + 'g>',
cloud:'<g fill="#C6DCF4"><circle cx="42" cy="62" r="22"/><circle cx="70" cy="50" r="28"/><circle cx="94" cy="68" r="18"/><rect x="42" y="60" width="52" height="24" rx="12"/>' + CL + 'g>',
rain:'<g fill="#C6DCF4"><circle cx="42" cy="48" r="19"/><circle cx="68" cy="40" r="24"/><circle cx="90" cy="54" r="15"/><rect x="42" y="46" width="48" height="22" rx="11"/>' + CL + 'g><g stroke="#4E9BE8" stroke-width="7" stroke-linecap="round"><path d="M44 84 38 100M64 84 58 100M84 84 78 100"/>' + CL + 'g>',
stone:'<path d="M22 94 34 56l32-16 32 24-8 30z" fill="#9AA3AF"/><path d="M34 56 52 76l22-8" stroke="#7C8593" stroke-width="5" fill="none" stroke-linejoin="round"/>',
door:'<rect x="22" y="14" width="76" height="92" rx="9" fill="#B6803F"/><rect x="36" y="28" width="48" height="40" rx="7" fill="#F5E1C2"/><circle cx="88" cy="68" r="6" fill="#F5E1C2"/>',
bird:'<path d="M38 62c-11-8-21-11-30-9 7 9 15 15 26 17z" fill="#4B9E60"/><ellipse cx="60" cy="66" rx="30" ry="23" fill="#5FB271"/><circle cx="84" cy="44" r="16" fill="#5FB271"/><circle cx="89" cy="40" r="4" fill="#17181A"/><path d="M99 46l14 6-14 6z" fill="#F0A73B"/><path d="M50 88 44 104M70 88 76 104" stroke="#F0A73B" stroke-width="6" stroke-linecap="round"/>',
fish:'<path d="M12 60c17-25 48-31 72-15 7 4 12 9 18 15-6 6-11 11-18 15-24 16-55 10-72-15z" fill="#4E9BE8"/><path d="M100 60l16-16v32z" fill="#3E86CD"/><circle cx="40" cy="52" r="5" fill="#FFFFFF"/><path d="M32 76c9 6 19 8 29 6" stroke="#FFFFFF" stroke-width="5" fill="none" stroke-linecap="round"/>',
long:'<rect x="8" y="40" width="104" height="28" rx="14" fill="#5B8DEF"/><rect x="8" y="78" width="38" height="20" rx="10" fill="#C6D8F7"/>',
short:'<rect x="8" y="40" width="38" height="28" rx="14" fill="#5B8DEF"/><rect x="8" y="78" width="104" height="20" rx="10" fill="#C6D8F7"/>',
tall:'<rect x="30" y="10" width="30" height="100" rx="15" fill="#4FAF63"/><rect x="84" y="76" width="30" height="34" rx="15" fill="#CBE6D4"/>',
low:'<rect x="30" y="76" width="30" height="34" rx="15" fill="#4FAF63"/><rect x="84" y="10" width="30" height="100" rx="15" fill="#CBE6D4"/>',
half:'<circle cx="60" cy="60" r="44" fill="#E7EFFD"/><path d="M60 16a44 44 0 0 1 0 88z" fill="#5B8DEF"/><path d="M60 10v100" stroke="#2B62D9" stroke-width="5" stroke-linecap="round"/>',
family:'<circle cx="36" cy="50" r="16" fill="#F5C79A"/><path d="M8 106c0-16 12-28 28-28s28 12 28 28z" fill="#5B8DEF"/><circle cx="84" cy="60" r="13" fill="#F7D6AE"/><path d="M58 106c0-14 11-25 26-25s26 11 26 25z" fill="#E8809A"/>',
house:'<path d="M12 58 60 16l48 42" stroke="#B6803F" stroke-width="11" fill="none" stroke-linejoin="round"/><rect x="26" y="56" width="68" height="50" rx="7" fill="#F2DFC0"/><rect x="52" y="72" width="20" height="34" rx="3" fill="#B6803F"/>',
head:'<circle cx="60" cy="60" r="40" fill="#F7D6AE"/><path d="M20 52c0-24 18-38 40-38s40 14 40 38" stroke="#4A3A2E" stroke-width="11" fill="none" stroke-linecap="round"/><circle cx="46" cy="54" r="5" fill="#4A3A2E"/><circle cx="74" cy="54" r="5" fill="#4A3A2E"/><path d="M46 78a18 12 0 0 0 28 0" stroke="#C2694A" stroke-width="5" fill="none" stroke-linecap="round"/>',
ear:'<circle cx="60" cy="60" r="38" fill="#F7D6AE"/><circle cx="46" cy="54" r="4.5" fill="#4A3A2E"/><circle cx="74" cy="54" r="4.5" fill="#4A3A2E"/><path d="M46 78a18 12 0 0 0 28 0" stroke="#C2694A" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M22 58c0-16 2-26 7-29M98 58c0-16-2-26-7-29" stroke="#F0AE7E" stroke-width="10" fill="none" stroke-linecap="round"/>',
nose:'<circle cx="60" cy="58" r="39" fill="#F7D6AE"/><circle cx="45" cy="50" r="4.5" fill="#4A3A2E"/><circle cx="75" cy="50" r="4.5" fill="#4A3A2E"/><path d="M60 54v16c0 5-4 8-9 9l-7 3" stroke="#F0AE7E" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
tooth:'<circle cx="60" cy="60" r="38" fill="#F7D6AE"/><circle cx="46" cy="48" r="4.5" fill="#4A3A2E"/><circle cx="74" cy="48" r="4.5" fill="#4A3A2E"/><ellipse cx="60" cy="80" rx="20" ry="13" fill="#C2694A"/><rect x="46" y="70" width="12" height="12" rx="3" fill="#FFFFFF"/><rect x="62" y="70" width="12" height="12" rx="3" fill="#FFFFFF"/>',
tongue:'<circle cx="60" cy="58" r="38" fill="#F7D6AE"/><circle cx="46" cy="46" r="4.5" fill="#4A3A2E"/><circle cx="74" cy="46" r="4.5" fill="#4A3A2E"/><ellipse cx="60" cy="80" rx="21" ry="14" fill="#C2694A"/><ellipse cx="60" cy="86" rx="13" ry="8" fill="#EE7A94"/>',
heart:'<path d="M60 104C26 80 12 62 12 44a26 26 0 0 1 48-15 26 26 0 0 1 48 15c0 18-14 36-48 60z" fill="#E8566F"/>',
body:'<circle cx="60" cy="26" r="15" fill="#F7D6AE"/><path d="M28 106c0-21 14-36 32-36s32 15 32 36z" fill="#5B8DEF"/><path d="M60 78v28" stroke="#C6D8F7" stroke-width="5"/>',
foot:'<path d="M44 16c11 0 18 9 18 20 0 13-5 21-5 32 0 11-7 18-16 18s-16-7-16-18c0-11 5-19 5-32 0-11 4-20 14-20z" fill="#F0AE7E"/><circle cx="32" cy="94" r="5.5" fill="#E28F55"/><circle cx="45" cy="98" r="5.5" fill="#E28F55"/><circle cx="58" cy="94" r="5.5" fill="#E28F55"/><circle cx="69" cy="86" r="5.5" fill="#E28F55"/>',
flower:'<g fill="#E8668F"><circle cx="60" cy="34" r="17"/><circle cx="88" cy="54" r="17"/><circle cx="76" cy="88" r="17"/><circle cx="44" cy="88" r="17"/><circle cx="32" cy="54" r="17"/>' + CL + 'g><circle cx="60" cy="62" r="15" fill="#F7C13B"/><path d="M60 102v16" stroke="#5FB271" stroke-width="8" stroke-linecap="round"/>',
grass:'<path d="M8 106h104" stroke="#8CC97C" stroke-width="9" stroke-linecap="round"/><g stroke="#5FB271" stroke-width="9" fill="none" stroke-linecap="round"><path d="M26 104c0-26 5-46 11-60M60 104V34M94 104c0-26-5-46-11-60M43 104c0-19 2-35 6-47M77 104c0-19-2-35-6-47"/>' + CL + 'g>',
car:'<rect x="8" y="56" width="104" height="38" rx="13" fill="#4E9BE8"/><path d="M30 56 42 26h36l12 30z" fill="#4E9BE8"/><rect x="46" y="32" width="24" height="18" rx="5" fill="#CFE5FA"/><circle cx="34" cy="96" r="14" fill="#3A4450"/><circle cx="86" cy="96" r="14" fill="#3A4450"/><circle cx="34" cy="96" r="5.5" fill="#D5DAE2"/><circle cx="86" cy="96" r="5.5" fill="#D5DAE2"/>',
book:'<path d="M60 32C47 21 30 19 13 23v66c17-4 34-2 47 9 13-11 30-13 47-9V23c-17-4-34-2-47 9z" fill="#F0A73B"/><path d="M60 32v66" stroke="#D98A1E" stroke-width="6"/>',
clothes:'<path d="M42 20h36l24 14-9 24-15-5v50H42V53l-15 5-9-24z" fill="#7A8DF0"/><path d="M50 20c0 8 4 13 10 13s10-5 10-13" fill="none" stroke="#5E72DF" stroke-width="5"/>',
shoe:'<path d="M12 72c0-6 5-10 11-10h20c9 0 13 5 19 13 6 8 17 12 32 14 6 1 9 5 9 10v5H12z" fill="#4E9BE8"/><path d="M12 104h92" stroke="#FFFFFF" stroke-width="7"/>',
bowl:'<path d="M40 40c0-9 7-11 7-20M60 40c0-9 7-11 7-20M80 40c0-9 7-11 7-20" stroke="#D9D9D9" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M16 60h88c0 28-20 46-44 46S16 88 16 60z" fill="#F0A73B"/><path d="M8 56h104" stroke="#D98A1E" stroke-width="10" stroke-linecap="round"/>',
cup:'<path d="M26 28h60l-9 66a11 11 0 0 1-11 10H46a11 11 0 0 1-11-10z" fill="#8FB6DE"/><path d="M84 46h8a13 13 0 0 1 0 26h-11" stroke="#8FB6DE" stroke-width="10" fill="none"/>',
veg:'<path d="M60 22c15 13 23 27 23 44 0 19-10 34-23 34S37 85 37 66c0-17 8-31 23-44z" fill="#7FC96B"/><path d="M60 40v60" stroke="#5FA84C" stroke-width="6"/><path d="M60 62 44 52M60 76l16-11" stroke="#5FA84C" stroke-width="6" stroke-linecap="round"/>',
fruit:'<circle cx="60" cy="70" r="37" fill="#E8566F"/><path d="M60 34V18" stroke="#7A5A32" stroke-width="7" stroke-linecap="round"/><path d="M63 26c11-11 24-9 28 0-7 9-19 11-28 4z" fill="#5FB271"/>',
egg:'<ellipse cx="60" cy="64" rx="35" ry="46" fill="#FBF2DC" stroke="#E5D3AA" stroke-width="5"/>',
smile:'<circle cx="60" cy="60" r="42" fill="#F7D25E"/><circle cx="46" cy="48" r="5.5" fill="#5A4A22"/><circle cx="74" cy="48" r="5.5" fill="#5A4A22"/><path d="M36 68a25 21 0 0 0 48 0z" fill="#FFFFFF" stroke="#5A4A22" stroke-width="5" stroke-linejoin="round"/>',
cry:'<circle cx="60" cy="60" r="42" fill="#C6DCF4"/><circle cx="46" cy="46" r="5.5" fill="#3A4450"/><circle cx="74" cy="46" r="5.5" fill="#3A4450"/><path d="M38 84a24 18 0 0 1 44 0z" fill="#FFFFFF" stroke="#3A4450" stroke-width="5" stroke-linejoin="round"/><path d="M44 54c-5 9-5 16 0 21 5-5 5-12 0-21zM76 54c-5 9-5 16 0 21 5-5 5-12 0-21z" fill="#4E9BE8"/>',
sad:'<circle cx="60" cy="60" r="42" fill="#D8DEE9"/><circle cx="46" cy="48" r="5.5" fill="#3A4450"/><circle cx="74" cy="48" r="5.5" fill="#3A4450"/><path d="M38 88a24 18 0 0 1 44 0z" fill="#FFFFFF" stroke="#3A4450" stroke-width="5" stroke-linejoin="round"/>',
run:'<circle cx="62" cy="24" r="14" fill="#F7D6AE"/><g stroke="#5B8DEF" stroke-width="11" fill="none" stroke-linecap="round"><path d="M60 40v30M60 48 38 64M60 48l24 14M60 70 42 106M60 70l20 36"/>' + CL + 'g>'
};

/* 点阵图示：用圆点表示数量 */
function artDots(n){
  var total = Math.max(1, Math.min(100, n));
  var cols = total <= 10 ? 5 : (total <= 20 ? 6 : (total <= 40 ? 8 : 10));
  var r = total <= 10 ? 9 : (total <= 20 ? 7 : (total <= 40 ? 5 : 3.6));
  var gap = 108 / cols;
  var startY = 60 - ((Math.ceil(total / cols) - 1) * gap) / 2;
  var out = '', i, row, col;
  for (i = 0; i < total; i++){
    row = Math.floor(i / cols); col = i % cols;
    out += '<circle cx="' + (6 + gap / 2 + col * gap).toFixed(1) + '" cy="' + (startY + row * gap).toFixed(1) + '" r="' + r + '" fill="#5B8DEF"/>';
  }
  return out;
}

function artHTML(key, param){
  if (!key) return '';
  var inner;
  if (key === 'dots') inner = artDots(param || 1);
  else if (key === 'swatch'){
    inner = '<circle cx="60" cy="60" r="42" fill="' + param + '"' + (param === '#FFFFFF' ? ' stroke="#D8DEE9" stroke-width="5"' : '') + '/>';
  } else inner = ART[key] || '';
  if (!inner) return '';
  return '<svg class="art" viewBox="0 0 120 120" aria-hidden="true">' + inner + '' + CL + 'svg>';
}

/* 把内置图示按汉字建索引，字库里没上传图片时用它兜底 */
var BUILTIN_ART = {};
(function(){
  var i, c, inner;
  for (i = 0; i < CHARS.length; i++){
    c = CHARS[i];
    if (!c.a) continue;
    if (c.a === 'dots') inner = artDots(c.an || 1);
    else if (c.a === 'swatch'){
      inner = '<circle cx="60" cy="60" r="42" fill="' + c.an + '"' + (c.an === '#FFFFFF' ? ' stroke="#D8DEE9" stroke-width="5"' : '') + '/>';
    } else inner = ART[c.a] || '';
    if (inner && !BUILTIN_ART[c.c]) BUILTIN_ART[c.c] = inner;
  }
})();
