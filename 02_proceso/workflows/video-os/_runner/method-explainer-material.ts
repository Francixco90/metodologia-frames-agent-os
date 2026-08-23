import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {realpath, stat} from 'node:fs/promises';
import {isAbsolute, relative, resolve} from 'node:path';

import {
  assertMethodExplainerContractBundle,
  METHOD_EXPLAINER_OUTPUT_REFS,
  MAX_TOTAL_MATERIAL_BYTES,
} from '../_schema/index.ts';

const MAX_BUNDLE_BYTES = 8 * 1024 * 1024;

const streamedHash = async (path: string, expected?: Buffer) => {
  const digest = createHash('sha256');
  let offset = 0;
  let exact = true;
  for await (const value of createReadStream(path)) {
    const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value);
    digest.update(chunk);
    if (expected) {
      exact &&= chunk.equals(expected.subarray(offset, offset + chunk.length));
      offset += chunk.length;
    }
  }
  return {
    sha256: digest.digest('hex'),
    exact: expected ? exact && offset === expected.length : true,
  };
};

export const assertMethodExplainerMaterialBundle = async (raw: unknown, baseDir: string) => {
  const bundle = assertMethodExplainerContractBundle(raw);
  let root: string;
  try {
    root = await realpath(baseDir);
  } catch {
    throw new Error('METHOD-EXPLAINER-MATERIAL-ROOT-ERROR');
  }
  const bindings = [
    ...bundle.method_content.authority_refs,
    bundle.build_manifest.script,
    bundle.build_manifest.audio,
    ...bundle.build_manifest.assets,
    ...bundle.build_manifest.components,
    ...Object.values(bundle.build_manifest.required_outputs),
    bundle.unattended_run_material,
    ...bundle.unattended_run.stages.flatMap((stage) =>
      stage.checkpoint ? [stage.checkpoint] : [],
    ),
  ];
  const unique = new Map<string, (typeof bindings)[number]>();
  for (const binding of bindings) {
    const previous = unique.get(binding.ref);
    if (
      previous &&
      (previous.sha256 !== binding.sha256 || previous.size_bytes !== binding.size_bytes)
    )
      throw new Error('METHOD-EXPLAINER-MATERIAL-BINDING-CONFLICT');
    unique.set(binding.ref, binding);
  }
  const resolved: Array<{binding: (typeof bindings)[number]; path: string}> = [];
  let totalBytes = 0;
  for (const binding of unique.values()) {
    let path: string;
    let info;
    try {
      path = await realpath(resolve(root, binding.ref));
      info = await stat(path);
    } catch {
      throw new Error('METHOD-EXPLAINER-MATERIAL-FS-ERROR');
    }
    const fromRoot = relative(root, path);
    if (fromRoot.startsWith('..') || isAbsolute(fromRoot))
      throw new Error('METHOD-EXPLAINER-MATERIAL-ESCAPES-ROOT');
    if (!info.isFile()) throw new Error('METHOD-EXPLAINER-MATERIAL-NOT-FILE');
    if (info.size !== binding.size_bytes)
      throw new Error('METHOD-EXPLAINER-MATERIAL-SIZE-MISMATCH');
    totalBytes += info.size;
    if (totalBytes > MAX_TOTAL_MATERIAL_BYTES)
      throw new Error('METHOD-EXPLAINER-MATERIAL-TOTAL-SIZE');
    resolved.push({binding, path});
  }
  const canonicalSpec = Buffer.from(JSON.stringify(bundle.video_spec), 'utf8');
  const canonicalRun = Buffer.from(JSON.stringify(bundle.unattended_run), 'utf8');
  for (const material of resolved) {
    let check;
    try {
      check = await streamedHash(
        material.path,
        material.binding.ref === METHOD_EXPLAINER_OUTPUT_REFS.video_spec
          ? canonicalSpec
          : material.binding.ref === METHOD_EXPLAINER_OUTPUT_REFS.unattended_run_state
            ? canonicalRun
            : undefined,
      );
    } catch {
      throw new Error('METHOD-EXPLAINER-MATERIAL-FS-ERROR');
    }
    if (check.sha256 !== material.binding.sha256)
      throw new Error('METHOD-EXPLAINER-MATERIAL-HASH-MISMATCH');
    if (!check.exact) throw new Error('METHOD-EXPLAINER-VIDEO-SPEC-BYTES-MISMATCH');
  }
  return bundle;
};

export const readMethodExplainerBundle = async (inputPath: string): Promise<string> => {
  const stream =
    inputPath === '-'
      ? createReadStream('', {fd: 0, autoClose: false, encoding: 'utf8'})
      : createReadStream(inputPath, {encoding: 'utf8'});
  const chunks: Buffer[] = [];
  let bytes = 0;
  let tooLarge = false;
  try {
    for await (const value of stream) {
      if (typeof value !== 'string') throw new Error('UNEXPECTED_BUNDLE_CHUNK');
      const chunk = Buffer.from(value, 'utf8');
      bytes += chunk.length;
      if (bytes > MAX_BUNDLE_BYTES) {
        tooLarge = true;
        break;
      }
      chunks.push(chunk);
    }
  } catch {
    throw new Error('METHOD-EXPLAINER-BUNDLE_READ');
  }
  if (tooLarge) throw new Error('METHOD-EXPLAINER-BUNDLE_TOO_LARGE');
  return Buffer.concat(chunks, bytes).toString('utf8');
};
