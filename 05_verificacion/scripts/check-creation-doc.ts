import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync, statSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

import {parse as parseYaml} from 'yaml';

import {SourceFreezeReceiptV1Schema} from '../../core/contracts/creation-v3.ts';
import {sha256Text} from '../../core/evidence/hash.ts';
import {
  adaptLegacyCarouselEditorialInputV1,
  LegacyCarouselSourceSnapshotV1Schema,
  parseLegacyCarouselEditorialYaml,
} from '../../workflows/content/markdown/legacy-carousel-adapter.ts';
import {
  assertPublicContentPolicy,
  loadCanonicalContent,
} from '../../workflows/content/markdown/parse-canonical-content.ts';
import {
  buildSourceFreezeReceipt,
  computeSourceFreezeReceiptSha256,
} from '../../workflows/content/markdown/source-freeze.ts';
import {measureAuthoredSurface} from './generate-file-disposition-ledger.ts';

const CONTENT_REF = 'content/pilot-carousel-002/content.md';
const CANONICAL_REF = 'content/pilot-carousel-002/generated/canonical-content-document.json';
const RECEIPT_REF = 'content/pilot-carousel-002/generated/source-freeze-receipt.json';
const BASELINE_REF = 'quality/reports/creation-v3-h01-baseline.yml';
const COMMITTEE_REF = 'committees/creation/H-01/canonical-content-contract.md';
const NETWORK_REF = 'docs/program/instagram-content-creation-network-v3.md';
const BASE_COMMIT = '7c26b6719451de7b0101262f3c379f85a251f939';

const sha256Bytes = (value: Uint8Array): string => createHash('sha256').update(value).digest('hex');

const walkFiles = (root: string, directory: string): string[] => {
  return execFileSync('git', ['ls-files', '-z', '--', directory], {
    cwd: root,
    encoding: 'utf8',
  })
    .split('\0')
    .filter(Boolean)
    .sort();
};

const digestTree = (root: string, directory: string): string => {
  const ledger = walkFiles(root, directory)
    .map((path) => `${sha256Bytes(readFileSync(resolve(root, path)))}  ${path}\n`)
    .join('');
  return sha256Text(ledger);
};

const checkCommittee = (document: string): string[] => {
  const errors: string[] = [];
  const roles = ['RT-03', 'RT-04', 'RT-07', 'RT-08', 'RT-10'];
  const rows = document
    .split('\n')
    .filter((line) => line.startsWith('|'))
    .map((line) =>
      line
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim()),
    );
  const positionRows = rows.flatMap(([id]) => {
    const match = /^P-(RT(?:03|04|07|08|10))$/u.exec(id ?? '');
    return match === null ? [] : [`RT-${match[1]!.slice(2)}`];
  });
  if (positionRows.length !== 5 || new Set(positionRows).size !== 5) {
    errors.push(`H01-CMT-001 expected five unique positions, received ${positionRows.length}`);
  }
  for (const role of roles) {
    if (!positionRows.includes(role)) errors.push(`H01-CMT-002 missing position ${role}`);
  }

  const reviewRows = rows.flatMap(([id, reviewer, target]) => {
    const match = /^X-(RT(?:03|04|07|08|10))-(RT(?:03|04|07|08|10))$/u.exec(id ?? '');
    return match === null
      ? []
      : [
          {
            idReviewer: `RT-${match[1]!.slice(2)}`,
            idTarget: `RT-${match[2]!.slice(2)}`,
            reviewer: reviewer ?? '',
            target: target ?? '',
          },
        ];
  });
  if (reviewRows.length !== 20) {
    errors.push(`H01-CMT-003 expected 20 cross-reviews, received ${reviewRows.length}`);
  }
  const pairs = new Set<string>();
  for (const review of reviewRows) {
    if (review.idReviewer !== review.reviewer || review.idTarget !== review.target) {
      errors.push(`H01-CMT-004 review ID and actor columns diverge: ${JSON.stringify(review)}`);
    }
    if (review.reviewer === review.target) {
      errors.push(`H01-CMT-005 self-review is forbidden: ${review.reviewer}`);
    }
    pairs.add(`${review.reviewer}->${review.target}`);
  }
  for (const reviewer of roles) {
    for (const target of roles) {
      if (reviewer !== target && !pairs.has(`${reviewer}->${target}`)) {
        errors.push(`H01-CMT-006 missing directed review ${reviewer}->${target}`);
      }
    }
  }
  if (pairs.size !== 20)
    errors.push(`H01-CMT-007 expected 20 unique pairs, received ${pairs.size}`);
  return errors;
};

