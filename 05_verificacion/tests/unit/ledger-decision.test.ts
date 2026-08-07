import {describe, expect, it} from 'vitest';

import {
  currentBytesFor,
  decisionFor,
  isAuthoredEligible,
  isGeneratedProjection,
} from '../../scripts/ledger/decision.ts';

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
