import fs from 'node:fs';

const css = fs.readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(message);
    process.exit(1);
  }
}

assert(
  !css.includes('.watchlist-card:not(.watchlist-card-plain)::before'),
  'Watchlist glow must not be drawn on archive-card-wrap; it drifts away from archive-card-shell.',
);

assert(
  css.includes('.watchlist-card:not(.watchlist-card-plain) .archive-card-shell::before'),
  'Watchlist glow must be anchored to archive-card-shell::before.',
);
