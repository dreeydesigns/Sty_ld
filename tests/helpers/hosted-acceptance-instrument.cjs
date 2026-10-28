/**
 * The readings the hosted-preview acceptance suite got wrong on its first run.
 *
 * The build identifier was taken from the first `/_next/static/<segment>/` path in the document,
 * which on this stack is the word `css`, and the feed navigation waited for the `load` event that
 * the suite's own third-party blocking can keep from ever firing. Each rule lives here once so
 * `tests/hosted-acceptance-instrument.cjs` can hold it and the suite cannot drift from it.
 */

const { visible } = require('../../scripts/first-render-audit.cjs');

// Folders Next reserves under /_next/static. They are not build identifiers.
const RESERVED_STATIC_SEGMENTS = Object.freeze(['chunks', 'css', 'media', 'image']);

// A build identifier on this stack is a 20-character URL-safe token; the length floor keeps a
// short folder or hash from being read as one.

// Next emits the build id twice in a served document: as an HTML comment directly after the
// doctype, and as the `b` field of the flight payload that hydrates the router. In the payload the
// quotes are backslash-escaped, so both spellings are matched. Neither position is a folder name,
// so neither can come back as `css`. The comment is the primary reading and the flight field is
// the cross-check.
const BUILD_ID_COMMENT = /^<!DOCTYPE[^>]*>\s*<!--([A-Za-z0-9_-]{16,32})-->/i;
const BUILD_ID_FLIGHT = /\\?"b\\?":\\?"([A-Za-z0-9_-]{16,32})\\?"/;
function buildIdFromDocument(html) {
  const text = String(html || '');
  const comment = BUILD_ID_COMMENT.exec(text);
  const flight = BUILD_ID_FLIGHT.exec(text);
  if (comment && flight && comment[1] !== flight[1]) {
    return { buildId: null, conflict: `${comment[1]} vs ${flight[1]}` };
  }
  return { buildId: (comment && comment[1]) || (flight && flight[1]) || null, conflict: null };
}

// The same identifier, as it must appear in the asset folders the browser is told to load. A
// versioned folder is a build id; a reserved segment is not.
function buildIdFromAssetUrls(urls, reserved = RESERVED_STATIC_SEGMENTS) {
  for (const url of urls || []) {
    const found = /\/_next\/static\/([^/?#]+)\//.exec(String(url));
    if (found && !reserved.includes(found[1])) return found[1];
  }
  return null;
}

// An asset path the document itself references, for proving the server really serves this build.
function firstReferencedAsset(html) {
  const found = /\/_next\/static\/[^"'\\ ]+\.(?:js|css)/.exec(String(html || '').replace(/\\\//g, '/'));
  return found ? found[0] : null;
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

module.exports = {
  buildIdFromDocument,
  buildIdFromAssetUrls,
  firstReferencedAsset,
  serverDeliveredWords,
  RESERVED_STATIC_SEGMENTS,
};
