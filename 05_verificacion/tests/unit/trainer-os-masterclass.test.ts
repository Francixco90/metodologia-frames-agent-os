import {readFileSync, symlinkSync, unlinkSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe, expect, it} from 'vitest';

import {hashModel} from '../../../02_proceso/workflows/trainer-os/common.ts';
import {TrainerMasterclassContentSchema} from '../../../02_proceso/workflows/trainer-os/masterclass-contracts.ts';
import {
  countPdfPages,
  renderMasterclassPdf,
  renderMasterclassQaViewer,
} from '../../../02_proceso/workflows/trainer-os/masterclass-pdf.ts';
import {executeTrainer} from '../../../02_proceso/workflows/trainer-os/runner.ts';
import {fixture} from './trainer-os-compiler-core.test.ts';
import {
  configureMasterclassFixture,
  makeMasterclassContent,
  rewriteMasterclassAuthority,
  rewriteMasterclassContent,
  verifyMasterclassReplay,
} from './trainer-os-masterclass-fixture.test.ts';

const binding = (ref: string, digit: string) => ({ref, sha256: digit.repeat(64)});
const authority = {
  browserReceipt: binding('browser.json', 'a'),
  runtimeReceipt: binding('runtime.json', 'b'),
  fontReceipt: binding('font.json', 'c'),
};
const theme = {
  colors: {navy: '#0a122a', gold: '#e0b400', lightCanvas: '#f5f7fa'},
  typography: {heading: 'Poppins', body: 'Montserrat'},
};

