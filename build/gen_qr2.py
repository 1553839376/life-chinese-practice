# -*- coding: utf-8 -*-
"""生成 v2「生活语文练习台」发布链接二维码。"""
import segno

URL = "https://workbuddy.link/p/nU41kHmAoelqM2mGxWRFll"
OUT = r"C:/Users/xnxxPC2/WorkBuddy/2026-10-13-08-49-54/生活语文练习台-扫码访问.png"

qr = segno.make(URL, error="h")
qr.save(OUT, scale=12, border=4, dark="#1F2933", light="#FFFDF7")
print("OK", OUT)
print("content:", URL)
