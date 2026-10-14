'use strict';
// Tiny dependency-free PNG encoder: RGBA scanlines, zlib, and CRC32.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4); checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}
const directory = path.join(__dirname, '..', 'icons');
fs.mkdirSync(directory, { recursive: true });
for (const size of [16, 48, 128]) {
  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = (x + 0.5) / size, v = (y + 0.5) / size;
    const dx = Math.max(.16 - u, 0, u - .84), dy = Math.max(.16 - v, 0, v - .84);
    const inside = dx * dx + dy * dy <= .14 * .14;
    const line = (v >= .27 && v < .37) || (v >= .46 && v < .56) || (v >= .65 && v < .75);
    const focus = line && u >= .23 && u < .43;
    const rest = line && u >= .48 && u < (v > .6 ? .65 : .78);
    const offset = y * (1 + size * 4) + 1 + x * 4;
    raw.set(!inside ? [0, 0, 0, 0] : focus ? [130, 235, 211, 255] : rest ? [230, 239, 255, 255] : [38, 65 + Math.round(v * 18), 143 + Math.round(u * 30), 255], offset);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0); header.writeUInt32BE(size, 4);
  header[8] = 8; header[9] = 6;
  fs.writeFileSync(path.join(directory, `${size}.png`), Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))
  ]));
}
