/**
 * First paint is an architecture rule, not a taste rule (Quality Assurance).
 *
 * Two separate things were measured on the build at f2ee01a, and the first one was the bigger
 * defect: a route-level app/loading.tsx is an implicit Suspense fallback for the whole segment, and
 * whenever a segment does not finish inside React's first flush the prerendered HTML commits the
 * spinner and carries the page in `<div hidden id="S:0">` for JavaScript to swap in. That caught
 * eight content routes, including the purely server-rendered legal pages, so no amount of tidying
 * client components would have fixed it. Removing the file took the count from eight to zero.
 * A page module that begins with "use client" is the second thing: it leaves the URL-reading part of
 * the tree with no boundary of its own, so it suspends the segment instead of a section of it. The
 * routes named below are the content routes a visitor is sent to, and this file fails the moment one
 * of them is turned back into a client page or the root spinner comes back.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('no route-level loading file is allowed to become the first paint', () => {
  const found = fs.readdirSync(path.join(root, 'app'), { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile() && /^loading\.tsx?$/.test(entry.name))
    .map(entry => path.join(entry.parentPath ?? entry.path, entry.name).replace(/\\/g, '/'))
    .map(file => file.slice(file.indexOf('/app/') + 5));
  assert.deepEqual(found, [], `${found.join(', ')} would be used as the fallback for its whole segment`);
});

// Each entry is a route a guest is meant to read, the page module that must stay on the server, and
// the client module the URL-reading part was moved to.
const CONTENT_ROUTES = [
  { route: '/discover', page: 'app/discover/page.tsx', client: 'components/discover-content.tsx', fallback: 'DiscoverFirstPaint' },
  { route: '/book', page: 'app/book/page.tsx', client: 'components/appointment-planning.tsx', fallback: 'PlanningFirstPaint' },
];

for (const { route, page, client, fallback } of CONTENT_ROUTES) {
  test(`${route} is served by a server page module`, () => {
    const source = read(page);
    assert.ok(!/^\s*"use client"/.test(source) && !/^\s*'use client'/.test(source),
      `${page} begins with "use client", so the whole segment waits for JavaScript and the first paint is the spinner`);
    assert.match(source, /<Suspense/, `${page} must keep the URL-reading part inside a Suspense boundary`);
    assert.match(source, new RegExp(`fallback=\{<${fallback} />`), `${page} must show ${fallback}, not the generic loader`);
  });

  test(`${route}'s honest picture is rendered by the same words as the live page`, () => {
    const clientSource = read(client);
    assert.match(clientSource, new RegExp(`export function ${fallback}`), `${fallback} has to be importable from the page module`);
    // The wait is announced either by the fallback's own status region or by the skeleton it paints,
    // which declares one. A second nested role="status" would be read out twice, so it is not added.
    const announced = /role="status"/.test(clientSource)
      || (/FeedSkeleton/.test(clientSource) && /role="status"/.test(read('components/feed-skeleton.tsx')));
    assert.ok(announced, 'the thing a visitor sees while the page waits has to be announced');
  });
}

test('the client tree that reads the address bar is no longer in the page module', () => {
  const page = read('app/discover/page.tsx');
  assert.doesNotMatch(page, /useSearchParams/, 'reading the URL in the page module is what suspended the segment');
  const client = read('components/discover-content.tsx');
  assert.match(client, /useSearchParams/, 'the feed still reads the address bar, one level down');
});

// /dashboard is protected by middleware, so a guest is redirected before any body is chosen and the
// page is only ever read by someone already signed in. That is still a waiting visitor, so the
// spinner has to be silent and the sentence beside it has to be announced.
test('/dashboard tells a signed-in waiting visitor where they are going', () => {
  const source = read('app/dashboard/page.tsx');
  const status = /<p role="status"[^>]*>([^<]*)</.exec(source);
  assert.ok(status, 'the wait needs a sentence a screen reader is given');
  assert.match(status[1], /Taking you to your workspace\./);
  assert.doesNotMatch(status[1], /\//, 'no destination is promised in the first paint, because the stored session decides it');
  assert.match(source, /className="loader-bloom h-14 w-14" aria-hidden="true"/, 'the decorative bloom must not be read out');
});

test('the stylesheet collapses every animation when motion is reduced', () => {
  const css = read('app/globals.css');
  const blocks = [...css.matchAll(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/g)].map(match => match[1]);
  assert.ok(blocks.length >= 1, 'globals.css has no reduced-motion media block to collapse');
  const global = blocks.find(block => /animation-iteration-count:\s*1\s*!important/.test(block));
  assert.ok(global, 'no reduced-motion block stops an animation from repeating');
  assert.match(global, /\*,\s*\*::before,/, 'the rule has to reach the bloom and the skeleton pulse, not only a named class');
});
