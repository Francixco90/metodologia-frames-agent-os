import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {verifyHtml} from './html-verifier.mjs';
import {packageHash} from './canonical.mjs';
import {validatePackagePolicy} from './package-policy.mjs';

const clone = (value) => structuredClone(value);
const rehash = (pkg) => ({...pkg, package_sha256: packageHash(pkg)});

export const verifyPolicyMutations = (pkg, skillRoot) => {
  const failures = [];
  const cases = [
    [
      'duplicate_variant',
      (value) => value.variants.push(clone(value.variants[0])),
      'DUPLICATE_VARIANT',
    ],
    [
      'duplicate_output',
      (value) => value.outputs.push(clone(value.outputs[0])),
      'DUPLICATE_OUTPUT',
    ],
    ['output_matrix', (value) => value.outputs.pop(), 'OUTPUT_MATRIX'],
    [
      'artifact_hash',
      (value) => {
        value.outputs[0].artifact_sha256 = 'f'.repeat(64);
      },
      'OUTPUT_HASH',
    ],
    [
      'stale_approval',
      (value) => {
        value.state = 'READY';
        value.approved_spec_sha256 = 'f'.repeat(64);
      },
      'STALE_APPROVAL',
    ],
    [
      'published_without_receipt',
      (value) => {
        value.state = 'PUBLISHED';
        value.approved_spec_sha256 = value.spec_sha256;
      },
      'PUBLICATION_RECEIPT_STATE',
    ],
    [
      'receipt_mismatch',
      (value) => {
        value.state = 'PUBLISHED';
        value.approved_spec_sha256 = value.spec_sha256;
        value.publication_receipt = {
          receipt_ref: 'fixtures/runtime/missing-receipt.json',
          receipt_sha256: 'a'.repeat(64),
          external_event_id: 'SYNTH-EVENT',
          observed_at: '2026-08-11T12:00:00-05:00',
          ready_package_sha256: 'b'.repeat(64),
        };
      },
      'PUBLICATION_RECEIPT_EVIDENCE',
    ],
  ];
  for (const [id, mutate, expected] of cases) {
    const value = clone(pkg);
    mutate(value);
    const issues = validatePackagePolicy(rehash(value), skillRoot);
    if (!issues.some((issue) => issue.startsWith(expected))) failures.push(`PROBE_${id}`);
  }
  return failures;
};

export const verifyHtmlMutations = () => {
  const directory = mkdtempSync(join(tmpdir(), 'cv-html-'));
  try {
    const base =
      '<html lang="es"><head><meta name="viewport" content="width=device-width"></head><body><main><h1>A</h1><section data-print-page="1">Visible</section></main></body></html>';
    const cases = [
      ['javascript', base.replace('</main>', '<script>bad()</script></main>'), 'HTML_JAVASCRIPT'],
      [
        'remote',
        base.replace('</main>', '<img src="https://remote.invalid/a.png"></main>'),
        'HTML_REMOTE_DEPENDENCY',
      ],
      [
        'hidden',
        base.replace('Visible', '<span style="display:none">keywords</span>'),
        'HTML_HIDDEN_CONTENT',
      ],
      [
        'pages',
        base.replace('</main>', '<section data-print-page="2">B</section></main>'),
        'PAGE_BUDGET_EXCEEDED',
      ],
      [
        'json_wrong_id',
        base.replace('</main>', '<script id="other" type="application/json">{}</script></main>'),
        'HTML_JAVASCRIPT',
      ],
      [
        'json_invalid',
        base.replace(
          '</main>',
          '<script id="career-document-data" type="application/json">{bad}</script></main>',
        ),
        'HTML_INERT_JSON_INVALID',
      ],
      [
        'json_src',
        base.replace(
          '</main>',
          '<script id="career-document-data" type="application/json" src="a.json">{}</script></main>',
        ),
        'HTML_JAVASCRIPT',
      ],
    ];
    const failures = cases.flatMap(([id, html, expected]) => {
      const path = join(directory, `${id}.html`);
      writeFileSync(path, html, 'utf8');
      return verifyHtml(path, 1).issues.includes(expected) ? [] : [`HTML_PROBE_${id}`];
    });
    const allowed = join(directory, 'inert.html');
    writeFileSync(
      allowed,
      base.replace(
        '</main>',
        '<script id="career-document-data" type="application/json">{"safe":true}</script></main>',
      ),
      'utf8',
    );
    if (verifyHtml(allowed, 1).status !== 'PASS') failures.push('HTML_PROBE_INERT_JSON');
    return failures;
  } finally {
    rmSync(directory, {recursive: true, force: true});
  }
};