describe('trainer official masterclass PDF', () => {
  it('renders one deterministic official PDF with exactly 18 pages', () => {
    const item = verifyMasterclassReplay(fixture);
    const pdf = readFileSync(resolve(item.root, 'dist/masterclass/es/masterclass.pdf'));
    expect(pdf.subarray(0, 8).toString()).toBe('%PDF-1.4');
    expect(countPdfPages(pdf)).toBe(18);
    expect(pdf.toString('latin1')).not.toMatch(/CreationDate|ModDate/u);
    const tree = JSON.parse(
      readFileSync(resolve(item.root, 'outputs/build-manifest.json'), 'utf8'),
    ) as {outputs: Array<{ref: string}>};
    expect(tree.outputs.map(({ref}) => ref)).toEqual(['dist/masterclass/es/masterclass.pdf']);
  });

  it('keeps the navigable viewer QA-only and outside official output', () => {
    const viewer = renderMasterclassQaViewer('../../dist/masterclass/es/masterclass.pdf', 'es');
    expect(viewer).toContain('data-qa-only="true"');
    expect(viewer).toContain('data-publication="false"');
    expect(viewer).toContain('type="application/pdf"');
    expect(() => renderMasterclassQaViewer('javascript:alert(1)', 'es')).toThrow(
      'TRAINER_MASTERCLASS_QA_REF_INVALID',
    );
    expect(() =>
      renderMasterclassQaViewer('../../dist/masterclass/es/masterclass.pdf', 'en'),
    ).toThrow('TRAINER_MASTERCLASS_QA_REF_INVALID');
  });

  it('compiles and replays an exact three-locale official output tree', () => {
    const item = verifyMasterclassReplay(fixture, ['es', 'en', 'pt']);
    const tree = JSON.parse(
      readFileSync(resolve(item.root, 'outputs/build-manifest.json'), 'utf8'),
    ) as {outputs: Array<{ref: string}>};
    expect(tree.outputs.map(({ref}) => ref)).toEqual([
      'dist/masterclass/en/masterclass.pdf',
      'dist/masterclass/es/masterclass.pdf',
      'dist/masterclass/pt/masterclass.pdf',
    ]);
  });

  it.each(['moments', 'timing', 'locale', 'hash', 'private'] as const)(
    'rejects adversarial %s drift',
    (mode) => {
      const value = structuredClone(
        makeMasterclassContent(binding('route.json', 'd'), binding('lock.json', 'e'), authority),
      );
      const first = value.locales.es.moments[0];
      if (!first) throw new Error('synthetic first moment missing');
      if (mode === 'moments') value.locales.es.moments.pop();
      if (mode === 'timing') first.baseMinutes = 4;
      if (mode === 'locale') value.requestedLocales = ['es', 'en'];
      if (mode === 'private') first.body = 'file:///private/source';
      if (mode === 'hash') first.body = 'stale hash mutation';
      if (mode !== 'hash') value.contentSha256 = hashModel(value, 'contentSha256');
      if (mode === 'private') {
        const item = configureMasterclassFixture(fixture());
        const content = TrainerMasterclassContentSchema.parse(
          JSON.parse(readFileSync(resolve(item.root, 'adapter-content.json'), 'utf8')),
        );
        const contentFirst = content.locales.es.moments[0];
        if (!contentFirst) throw new Error('synthetic first moment missing');
        contentFirst.body = first.body;
        content.contentSha256 = hashModel(content, 'contentSha256');
        rewriteMasterclassContent(item, content);
        expect(() => executeTrainer('build', item.runPath)).toThrow();
      } else expect(() => TrainerMasterclassContentSchema.parse(value)).toThrow();
    },
  );

  it('fails closed instead of clipping long text', () => {
    const content = makeMasterclassContent(
      binding('route.json', 'd'),
      binding('lock.json', 'e'),
      authority,
    );
    const first = content.locales.es.moments[0];
    if (!first) throw new Error('synthetic first moment missing');
    first.body = 'a'.repeat(500);
    content.contentSha256 = hashModel(content, 'contentSha256');
    const parsed = TrainerMasterclassContentSchema.parse(content);
    expect(() => renderMasterclassPdf(parsed, 'es', theme)).toThrow(
      'TRAINER_MASTERCLASS_TEXT_OVERFLOW',
    );
  });

  it('keeps ES/PT WinAnsi accents and exposes tagged metadata and timing', () => {
    const content = makeMasterclassContent(
      binding('route.json', 'd'),
      binding('lock.json', 'e'),
      authority,
      ['es', 'pt'],
    );
    const portuguese = content.locales.pt;
    const first = portuguese?.moments[0];
    if (!first || !portuguese) throw new Error('synthetic Portuguese first moment missing');
    first.body = 'Sessão ágil com ação útil';
    content.contentSha256 = hashModel(content, 'contentSha256');
    const pdf = renderMasterclassPdf(TrainerMasterclassContentSchema.parse(content), 'pt', theme);
    const source = pdf.toString('latin1');
    expect(source).toContain('/Lang (pt)');
    expect(source).toContain('/MarkInfo << /Marked true >>');
    expect(source).toContain('/StructTreeRoot');
    expect(source).toContain('/Title');
    expect(source.match(/\/S \/H1\b/gu)).toHaveLength(18);
    expect(source.match(/\/S \/P\b/gu)).toHaveLength(54);
    expect(source.match(/\/Artifact BMC/gu)).toHaveLength(18);
    expect(source).toContain('53657373E36F20E167696C20636F6D2061E7E36F20FA74696C');
    expect(source).toContain('526F7461203930202B203330');
    expect(source).toContain('35206D696E206261736520B72030206D696E206578747261');
    expect(source).toContain(Buffer.from(portuguese.lede, 'latin1').toString('hex').toUpperCase());
  });

  it('rejects a well-formed runtime receipt that does not describe this runtime', () => {
    const item = configureMasterclassFixture(fixture());
    const ref = 'runtime.json';
    const receipt = JSON.parse(readFileSync(resolve(item.root, ref), 'utf8')) as Record<
      string,
      unknown
    >;
    receipt.version = 'v0.0.0';
    rewriteMasterclassAuthority(item, ref, receipt);
    expect(() => executeTrainer('build', item.runPath)).toThrow(
      'TRAINER_MASTERCLASS_RUNTIME_VERSION_DRIFT',
    );
  });

  it('binds one H1 and three paragraph structures to distinct MCIDs on every page', () => {
    const content = makeMasterclassContent(
      binding('route.json', 'd'),
      binding('lock.json', 'e'),
      authority,
    );
    const source = renderMasterclassPdf(content, 'es', theme).toString('latin1');
    for (let page = 0; page < 18; page += 1) {
      const pageId = 3 + page * 2;
      expect(source).toContain(`/StructParents ${page} /MediaBox`);
      for (const [mcid, role] of ['H1', 'P', 'P', 'P'].entries()) {
        const structureId = 41 + page * 4 + mcid;
        expect(source).toContain(`/${role} <</MCID ${mcid}>> BDC`);
        expect(source).toContain(
          `${structureId} 0 obj\n<< /Type /StructElem /S /${role} /P 40 0 R /Pg ${pageId} 0 R /K ${mcid} >>`,
        );
      }
    }
    expect(source.match(/\/H1 <<\/MCID 0>> BDC/gu)).toHaveLength(18);
    expect(source.match(/\/P <<\/MCID [123]>> BDC/gu)).toHaveLength(54);
    expect(source.match(/\/Artifact BMC/gu)).toHaveLength(18);
  });

  it('materializes a locked color change in PDF bytes', () => {
    const content = makeMasterclassContent(
      binding('route.json', 'd'),
      binding('lock.json', 'e'),
      authority,
    );
    const changed = {...theme, colors: {...theme.colors, gold: '#765400'}};
    expect(renderMasterclassPdf(content, 'es', theme)).not.toEqual(
      renderMasterclassPdf(content, 'es', changed),
    );
    const channel = (hex: string) => {
      const value = Number.parseInt(hex, 16) / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    };
    const luminance = (color: string) =>
      0.2126 * channel(color.slice(1, 3)) +
      0.7152 * channel(color.slice(3, 5)) +
      0.0722 * channel(color.slice(5, 7));
    const navy = luminance(theme.colors.navy);
    const gold = luminance(theme.colors.gold);
    const high = Math.max(navy, gold);
    const low = Math.min(navy, gold);
    expect((high + 0.05) / (low + 0.05)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(['mutation', 'symlink', 'missing-authority', 'residual'] as const)(
    'blocks %s after setup',
    (mode) => {
      const item = configureMasterclassFixture(fixture());
      if (mode === 'missing-authority') unlinkSync(resolve(item.root, 'runtime.json'));
      if (mode === 'residual') writeFileSync(resolve(item.root, '.trainer-stage'), 'residual');
      if (mode === 'missing-authority' || mode === 'residual')
        return expect(() => executeTrainer('build', item.runPath)).toThrow();
      executeTrainer('build', item.runPath);
      const output = resolve(item.root, 'dist/masterclass/es/masterclass.pdf');
      if (mode === 'mutation') writeFileSync(output, 'mutated');
      else {
        unlinkSync(output);
        symlinkSync(resolve(item.root, 'source.txt'), output);
      }
      expect(() => executeTrainer('verify', item.runPath)).toThrow();
    },
  );

  it('keeps unreviewed package and benchmark fail-closed', () => {
    const item = configureMasterclassFixture(fixture());
    expect(() => executeTrainer('package', item.runPath)).toThrow(
      'TRAINER_PACKAGE_REQUIRES_RENDERED_DRAFT',
    );
    expect(() => executeTrainer('benchmark', item.runPath)).toThrow('NOT_IMPLEMENTED_FAIL_CLOSED');
  });
});
