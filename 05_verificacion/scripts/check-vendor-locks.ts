// Vendor packs live outside the tree; their source locks are the authority. A pack present
// on disk must match its lock byte for byte (fail-closed); an absent pack is a PASS that the
// report names, and `--sync <pack>` re-materializes it from the pinned upstream commit. [CÓDIGO]
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';

const VENDOR_ROOT = '03_artefactos/skills/vendor';
const LOCK_GLOB_ROOT = '01_intencion';

export interface VendorFileClaim {
  readonly pack: string;
  readonly destination: string;
  readonly file: string;
  readonly sha256: string;
}
export interface VendorSource {
  readonly pack: string;
  readonly destination: string;
  readonly sourceRepo: string;
  readonly sourceCommit: string;
  readonly sourcePath: string;
}
export interface VendorLockSet {
  readonly claims: VendorFileClaim[];
  readonly sources: VendorSource[];
}

type LockVendor = {
  destination?: string;
  source_repo?: string;
  source_commit?: string;
  source_path?: string;
  critical_file_hashes?: Record<string, string>;
};
type Lock = {
  vendor_root?: string;
  source_repo?: string;
  source_commit?: string;
  vendor_root_hashes?: Record<string, string>;
  vendors?: LockVendor[];
};

const sha256 = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');
const canonical = (path: string): string =>
  path.replace(/^skills\//u, '03_artefactos/skills/').replace(/\/+$/u, '');
const packOf = (destination: string): string => destination.split('/')[3] ?? '';

export const loadVendorLocks = (root: string): VendorLockSet => {
  const claims: VendorFileClaim[] = [];
  const sources: VendorSource[] = [];
  const lockRoot = resolve(root, LOCK_GLOB_ROOT);
  for (const entry of readdirSync(lockRoot, {withFileTypes: true})) {
    const lockPath = join(lockRoot, entry.name, 'source-lock.json');
    if (!entry.isDirectory() || !existsSync(lockPath)) continue;
    const lock = JSON.parse(readFileSync(lockPath, 'utf8')) as Lock;
    if (lock.vendor_root) {
      const destination = canonical(lock.vendor_root);
      for (const [file, hash] of Object.entries(lock.vendor_root_hashes ?? {}))
        claims.push({pack: packOf(destination), destination, file, sha256: hash});
    }
    for (const vendor of lock.vendors ?? []) {
      if (!vendor.destination) continue;
      const destination = canonical(vendor.destination);
      for (const [file, hash] of Object.entries(vendor.critical_file_hashes ?? {}))
        claims.push({pack: packOf(destination), destination, file, sha256: hash});
      const sourceRepo = vendor.source_repo ?? lock.source_repo;
      const sourceCommit = vendor.source_commit ?? lock.source_commit;
      if (sourceRepo && sourceCommit && vendor.source_path)
        sources.push({
          pack: packOf(destination),
          destination,
          sourceRepo,
          sourceCommit,
          sourcePath: vendor.source_path,
        });
    }
  }
  return {claims, sources};
};

export interface VendorCheckReport {
  readonly materialized: string[];
  readonly tracked: string[];
  readonly absent: string[];
  readonly drift: string[];
}

// Packs that Git tracks are governed by the repository's own hash-bound registries (they are
// cited as authority_refs); the lock only governs packs materialized outside Git.
const trackedVendorPacks = (root: string): Set<string> => {
  try {
    const output = execFileSync('git', ['-C', root, 'ls-files', '-z', '--', VENDOR_ROOT], {
      encoding: 'utf8',
    });
    return new Set(
      output
        .split('\0')
        .filter(Boolean)
        .map((path) => path.split('/')[3] ?? '')
        .filter((pack) => pack.length > 0),
    );
  } catch {
    return new Set();
  }
};

export const checkVendorLocks = (
  root: string,
  locks = loadVendorLocks(root),
): VendorCheckReport => {
  const packs = new Set(locks.claims.map((claim) => claim.pack));
  const trackedSet = trackedVendorPacks(root);
  const materialized: string[] = [];
  const tracked: string[] = [];
  const absent: string[] = [];
  const drift: string[] = [];
  for (const pack of [...packs].sort()) {
    if (trackedSet.has(pack)) {
      tracked.push(pack);
      continue;
    }
    if (!existsSync(resolve(root, VENDOR_ROOT, pack))) {
      absent.push(pack);
      continue;
    }
    materialized.push(pack);
    for (const claim of locks.claims.filter((item) => item.pack === pack)) {
      const target = resolve(root, claim.destination, claim.file);
      if (!existsSync(target) || sha256(readFileSync(target)) !== claim.sha256)
        drift.push(`${claim.destination}/${claim.file}`);
    }
  }
  return {materialized, tracked, absent, drift};
};

export const syncVendorPack = (
  root: string,
  pack: string,
  locks = loadVendorLocks(root),
): number => {
  const sources = locks.sources.filter((source) => source.pack === pack);
  if (sources.length === 0) throw new Error(`VENDOR-SYNC001 no source lock covers ${pack}`);
  const scratch = mkdtempSync(join(tmpdir(), 'frames-vendor-sync-'));
  try {
    for (const source of sources) {
      const checkout = join(scratch, sha256(Buffer.from(source.sourceRepo + source.sourceCommit)));
      if (!existsSync(checkout)) {
        execFileSync('git', ['init', '-q', checkout]);
        execFileSync('git', [
          '-C',
          checkout,
          'fetch',
          '-q',
          '--depth',
          '1',
          source.sourceRepo,
          source.sourceCommit,
        ]);
        execFileSync('git', ['-C', checkout, 'checkout', '-q', 'FETCH_HEAD']);
      }
      const from = resolve(checkout, source.sourcePath);
      const to = resolve(root, source.destination);
      if (!existsSync(from))
        throw new Error(`VENDOR-SYNC002 ${source.sourcePath} missing upstream`);
      cpSync(from, to, {recursive: true});
      rmSync(join(to, '.git'), {recursive: true, force: true});
    }
  } finally {
    rmSync(scratch, {recursive: true, force: true});
  }
  return sources.length;
};

const main = (): void => {
  const root = process.cwd();
  const syncIndex = process.argv.indexOf('--sync');
  if (syncIndex !== -1) {
    const pack = process.argv[syncIndex + 1];
    if (!pack) throw new Error('VENDOR-SYNC000 usage: --sync <pack>');
    const count = syncVendorPack(root, pack);
    console.info(`SYNCED vendor pack ${pack} from ${count} pinned source(s); run vendor:check.`);
    return;
  }
  const report = checkVendorLocks(root);
  if (report.drift.length > 0) {
    console.error(`VENDOR-DRIFT001 ${report.drift.join(', ')}`);
    process.exitCode = 1;
    return;
  }
  console.info(
    `PASS VENDOR LOCKS: ${report.materialized.length} materialized, ${report.tracked.length} tracked (registry-governed), ${report.absent.length} absent (${report.absent.join(', ') || 'none'})`,
  );
};

if (process.argv[1] && /check-vendor-locks\.ts$/u.test(process.argv[1])) main();
