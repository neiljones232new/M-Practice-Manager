const requiredMajor = 20;
const requiredMinor = 9;
const version = process.versions.node || '';
const [majorStr, minorStr] = version.split('.');
const major = Number(majorStr || 0);
const minor = Number(minorStr || 0);

if (major < requiredMajor || (major === requiredMajor && minor < requiredMinor)) {
  // eslint-disable-next-line no-console
  console.error(
    `Node ${requiredMajor}.${requiredMinor}+ required. Detected ${version}. ` +
      'Run `nvm use 22` (or upgrade Node) before starting.'
  );
  process.exit(1);
}
