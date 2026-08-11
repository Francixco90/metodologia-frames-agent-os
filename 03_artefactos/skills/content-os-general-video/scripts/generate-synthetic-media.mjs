#!/usr/bin/env node
import {mkdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const at = process.argv.indexOf('--out');
if (at < 0 || !process.argv[at + 1]) {
  console.error('usage: generate-synthetic-media.mjs --out <fixture-dir>');
  process.exit(2);
}
const out = resolve(process.argv[at + 1]);
mkdirSync(out, {recursive: true});

const width = 16;
const height = 16;
const pixels = Buffer.alloc(width * height * 3);
for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    const offset = (y * width + x) * 3;
    pixels[offset] = 8 + x * 6;
    pixels[offset + 1] = 24 + y * 5;
    pixels[offset + 2] = 64 + ((x + y) % 8) * 14;
  }
}
writeFileSync(resolve(out, 'frame.ppm'), Buffer.concat([Buffer.from(`P6\n${width} ${height}\n255\n`), pixels]));

const sampleRate = 48000;
const seconds = 1;
const sampleCount = sampleRate * seconds;
const pcm = Buffer.alloc(sampleCount * 2);
for (let i = 0; i < sampleCount; i += 1) {
  const envelope = Math.min(1, i / 2400, (sampleCount - i) / 2400);
  const value = Math.round(Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 6200 * envelope);
  pcm.writeInt16LE(value, i * 2);
}
const wav = Buffer.alloc(44);
wav.write('RIFF', 0); wav.writeUInt32LE(36 + pcm.length, 4); wav.write('WAVE', 8);
wav.write('fmt ', 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(1, 22); wav.writeUInt32LE(sampleRate, 24); wav.writeUInt32LE(sampleRate * 2, 28);
wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(pcm.length, 40);
writeFileSync(resolve(out, 'tone.wav'), Buffer.concat([wav, pcm]));
