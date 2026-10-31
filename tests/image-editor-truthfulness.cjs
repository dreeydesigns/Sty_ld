/**
 * MOBILE-MEDIA-04 regression: the image editor must open with the prepared
 * photo, report a size change honestly (a file can grow), upload through the
 * shared pipeline instead of a local data URL, and apply filters where the
 * canvas filter API is missing.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');
const COMPONENT = path.join(ROOT, 'components', 'image-upload-editor.tsx');

function loadImagePrep() {
  const source = ts.transpileModule(fs.readFileSync(path.join(ROOT, 'lib', 'image-prep.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  const context = {
    console, process, Buffer, URL, URLSearchParams, Date, Math, JSON, Object, Array,
    Number, String, Boolean, Error, Set, Map, Symbol, Promise, RegExp, TypeError, globalThis: null,
  };
  vm.runInNewContext(`(function(require,module,exports){${source}\n})`, context)(
    (name) => require(name), module, module.exports);
  return module.exports;
}

const imagePrep = loadImagePrep();

test('a photo that grew is reported as larger, never as a saving', () => {
  const reported = imagePrep.describeSizeDelta(281.7 * 1024, 323.9 * 1024);
  assert.equal(reported.tone, 'larger');
  assert.equal(reported.text, '15% larger');
});

test('a photo that shrank reports the real saving', () => {
  const shrunken = imagePrep.describeSizeDelta(1200 * 1024, 300 * 1024);
  assert.equal(shrunken.text, '75% smaller');
  assert.equal(shrunken.tone, 'smaller');
});

test('unchanged, rounded and unknown sizes stay neutral', () => {
  const cases = [
    [500 * 1024, 500 * 1024, 'same size'],
    [100000, 100400, 'about the same size'],
    [0, 500, 'size unknown'],
    [Number.NaN, 500, 'size unknown'],
  ];
  for (const [original, prepared, text] of cases) {
    const delta = imagePrep.describeSizeDelta(original, prepared);
    assert.equal(delta.text, text, `${original} vs ${prepared}`);
    assert.equal(delta.tone, 'same');
  }
});

test('the pixel fallback reproduces the preview filter order', () => {
  const neutral = new Uint8ClampedArray([10, 20, 30, 255]);
  imagePrep.adjustImagePixels(neutral, { brightness: 100, contrast: 100, saturation: 100 });
  assert.deepEqual(Array.from(neutral), [10, 20, 30, 255], 'neutral leaves pixels untouched');

  const bright = new Uint8ClampedArray([100, 100, 100, 255]);
  imagePrep.adjustImagePixels(bright, { brightness: 150, contrast: 100, saturation: 100 });
  assert.equal(bright[0], 150);

  const contrast = new Uint8ClampedArray([100, 128, 150, 255]);
  imagePrep.adjustImagePixels(contrast, { brightness: 100, contrast: 150, saturation: 100 });
  assert.equal(contrast[0], 86, 'brightness and contrast are applied before saturation');

  const grey = new Uint8ClampedArray([200, 40, 90, 250]);
  imagePrep.adjustImagePixels(grey, { brightness: 100, contrast: 100, saturation: 0 });
  assert.ok(Math.abs(grey[0] - grey[1]) <= 1 && Math.abs(grey[1] - grey[2]) <= 1, 'zero saturation is grey');
  assert.equal(grey[3], 250, 'alpha is untouched');
});

test('the editor opens with the prepared photo and a neutral edit state', () => {
  const source = fs.readFileSync(COMPONENT, 'utf8');
  const editor = source.slice(source.indexOf('function openAdvancedEditor'));
  const body = editor.slice(0, editor.indexOf('}\n'));
  assert.match(body, /if \(!compressedUrl\) return;/, 'without a prepared image there is nothing to edit');
  assert.match(body, /setRawUrl\(compressedUrl\)/, 'the preview source is the prepared photo');
  assert.match(body, /setMode\("editing"\)/);

  const confirm = source.slice(source.indexOf('isConfirming && compressedUrl'));
  assert.doesNotMatch(confirm.slice(0, 2500), /% saved/, 'the size chip must not claim a saving');
  assert.match(source, /describeSizeDelta\(originalSize, compressedSize\)/, 'the size chip uses the honest delta');
});

test('both save paths upload the prepared image through the shared pipeline', () => {
  const source = fs.readFileSync(COMPONENT, 'utf8');
  assert.doesNotMatch(source, /setSavedUrl\(dataUrl\)/, 'a local data URL is never presented as a saved upload');
  assert.doesNotMatch(source, /JSON\.stringify\(\{ dataUrl/, 'the editor no longer posts base64 JSON directly');
  assert.doesNotMatch(source, /dataUrlToFile\(compressedUrl/, 'a blob URL is not parsed as a data URL');

  const uploads = source.match(/uploadPreparedImage\(/g) || [];
  assert.equal(uploads.length, 2, 'confirm and editor save both use the shared uploader');
  assert.match(source, /preparedFileRef\.current/, 'the prepared File is kept for the confirm path');

  assert.match(source, /URL\.revokeObjectURL/, 'prepared object URLs are released');
  assert.match(source, /adjustImagePixels/, 'old iOS browsers get the filter fallback');
});
