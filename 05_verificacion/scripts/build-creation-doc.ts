import {mkdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {loadCanonicalContent} from '../../workflows/content/markdown/parse-canonical-content.ts';
import {buildSourceFreezeReceipt} from '../../workflows/content/markdown/source-freeze.ts';

const root = process.cwd();
const contentRef = 'content/pilot-carousel-002/content.md';
const outputRoot = resolve(root, 'content/pilot-carousel-002/generated');
const loaded = loadCanonicalContent(root, contentRef);
const receipt = buildSourceFreezeReceipt(contentRef, loaded);

mkdirSync(outputRoot, {recursive: true});
writeFileSync(
  resolve(outputRoot, 'canonical-content-document.json'),
  `${JSON.stringify(loaded.document, null, 2)}\n`,
);
writeFileSync(
  resolve(outputRoot, 'source-freeze-receipt.json'),
  `${JSON.stringify(receipt, null, 2)}\n`,
);

console.info(
  `BUILT H-01: ${loaded.document.frontmatter.contentId} raw=${loaded.document.rawSha256} semantic=${loaded.document.semanticSha256} state=${receipt.maximumState}`,
);
