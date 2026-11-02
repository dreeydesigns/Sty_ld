// Renders the two PNG brand assets the public investor site serves, from the HTML cards in this
// folder. The geometry and colours come from components/styld-logo.tsx and lib/beauty-world.ts, so
// the committed PNG is reproducible rather than a downloaded one-off.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const jobs = [
  { source: 'scripts/public-site-assets/og-card.html', out: 'public-site/assets/og.png', size: '1200,630' },
  { source: 'scripts/public-site-assets/icon-card.html', out: 'public-site/assets/apple-touch-icon.png', size: '180,180' },
];

function render(job) {
  const outPath = path.join(root, job.out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  return new Promise((resolve, reject) => {
    const child = spawn(chrome, [
      '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-default-browser-check',
      '--force-device-scale-factor=1', `--window-size=${job.size}`,
      '--virtual-time-budget=8000',
      `--screenshot=${outPath}`, `file:///${path.join(root, job.source).split(path.sep).join('/')}`,
    ], { cwd: root, windowsHide: true });
    let stderr = '';
    child.stderr.on('data', chunk => { stderr += String(chunk); });
    child.on('close', code => {
      if (code !== 0 || !fs.existsSync(outPath)) reject(new Error(`chrome exited ${code} for ${job.out}: ${stderr.slice(-400)}`));
      else resolve({ file: job.out, bytes: fs.statSync(outPath).size });
    });
  });
}

(async () => {
  for (const job of jobs) console.log('rendered', JSON.stringify(await render(job)));
})().catch(error => { console.error(String(error.message || error)); process.exitCode = 1; });
