import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {parse as parseYaml} from 'yaml';

import {NotebookProfileV2Schema} from '../../../02_proceso/core/contracts/index.ts';
import {splitFrontMatter, statSafe} from './io.ts';
import {extractCompiledBootstrap} from './knowledge.ts';

export const validateProfile = (root: string): string[] => {
  const errors: string[] = [];
  const profile = NotebookProfileV2Schema.parse(
    parseYaml(readFileSync(resolve(root, 'profile.yml'), 'utf8')) as unknown,
  );
  const promptFiles = [
    [profile.systemPrompt.bootstrapSource, profile.systemPrompt.bootstrapSha256, 'bootstrap'],
    [profile.systemPrompt.fullPromptSource, profile.systemPrompt.fullPromptSha256, 'full'],
  ] as const;
  for (const [source, expectedSha, kind] of promptFiles) {
    const sourcePath = resolve(process.cwd(), source);
    if (!statSafe(sourcePath)) {
      errors.push(`profile.yml: missing prompt source ${source}.`);
      continue;
    }
    const sourceBytes = readFileSync(sourcePath);
    const hashInput =
      kind === 'bootstrap'
        ? extractCompiledBootstrap(
            source,
            splitFrontMatter(source, sourceBytes.toString('utf8')).body,
          )
        : sourceBytes;
    const actualSha = createHash('sha256').update(hashInput).digest('hex');
    if (actualSha !== expectedSha) errors.push(`profile.yml: hash drift for ${source}.`);
  }
  return errors;
};