export const validateCreationDoc = (root = process.cwd()): string[] => {
  const errors: string[] = [];
  try {
    const loaded = loadCanonicalContent(root, CONTENT_REF);
    const voice = parseYaml(
      readFileSync(resolve(root, 'registries/brand/voice-profile-v2.yml'), 'utf8'),
    ) as {red_list: string[]};
    assertPublicContentPolicy(loaded.document, voice.red_list);

    const capabilityIds = loaded.document.frontmatter.plannedCapabilities.map(
      ({capabilityId}) => capabilityId,
    );
    const expectedCapabilities = [
      'd3',
      'gsap',
      'lottie',
      'remotion-v3-creative-compositor',
      'three',
    ];
    if (JSON.stringify(capabilityIds) !== JSON.stringify(expectedCapabilities)) {
      errors.push(`H01-CAP-001 capability set/order drift: ${capabilityIds.join(',')}`);
    }
    const routerBeat = loaded.document.body.narrativeBeats.find(
      ({purpose}) => purpose === 'visual_router',
    );
    if (
      routerBeat?.stateDisclosure !== 'planned_capability' ||
      new Set(routerBeat.plannedCapabilityIds).size !== 5
    ) {
      errors.push('H01-CAP-002 router beat must bind five planned capabilities');
    }
    if (loaded.manifest.readSet.length !== 23) {
      errors.push(
        `H01-SRC-001 expected 23 explicit read-set entries, received ${loaded.manifest.readSet.length}`,
      );
    }

    const expectedDocument = `${JSON.stringify(loaded.document, null, 2)}\n`;
    const actualDocument = readFileSync(resolve(root, CANONICAL_REF), 'utf8');
    if (actualDocument !== expectedDocument) {
      errors.push('H01-GEN-001 canonical content projection is stale; run pnpm creation-doc:build');
    }

    const expectedReceipt = buildSourceFreezeReceipt(CONTENT_REF, loaded);
    const actualReceiptText = readFileSync(resolve(root, RECEIPT_REF), 'utf8');
    const actualReceipt = SourceFreezeReceiptV1Schema.parse(JSON.parse(actualReceiptText));
    if (actualReceiptText !== `${JSON.stringify(expectedReceipt, null, 2)}\n`) {
      errors.push('H01-GEN-002 source-freeze receipt is stale; run pnpm creation-doc:build');
    }
    const {receiptSha256: declaredReceiptSha256, ...unsignedReceipt} = actualReceipt;
    if (computeSourceFreezeReceiptSha256(unsignedReceipt) !== declaredReceiptSha256) {
      errors.push('H01-GEN-003 source-freeze receipt self-hash mismatch');
    }
    if (
      actualReceipt.maximumState !== 'SCOPED' ||
      actualReceipt.authoredStatus !== 'DRAFT' ||
      actualReceipt.publicationAuthority ||
      actualReceipt.distributionState !== 'NOT_DESIGNED'
    ) {
      errors.push('H01-STATE-001 H-01 state boundary drift');
    }

    const legacyInputRaw = readFileSync(
      resolve(root, 'projects/pilot-carousel-001/editorial/pilot-content.yml'),
      'utf8',
    );
    const legacySnapshotRaw = readFileSync(
      resolve(root, 'projects/pilot-carousel-001/spec/source-snapshot.json'),
      'utf8',
    );
    const legacyProjection = adaptLegacyCarouselEditorialInputV1(
      parseLegacyCarouselEditorialYaml(legacyInputRaw),
      LegacyCarouselSourceSnapshotV1Schema.parse(JSON.parse(legacySnapshotRaw)),
      {
        legacyInputSha256: sha256Text(legacyInputRaw),
        legacySnapshotSha256: sha256Text(legacySnapshotRaw),
      },
    );
    if (
      !legacyProjection.legacyReadOnly ||
      legacyProjection.publicationAuthority ||
      legacyProjection.legacyNotes.length !== 8
    ) {
      errors.push('H01-LEGACY-001 legacy adapter elevated or lost historical content');
    }
  } catch (error) {
    errors.push(`H01-DOC-001 ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    const baseline = parseYaml(readFileSync(resolve(root, BASELINE_REF), 'utf8')) as {
      legacy: {
        pilot_carousel_001_tree_sha256: string;
        vs_001_tree_sha256: string;
      };
      budget: {
        baseline_authored_words: number;
        baseline_authored_loc: number;
        objective_multiplier: number;
        hard_cap_multiplier: number;
      };
    };
    const pilotDigest = digestTree(root, 'projects/pilot-carousel-001');
    const vsDigest = digestTree(root, 'projects/vs-001-source-to-campaign');
    if (pilotDigest !== baseline.legacy.pilot_carousel_001_tree_sha256) {
      errors.push(`H01-LEGACY-002 pilot-carousel-001 changed: ${pilotDigest}`);
    }
    if (vsDigest !== baseline.legacy.vs_001_tree_sha256) {
      errors.push(`H01-LEGACY-003 VS-001 changed: ${vsDigest}`);
    }
    const n8nDiff = execFileSync(
      'git',
      ['diff', '--name-only', BASE_COMMIT, '--', 'adapters/n8n'],
      {cwd: root, encoding: 'utf8'},
    ).trim();
    const n8nUntracked = execFileSync('git', ['status', '--porcelain', '--', 'adapters/n8n'], {
      cwd: root,
      encoding: 'utf8',
    }).trim();
    if (n8nDiff !== '' || n8nUntracked !== '') {
      errors.push('H01-SCOPE-001 adapters/n8n changed during creation-only H-01');
    }
    const authoredSurface = measureAuthoredSurface(root);
    const objectiveWords = Math.floor(
      baseline.budget.baseline_authored_words * baseline.budget.objective_multiplier,
    );
    const hardCapWords = Math.floor(
      baseline.budget.baseline_authored_words * baseline.budget.hard_cap_multiplier,
    );
    const hardCapLoc = Math.floor(
      baseline.budget.baseline_authored_loc * baseline.budget.hard_cap_multiplier,
    );
    if (authoredSurface.words > objectiveWords) {
      errors.push(
        `H01-BUDGET-001 V3 authored surface exceeds rolling 1.5x objective: ${authoredSurface.words}/${objectiveWords}`,
      );
    }
    if (authoredSurface.words > hardCapWords || authoredSurface.loc > hardCapLoc) {
      errors.push(
        `H01-BUDGET-002 V3 authored surface exceeds 2x hard cap: ${authoredSurface.words}/${hardCapWords} words; ${authoredSurface.loc}/${hardCapLoc} LOC`,
      );
    }
  } catch (error) {
    errors.push(`H01-BASELINE-001 ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    const committee = readFileSync(resolve(root, COMMITTEE_REF), 'utf8');
    errors.push(...checkCommittee(committee));
    const network = readFileSync(resolve(root, NETWORK_REF), 'utf8');
    for (const marker of [
      'content.md',
      'SourceFreeze',
      'planned_capability',
      'D3',
      'Three.js',
      'Lottie',
      'GSAP',
      'Remotion V3',
      'NOT_DESIGNED',
      'SCOPED',
      'APRUEBO HITO H-02',
    ]) {
      if (!network.includes(marker)) errors.push(`H01-NET-001 missing network marker: ${marker}`);
    }
    if (statSync(resolve(root, NETWORK_REF)).size > 30_000) {
      errors.push('H01-NET-002 V3 network document exceeds 30 KB H-01 budget');
    }
  } catch (error) {
    errors.push(`H01-GOV-001 ${error instanceof Error ? error.message : String(error)}`);
  }

  return errors;
};

const isMain =
  process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  const errors = validateCreationDoc();
  if (errors.length > 0) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else {
    const content = JSON.parse(readFileSync(resolve(process.cwd(), CANONICAL_REF), 'utf8')) as {
      rawSha256: string;
      semanticSha256: string;
    };
    console.info(
      `PASS CREATION DOC H-01: DRAFT→SCOPED, 23 refs, committee 5/20, raw=${content.rawSha256}, semantic=${content.semanticSha256}`,
    );
  }
}
