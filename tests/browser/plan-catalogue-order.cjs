// MOBILE-PLAN-03 proof: the long Plan catalogue has to be searchable, filterable and orderable on
// a phone, and a card's price line has to agree with the position the sort gave it.
//
// The founder report was about length: the service list was one long block with a Back link only at
// the top, so a client on a 390 px screen could not narrow it, could not tell what they were looking
// at, and could not trust the order. `ba06ae6` added the search field, the category chips with
// counts, the name/price sort and the status line; `29f54bd` then made the price sort use the same
// rule the card uses to decide whether a price can be printed at all. Neither commit had ever been
// driven in a browser: `tests/browser/plan-v2.cjs` intercepts mock responses and never opens the
// sort control. This suite signs a real client in on a disposable cluster, seeds a professional with
// three packages the search can find by a token no other row carries, and measures the rendered
// order, the printed label of each card, the status line counts and whether a selection survives a
// filter change.
//
// Usage: node tests/browser/plan-catalogue-order.cjs --bin "<PostgreSQL 17.11 bin>"
const fs = require('node:fs'), path = require('node:path'), net = require('node:net');
const assert = require('node:assert/strict');
const { spawn, execFileSync } = require('node:child_process');
const { randomBytes, randomUUID } = require('node:crypto');
const { chromium } = require('playwright');
const { startLiveCluster } = require('../helpers/live-postgres-cluster.cjs');
const { startMailCapture } = require('../helpers/live-mail-capture.cjs');

const root = path.resolve(__dirname, '../..');
const chrome = process.env.STYLD_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const binIndex = process.argv.indexOf('--bin');
const bin = binIndex >= 0 ? process.argv[binIndex + 1] : process.env.STYLD_PG_BIN;
const receiptPath = process.env.STYLD_PLAN_RECEIPT || 'docs/readiness/beta/live-plan-catalogue.json';

const CLIENT_EMAIL = 'plan-catalogue-client@example.test';
const CATEGORY = 'QA Plan Sort';
// A token no static catalogue row contains, so a search for it is a measurement of the filter rather
// than a count of whatever the seed data happened to share with the app's own package names.
const TOKEN = 'QAorder';
const SEEDED = [
  { name: `${TOKEN} Alpha Root`, price: '45.50', expected: 45.5, label: 'priced' },
  { name: `${TOKEN} Mid Gloss`, price: '1200.00', expected: 1200, label: 'priced' },
  // A DECIMAL(10,2) column cannot hold NULL, and the price rule is about a figure the card will not
  // print, so the unpriced row is seeded as a negative: the server refuses to list it, and the card
  // has to say so and sort last instead of ordering itself by the number it hides.
  { name: `${TOKEN} Zeta Trim`, price: '-5.00', expected: null, label: 'unpriced' },
];

const results = [];
const samples = [];
const notes = [];

async function step(name, run) {
  try {
    await run();
    results.push({ name, status: 'pass' });
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push({ name, status: 'fail', error: String(error.message || error).slice(0, 700) });
    console.log(`FAIL ${name}: ${String(error.message || error).split('\n')[0].slice(0, 300)}`);
  }
}

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

