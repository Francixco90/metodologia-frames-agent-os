import {createHash} from 'node:crypto';

export const normalizeContentRequest = (value) =>
  String(value ?? '')
    .trim()
    .replace(/\s+/gu, ' ');

export const hashContentRequestV1 = (value) =>
  createHash('sha256')
    .update(normalizeContentRequest(value).toLocaleLowerCase('es'))
    .digest('hex');
