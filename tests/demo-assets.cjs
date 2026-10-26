const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{inflateSync}=require('node:zlib');
const {buildDemoAssets,assetManifest,validateDemoAssets}=require('../scripts/demo-assets.cjs');
const {buildFixturePackage,TARGET}=require('../scripts/pilot-fixture-package.cjs');
const root=path.join(__dirname,'fixtures','demo-assets');
test('six real PNG assets resolve every Demo Look reference with deterministic integrity and original provenance',()=>{
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
  assert.equal(validateDemoAssets(manifest,file=>fs.readFileSync(path.join(root,file))),true);
  const fixture=buildFixturePackage('88888888-8888-4888-8888-888888888888',TARGET,true);
  assert.ok(fixture.posts.every(post=>manifest.assets.some(asset=>asset.mediaRef===post.mediaRef)));
  for(const asset of buildDemoAssets()) {
    assert.ok(asset.buffer.equals(fs.readFileSync(path.join(root,asset.file))));
    assert.equal(asset.buffer.readUInt32BE(16),360);assert.equal(asset.buffer.readUInt32BE(20),480);
    let offset=8;const compressed=[];
    while(offset<asset.buffer.length){const size=asset.buffer.readUInt32BE(offset),type=asset.buffer.toString('ascii',offset+4,offset+8);if(type==='IDAT')compressed.push(asset.buffer.subarray(offset+8,offset+8+size));offset+=12+size;}
    assert.equal(inflateSync(Buffer.concat(compressed)).length,(360*4+1)*480);
  }
});
test('asset validator refuses traversal, replacement manifests and tampered files before any remote operation',()=>{
  const manifest=assetManifest(),original=buildDemoAssets();
  const traversal=structuredClone(manifest);traversal.assets[0].file='../private.png';
  assert.throws(()=>validateDemoAssets(traversal,()=>{throw new Error('must not read');}),/Unexpected asset/);
  const replacement=structuredClone(manifest);replacement.assets[0].sha256='a'.repeat(64);
  assert.throws(()=>validateDemoAssets(replacement,()=>{throw new Error('must not read');}),/Unexpected asset/);
  assert.throws(()=>validateDemoAssets({...manifest,rights:'unverified source'},()=>{throw new Error('must not read');}),/provenance/);
  assert.throws(()=>validateDemoAssets(manifest,file=>{const bytes=Buffer.from(original.find(asset=>asset.file===file).buffer);bytes[40]^=1;return bytes;}),/integrity/);
});