// Runs in the page. Reads the picker the way a client reads it: the control values, the status line,
// the chips with their counts, and each card in the order it was painted. Nothing is inferred from
// the source; every figure below is a string a visitor can see. The two seed markers are passed in,
// because a function handed to page.evaluate is serialised on its own and cannot read this file's
// constants.
function pickerProbe(scope) {
  const CATEGORY = scope.category;
  const cards = Array.from(document.querySelectorAll('div[role="group"][aria-label="Services"] > button'))
    .map((button) => {
      const spans = Array.from(button.querySelectorAll('span')).map((span) => (span.textContent || '').trim());
      return { name: spans[0], category: spans[1], priceLine: spans[2], pressed: button.getAttribute('aria-pressed'),
        height: Math.round(button.getBoundingClientRect().height) };
    });
  const status = Array.from(document.querySelectorAll('p[role="status"]'))
    .find((node) => /services shown/.test(node.textContent || ''));
  const chip = (label) => Array.from(document.querySelectorAll('button[aria-pressed]'))
    .find((button) => (button.textContent || '').trim().startsWith(label));
  const search = document.querySelector('#plan-service-search');
  const sort = document.querySelector('#plan-service-sort');
  return {
    hasSearch: Boolean(search), hasSort: Boolean(sort),
    sortValue: sort ? sort.value : null,
    sortOptions: sort ? Array.from(sort.querySelectorAll('option')).map((option) => option.value) : [],
    searchBox: search ? { width: Math.round(search.getBoundingClientRect().width), height: Math.round(search.getBoundingClientRect().height) } : null,
    sortBox: sort ? { width: Math.round(sort.getBoundingClientRect().width), height: Math.round(sort.getBoundingClientRect().height) } : null,
    statusLine: status ? (status.textContent || '').trim() : null,
    chips: Array.from(document.querySelectorAll('button[aria-pressed]'))
      .filter((button) => /\(\d+\)\s*$/.test((button.textContent || '').trim()))
      .map((button) => ({ text: (button.textContent || '').trim(), pressed: button.getAttribute('aria-pressed') })),
    allChip: chip('All ') ? chip('All ').textContent.trim() : null,
    categoryChip: chip(`${CATEGORY} `) ? chip(`${CATEGORY} `).textContent.trim() : null,
    cards,
    selected: Array.from(document.querySelectorAll('ul li button[aria-label^="Remove "]'))
      .map((button) => (button.getAttribute('aria-label') || '').replace('Remove ', '').trim()),
    emptyMessage: Array.from(document.querySelectorAll('section p'))
      .map((node) => (node.textContent || '').trim()).find((text) => /^No service matched that search/.test(text)) || null,
    backLinks: Array.from(document.querySelectorAll('a')).filter((link) => /Back to Discover/.test(link.textContent || '')).length,
    overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
    scrollWidth: document.documentElement.scrollWidth,
  };
}

/** The amount a card printed, or null when the card printed no amount. Read from the label, not the payload. */
function printedAmount(priceLine) {
  const matches = String(priceLine || '').match(/(\d[\d,]*(?:\.\d{1,2})?)/g);
  if (!/^From /.test(String(priceLine || '')) || !matches) return null;
  return Number(matches[matches.length - 1].replace(/,/g, ''));
}

