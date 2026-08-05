import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

export function sha256(data: Buffer | string): string {
  return createHash('sha256').update(data).digest('hex');
}

export function fileSha256(filePath: string): string {
  return sha256(readFileSync(filePath));
}

export function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function readJson(filePath: string): unknown {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}
