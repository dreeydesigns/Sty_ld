// Original geometric QA graphics. No people, third-party media or remote adapter.
const { deflateSync } = require('node:zlib');
const { createHash } = require('node:crypto');
const signature = Buffer.from([137,80,78,71,13,10,26,10]);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) { crc ^= byte; for (let n=0;n<8;n++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1; }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, bytes) {
  const name=Buffer.from(type), length=Buffer.alloc(4), crc=Buffer.alloc(4);
  length.writeUInt32BE(bytes.length); crc.writeUInt32BE(crc32(Buffer.concat([name,bytes])));
  return Buffer.concat([length,name,bytes,crc]);
}
function buildDemoAssets() {
  const width=360,height=480;
  const letters=['11110100011000110001100011000111110','11111100001000011110100001000011111','10001110111010110101100011000110001','01110100011000110001100011000101110'];
  const palette=[[196,164,149],[147,155,138],[194,112,122],[26,26,46],[180,145,124],[146,119,151]];
  return palette.map((accent,index) => {
    const raw=Buffer.alloc((width*4+1)*height);
    for(let y=0;y<height;y++) for(let x=0;x<width;x++) {
      let color=y<110?[26,26,46]:[250,248,245];
      if(y>=110&&Math.hypot(x-180,y-280)<130) color=(Math.floor((x+y+index*15)/30)%2)?accent:[250,248,245];
      const lx=Math.floor((x-122)/5),ly=Math.floor((y-35)/5),letter=Math.floor(lx/6),column=lx%6;
      if(lx>=0&&ly>=0&&ly<7&&letter<4&&column<5&&letters[letter][ly*5+column]==='1') color=[250,248,245];
      const offset=y*(width*4+1)+1+x*4;raw[offset]=color[0];raw[offset+1]=color[1];raw[offset+2]=color[2];raw[offset+3]=255;
    }
    const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=6;
    const buffer=Buffer.concat([signature,chunk('IHDR',ihdr),chunk('tEXt',Buffer.from('Description\0DEMO geometric QA graphic. Locally generated, not a real portfolio.')),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
    return {mediaRef:`synthetic-approved-${index+1}`,file:`demo-${index+1}.png`,contentType:'image/png',width,height,sha256:digest(buffer),buffer};
  });
}
function assetManifest() { return {version:1,provenance:'locally-generated-geometric-demo',rights:'Project-generated review fixtures only. No third-party assets.',assets:buildDemoAssets().map(({buffer,...entry})=>entry)}; }
function validateDemoAssets(manifest, readFile) {
  if(manifest?.version!==1||manifest.provenance!=='locally-generated-geometric-demo'||manifest.assets?.length!==6) throw new Error('Invalid synthetic asset manifest.');
  const expected=assetManifest();
  if(Object.keys(manifest).sort().join()!=='assets,provenance,rights,version'||manifest.rights!==expected.rights) throw new Error('Unexpected asset provenance.');
  for(let i=0;i<6;i++) {
    const entry=manifest.assets[i];
    if(JSON.stringify(entry)!==JSON.stringify(expected.assets[i])) throw new Error('Unexpected asset reference, path or checksum.');
    const bytes=readFile(entry.file);
    if(!Buffer.isBuffer(bytes)||!bytes.subarray(0,8).equals(signature)||digest(bytes)!==entry.sha256) throw new Error('Synthetic asset integrity failed.');
  }
  return true;
}
if(require.main===module) console.log(JSON.stringify({dryRunOnly:true,remoteWrites:0,manifest:assetManifest()},null,2));
module.exports={buildDemoAssets,assetManifest,validateDemoAssets};
