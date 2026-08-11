import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';

const SCHEMA_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../schemas');
const cache = new Map();

export function validateSchema(file, value, label, fail) {
  if (!cache.has(file)) {
    const schema = JSON.parse(readFileSync(resolve(SCHEMA_DIR, file), 'utf8'));
    cache.set(file, new Ajv2020({allErrors: true, strict: false}).compile(schema));
  }
  const validate = cache.get(file);
  if (!validate(value)) {
    const detail = (validate.errors ?? []).map((error) => `${error.instancePath || '/'} ${error.message}`).join(';');
    fail(`SCHEMA_${label} ${detail}`);
  }
}
