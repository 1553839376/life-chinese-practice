# -*- coding: utf-8 -*-
"""按钮体检：找出「点了没反应」的按钮，以及「绑了事件但元素不存在」的幽灵。

这个项目里按钮有四种接法，只查一种会误报：
  ① $('id').addEventListener('click', ...)
  ② 全局 click 委托里的 el.id === 'xxx'
  ③ data-* 委托：el.closest('[data-xxx]') + 渲染时写 data-xxx="..."
  ④ 表单 submit（$('formId').addEventListener('submit'|'change'|'input'）

用法：python build/check_buttons.py
退出码：0 没有孤儿 / 1 有
"""
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROD = os.path.join(ROOT, 'build', '生活语文练习台.html')


def main():
    html = io.open(PROD, encoding='utf-8').read()
    body = html.split('<body', 1)[1] if '<body' in html else html

    # 静态 DOM 里的按钮 / 输入控件 id
    dom_ids = set()
    for tag in ('button', 'input', 'select', 'textarea'):
        dom_ids |= set(re.findall(
            r'<%s[^>]*\bid="([A-Za-z][\w-]*)"' % tag, body))
    # 容器类 id（div/section 等）也算「存在」
    all_static_ids = set(re.findall(r'\bid="([A-Za-z][\w-]*)"', body))

    # ① $('x').addEventListener(...)
    bound = set(re.findall(r"""\$\('([A-Za-z][\w-]*)'\)\s*\.addEventListener""", html))
    # ② el.id === 'x'
    bound |= set(re.findall(r"""\.id\s*===\s*'([A-Za-z][\w-]*)'""", html))
    # ③ data-* 委托
    data_attrs = set(re.findall(r"""closest\('\[data-([\w-]+)\]'\)""", html))
    # ④ 任何 $('x') 取过（可能是读值、改文案，也算被用上了）
    touched = set(re.findall(r"""\$\('([A-Za-z][\w-]*)'\)""", html))
    touched |= set(re.findall(r"""getElementById\(['"]([A-Za-z][\w-]*)['"]\)""", html))

    # 运行时才生成的 id（模板字符串里写死的）——这些不在静态 body 里，属于正常
    runtime_ids = set(re.findall(r'id="([A-Za-z][\w-]*)"', html.split('<script', 1)[-1]))

    dead = []
    js_src = html.split('</html>')[0]
    for i in sorted(dom_ids):
        if i in bound or i in touched:
            continue
        # 三元 / 数组形式的取法（$(isLib ? 'fLibGroup' : 'fWdGroup')）静态解析不了，
        # 只要 id 在 JS 源码里露过面就不再报；宁可漏报，也不给一堆假警报。
        if i in js_src:
            continue
        dead.append(i)

    ghost = []
    for i in sorted(bound):
        if i in all_static_ids or i in runtime_ids:
            continue
        ghost.append(i)

    print('=' * 58)
    print('按钮体检')
    print('=' * 58)
    print('静态控件 id      : %d 个' % len(dom_ids))
    print('被 JS 用到/绑定  : %d 个' % len([i for i in dom_ids if i in bound or i in touched]))
    print('data-* 委托      : %d 种 (%s)' % (len(data_attrs), ' '.join(sorted(data_attrs))))
    print()
    if dead:
        print('  孤儿控件（既没绑定也没被读过）：')
        for d in dead:
            print('   - ' + d)
    if ghost:
        print('  幽灵绑定（绑了但元素不存在）：')
        for g in ghost:
            print('   - ' + g)
    if not dead and not ghost:
        print('  所有按钮都有去处 ✅')
    print()
    return 1 if (dead or ghost) else 0


if __name__ == '__main__':
    sys.exit(main())
