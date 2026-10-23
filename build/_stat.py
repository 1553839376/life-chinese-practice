import json, io
pic = json.load(io.open('_pic_chars.json', encoding='utf-8'))
img = json.load(io.open('art_img.json', encoding='utf-8'))
svg = json.load(io.open('art_svg.json', encoding='utf-8'))
print('img', len(img), ''.join(sorted(img.keys())))
print('svg', len(svg), ''.join(sorted(svg.keys())))
done = set(img) | set(svg)
rest = [c for c in pic if c not in done]
print('rest', len(rest), ''.join(rest))
