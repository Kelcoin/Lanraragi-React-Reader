import fs from 'node:fs';

const files = [
  'src/components/ArchiveCard.jsx',
  'src/pages/Reader.jsx',
];

for (const file of files) {
  const source = fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  if (source.includes("alignItems: 'baseline'")) {
    console.error(`${file}: tag panel rows must use center alignment, not baseline.`);
    process.exit(1);
  }
}
