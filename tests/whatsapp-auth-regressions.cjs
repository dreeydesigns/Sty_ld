const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');
function load(){const code=ts.transpileModule(fs.readFileSync('app/api/auth/whatsapp/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;const m={exports:{}};vm.runInNewContext('(function(require,module,exports){'+code+'})')((name)=>{assert.equal(name,'next/server');return {NextResponse:Response};},m,m.exports);return m.exports;}
for(const stage of ['start','verify','complete'])test('Retired WhatsApp '+stage+' cannot send paid messages, reveal codes, or create accounts',async()=>{const r=await load().POST({json:async()=>({action:stage,role:'super_admin',phone:'+254700000000'})});assert.equal(r.status,410);const d=await r.json();assert.equal(d.retired,true);assert.equal(d.devHint,undefined);assert.equal(d.session,undefined);});
test('Retired WhatsApp GET cannot advertise test-mode or provider availability',async()=>{const r=await load().GET();assert.equal(r.status,410);assert.equal((await r.json()).retired,true);});
