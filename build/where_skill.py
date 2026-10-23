# -*- coding: utf-8 -*-
"""找 WorkBuddy「资料库」skill 的 page 脚本目录（发布线上页面要用）。

这些脚本不在本仓库里（它们是 WorkBuddy 自带的），换台电脑路径就变了。
所以发布前先跑这个，拿到目录再说。

用法：
    python build/where_skill.py
    # 找到就打印路径；找不到会给出手动指定方法

也可以直接指定：
    PAGE_SKILL_DIR="D:/xxx/skills/library/page" python build/where_skill.py
"""
import os
import sys
from pathlib import Path

MARK = 'create_page_transaction.py'

# 常见安装位置（按经验从新到旧）
GUESS = [
    r'D:\职称参考\workbuddy\resources\app.asar.unpacked\resources\plugins\workbuddy-builtin\skills\library\page',
    r'C:\Program Files\workbuddy\resources\app.asar.unpacked\resources\plugins\workbuddy-builtin\skills\library\page',
    r'C:\Program Files (x86)\workbuddy\resources\app.asar.unpacked\resources\plugins\workbuddy-builtin\skills\library\page',
]


def ok(p):
    return p and (Path(p) / MARK).exists()


def main():
    env = os.environ.get('PAGE_SKILL_DIR', '').strip()
    if env:
        if ok(env):
            print(env)
            return 0
        print('环境变量 PAGE_SKILL_DIR 指向的目录里没有 %s：%s' % (MARK, env))
        return 1

    for c in GUESS:
        if ok(c):
            print(c)
            return 0

    # 再按「用户目录 / 常见盘符」扫一层，限定深度，别把整个磁盘翻一遍
    home = Path.home()
    roots = [home / 'AppData' / 'Local' / 'Programs',
             home / 'AppData' / 'Local',
             Path('D:/'), Path('C:/Program Files'), Path('C:/Program Files (x86)')]
    for r in roots:
        if not r.exists():
            continue
        try:
            for p in r.glob('*/resources/app.asar.unpacked/resources/plugins/workbuddy-builtin/skills/library/page'):
                if ok(str(p)):
                    print(str(p))
                    return 0
            for p in r.glob('*/*/resources/app.asar.unpacked/resources/plugins/workbuddy-builtin/skills/library/page'):
                if ok(str(p)):
                    print(str(p))
                    return 0
        except (PermissionError, OSError):
            continue

    print('没找到。可以这样手动指定：')
    print('  1) 在 WorkBuddy 安装目录里找 resources/app.asar.unpacked/resources/plugins/')
    print('     workbuddy-builtin/skills/library/page，路径里要有 %s' % MARK)
    print('  2) 然后：export PAGE_SKILL_DIR="<那个目录>"')
    print('  3) 再跑一次：python build/where_skill.py')
    print('')
    print('如果只是想改代码、不发布，可以完全跳过这一步。')
    return 1


if __name__ == '__main__':
    sys.exit(main())
