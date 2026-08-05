import {spawnSync} from 'node:child_process';

import {describe, expect, it} from 'vitest';
import {z} from 'zod';

import {readRepositoryJson, readRepositoryYaml, repositoryRoot} from '../fixtures/verifier/io.ts';

function runSkillCheck(script: string): ReturnType<typeof spawnSync> {
  return spawnSync(process.execPath, [script], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  });
}

describe('A05 Skill Foundry adversarial verification', () => {
  it('confirms the active local gate includes a passing example check', () => {
    const registry = z
      .object({
        entries: z.array(
          z.object({
            skill_id: z.string(),
            current_state: z.string(),
            tests: z.array(z.string()),
          }),
        ),
      })
      .parse(readRepositoryYaml('registries/skills/skill-registry.yml'));
    const canonical = registry.entries.find(
      ({skill_id: skillId}) => skillId === 'remotion-video-production',
    );
    const exampleCheck = runSkillCheck(
      'skills/remotion-video-production/scripts/check-example.mjs',
    );

    expect(canonical?.current_state).toBe('active');
    expect(canonical?.tests).toContain(
      'node skills/remotion-video-production/scripts/check-example.mjs',
    );
    expect(exampleCheck.status).toBe(0);
    expect(`${String(exampleCheck.stdout)}${String(exampleCheck.stderr)}`).toMatch(
      /PASS REMOTION EXAMPLE/u,
    );
  });

  it('rejects all 12 hostile portableMediaPath cases in the published fixture matrix', () => {
    const schema = z
      .object({
        properties: z.object({
          portableMediaPath: z.object({pattern: z.string()}),
        }),
      })
      .parse(
        readRepositoryJson('skills/remotion-video-production/schemas/render-output.schema.json'),
      );
    const publishedPattern = new RegExp(schema.properties.portableMediaPath.pattern, 'u');
    const hostileFixture = z
      .object({
        cases: z
          .array(
            z.strictObject({
              case: z.string().min(1),
              value: z.string(),
            }),
          )
          .length(12),
      })
      .parse(
        readRepositoryJson(
          'skills/remotion-video-production/fixtures/negative/portable-media-paths.json',
        ),
      );

    expect(hostileFixture.cases.filter(({value}) => publishedPattern.test(value))).toEqual([]);
  });

  it('confirms the production license gap cannot be erased by a READY-shaped output', () => {
    const verdict = z
      .object({
        commercial_or_production_use: z.object({
          verdict: z.literal('coverage_gap'),
          consequence: z.literal('blocked'),
        }),
      })
      .parse(
        readRepositoryYaml('skills/remotion-video-production/licenses/runtime-license-verdict.yml'),
      );
    const hostileOutput = z
      .object({
        status: z.literal('READY'),
        runtimeLicenseStatus: z.literal('unresolved'),
      })
      .safeParse(
        readRepositoryJson(
          'skills/remotion-video-production/fixtures/negative/render-output-ready-with-license-gap.json',
        ),
      );

    expect(hostileOutput.success).toBe(true);
    expect(verdict.commercial_or_production_use.consequence).toBe('blocked');
  });
});
