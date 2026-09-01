import {parse, stringify} from 'yaml';

import {
  CanonicalSourceGapsSchema,
  PinnedRepositoryRightsProjectionV1Schema,
  PinnedRepositorySourceEntryV2Schema,
  PinnedRepositoryTransitionReceiptV2Schema,
  SourceRegistrySchema,
  auditCanonicalCoverage,
  auditPinnedRepositorySourceV2,
  auditSourceLifecycle,
  readYamlFile,
  sha256,
} from '../fixtures/source-notebook/contracts-v2.ts';
import {
  loadPinnedAuditFixture,
  loadSourceSystem,
} from '../fixtures/source-notebook/test-support.ts';

describe('source lifecycle adversarial rejection', () => {
  it('rejects active promotion without hashes, rights or verified authority', async () => {
    const {lifecycle, registry, receipts} = await loadSourceSystem();
    const missingHashRegistry = structuredClone(registry);
    const missingHashActive = missingHashRegistry.entries.find(
      ({current_state}) => current_state === 'active',
    );
    if (missingHashActive === undefined) throw new Error('Expected an active source fixture.');
    missingHashActive.hashes.raw_sha256 = null;

    const missingRightsRegistry = structuredClone(registry);
    const missingRightsActive = missingRightsRegistry.entries.find(
      ({current_state}) => current_state === 'active',
    );
    if (missingRightsActive === undefined) throw new Error('Expected an active source fixture.');
    delete missingRightsActive.rights.rights_holder;

    const pendingAuthorityRegistry = structuredClone(registry);
    const pendingAuthorityActive = pendingAuthorityRegistry.entries.find(
      ({current_state}) => current_state === 'active',
    );
    if (pendingAuthorityActive === undefined) throw new Error('Expected an active source fixture.');
    pendingAuthorityActive.authority.authority_verdict = 'pending';

    expect(auditSourceLifecycle({lifecycle, registry: missingHashRegistry, receipts})).toContain(
      'SRC-SYNTH-VS001: active source is missing hashes',
    );
    expect(auditSourceLifecycle({lifecycle, registry: missingRightsRegistry, receipts})).toContain(
      'SRC-SYNTH-VS001: active source missing rights rights_holder',
    );
    expect(
      auditSourceLifecycle({lifecycle, registry: pendingAuthorityRegistry, receipts}),
    ).toContain('SRC-SYNTH-VS001: active source authority is unresolved');
  });

  it('rejects skipped lifecycle states and missing append-only receipts', async () => {
    const {lifecycle, registry, receipts} = await loadSourceSystem();
    const withoutQuarantine = receipts.filter(
      ({receipt}) =>
        !(
          receipt.source_id === 'SRC-SYNTH-VS001' &&
          'transition' in receipt &&
          receipt.transition.to === 'quarantined'
        ),
    );
    expect(auditSourceLifecycle({lifecycle, registry, receipts: withoutQuarantine})).toEqual(
      expect.arrayContaining([
        expect.stringContaining('missing receipt'),
        expect.stringContaining('receipt chain is discontinuous'),
      ]),
    );
  });

  it('rejects removal of the hash-semantics migration receipt', async () => {
    const {lifecycle, registry, receipts} = await loadSourceSystem();
    const withoutMigration = receipts.filter(
      ({receipt}) =>
        !('receipt_kind' in receipt && receipt.receipt_kind === 'hash_semantics_migration'),
    );
    expect(auditSourceLifecycle({lifecycle, registry, receipts: withoutMigration})).toEqual(
      expect.arrayContaining([
        expect.stringContaining('registry migration receipt mismatch'),
        expect.stringContaining('missing receipt'),
        expect.stringContaining('source-normalized hash differs without migration'),
      ]),
    );
  });

  it('rejects conflated compatibility aliases and mutable projection locators', async () => {
    const {registry} = await loadSourceSystem();
    const aliasMismatch = structuredClone(registry);
    const promptWithAliasMismatch = aliasMismatch.entries.find(
      ({source_id}) => source_id === 'SRC-PROMPT-MAESTRO-V6',
    );
    if (promptWithAliasMismatch === undefined) throw new Error('Expected prompt source fixture.');
    promptWithAliasMismatch.hashes.normalized_sha256 =
      promptWithAliasMismatch.projection?.projection_sha256 ?? null;
    expect(SourceRegistrySchema.safeParse(aliasMismatch).success).toBe(false);

    const mutableLocator = structuredClone(registry);
    const promptWithMutableLocator = mutableLocator.entries.find(
      ({source_id}) => source_id === 'SRC-PROMPT-MAESTRO-V6',
    );
    if (promptWithMutableLocator === undefined) throw new Error('Expected prompt source fixture.');
    promptWithMutableLocator.portable_locator = 'docs/program/requirements-traceability.md';
    expect(SourceRegistrySchema.safeParse(mutableLocator).success).toBe(false);
  });

  it('rejects equal normalized hashes both marked unique', async () => {
    const {lifecycle, registry, receipts} = await loadSourceSystem();
    const duplicatedRegistry = structuredClone(registry);
    const active = duplicatedRegistry.entries.find(({current_state}) => current_state === 'active');
    if (active === undefined) throw new Error('Expected an active source fixture.');
    duplicatedRegistry.entries.push({
      ...structuredClone(active),
      source_id: 'SRC-SYNTH-DUPLICATE',
      snapshot_id: 'synthetic-duplicate-v1',
    });
    expect(auditSourceLifecycle({lifecycle, registry: duplicatedRegistry, receipts})).toContain(
      'duplicate normalized hash incorrectly marked unique',
    );
  });

  it('rejects short Git object IDs and private repository evidence locators', async () => {
    const {entry} = await loadPinnedAuditFixture();
    const shortCommit = structuredClone(entry);
    shortCommit.repository_lock.commit_object_id = 'e0d6ba4';
    expect(PinnedRepositorySourceEntryV2Schema.safeParse(shortCommit).success).toBe(false);
    const privateLocator = structuredClone(entry);
    privateLocator.repository_lock.repository_descriptor.locator =
      '/Users/private/donor/repository.yml';
    expect(PinnedRepositorySourceEntryV2Schema.safeParse(privateLocator).success).toBe(false);
  });

  it('rejects physical manifest and receipt hash mismatches', async () => {
    const {entry, evidence} = await loadPinnedAuditFixture();
    const corruptedManifest = evidence.map((record) =>
      record.path === entry.repository_lock.selected_paths_manifest.locator
        ? {path: record.path, bytes: Buffer.concat([Buffer.from(record.bytes), Buffer.from('#')])}
        : record,
    );
    expect(auditPinnedRepositorySourceV2({entry, evidence: corruptedManifest})).toEqual(
      expect.arrayContaining([expect.stringContaining('physical evidence hash/bytes mismatch')]),
    );
    const wrongReceiptBinding = structuredClone(entry);
    wrongReceiptBinding.receipt_bindings[0]!.sha256 = 'a'.repeat(64);
    expect(auditPinnedRepositorySourceV2({entry: wrongReceiptBinding, evidence})).toEqual(
      expect.arrayContaining([expect.stringContaining('physical receipt hash mismatch')]),
    );
  });

  it('rejects Technical Defense license evidence not bound to the LICENSE manifest row', async () => {
    const {entry, evidence} = await loadPinnedAuditFixture('SRC-TECHNICAL-DEFENSE-78FD383');
    const rightsPath = entry.repository_lock.rights_authorization_projection.locator;
    const rightsBytes = evidence.find(({path}) => path === rightsPath)?.bytes;
    if (rightsBytes === undefined) throw new Error('Expected Technical Defense rights evidence.');
    const rights = parse(Buffer.from(rightsBytes).toString('utf8')) as {
      observations: {tracked_license_scope?: string; tracked_license_sha256: string};
    };
    const missingScope = structuredClone(rights);
    delete missingScope.observations.tracked_license_scope;
    expect(PinnedRepositoryRightsProjectionV1Schema.safeParse(missingScope).success).toBe(false);
    rights.observations.tracked_license_sha256 = 'a'.repeat(64);
    const mutatedBytes = Buffer.from(stringify(rights, {lineWidth: 0}));
    const mutatedEntry = structuredClone(entry);
    mutatedEntry.repository_lock.rights_authorization_projection.sha256 = sha256(mutatedBytes);
    mutatedEntry.repository_lock.rights_authorization_projection.bytes = mutatedBytes.byteLength;
    const mutatedEvidence = evidence.map((record) =>
      record.path === rightsPath ? {path: record.path, bytes: mutatedBytes} : record,
    );
    expect(auditPinnedRepositorySourceV2({entry: mutatedEntry, evidence: mutatedEvidence})).toEqual(
      expect.arrayContaining([
        expect.stringContaining('tracked LICENSE SHA-256 does not match manifest row'),
      ]),
    );
  });

  it('rejects a broken previous-receipt hash chain', async () => {
    const {entry, evidence} = await loadPinnedAuditFixture();
    const secondReceiptPath = entry.receipt_bindings[1]!.path;
    const previousHash = entry.receipt_bindings[0]!.sha256;
    const brokenEvidence = evidence.map((record) =>
      record.path === secondReceiptPath
        ? {
            path: record.path,
            bytes: Buffer.from(
              Buffer.from(record.bytes).toString('utf8').replace(previousHash, 'b'.repeat(64)),
            ),
          }
        : record,
    );
    expect(auditPinnedRepositorySourceV2({entry, evidence: brokenEvidence})).toEqual(
      expect.arrayContaining([expect.stringContaining('previous receipt SHA-256 chain is broken')]),
    );
  });

  it('rejects scope escalation and actor/verifier identity collapse in receipts', async () => {
    const {entry, evidence} = await loadPinnedAuditFixture();
    const evaluatedPath = entry.receipt_bindings[2]!.path;
    const bytes = evidence.find(({path}) => path === evaluatedPath)?.bytes;
    if (bytes === undefined) throw new Error('Expected evaluated donor receipt bytes.');
    const receipt = PinnedRepositoryTransitionReceiptV2Schema.parse(
      parse(Buffer.from(bytes).toString('utf8')) as unknown,
    );
    const escalated = structuredClone(receipt) as unknown as {
      rights: {allowed_use_scope: string};
    };
    escalated.rights.allowed_use_scope = 'public_distribution';
    expect(PinnedRepositoryTransitionReceiptV2Schema.safeParse(escalated).success).toBe(false);
    const sameActor = structuredClone(receipt);
    sameActor.verifier_id = sameActor.actor_id;
    expect(PinnedRepositoryTransitionReceiptV2Schema.safeParse(sameActor).success).toBe(false);
  });

  it('rejects evaluated repository sources without all three bound receipts', async () => {
    const {entry} = await loadPinnedAuditFixture();
    const incomplete = structuredClone(entry);
    incomplete.receipts.pop();
    incomplete.receipt_bindings.pop();
    expect(PinnedRepositorySourceEntryV2Schema.safeParse(incomplete).success).toBe(false);
  });

  it('rejects false canonical coverage and source lock claims', async () => {
    const gaps = await readYamlFile(
      'registries/sources/canonical-source-gaps.yml',
      CanonicalSourceGapsSchema,
    );
    const falseCount = structuredClone(gaps);
    falseCount.confirmed_count = 1;
    const falseLock = structuredClone(gaps);
    falseLock.consequence.source_locked = true;
    expect(auditCanonicalCoverage(falseCount)).toContain(
      'confirmed_count does not match populated canonical slots',
    );
    expect(auditCanonicalCoverage(falseLock)).toContain(
      'incomplete canonical corpus must remain fail-closed',
    );
  });
});
