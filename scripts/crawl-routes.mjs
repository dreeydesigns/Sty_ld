import http from 'http';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

const ROUTES_TO_TEST = [
  // Public routes (expect 200 OK)
  { path: '/', expectStatus: [200], type: 'public' },
  { path: '/discover', expectStatus: [200], type: 'public' },
  { path: '/explore', expectStatus: [200], type: 'public' },
  { path: '/help', expectStatus: [200], type: 'public' },
  { path: '/terms', expectStatus: [200], type: 'public' },
  { path: '/privacy', expectStatus: [200], type: 'public' },
  { path: '/community-guidelines', expectStatus: [200], type: 'public' },
  { path: '/licenses', expectStatus: [200], type: 'public' },
  { path: '/safety', expectStatus: [200], type: 'public' },
  { path: '/auth/sign-in', expectStatus: [200], type: 'public' },
  { path: '/auth/sign-up', expectStatus: [200], type: 'public' },
  { path: '/sign-in', expectStatus: [200], type: 'public' },
  { path: '/sign-up', expectStatus: [200], type: 'public' },
  { path: '/sso-callback', expectStatus: [200], type: 'public' },
  { path: '/unauthorized', expectStatus: [200], type: 'public' },

  // Protected routes (expect 307 / redirect to /auth/sign-in when unauthenticated)
  { path: '/home', expectStatus: [307, 302, 303], type: 'protected' },
  { path: '/activity', expectStatus: [307, 302, 303], type: 'protected' },
  { path: '/profile', expectStatus: [307, 302, 303], type: 'protected' },
  { path: '/settings', expectStatus: [307, 302, 303], type: 'protected' },
  { path: '/book', expectStatus: [307, 302, 303], type: 'protected' },
  { path: '/admin', expectStatus: [307, 302, 303], type: 'protected' },
  { path: '/pro', expectStatus: [307, 302, 303], type: 'protected' },
  { path: '/salon', expectStatus: [307, 302, 303], type: 'protected' },
  { path: '/counter', expectStatus: [307, 302, 303], type: 'feature_gated' },
  { path: '/counter/cart', expectStatus: [307, 302, 303], type: 'feature_gated' },
  { path: '/dashboard/professional', expectStatus: [307, 302, 303], type: 'protected' },
  { path: '/dashboard/delivery', expectStatus: [307, 302, 303], type: 'feature_gated' },
  { path: '/onboarding/professional', expectStatus: [200, 307], type: 'onboarding' },
  { path: '/onboarding/salon', expectStatus: [200, 307], type: 'onboarding' },
  { path: '/settings/edit-profile', expectStatus: [307, 302, 303], type: 'protected' },
  { path: '/settings/change-password', expectStatus: [307, 302, 303], type: 'protected' },
  { path: '/settings/active-sessions', expectStatus: [307, 302, 303], type: 'protected' },
  { path: '/settings/blocked-accounts', expectStatus: [307, 302, 303], type: 'protected' },
];

function fetchRoute(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    http.get(url, { headers: { 'User-Agent': 'StyldCrawler/1.0' } }, (res) => {
      const location = res.headers.location || null;
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          path,
          statusCode: res.statusCode,
          location,
          bodyLength: body.length,
        });
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log(`Starting STYLD Internal Route Crawler against ${BASE_URL}...`);
  let passed = 0;
  let failed = 0;
  const failures = [];

  for (const item of ROUTES_TO_TEST) {
    try {
      const res = await fetchRoute(item.path);
      const isExpected = item.expectStatus.includes(res.statusCode);
      
      // Check redirection validity if redirected
      let redirectOk = true;
      if (res.statusCode >= 300 && res.statusCode < 400) {
        if (!res.location) {
          redirectOk = false;
        } else if (item.type === 'protected' && !res.location.includes('/auth/sign-in') && !res.location.includes('/unauthorized')) {
          redirectOk = false;
        } else if (item.type === 'feature_gated' && !res.location.includes('/discover') && !res.location.includes('/auth/sign-in')) {
          redirectOk = false;
        }
      }

      if (isExpected && redirectOk) {
        passed++;
        const note = res.location ? `-> ${res.location}` : `(${res.bodyLength} bytes)`;
        console.log(`  [PASS] ${item.path.padEnd(28)} HTTP ${res.statusCode} ${note}`);
      } else {
        failed++;
        failures.push({ path: item.path, expected: item.expectStatus, actual: res.statusCode, location: res.location });
        console.error(`  [FAIL] ${item.path.padEnd(28)} Expected [${item.expectStatus}], Got HTTP ${res.statusCode} (Loc: ${res.location})`);
      }
    } catch (err) {
      failed++;
      failures.push({ path: item.path, error: err.message });
      console.error(`  [ERROR] ${item.path.padEnd(27)} ${err.message}`);
    }
  }

  console.log('==================================================');
  console.log(`CRAWL COMPLETED: ${passed} PASSED, ${failed} FAILED (Total: ${ROUTES_TO_TEST.length})`);
  console.log('==================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

run();
