export function reportCheckResult({errors, validationProfile}) {
  if (errors.length > 0) {
    console.error(`FAIL content-os-general-video: ${errors.length} error(s)`);
    for (const error of errors) console.error(`  ${error}`);
    process.exitCode = 1;
    return;
  }
  const message = validationProfile === 'ci-code-only'
    ? 'PASS CODE-ONLY content-os-general-video: structure, policy, fixtures, adversarial security gates, linguistic gate and forbidden-scan. MEDIA COVERAGE GAP: render bytes, measurements, A/B output verification and miniclip runtime checks require local-full.'
    : 'PASS content-os-general-video: v1 read compatibility, v2 Spec First CLI, A/B/miniclip gates, fixtures and forbidden-scan.';
  console.info(message);
}
