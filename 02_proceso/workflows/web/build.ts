import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {pageModelSchema} from '../../../networks/web/src/model.ts';
import {renderPage} from '../../../networks/web/src/render.ts';

const root = process.cwd();
const projectRoot = resolve(root, 'projects/vs-001-source-to-campaign/web');
const modelPath = resolve(projectRoot, 'page.json');
const cssPath = resolve(root, 'networks/web/src/styles.css');
const modelSchemaPath = resolve(root, 'networks/web/src/model.ts');
const rendererPath = resolve(root, 'networks/web/src/render.ts');
const outputPath = resolve(projectRoot, 'artifact/index.html');
const receiptPath = resolve(projectRoot, 'artifact/build-receipt.json');
const modelRaw = readFileSync(modelPath);
const cssRaw = readFileSync(cssPath);
const modelSchemaRaw = readFileSync(modelSchemaPath);
const rendererRaw = readFileSync(rendererPath);
const model = pageModelSchema.parse(JSON.parse(modelRaw.toString('utf8')));
const html = renderPage(model, cssRaw.toString('utf8'));

const sha256 = (content: Uint8Array | string): string =>
  createHash('sha256').update(content).digest('hex');

const receipt = {
  schema_version: 1,
  receipt_id: 'RCP-WEB-VS001-BUILD-001',
  artifact_id: model.pageId,
  source_snapshot_id: model.sourceSnapshotId,
  deterministic_timestamp: model.deterministicTimestamp,
  inputs: [
    {path: 'projects/vs-001-source-to-campaign/web/page.json', sha256: sha256(modelRaw)},
    {path: 'networks/web/src/styles.css', sha256: sha256(cssRaw)},
    {path: 'networks/web/src/model.ts', sha256: sha256(modelSchemaRaw)},
    {path: 'networks/web/src/render.ts', sha256: sha256(rendererRaw)},
  ],
  output: {
    path: 'projects/vs-001-source-to-campaign/web/artifact/index.html',
    sha256: sha256(html),
  },
  state: 'RENDERED_DRAFT',
  publish_authorized: false,
};

mkdirSync(dirname(outputPath), {recursive: true});
writeFileSync(outputPath, html, 'utf8');
writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
console.info(`Built ${receipt.output.path} sha256=${receipt.output.sha256}`);
