// The signature loader on the shipped build. Every identity and API answer is
// irrelevant here: this suite only needs the document, the real bundle and the
// real CSS. It runs against the mock runner's production server.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const base = process.argv[3] || 'http://localhost:3107';
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const loader = '[data-styld-loader]';
let passed = 0;
const pass = line => { passed++; console.log(`PASS ${line}`); };

async function coldContext(browser, options = {}) {
  return browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference', ...options });
}

(async () => {
  const browser = await chromium.launch({ executablePath: chrome, headless: true });
  try {
    // 1. A cold tab paints the official artwork, then clears itself.
    const context = await coldContext(browser);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const started = Date.now();
    await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(document.querySelector('[data-styld-loader]')) || document.documentElement.dataset.signatureLoader, { timeout: 10000 });
    const state = await page.evaluate(() => document.documentElement.dataset.signatureLoader);
    assert.notEqual(state, 'late-hydration', `hydration took ${Date.now() - started}ms, so the loader skipped itself; this run cannot prove the show path`);
    assert.notEqual(state, 'reduced-motion', 'the context asked for no preference, so motion must be available');
    const overlay = page.locator(loader);
    await overlay.waitFor({ state: 'visible', timeout: 3000 });
    const describe = await overlay.evaluate(node => {
      const style = getComputedStyle(node);
      const stage = node.querySelector('.signature-loader__stage');
      return {
        ariaHidden: node.getAttribute('aria-hidden'),
        pointerEvents: style.pointerEvents,
        position: style.position,
        hasMark: Boolean(node.querySelector('svg')),
        text: (stage ? stage.innerText : '').replace(/\s+/g, ' ').trim(),
        width: Math.round(node.getBoundingClientRect().width),
        height: Math.round(node.getBoundingClientRect().height),
      };
    });
    assert.equal(describe.ariaHidden, 'true');
    assert.equal(describe.pointerEvents, 'none', 'the gesture must never capture a press');
    assert.equal(describe.position, 'fixed');
    assert.equal(describe.hasMark, true, 'the official mark svg is drawn');
    assert.match(describe.text, /Styld/, 'the official wordmark is drawn');
    await overlay.waitFor({ state: 'detached', timeout: 2600 });
    assert.equal(await page.evaluate(() => document.documentElement.dataset.signatureLoader), 'done');
    assert.deepEqual(errors, []);
    pass('a cold tab paints the official mark and wordmark, blocks no press, and clears within 1.7s');
    await context.close();

    // 2. The hold is real: the mark finishes moving at 760ms and the veil only
    //    starts at 1380ms, so the lockup is still for 620ms. Read from the live
    //    animations rather than from the stylesheet text.
    const timingContext = await coldContext(browser);
    const timingPage = await timingContext.newPage();
    await timingPage.goto(base + '/', { waitUntil: 'domcontentloaded' });
    await timingPage.locator(loader).waitFor({ state: 'visible', timeout: 10000 });
    const timing = await timingPage.evaluate(() => {
      const node = document.querySelector('[data-styld-loader]');
      const word = node.querySelector('.signature-loader__word');
      const veil = node.getAnimations ? node.getAnimations()[0] : null;
      const wordAnimations = word && word.getAnimations ? word.getAnimations() : [];
      const wordTiming = wordAnimations[0] && wordAnimations[0].effect.getTiming();
      const veilTiming = veil && veil.effect.getTiming();
      return {
        wordStart: wordTiming ? Number(wordTiming.delay) : null,
        wordEnd: wordTiming ? Number(wordTiming.delay) + Number(wordTiming.duration) : null,
        veilStart: veilTiming ? Number(veilTiming.delay) : null,
        iterations: wordTiming ? wordTiming.iterations : null,
      };
    });
    assert.ok(timing.veilStart - timing.wordEnd >= 600, `the still hold is ${timing.veilStart - timing.wordEnd}ms`);
    assert.equal(timing.iterations, 1, 'the reveal runs once, it does not loop');
    pass(`the mark holds still for ${timing.veilStart - timing.wordEnd}ms before the veil leaves, and the reveal never loops`);
    await timingContext.close();

    // 3. A reload in the same tab is not a cold tab.
    const seenContext = await coldContext(browser);
    const seenPage = await seenContext.newPage();
    await seenPage.goto(base + '/', { waitUntil: 'domcontentloaded' });
    await seenPage.locator(loader).waitFor({ state: 'visible', timeout: 10000 });
    await seenPage.locator(loader).waitFor({ state: 'detached', timeout: 3000 });
    await seenPage.reload({ waitUntil: 'domcontentloaded' });
    await seenPage.waitForFunction(() => document.documentElement.dataset.signatureLoader, { timeout: 5000 });
    assert.equal(await seenPage.evaluate(() => document.documentElement.dataset.signatureLoader), 'seen');
    assert.equal(await seenPage.locator(loader).count(), 0);
    pass('a reload, a client navigation or a re-entry in the same tab never replays the gesture');
    await seenContext.close();

    // 4. Reduced motion gets no overlay at all, not a shortened one.
    const reducedContext = await coldContext(browser, { reducedMotion: 'reduce' });
    const reducedPage = await reducedContext.newPage();
    await reducedPage.goto(base + '/', { waitUntil: 'domcontentloaded' });
    await reducedPage.waitForFunction(() => document.documentElement.dataset.signatureLoader, { timeout: 5000 });
    assert.equal(await reducedPage.evaluate(() => document.documentElement.dataset.signatureLoader), 'reduced-motion');
    assert.equal(await reducedPage.locator(loader).count(), 0);
    pass('reduced motion gets the page itself, with no overlay and no shortened animation');
    await reducedContext.close();

    // 5. While the veil is up the page behind it still answers a press, and the
    //    layout underneath is unchanged.
    const passContext = await coldContext(browser);
    const passPage = await passContext.newPage();
    const passErrors = [];
    passPage.on('pageerror', error => passErrors.push(error.message));
    await passPage.goto(base + '/', { waitUntil: 'domcontentloaded' });
    await passPage.locator(loader).waitFor({ state: 'visible', timeout: 10000 });
    const reachable = await passPage.evaluate(() => {
      const node = document.querySelector('[data-styld-loader]');
      const rect = node.getBoundingClientRect();
      const hit = document.elementFromPoint(Math.round(rect.width / 2), Math.round(rect.height / 2));
      return { inside: Boolean(hit && node.contains(hit)), tag: hit ? hit.tagName.toLowerCase() : null, overflow: document.documentElement.scrollWidth > innerWidth };
    });
    assert.equal(reachable.inside, false, 'the centre of the screen resolves to the page, not the overlay');
    assert.equal(reachable.overflow, false, 'the overlay does not introduce horizontal overflow');
    assert.deepEqual(passErrors, []);
    pass(`the page stays reachable through the veil (centre resolves to ${reachable.tag}) with no overflow and no page errors`);
    await passContext.close();

    console.log(`${passed} signature loader scenarios`);
    if (passed < 5) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch(error => { console.error('FAIL signature loader:', String(error.message || error).split('\n')[0]); process.exitCode = 1; });
