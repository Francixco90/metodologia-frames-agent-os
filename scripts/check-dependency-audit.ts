import {createHash} from 'node:crypto';
import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root = process.cwd();
const receiptPath = resolve(
  root,
  'receipts/dependency-audits/RCP-DEP-PRODUCTION-20260720-001.json',
);
const errors: string[] = [];
const sha256 = (value: Uint8Array | string): string =>
  createHash('sha256').update(value).digest('hex');

if (!existsSync(receiptPath)) {
  errors.push('dependency audit receipt ausente');
} else {
  const receipt = JSON.parse(readFileSync(receiptPath, 'utf8')) as {
    schemaVersion?: string;
    receiptId?: string;
    command?: string;
    status?: string;
    exitCode?: number;
    vulnerabilities?: {
      critical?: number;
      high?: number;
      moderate?: number;
      low?: number;
    };
    packageJsonSha256?: string;
    pnpmLockSha256?: string;
    appendOnly?: boolean;
  };
  if (
    receipt.schemaVersion !== 'dependency-audit-receipt-v1' ||
    receipt.receiptId !== 'RCP-DEP-PRODUCTION-20260720-001' ||
    receipt.command !== 'pnpm audit --prod --json' ||
    receipt.status !== 'passed' ||
    receipt.exitCode !== 0 ||
    receipt.appendOnly !== true
  ) {
    errors.push('dependency audit receipt no demuestra un audit productivo aprobado');
  }
  if (
    Object.values(receipt.vulnerabilities ?? {}).some((count) => count !== 0) ||
    Object.keys(receipt.vulnerabilities ?? {}).length !== 4
  ) {
    errors.push('dependency audit reporta vulnerabilidades o resumen incompleto');
  }
  if (receipt.packageJsonSha256 !== sha256(readFileSync(resolve(root, 'package.json')))) {
    errors.push('dependency audit package.json hash stale');
  }
  if (receipt.pnpmLockSha256 !== sha256(readFileSync(resolve(root, 'pnpm-lock.yaml')))) {
    errors.push('dependency audit pnpm-lock hash stale');
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.info(
    'PASS DEPENDENCY AUDIT: receipt productivo durable, cero findings y hashes vigentes.',
  );
}
