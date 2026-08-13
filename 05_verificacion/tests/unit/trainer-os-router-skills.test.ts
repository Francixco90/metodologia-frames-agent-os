import {createHash} from 'node:crypto';
import {readFileSync, readdirSync, statSync} from 'node:fs';
import {relative, resolve} from 'node:path';

import {parse} from 'yaml';
import {describe, expect, it} from 'vitest';
import {z} from 'zod';

const root = process.cwd();
const base = '03_artefactos/skills';
const ids = ['metodologia-trainer-os', 'metodologia-masterclass-pdf'] as const;
const read = (ref: string) => readFileSync(resolve(root, ref), 'utf8');
const sha = (value: string) => createHash('sha256').update(value).digest('hex');
const walk = (directory: string): string[] =>
  readdirSync(directory).flatMap((name) => {
    const child = resolve(directory, name);
    return statSync(child).isDirectory() ? walk(child) : [child];
  });
const packageDigest = (id: string) => {
  const directory = resolve(root, base, id);
  const manifest = `${walk(directory)
    .sort()
    .map((path) => `${sha(readFileSync(path, 'utf8'))}  ${relative(directory, path)}`)
    .join('\n')}\n`;
  return sha(manifest);
};
const routeIssues = (value: {
  directions: number;
  questions: number;
  prompts: number;
  publish: boolean;
  privateReceipts: boolean;
}) => [
  ...(value.directions === 2 ? [] : ['directions']),
  ...(value.questions <= 2 ? [] : ['questions']),
  ...(value.prompts >= 3 && value.prompts <= 5 ? [] : ['prompts']),
  ...(value.publish ? ['publication'] : []),
  ...(value.privateReceipts ? ['private-receipts'] : []),
];
const pdfIssues = (value: {moments: number; fontRef: string; viewerPublic: boolean}) => [
  ...(value.moments === 18 ? [] : ['moment_count']),
  ...(value.fontRef === 'fonts/helvetica-standard-14' ? [] : ['font_authority']),
  ...(value.viewerPublic ? ['viewer_publication'] : []),
];
const fixture = z.discriminatedUnion('skill_id', [
  z.strictObject({
    schema_version: z.literal('trainer-skill-fixture-v1'),
    skill_id: z.literal('metodologia-trainer-os'),
    request: z.string().min(1),
    input: z.strictObject({
      directions: z.number().int().nonnegative(),
      questions: z.number().int().nonnegative(),
      prompts: z.number().int().nonnegative(),
      publish: z.boolean(),
      private_receipts: z.boolean(),
    }),
    expect: z.union([
      z.strictObject({
        directions: z.literal(2),
        blocking_questions_max: z.literal(2),
        prompt_count_min: z.literal(3),
        prompt_count_max: z.literal(5),
        maximum_state: z.literal('RENDERED_DRAFT'),
        publication_authority: z.literal(false),
      }),
      z.strictObject({
        verdict: z.literal('BLOCK'),
        reasons: z.tuple([z.literal('publication'), z.literal('private-receipts')]),
        publication_authority: z.literal(false),
      }),
    ]),
  }),
  z.strictObject({
    schema_version: z.literal('trainer-skill-fixture-v1'),
    skill_id: z.literal('metodologia-masterclass-pdf'),
    request: z.string().min(1),
    input: z.strictObject({
      moments: z.number().int().nonnegative(),
      font_ref: z.string().min(1),
      viewer_public: z.boolean(),
    }),
    expect: z.union([
      z.strictObject({
        official_format: z.literal('pdf'),
        pages: z.literal(18),
        base_minutes: z.literal(90),
        extension_minutes: z.literal(30),
        locales: z.tuple([z.literal('es'), z.literal('en'), z.literal('pt')]),
        deterministic_replay: z.literal(true),
        maximum_state: z.literal('RENDERED_DRAFT'),
        publication_authority: z.literal(false),
      }),
      z.strictObject({
        verdict: z.literal('BLOCK'),
        reasons: z.tuple([
          z.literal('moment_count'),
          z.literal('font_authority'),
          z.literal('viewer_publication'),
        ]),
        publication_authority: z.literal(false),
      }),
    ]),
  }),
]);

