/* 用 jsqr + pngjs 独立解码二维码，核对与目标 URL 是否一致 */
const fs = require('fs');
const { PNG } = require('pngjs');
const jsQR = require('jsqr');

const file = process.argv[2];
const expect = process.argv[3];

const png = PNG.sync.read(fs.readFileSync(file));
const res = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);

if (!res) {
  console.log('FAIL 未能解码');
  process.exit(1);
}
console.log('解码内容: ' + res.data);
console.log('期望内容: ' + expect);
console.log(res.data === expect ? 'PASS 二维码内容与目标 URL 完全一致' : 'FAIL 内容不一致');
