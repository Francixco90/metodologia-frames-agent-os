// prepare-project/build-components.ts — builds the component registry entries
// from the file list, hashing each component file. Key order is byte-stable. [CÓDIGO]
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {
  componentCategories,
  componentRequiredProps,
  isVisualCategory,
} from './component-categories.ts';
import {componentFiles, componentRoles} from './component-files.ts';

export type Sha256 = (value: Uint8Array | string) => string;

export type ComponentEntry = {
  readonly component_id: string;
  readonly version: string;
  readonly category: string;
  readonly renderer: string;
  readonly path: string;
  readonly sha256: string;
  readonly role: string;
  readonly runtime: string;
  readonly deterministic: boolean;
  readonly props: {readonly required: readonly string[]; readonly defaults: Record<string, never>};
  readonly compatible_formats: readonly string[];
  readonly preview: {
    readonly status: string;
    readonly reason: string;
  };
  readonly restrictions: readonly string[];
  readonly rights: {
    readonly holder: string;
    readonly basis: string;
    readonly allowed_scope: string;
  };
  readonly accessibility: readonly string[];
  readonly tests: {
    readonly required: boolean;
    readonly refs: readonly string[];
  };
  readonly risks: readonly string[];
  readonly state: string;
};

export const buildComponents = (root: string, sha256: Sha256): readonly ComponentEntry[] =>
  componentFiles.map((path) => {
    const content = readFileSync(resolve(root, path));
    const componentId = path.split('/').at(-1)?.replace(/\.[^.]+$/u, '');
    if (componentId === undefined) throw new Error(`Cannot derive component ID from ${path}.`);
    const category = componentCategories[path];
    const visual = isVisualCategory(category);
    return {
      component_id: componentId,
      version: '1.0.0',
      category,
      renderer: 'remotion',
      path,
      sha256: sha256(content),
      role: componentRoles[path],
      runtime: 'Remotion 4.0.494',
      deterministic: true,
      props: {required: componentRequiredProps[path], defaults: {}},
      compatible_formats: ['9:16'],
      preview: visual
        ? {
            status: 'not_applicable',
            reason:
              'Portable review-shot previews are generated after build; this registry remains an unapproved draft.',
          }
        : {status: 'not_applicable', reason: 'Non-visual runtime, policy or contract module.'},
      restrictions: [
        'local contract testing only',
        'no remote assets or fonts',
        'no governed state transition without independent approvals',
      ],
      rights: {
        holder: 'MetodologIA',
        basis: 'locally_authored_first_party_code',
        allowed_scope: 'local_contract_testing_only',
      },
      accessibility: visual
        ? [
            'layout guard checks viewport and safe-zone bounds',
            'status is not communicated by color alone',
          ]
        : ['does not independently render user-facing content'],
      tests: {
        required: true,
        refs: [
          'tests/unit/remotion/contracts.test.ts',
          'tests/unit/remotion/font-loader.test.ts',
          'tests/unit/remotion/layout-geometry.test.ts',
          'tests/unit/remotion/offline-renderer.test.ts',
        ],
      },
      risks: ['formal registry approval receipt absent', 'human playback approval absent'],
      state: 'REGISTRY_DRAFT',
    };
  });