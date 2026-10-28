/**
 * The two readings the hosted-preview acceptance suite gets wrong if it guesses.
 *
 * Both were measured wrong on a first run: the build identifier was taken from the first
 * `/_next/static/<segment>/` path in the document, which on this stack is the word `css`, and the
 * feed navigation waited for the `load` event that the suite's own third-party blocking can keep
 * from ever firing. Each rule lives here once so `tests/hosted-acceptance-instrument.cjs` can hold
 * it and the suite cannot drift from it.
 */

const { visible } = require('../../scripts/first-render-audit.cjs');

// Folders Next reserves under /_next/static. They are not build identifiers.
const RESERVED_STATIC_SEGMENTS = Object.freeze(['chunks', 'css', 'media', 'image']);

// The build identifier is read from the asset URLs a browser actually requests, not from markup.
// The first requested asset in a versioned folder wins; later ones cannot overwrite it.
function buildIdFromAssetUrls(urls, reserved = RESERVED_STATIC_SEGMENTS) {
  for (const url of urls || []) {
    const found = /\/_next\/static\/([^/?#]+)\//.exec(String(url));
    if (found && !reserved.includes(found[1])) return found[1];
  }
  return null;
}

// Words a visitor is handed before any script runs. This delegates to the same renderer the
// first-render audit uses, so a route the audit calls silent can never be counted as delivering
// copy here: a streamed payload behind a hidden Suspense boundary, a document title, a script
// payload and an HTML comment are not words on a page in either measure. The question differs from
// the audit's in one respect only, and deliberately: the audit subtracts the shell so it can ask
// whether the *route* said something, while this asks whether anything at all reaches a visitor on
// a slow connection. The frame is genuinely drawn, so it counts here and not there.
function serverDeliveredWords(html) {
  return (visible(html).match(/[A-Za-z][A-Za-z']{2,}/g) || []).length;
}

module.exports = { buildIdFromAssetUrls, serverDeliveredWords, RESERVED_STATIC_SEGMENTS };
