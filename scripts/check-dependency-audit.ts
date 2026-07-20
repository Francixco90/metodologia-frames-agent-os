import {createHash} from 'node:crypto';
import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {resolve} from 'node:path';

const root = process.cwd();
const receiptDirectory = resolve(root, 'receipts/dependency-audits');
const errors: string[] = [];
const sha256 = (value: Uint8Array | string): string =>
  createHash('sha256').update(value).digest('hex');

if (!existsSync(receiptDirectory)) {
  errors.push('dependency audit receipt ausente');
} else {
  const receiptNames = readdirSync(receiptDirectory)
    .filter((name) => /^RCP-DEP-PRODUCTION-[0-9]{8}-[0-9]{3}\.json$/u.test(name))
    .sort();
  const receipts = receiptNames.map((name) => ({
    name,
    receipt: JSON.parse(readFileSync(resolve(receiptDirectory, name), 'utf8')) as {
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
      supersedesReceiptId?: string;
      appendOnly?: boolean;
    },
  }));
  const latest = receipts.at(-1);
  const previous = receipts.at(-2);
  if (latest === undefined) {
    errors.push('dependency audit receipt ausente');
  } else {
    const {name, receipt} = latest;
    const expectedReceiptId = name.slice(0, -'.json'.length);
    if (
      receipt.schemaVersion !== 'dependency-audit-receipt-v1' ||
      receipt.receiptId !== expectedReceiptId ||
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
    if (previous !== undefined && receipt.supersedesReceiptId !== previous.receipt.receiptId) {
      errors.push('dependency audit successor no preserva lineage append-only');
    }
    if (receipt.packageJsonSha256 !== sha256(readFileSync(resolve(root, 'package.json')))) {
      errors.push('dependency audit package.json hash stale');
    }
    if (receipt.pnpmLockSha256 !== sha256(readFileSync(resolve(root, 'pnpm-lock.yaml')))) {
      errors.push('dependency audit pnpm-lock hash stale');
    }
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