describe('Trainer OS candidate skill routers', () => {
  it.each(ids)('%s has strict positive and negative fixtures', (id) => {
    for (const kind of ['positive', 'negative'])
      expect(fixture.parse(parse(read(`${base}/${id}/fixtures/${kind}/case.yml`))).skill_id).toBe(
        id,
      );
  });

  it('keeps Tier 1 concise and bounded to two directions and 3-5 prompts', () => {
    const skill = read(`${base}/metodologia-trainer-os/SKILL.md`);
    expect([...skill].length).toBeLessThanOrEqual(1200);
    expect(skill).toContain('exactly two distinct directions');
    expect(skill).toContain('at most two blocking questions');
    expect(skill).toContain('Allow three');
    expect(skill).toContain('and five');
    expect(skill).toContain('progressive');
  });

  it('executes router and PDF fixture semantics and catches contract mutations', () => {
    const routePositive = fixture.parse(
      parse(read(`${base}/metodologia-trainer-os/fixtures/positive/case.yml`)),
    );
    const routeNegative = fixture.parse(
      parse(read(`${base}/metodologia-trainer-os/fixtures/negative/case.yml`)),
    );
    if (
      routePositive.skill_id !== 'metodologia-trainer-os' ||
      routeNegative.skill_id !== 'metodologia-trainer-os'
    )
      throw new Error('ROUTER_FIXTURE_ROUTING_DRIFT');
    expect(routePositive.expect).toMatchObject({directions: 2, prompt_count_max: 5});
    expect(routeNegative.expect).toMatchObject({verdict: 'BLOCK'});
    const toRouteInput = (input: typeof routePositive.input) => ({
      directions: input.directions,
      questions: input.questions,
      prompts: input.prompts,
      publish: input.publish,
      privateReceipts: input.private_receipts,
    });
    expect(routeIssues(toRouteInput(routePositive.input))).toEqual([]);
    expect(routeIssues(toRouteInput(routeNegative.input))).toEqual([
      'publication',
      'private-receipts',
    ]);
    const route = toRouteInput(routePositive.input);
    expect(routeIssues({...route, directions: 3})).toContain('directions');
    expect(routeIssues({...route, questions: 3})).toContain('questions');
    expect(routeIssues({...route, prompts: 6})).toContain('prompts');
    expect(routeIssues({...route, publish: true, privateReceipts: true})).toEqual([
      'publication',
      'private-receipts',
    ]);
    const pdfPositive = fixture.parse(
      parse(read(`${base}/metodologia-masterclass-pdf/fixtures/positive/case.yml`)),
    );
    const pdfNegative = fixture.parse(
      parse(read(`${base}/metodologia-masterclass-pdf/fixtures/negative/case.yml`)),
    );
    if (
      pdfPositive.skill_id !== 'metodologia-masterclass-pdf' ||
      pdfNegative.skill_id !== 'metodologia-masterclass-pdf'
    )
      throw new Error('PDF_FIXTURE_ROUTING_DRIFT');
    const toPdfInput = (input: typeof pdfPositive.input) => ({
      moments: input.moments,
      fontRef: input.font_ref,
      viewerPublic: input.viewer_public,
    });
    const pdf = toPdfInput(pdfPositive.input);
    expect(pdfIssues(pdf)).toEqual([]);
    expect(pdfIssues(toPdfInput(pdfNegative.input))).toEqual([
      'moment_count',
      'font_authority',
      'viewer_publication',
    ]);
    expect(pdfIssues({...pdf, moments: 17})).toContain('moment_count');
    for (const fontRef of [
      'https://fonts.invalid/font.woff2',
      'file:///private/font.woff2',
      '//fonts.invalid/font.woff2',
      'fonts/unlisted.woff2',
    ])
      expect(pdfIssues({...pdf, fontRef})).toContain('font_authority');
    expect(pdfIssues({...pdf, viewerPublic: true})).toContain('viewer_publication');
  });

  it('routes PDF compilation to the shared deterministic implementation', () => {
    const skill = read(`${base}/metodologia-masterclass-pdf/SKILL.md`);
    const lineage = read(`${base}/metodologia-masterclass-pdf/LINEAGE.yml`);
    for (const token of [
      '18 moments',
      '90 base minutes plus 30',
      'shared Trainer OS compiler',
      'RENDERED_DRAFT',
      'publication',
      'masterclass-compiler.ts',
      'masterclass-pdf.ts',
      'blocked_pending_evaluation',
    ])
      expect(`${skill}\n${lineage}`).toContain(token);
  });

  it('binds candidate registry entries and append-only events to package bytes', () => {
    const registry = parse(read('04_estado/registries/skills/skill-registry.yml')) as {
      entries: Array<Record<string, unknown>>;
      events: Array<Record<string, unknown>>;
    };
    for (const id of ids) {
      const entry = registry.entries.find(({skill_id: skillId}) => skillId === id);
      const event = registry.events.find(({skill_id: skillId}) => skillId === id);
      expect(entry).toMatchObject({
        skill_id: id,
        current_state: 'candidate',
        production_runtime_status: 'blocked_pending_evaluation',
        publication_authority: false,
      });
      expect(event).toMatchObject({skill_id: id, transition: {from: null, to: 'candidate'}});
      expect(entry?.content_sha256).toBe(sha(read(`${base}/${id}/SKILL.md`)));
      expect(entry?.package_manifest_sha256).toBe(packageDigest(id));
      expect(event?.content_sha256).toBe(entry?.content_sha256);
      expect(entry?.lineage).toBe(`skills/${id}/LINEAGE.yml`);
      const lineage = parse(read(`${base}/${id}/LINEAGE.yml`)) as {
        authority_refs: string[];
        runtime_refs: string[];
      };
      for (const ref of [...lineage.authority_refs, ...lineage.runtime_refs])
        expect(statSync(resolve(root, ref)).isFile()).toBe(true);
      expect(statSync(resolve(root, base, id, 'references/operating-contract.md')).isFile()).toBe(
        true,
      );
      expect(read(`${base}/${id}/SKILL.md`)).toContain('(references/operating-contract.md)');
    }
  });
});
