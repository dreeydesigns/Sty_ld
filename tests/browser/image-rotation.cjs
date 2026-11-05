const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '../..');
const source = ts.createSourceFile('editor.tsx', fs.readFileSync(path.join(root, 'components/image-upload-editor.tsx'), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let handler;
function find(node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === 'rotateClockwise') handler = node.getText(source);
  ts.forEachChild(node, find);
}
find(source);
assert.ok(handler, 'measure the actual editor rotation handler');
const code = ts.transpileModule(handler, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.STYLD_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const result = await page.evaluate(async (handlerCode) => {
      const original = document.createElement('canvas');
      original.width = 2;
      original.height = 3;
      const context = original.getContext('2d');
      const pixels = new Uint8ClampedArray([
        255, 0, 0, 255, 0, 255, 0, 255,
        0, 0, 255, 255, 255, 255, 0, 255,
        255, 0, 255, 255, 0, 255, 255, 255,
      ]);
      context.putImageData(new ImageData(pixels, 2, 3), 0, 0);
      let rawUrl = original.toDataURL('image/png');
      let crop = { top: 1, right: 2, bottom: 3, left: 4 };
      let turns = 0;
      let rotating = false;
      const errors = [];
      const samples = [];
      for (let turn = 0; turn < 4; turn++) {
        const run = new Function('rawUrl', 'rotating', 'uploading', 'setRotating', 'setError', 'setRawUrl', 'setCrop', 'setQuarterTurns', `${handlerCode}; return rotateClockwise;`)(
          rawUrl, rotating, false, value => { rotating = value; }, value => { if (value) errors.push(value); },
          value => { rawUrl = value; }, update => { crop = update(crop); }, update => { turns = update(turns); }
        );
        await run();
        const image = new Image();
        await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = rawUrl; });
        const output = document.createElement('canvas');
        output.width = image.naturalWidth;
        output.height = image.naturalHeight;
        const draw = output.getContext('2d');
        draw.drawImage(image, 0, 0);
        samples.push({ width: output.width, height: output.height, pixels: Array.from(draw.getImageData(0, 0, output.width, output.height).data), crop: { ...crop } });
      }
      return { samples, errors, rotating, turns, originalPixels: Array.from(pixels) };
    }, code);
    assert.deepEqual(result.errors, []);
    assert.equal(result.rotating, false);
    assert.equal(result.turns, 0);
    assert.deepEqual([result.samples[0].width, result.samples[0].height], [3, 2]);
    assert.deepEqual(result.samples[0].pixels.slice(0, 12), [255, 0, 255, 255, 0, 0, 255, 255, 255, 0, 0, 255]);
    assert.deepEqual(result.samples[0].crop, { top: 4, right: 1, bottom: 2, left: 3 });
    assert.deepEqual(result.samples[3].pixels, result.originalPixels, 'four turns preserve every original pixel');
    assert.deepEqual(result.samples[3].crop, { top: 1, right: 2, bottom: 3, left: 4 });
    console.log('PASS actual editor handler: clockwise pixels, dimensions, crop edges and lossless four-turn round trip');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