(async () => {
  if (!bin) throw new Error('A verified PostgreSQL bin directory is required (--bin).');
  const cluster = await startLiveCluster({ bin, label: 'plan-catalogue' });
  let mail;
  let server;
  let browser;
  const serverLog = [];
  const errors = [];
  let cleanedUp = false;
  async function teardown() {
    if (cleanedUp) return;
    cleanedUp = true;
    if (browser) await browser.close().catch(() => null);
    if (server) server.kill();
    await new Promise(resolve => setTimeout(resolve, 1500));
    const cleanup = await cluster.close();
    if (mail) await mail.stop().catch(() => null);
    console.log('cleanup', JSON.stringify(cleanup));
  }
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => { void teardown().then(() => process.exit(1), () => process.exit(1)); });
  }

  let base = '';
  try {
    mail = await startMailCapture();
    const appPort = await freePort();
    base = `http://127.0.0.1:${appPort}`;
    const environment = {
      PATH: process.env.PATH, SYSTEMROOT: process.env.SYSTEMROOT, WINDIR: process.env.WINDIR,
      TEMP: process.env.TEMP, TMP: process.env.TMP, COMSPEC: process.env.COMSPEC, PATHEXT: process.env.PATHEXT,
      NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1',
      BETTER_AUTH_URL: base, BETTER_AUTH_SECRET: randomBytes(32).toString('hex'), MFA_SECRET_KEY: randomBytes(32).toString('hex'),
      POSTGRES_URL: cluster.runtimeUrl, POSTGRES_URL_NON_POOLING: cluster.runtimeUrl, DATABASE_URL: cluster.runtimeUrl,
      EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 'live-qa-local-token', RESEND_FROM_EMAIL: 'STYLD QA <qa@example.test>',
      RESEND_API_URL: mail.apiUrl,
    };
    server = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', String(appPort)],
      { cwd: root, env: environment, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    server.stdout.on('data', chunk => serverLog.push(String(chunk)));
    server.stderr.on('data', chunk => serverLog.push(String(chunk)));
    for (let attempt = 0; attempt < 60; attempt++) {
      try { const response = await fetch(`${base}/discover`); if (response.status < 500) break; } catch {}
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    browser = await chromium.launch({ executablePath: chrome, headless: true });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await context.route(/.*/, route => {
      const host = new URL(route.request().url()).hostname;
      if (host === '127.0.0.1' || host === 'localhost') return route.fallback();
      return route.abort();
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));

    async function servedPlan() {
      const response = await page.request.get(`${base}/api/plan`);
      assert.equal(response.ok(), true, 'the plan endpoint has to answer for the signed-in client');
      return await response.json();
    }

    async function readPicker() {
      await page.waitForSelector('#plan-service-search', { timeout: 25000 });
      return page.evaluate(pickerProbe, { category: CATEGORY });
    }

    async function setSort(value) {
      await page.selectOption('#plan-service-sort', value);
      await page.waitForTimeout(250);
      return readPicker();
    }

    // Narrow the list to the three seeded packages, so an order assertion is about the sort and not
    // about where a couple of hundred static catalogue rows landed.
    async function filteredByChip() {
      await page.getByRole('button', { name: new RegExp(`^${CATEGORY} \\(\\d+\\)$`) }).click({ timeout: 20000 });
      await page.waitForTimeout(250);
      return readPicker();
    }

    await step('a real client signs in on the disposable cluster', async () => {
      await page.goto(`${base}/auth/sign-in?returnTo=%2Fhome`, { waitUntil: 'domcontentloaded' });
      await page.getByLabel('Email address').fill(CLIENT_EMAIL);
      await cluster.owner.query('DELETE FROM auth_limits');
      await cluster.owner.query('DELETE FROM auth_rate_limits');
      await page.getByRole('button', { name: 'Continue with email', exact: true }).click();
      await page.getByRole('heading', { name: 'Check your email', exact: true }).waitFor({ timeout: 20000 });
      const code = await mail.waitForCode(CLIENT_EMAIL);
      await page.getByLabel('Verification code').fill(code);
      await page.getByRole('button', { name: 'Continue', exact: true }).click();
      if (await page.getByRole('heading', { name: 'What should we call you?', exact: true })
        .waitFor({ timeout: 6000 }).then(() => true).catch(() => false)) {
        await page.getByLabel('Preferred name').fill('Plan Catalogue QA');
        await page.getByRole('button', { name: 'Continue', exact: true }).click();
      }
      await page.waitForURL('**/home', { timeout: 25000 });
      const skip = page.locator('div[role="dialog"] button[aria-label="Skip walkthrough"]').first();
      if (await skip.waitFor({ timeout: 12000 }).then(() => true).catch(() => false)) {
        await skip.click({ timeout: 10000 });
        await page.waitForSelector('div[role="dialog"][data-tour-step]', { state: 'detached', timeout: 10000 });
      }
    });

    await step('a professional with three packages is seeded into the cluster', async () => {
      const providerId = randomUUID();
      const workspaceId = randomUUID();
      await cluster.owner.query('INSERT INTO users(id,email,first_name) VALUES($1,$2,$3)',
        [providerId, 'plan-catalogue-provider@example.test', 'QA Provider']);
      await cluster.owner.query('INSERT INTO identity_workspaces(id,user_id,role,profile) VALUES($1,$2,$3,$4)',
        [workspaceId, providerId, 'professional', JSON.stringify({ displayName: 'QA Braids Studio', location: 'Kilimani, Nairobi', serviceMode: 'Salon', specialty: 'Braids' })]);
      for (const service of SEEDED) {
        const inserted = await cluster.owner.query(
          'INSERT INTO services(id,workspace_id,provider_id,name,price,category,is_active) VALUES($1,$2,$3,$4,$5,$6,true) RETURNING id, name, price::text AS price',
          [randomUUID(), workspaceId, providerId, service.name, service.price, CATEGORY]);
        assert.equal(inserted.rows.length, 1, `${service.name} was not inserted, so the list below is not the seeded one`);
      }
      const served = await servedPlan();
      const rows = served.services.filter((service) => String(service.name).startsWith(`${TOKEN} `));
      assert.equal(rows.length, SEEDED.length, `the plan endpoint served ${rows.length} of ${SEEDED.length} seeded packages`);
      const priced = rows.map((row) => ({ name: row.name, price: row.price }));
      assert.deepEqual(priced.find(row => row.name.includes('Alpha')).price, 45.5, 'the priced row serves its figure');
      assert.deepEqual(priced.find(row => row.name.includes('Mid')).price, 1200, 'and so does the expensive one');
      assert.equal(priced.find(row => row.name.includes('Zeta')).price, null,
        'the negative figure is expected to arrive as no listed price; if it stops arriving that way the label test below is measuring a different defect');
      samples.push({ stage: 'seeded', workspaceId, served: priced });
    });

    await step('the picker opens on a phone viewport with search, sort, chips and a count line', async () => {
      await page.goto(`${base}/book`, { waitUntil: 'domcontentloaded' });
      const lit = await readPicker();
      assert.equal(lit.hasSearch, true, 'the search field is not on the page');
      assert.equal(lit.hasSort, true, 'the sort control is not on the page');
      assert.deepEqual(lit.sortOptions, ['name', 'price', 'price-desc'], `the sort offered ${JSON.stringify(lit.sortOptions)}`);
      assert.equal(lit.sortValue, 'name', 'the picker opens on the name order');
      assert.ok(lit.searchBox.height >= 44, `the search field is ${lit.searchBox.height} px tall, under a thumb-reachable 44`);
      assert.ok(lit.sortBox.height >= 44, `the sort select is ${lit.sortBox.height} px tall`);
      assert.ok(lit.searchBox.width <= 390 && lit.sortBox.width <= 390, 'a control wider than the viewport cannot be reached');
      assert.match(lit.statusLine, /^\d+ of \d+ services shown\. Your selection stays when you change filters\.$/,
        `the status line read ${JSON.stringify(lit.statusLine)}`);
      assert.ok(Number(lit.statusLine.split(' of ')[0]) === lit.cards.length,
        'the count in the status line has to equal the number of cards painted');
      assert.ok(lit.allChip, 'there is no All chip to count against');
      assert.ok(Number(lit.allChip.match(/\((\d+)\)/)[1]) === lit.cards.length,
        `the All chip claims ${lit.allChip} while ${lit.cards.length} cards are painted`);
      assert.equal(lit.overflowX, false, `the page scrolls sideways at ${lit.scrollWidth} px wide on a 390 px screen`);
      assert.ok(lit.backLinks >= 1, 'the flow needs a way back to Discover');
      samples.push({ stage: 'opened', statusLine: lit.statusLine, allChip: lit.allChip, cards: lit.cards.length });
    });

    await step('the category chip narrows the list to the three seeded packages', async () => {
      const lit = await filteredByChip();
      assert.equal(lit.categoryChip, `${CATEGORY} (${SEEDED.length})`, `the chip read ${JSON.stringify(lit.categoryChip)}`);
      assert.equal(Number(lit.statusLine.split(' of ')[0]), SEEDED.length, `the count line read ${lit.statusLine}`);
      assert.equal(lit.cards.length, SEEDED.length, `${lit.cards.length} cards showed under the chip`);
      assert.deepEqual(lit.cards.map(card => card.category), [CATEGORY, CATEGORY, CATEGORY], 'every card under the chip is in that category');
      assert.ok(lit.cards.every(card => card.pressed === 'false'), 'nothing is selected yet, so the cards say so');
      assert.ok(lit.cards.every(card => card.height >= 44), `the shortest card is ${Math.min(...lit.cards.map(card => card.height))} px`);
      samples.push({ stage: 'filtered', chip: lit.categoryChip, statusLine: lit.statusLine, cards: lit.cards });
    });

    await step('the card label and the order agree under every sort', async () => {
      const served = await servedPlan();
      const byName = new Map(served.services.filter(s => String(s.name).startsWith(`${TOKEN} `)).map(s => [s.name, s.price]));
      const expectations = [
        { sort: 'name', order: [`${TOKEN} Alpha Root`, `${TOKEN} Mid Gloss`, `${TOKEN} Zeta Trim`], amounts: [45.5, 1200, null] },
        { sort: 'price', order: [`${TOKEN} Alpha Root`, `${TOKEN} Mid Gloss`, `${TOKEN} Zeta Trim`], amounts: [45.5, 1200, null] },
        { sort: 'price-desc', order: [`${TOKEN} Mid Gloss`, `${TOKEN} Alpha Root`, `${TOKEN} Zeta Trim`], amounts: [1200, 45.5, null] },
      ];
      for (const expectation of expectations) {
        const lit = await setSort(expectation.sort);
        assert.deepEqual(lit.cards.map(card => card.name), expectation.order,
          `under ${expectation.sort} the painted order was ${JSON.stringify(lit.cards.map(card => card.name))}`);
        assert.deepEqual(lit.cards.map(card => printedAmount(card.priceLine)), expectation.amounts,
          `under ${expectation.sort} the printed amounts were ${JSON.stringify(lit.cards.map(card => card.priceLine))}`);
        // The rule both sides are supposed to share, re-stated here from the served payload: a card
        // prints an amount exactly when the figure is a number, whole cents, and not below zero.
        for (const card of lit.cards) {
          const price = byName.get(card.name);
          const listable = typeof price === 'number' && Number.isFinite(price) && price >= 0
            && Number.isSafeInteger(Math.round(price * 100)) && Math.abs(price * 100 - Math.round(price * 100)) <= 0.00001;
          assert.equal(printedAmount(card.priceLine) === null, !listable,
            `${card.name} served ${JSON.stringify(price)} and printed ${JSON.stringify(card.priceLine)}`);
          assert.doesNotMatch(card.priceLine, /From Not provided/,
            'a card ordered itself by a price it refused to print, which is the defect this row was opened for');
          if (!listable) assert.equal(card.priceLine, 'Service interest. Price not provided.', `${card.name} printed ${card.priceLine}`);
        }
        const pricedAmounts = lit.cards.map(card => printedAmount(card.priceLine)).filter(amount => amount !== null);
        if (expectation.sort === 'price') {
          assert.deepEqual(pricedAmounts, [...pricedAmounts].sort((a, b) => a - b), 'the lowest listed price is not first');
        }
        if (expectation.sort === 'price-desc') {
          assert.deepEqual(pricedAmounts, [...pricedAmounts].sort((a, b) => b - a), 'the highest listed price is not first');
        }
        // The card that cannot print a price sits after every card that can, under every sort.
        const unpricedIndex = lit.cards.findIndex(card => printedAmount(card.priceLine) === null);
        if (unpricedIndex >= 0) {
          assert.ok(lit.cards.slice(unpricedIndex + 1).every(card => printedAmount(card.priceLine) === null),
            'an unpriced card sorts ahead of a priced one');
        }
      }
      samples.push({ stage: 'sorts', expectations });
    });

    await step('search narrows the list and the status line counts what is left', async () => {
      await page.fill('#plan-service-search', `${TOKEN} Zeta`);
      await page.waitForTimeout(300);
      let lit = await readPicker();
      assert.equal(lit.cards.length, 1, `the search left ${lit.cards.length} cards`);
      assert.equal(lit.cards[0].name, `${TOKEN} Zeta Trim`, `the search showed ${JSON.stringify(lit.cards.map(card => card.name))}`);
      assert.match(lit.statusLine, /^1 of \d+ services shown/, `the count line read ${lit.statusLine}`);

      await page.fill('#plan-service-search', 'zzqx-no-such-service');
      await page.waitForTimeout(300);
      lit = await readPicker();
      assert.equal(lit.cards.length, 0, 'a search that matches nothing still painted cards');
      assert.equal(lit.emptyMessage, 'No service matched that search. Try a shorter word or another category.',
        `the empty state read ${JSON.stringify(lit.emptyMessage)}`);
      assert.match(lit.statusLine, /^0 of \d+ services shown/, `the count line read ${lit.statusLine}`);
      samples.push({ stage: 'search', emptyMessage: lit.emptyMessage });
      await page.fill('#plan-service-search', '');
      await page.waitForTimeout(300);
    });

    await step('a chosen package stays chosen when the filters change', async () => {
      const before = await readPicker();
      assert.ok(before.cards.some(card => card.name === `${TOKEN} Alpha Root`),
        `the seeded card is not painted before the click: ${before.cards.length} cards, first five ${JSON.stringify(before.cards.slice(0, 5).map(card => card.name))}`);
      await page.locator('div[role="group"][aria-label="Services"] > button')
        .filter({ hasText: `${TOKEN} Alpha Root` }).first().click({ timeout: 25000 });
      await page.waitForTimeout(300);
      let lit = await readPicker();
      assert.deepEqual(lit.selected, [`${TOKEN} Alpha Root`], `the selection list read ${JSON.stringify(lit.selected)}`);
      assert.equal(lit.cards.find(card => card.name === `${TOKEN} Alpha Root`).pressed, 'true', 'the card does not say it is chosen');

      // Filter it away, then check the choice is still there: the status line promises this, and the
      // founder report was that a long list made the choice feel temporary.
      await page.fill('#plan-service-search', `${TOKEN} Zeta`);
      await page.waitForTimeout(300);
      lit = await readPicker();
      assert.equal(lit.cards.some(card => card.name === `${TOKEN} Alpha Root`), false, 'the filter did not actually hide the choice');
      assert.deepEqual(lit.selected, [`${TOKEN} Alpha Root`],
        `the selection vanished when the filter changed: ${JSON.stringify(lit.selected)}`);
      assert.match(lit.statusLine, /Your selection stays when you change filters/, 'the count line stopped promising it');

      await page.fill('#plan-service-search', '');
      await page.getByRole('button', { name: /^All \(\d+\)$/ }).click({ timeout: 10000 });
      await page.waitForTimeout(300);
      lit = await readPicker();
      assert.deepEqual(lit.selected, [`${TOKEN} Alpha Root`], 'the choice did not survive coming back to the full list');
      const card = lit.cards.find(entry => entry.name === `${TOKEN} Alpha Root`);
      assert.equal(card.pressed, 'true', 'and the card no longer says it is chosen');

      await page.getByRole('button', { name: `Remove ${TOKEN} Alpha Root`, exact: true }).click({ timeout: 10000 });
      await page.waitForTimeout(300);
      lit = await readPicker();
      assert.deepEqual(lit.selected, [], 'the remove button left something behind');
      assert.equal(lit.cards.find(entry => entry.name === `${TOKEN} Alpha Root`).pressed, 'false', 'the card still says chosen after removal');
      samples.push({ stage: 'selection', survivedFilterChange: true });
    });

    await step('the picker journey adds no client-side errors', async () => {
      assert.deepEqual(errors, []);
    });

    notes.push('the three packages are real rows in services (workspace_id set, is_active true) behind a professional '
      + 'identity_workspaces row, so the list comes from the same join the app uses (lib/plan-repository.ts options()) '
      + 'rather than a mock: tests/browser/plan-v2.cjs intercepts responses and never drives these controls.');
    notes.push('the unpriced row is seeded with price -5.00 because services.price is DECIMAL(10,2) NOT NULL. The served '
      + 'payload carries it as price: null (the repository refuses to list a figure below zero), which is why the '
      + 'before run of this suite is the picker without controls at all: with a normalised null arriving over HTTP, '
      + 'the pre-29f54bd card and the post-fix card print the same words for the same payload. The label/order '
      + 'divergence that 29f54bd removed is reproduced at contract level in tests/plan-catalogue-controls.cjs, and '
      + 'the agreement invariant is re-asserted here from the served payload rather than claimed.');
    notes.push('quantities are read off the painted page: card order, the price string in the third span, the count in '
      + 'the status paragraph, the All chip, and aria-pressed. Amounts are parsed from the printed label, so a change '
      + 'to the currency format shows up as an order failure rather than a string mismatch.');
    notes.push('viewport 390x844 in installed Chrome with touch emulation. This is a simulated phone, not a hand-held '
      + 'device, so it does not close the real-device sign-off in FND-01.');
    notes.push('nothing off loopback is reached: the route filter aborts every request whose host is not 127.0.0.1 or '
      + 'localhost, the database is a disposable cluster this run creates and drops, and the OTP goes to a loopback stand-in.');

    const failed = results.filter(item => item.status === 'fail');
    const receipt = {
      instrument: 'tests/browser/plan-catalogue-order.cjs',
      conditions: 'Windows, installed Chrome headless at 390x844 touch, next start production build, owned loopback PostgreSQL 17.11 disposable cluster, schema-only fixture, real Better Auth email OTP to a loopback stand-in, seeded professional and three services rows, no route interception',
      buildId: fs.readFileSync(path.join(root, '.next/BUILD_ID'), 'utf8'),
      commit: execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
      origin: base,
      clusterIdentity: cluster.identity,
      viewport: '390x844',
      steps: results,
      passed: results.length - failed.length,
      failed: failed.length,
      samples,
      notes,
      browserErrors: errors,
      appServerLogTail: serverLog.join('').slice(-4000),
    };
    fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
    fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2));
    console.log(`receipt ${receipt.passed}/${results.length} passed -> ${receiptPath}`);
    if (receipt.failed) process.exitCode = 1;
  } finally {
    await teardown();
  }
})().catch(error => {
  console.error('plan catalogue proof failed:', String(error.message || error).split('\n')[0]);
  process.exitCode = 1;
}).then(() => { setTimeout(() => process.exit(process.exitCode || 0), 1000).unref(); });
