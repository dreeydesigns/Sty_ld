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

function loadImagePrep(extras) {
  const source = ts.transpileModule(fs.readFileSync(path.join(ROOT, 'lib', 'image-prep.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  const context = {
    console, process, Buffer, URL, URLSearchParams, Date, Math, JSON, Object, Array,
    Number, String, Boolean, Error, Set, Map, Symbol, Promise, RegExp, TypeError, globalThis: null,
    ...extras,
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

test('a stage clamps before the next one multiplies', () => {
  // 200 pushed to 300 by brightness stays at the ceiling: the old pipeline let the overshoot
  // travel into contrast and come back as 213, which is 22 steps brighter than the preview.
  const pushed = new Uint8ClampedArray([200, 200, 200, 255]);
  imagePrep.adjustImagePixels(pushed, { brightness: 150, contrast: 50, saturation: 100 });
  assert.equal(pushed[0], 191, 'brightness clamps at 255 and contrast works from the clamped byte');

  // A stage hands the next one a whole byte, the way a canvas filter does, so nothing is rounded
  // twice at the end.
  const quantised = new Uint8ClampedArray([15, 15, 15, 255]);
  imagePrep.adjustImagePixels(quantised, { brightness: 105, contrast: 102, saturation: 100 });
  assert.equal(quantised[0], 12, '15 becomes 15 at brightness 105 because the fraction is dropped, not rounded');
});

test('an oversized or unprepared photo is refused before a byte is sent', () => {
  const cap = imagePrep.DEFAULT_MAX_UPLOAD_BYTES;
  const jpeg = (bytes, type = 'image/jpeg') => ({ size: bytes, type, name: 'photo.jpg' });
  assert.equal(imagePrep.validateUploadableFile(jpeg(cap)).ok, true, 'exactly at the cap is what the server takes');
  assert.equal(imagePrep.validateUploadableFile(jpeg(cap + 1)).ok, false, 'one over the cap never reaches the network');
  assert.match(imagePrep.validateUploadableFile(jpeg(cap + 1)).error, /5 MB/);
  assert.equal(imagePrep.validateUploadableFile(jpeg(1000, 'image/heic')).ok, false, 'a HEIC is not an uploadable type');
  assert.equal(imagePrep.validateUploadableFile(jpeg(0)).ok, false, 'an empty file is not an upload');

  const failure = imagePrep.uploadPreparedImage(jpeg(cap + 1));
  return failure.then((result) => {
    assert.equal(result.ok, false);
    assert.match(result.error, /5 MB/);
  });
});

test('a stored value only counts as an image while its URL still opens', () => {
  assert.equal(imagePrep.isStorableImageUrl('https://res.cloudinary.com/demo/image/upload/photo.jpg'), true);
  assert.equal(imagePrep.isStorableImageUrl('/api/media/pending/photo.jpg'), true, 'a same-origin path is a real address');
  assert.equal(imagePrep.isStorableImageUrl(''), false);
  assert.equal(imagePrep.isStorableImageUrl(null), false);
  assert.equal(imagePrep.isStorableImageUrl(undefined), false);
  assert.equal(imagePrep.isStorableImageUrl('blob:http://localhost/6f2c'), false, 'an object URL dies with the tab');
  assert.equal(imagePrep.isStorableImageUrl('data:image/jpeg;base64,/9j/4AAQ'), false, 'a pasted preview is not a saved photo');
  assert.equal(imagePrep.isStorableImageUrl('//evil.example/photo.jpg'), false, 'a protocol-relative value is not ours');
});

test('the profile field keeps a real address and drops a dead one', () => {
  assert.equal(imagePrep.pickStorableImageUrl('https://cdn.example/photo.jpg'), 'https://cdn.example/photo.jpg');
  assert.equal(imagePrep.pickStorableImageUrl('/api/media/pending/photo.jpg'), '/api/media/pending/photo.jpg');
  assert.equal(imagePrep.pickStorableImageUrl('data:image/jpeg;base64,/9j/4AAQ'), undefined, 'a legacy preview renders as no photo');
  assert.equal(imagePrep.pickStorableImageUrl('blob:http://127.0.0.1:5999/dead'), undefined);
  assert.equal(imagePrep.pickStorableImageUrl(undefined), undefined);
});

test('an upload response that is not a real address is a failed upload', async () => {
  // The response body is a system boundary: whatever the upload route answers has to be a URL the
  // visitor can still open next week before the editor is allowed to write it into a profile.
  const withResponse = (body) => loadImagePrep({
    FormData: class { append() {} },
    fetch: async () => ({ ok: true, json: async () => body }),
  });
  const file = { size: 1000, type: 'image/jpeg', name: 'photo.jpg' };

  const preview = await withResponse({ ok: true, url: 'data:image/jpeg;base64,AAAA' }).uploadPreparedImage(file);
  assert.equal(preview.ok, false, 'a data: answer is not a saved photo');
  assert.equal(preview.url, undefined, 'and nothing is handed to the caller to store');

  const relative = await withResponse({ ok: true, url: '//someone-else.example/photo.jpg' }).uploadPreparedImage(file);
  assert.equal(relative.ok, false, 'a protocol-relative answer is not ours either');

  const saved = await withResponse({ ok: true, url: 'https://res.cloudinary.com/demo/image/upload/photo.jpg' })
    .uploadPreparedImage(file);
  assert.equal(saved.ok, true, 'a real address still saves');
  assert.equal(saved.url, 'https://res.cloudinary.com/demo/image/upload/photo.jpg');
});

test('the editor never calls a legacy preview a saved image', () => {
  const source = fs.readFileSync(COMPONENT, 'utf8');
  assert.match(source, /useState<string \| null>\(isStorableImageUrl\(value\)/, 'a legacy value is screened on the way in');
  assert.match(source, /if \(isStorableImageUrl\(value\)\)/, 'a legacy value is screened when it changes');
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
  assert.equal(uploads.length, 1, 'the acceptance helper owns the shared uploader');
  assert.equal((source.match(/await uploadAndAccept\(/g) || []).length, 2, 'confirm and editor save both await the acceptance helper');
  assert.match(source, /preparedFileRef\.current/, 'the prepared File is kept for the confirm path');

  assert.match(source, /URL\.revokeObjectURL/, 'prepared object URLs are released');
  assert.match(source, /adjustImagePixels/, 'old iOS browsers get the filter fallback');
});
