const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function harness(onSave, upload) {
  const source = fs.readFileSync('components/image-upload-editor.tsx', 'utf8');
  const ast = ts.createSourceFile('editor.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let fn;
  function visit(node) { if (ts.isFunctionDeclaration(node) && node.name?.text === 'uploadAndAccept') fn = node; ts.forEachChild(node, visit); }
  visit(ast); assert.ok(fn);
  const emitted = ts.transpileModule(fn.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const state = { selectionVersion: { current: 1 }, stagedUpload: { current: null }, preparedFileRef: { current: {} }, writes: [], uploads: 0 };
  const factory = new Function('state', 'onSave', 'upload', `const { selectionVersion, stagedUpload, preparedFileRef } = state;
    const folder='profile';
    const uploadPreparedImage=async file=>{state.uploads++;return upload(file);};
    const isPendingMediaUrl=()=>true;
    const openPendingMediaWindow=async()=>({ok:true});
    const releasePreparedUrl=()=>state.writes.push('released');
    const setSavedUrl=value=>state.writes.push(['saved',value]);
    const setIsConfirming=value=>state.writes.push(['confirm',value]);
    const setCompressedUrl=value=>state.writes.push(['compressed',value]);
    const setRawUrl=value=>state.writes.push(['raw',value]);
    const setMode=value=>state.writes.push(['mode',value]);
    ${emitted}; return uploadAndAccept;`);
  return { state, save: factory(state, onSave, upload || (async()=>({ok:true,url:'/api/media/pending/test'}))) };
}
test('photo editor waits for profile acknowledgement before showing saved or discarding edits', async()=>{
  let resolve; const ack=new Promise(done=>{resolve=done;});
  const h=harness(()=>ack); const file={size:100};
  const pending=h.save(file,{width:2,height:3,bytes:100},file);
  await new Promise(done=>setImmediate(done));
  assert.deepEqual(h.state.writes,[]); assert.ok(h.state.preparedFileRef.current);
  resolve(true); assert.equal(await pending,true);
  assert.deepEqual(h.state.writes[0],['saved','/api/media/pending/test']);
  assert.equal(h.state.preparedFileRef.current,null);
});
test('failed persistence retains staged upload and retries without uploading a second copy', async()=>{
  let accepted=false; const h=harness(()=>accepted); const file={size:100};
  await assert.rejects(h.save(file,{width:2,height:3,bytes:100},file),/could not save/);
  assert.equal(h.state.uploads,1); assert.deepEqual(h.state.writes,[]);
  accepted=true; assert.equal(await h.save(file,{width:2,height:3,bytes:100},file),true);
  assert.equal(h.state.uploads,1);
});
test('a replaced selection cannot persist a stale upload', async()=>{
  let resolve; let saves=0;
  const h=harness(()=>{saves++;},()=>new Promise(done=>{resolve=done;}));
  const file={size:100}; const pending=h.save(file,{width:2,height:3,bytes:100},file);
  h.state.selectionVersion.current++;
  resolve({ok:true,url:'/api/media/pending/test'});
  assert.equal(await pending,false); assert.equal(saves,0); assert.deepEqual(h.state.writes,[]);
});
