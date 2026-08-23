import {createHash} from 'node:crypto';

export const textSha256 = (bytes: string) =>
  createHash('sha256').update(bytes, 'utf8').digest('hex');

export const bytesBinding = (ref: string, bytes: string) => ({
  ref,
  sha256: textSha256(bytes),
  size_bytes: Buffer.byteLength(bytes, 'utf8'),
});
