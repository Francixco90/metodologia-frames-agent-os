import {errors} from './check-notebooklm-os-common.ts';
import './check-notebooklm-os-fixtures.ts';
import './check-notebooklm-os-capability.ts';
import './check-notebooklm-os-templates.ts';
import './check-notebooklm-os-privacy.ts';

if (errors.length > 0) {
  console.error([...new Set(errors)].sort().join('\n'));
  process.exitCode = 1;
} else {
  console.info(
    'PASS G09 NOTEBOOKLM OS: Brand Builder público validado; 2 marcas sintéticas, N00-N09, 12 skills, 10 agentes, 22 templates y anti-fuga sin efectos externos.',
  );
}
