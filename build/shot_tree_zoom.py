# -*- coding: utf-8 -*-
"""把树单独放大拍一张，专门看树干与枝条的接缝。

用法：python build/shot_tree_zoom.py
输出：%TEMP%/wb_fruit/tree_zoom.png
"""
import io
import os
import subprocess
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'build', '生活语文练习台.html')
EDGE = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
OUT = os.path.join(tempfile.gettempdir(), 'wb_fruit')

JS = u"""
window.addEventListener('load', function(){
  setTimeout(function(){
    var box = document.createElement('div');
    box.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#EAF6E4;'
      + 'width:900px;height:880px;display:flex;align-items:center;justify-content:center';
    var inner = document.createElement('div');
    inner.style.cssText = 'width:840px;height:788px';
    inner.innerHTML = treeSVG();
    inner.querySelector('svg').style.cssText = 'width:840px;height:788px;display:block';
    box.appendChild(inner);
    document.body.appendChild(box);
    document.title = 'ZOOM';
  }, 300);
});
"""


def main():
    os.makedirs(OUT, exist_ok=True)
    src = io.open(SRC, encoding='utf-8').read()
    html = src.replace('</body>', '<script>' + JS + '</script>\n</body>')
    page = os.path.join(OUT, 'tree_zoom.html')
    io.open(page, 'w', encoding='utf-8', newline='').write(html)
    shot = os.path.join(OUT, 'tree_zoom.png')
    if os.path.exists(shot):
        os.remove(shot)
    subprocess.run([
        EDGE, '--headless=new', '--disable-gpu', '--no-sandbox',
        '--user-data-dir=' + os.path.join(OUT, 'ud'), '--hide-scrollbars',
        '--force-device-scale-factor=1', '--virtual-time-budget=4000',
        '--window-size=900,880', '--screenshot=' + shot,
        'file:///' + page.replace('\\', '/')], capture_output=True)
    print('tree_zoom', os.path.exists(shot))
    print('DIR', OUT)


if __name__ == '__main__':
    main()
