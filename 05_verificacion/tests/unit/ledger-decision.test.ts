import {readFileSync} from 'node:fs';

import {describe, expect, it} from 'vitest';
import {parse} from 'yaml';

import type {Ledger} from '../../scripts/generate-file-disposition-ledger.ts';

import {
  currentBytesFor,
  decisionFor,
  isAuthoredEligible,
  isGeneratedProjection,
} from '../../scripts/ledger/decision.ts';
import {markdownFor} from '../../scripts/ledger/markdown.ts';

const root = process.cwd();

describe('isGeneratedProjection', () => {
  it('classifies brand generated projections, content generated trees and project artifacts', () => {
    expect(isGeneratedProjection('brand/generated/social-light.tokens.json')).toBe(true);
    expect(isGeneratedProjection('content/foo/generated/x.ts')).toBe(true);
    expect(isGeneratedProjection('projects/x/orchestration/run.json')).toBe(true);
    expect(isGeneratedProjection('projects/x/artifacts/y.ts')).toBe(true);
    expect(isGeneratedProjection('docs/program/file-disposition-ledger.yml')).toBe(true);
  });

  it('does not classify authored source as generated', () => {
    expect(isGeneratedProjection('scripts/ledger/decision.ts')).toBe(false);
    expect(isGeneratedProjection('package.json')).toBe(false);
  });
});

describe('isAuthoredEligible', () => {
  it('excludes historical evidence and generated projections', () => {
    expect(isAuthoredEligible('governance/policy.md')).toBe(false);
    expect(isAuthoredEligible('brand/generated/social-light.tokens.json')).toBe(false);
    expect(isAuthoredEligible('scripts/ledger/decision.ts')).toBe(true);
  });
});

describe('decisionFor', () => {
  it('returns immutable_history for historical evidence regardless of byte identity', () => {
    const result = decisionFor('governance/policy.md', false);
    expect(result.decision).toBe('immutable_history');
    expect(result.generatorRef).toBeNull();
    expect(result.successorPath).toBeNull();
  });

  it('returns quarantined for the legacy stitch wrapper prefix', () => {
    const result = decisionFor('skills/stitch-remotion-walkthrough/foo.ts', true);
    expect(result.decision).toBe('quarantined');
  });

  it('returns verified_no_change when working-tree bytes equal the baseline', () => {
    const result = decisionFor('scripts/ledger/decision.ts', true);
    expect(result.decision).toBe('verified_no_change');
  });

  it('returns generator_fixed when a changed path has a canonical generator', () => {
    const result = decisionFor(
      'projects/vs-001-source-to-campaign/remotion/05-input-props.json',
      false,
    );
    expect(result.decision).toBe('generator_fixed');
    expect(result.generatorRef).toBe('renderers/remotion/scripts/prepare-project.ts');
  });

  it('returns refactored when a changed authored path has no generator', () => {
    const result = decisionFor('scripts/ledger/decision.ts', false);
    expect(result.decision).toBe('refactored');
    expect(result.generatorRef).toBeNull();
  });
});

describe('currentBytesFor', () => {
  it('reads an existing file as a Buffer', () => {
    const bytes = currentBytesFor(root, 'package.json');
    expect(bytes).toBeInstanceOf(Buffer);
    expect(bytes && bytes.length).toBeGreaterThan(0);
  });

  it('returns null for a missing path', () => {
    expect(currentBytesFor(root, 'no-such-file-xyz.json')).toBeNull();
  });

  it('returns null for a directory rather than reading it as a file', () => {
    expect(currentBytesFor(root, 'scripts')).toBeNull();
  });
});

describe('markdownFor', () => {
  it('renders baseline, coverage and entries from the ledger value', () => {
    const ledger = parse(
      readFileSync('docs/program/file-disposition-ledger.yml', 'utf8'),
    ) as Ledger;
    const [first, second, omitted] = ledger.entries;
    if (!first || !second || !omitted) throw new Error('ledger fixture requires three entries');

    const baseline = 'f'.repeat(40);
    const fixture: Ledger = {
      ...ledger,
      baseline_commit: baseline,
      baseline_file_count: 2,
      coverage: '2/2',
      entries: [first, second],
    };
    const markdown = markdownFor(fixture);

    expect(markdown).toContain(`Baseline: \`${baseline}\`. Coverage: **2/2**.`);
    expect(markdown).toContain('de los 2 archivos.');
    expect(markdown).toContain('## Cobertura 2/2');
    expect(markdown).toContain(`\`${first.path}\``);
    expect(markdown).toContain(`\`${second.path}\``);
    expect(markdown).not.toContain(`\`${omitted.path}\``);
    expect(markdown).not.toContain('de los 377 archivos.');
    expect(markdown).not.toContain('## Cobertura 387/387');
  });
});
