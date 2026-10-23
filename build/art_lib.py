# -*- coding: utf-8 -*-
"""SVG 造型小工具：把中轴线 + 宽度序列变成有粗细变化的填充路径。
用于龙身、蛇身、尾巴这类"带状"造型。
"""
import math


def _smooth(pts, samples=10):
    """Catmull-Rom 插值，返回密集点列。"""
    p = [pts[0]] + list(pts) + [pts[-1]]
    out = []
    for i in range(len(p) - 3):
        p0, p1, p2, p3 = p[i], p[i + 1], p[i + 2], p[i + 3]
        for s in range(samples):
            t = s / samples
            t2, t3 = t * t, t * t * t
            x = 0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t +
                       (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
                       (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3)
            y = 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t +
                       (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
                       (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
            out.append((x, y))
    out.append(p[-2])
    return out


def _lerp_width(ws, t):
    """按归一化位置 t 在宽度序列里插值。"""
    if len(ws) == 1:
        return ws[0]
    x = t * (len(ws) - 1)
    i = min(int(x), len(ws) - 2)
    f = x - i
    return ws[i] * (1 - f) + ws[i + 1] * f


def ribbon(pts, widths, samples=12, close_tip=True):
    """返回一条闭合填充路径的 d 字符串（左缘去、右缘回）。"""
    axis = _smooth(pts, samples)
    n = len(axis)
    left, right = [], []
    for i, (x, y) in enumerate(axis):
        if i == 0:
            dx, dy = axis[1][0] - x, axis[1][1] - y
        elif i == n - 1:
            dx, dy = x - axis[-2][0], y - axis[-2][1]
        else:
            dx, dy = axis[i + 1][0] - axis[i - 1][0], axis[i + 1][1] - axis[i - 1][1]
        L = math.hypot(dx, dy) or 1.0
        nx, ny = -dy / L, dx / L
        w = _lerp_width(widths, i / (n - 1)) / 2.0
        left.append((x + nx * w, y + ny * w))
        right.append((x - nx * w, y - ny * w))

    d = 'M%.1f %.1f' % left[0]
    for x, y in left[1:]:
        d += ' L%.1f %.1f' % (x, y)
    if close_tip:
        # 尾端用圆弧收口
        d += ' A%.1f %.1f 0 0 1 %.1f %.1f' % (
            _lerp_width(widths, 1) / 2, _lerp_width(widths, 1) / 2, right[-1][0], right[-1][1])
    else:
        d += ' L%.1f %.1f' % right[-1]
    for x, y in reversed(right[:-1]):
        d += ' L%.1f %.1f' % (x, y)
    w0 = _lerp_width(widths, 0) / 2
    d += ' A%.1f %.1f 0 0 1 %.1f %.1f Z' % (w0, w0, left[0][0], left[0][1])
    return d


def outline(d):
    """给填充路径叠一层深色描边（同路径、加 stroke）。"""
    return d
