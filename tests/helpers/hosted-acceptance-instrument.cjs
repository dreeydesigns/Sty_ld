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

// Next emits the build id twice in a served document, as an HTML comment directly after the
// doctype, and as the `b` field of the flight payload that hydrates the router. In the payload the
// quotes are backslash-escaped, so both spellings are matched. Neither position is a folder name,
// so neither can come back as `css`.
//
// A single reading is not enough to call a deployment identified: the first version of this read
// the comment OR the payload, so a document whose payload had been rewritten while its comment
// stayed put, or a page served without one field at all, passed without saying which field it came
// from. Both must be present and must agree, and each source is named in the result so the receipt
// can say where the identifier it quotes was found.
const BUILD_ID_COMMENT = /^<!DOCTYPE[^>]*>\s*<!--([A-Za-z0-9_-]{16,32})-->/i;
// Scoped to the payload that actually carries it. An unscoped `"b":"<20 chars>"` matches any
// application JSON that happens to have a `b` key (a build label in a page's own data, a route
// payload), and then the "second, independent reading" is not independent: it would agree with or
// contradict the comment on a coincidence. The window is bounded because a field three kilobytes
// into some other chunk is not the router's build field either.
const BUILD_ID_FLIGHT = /self\.__next_f\.push\(\[1,[\s\S]{0,2000}?\\?"b\\?":\\?"([A-Za-z0-9_-]{16,32})\\?"/;
function buildIdFromDocument(html) {
  const text = String(html || '');
  const comment = BUILD_ID_COMMENT.exec(text);
  const flight = BUILD_ID_FLIGHT.exec(text);
  const sources = [comment && 'doctype comment', flight && 'flight payload'].filter(Boolean);
  if (comment && flight && comment[1] !== flight[1]) {
    return { buildId: null, conflict: `${comment[1]} (doctype comment) vs ${flight[1]} (flight payload)`, sources };
  }
  return { buildId: (comment && comment[1]) || (flight && flight[1]) || null, conflict: null, sources };
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

// The file Next writes into the versioned folder for the build it just made. On this stack the
// document only ever references /_next/static/chunks/... and /_next/static/css/..., so fetching a
// referenced asset cannot confirm a build identifier: those folders are named for their content,
// not for the build. This path is derived from the identifier alone, so a 200 here is evidence the
// deployment serves a folder with exactly that name.
function buildManifestFor(buildId) {
  return buildId ? `/_next/static/${buildId}/_buildManifest.js` : null;
}

// Words a visitor is handed before any script runs. This delegates to the same renderer the
// first-render audit uses, so hidden Suspense payloads, document titles, script payloads and HTML
// comments are never counted as words here either: they are not words on a page in either measure.
// The question differs from the audit's in one respect only, and deliberately: the audit subtracts
// the shell so it can ask whether the *route* said something, while this asks whether anything at
// all reaches a visitor on a slow connection. The frame is genuinely drawn, so it counts here.
function serverDeliveredWords(html) {
  return (visible(html).match(/[A-Za-z][A-Za-z']{2,}/g) || []).length;
}

module.exports = {
  buildIdFromDocument,
  buildIdFromAssetUrls,
  buildManifestFor,
  firstReferencedAsset,
  serverDeliveredWords,
  RESERVED_STATIC_SEGMENTS,
};
