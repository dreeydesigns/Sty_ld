const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const WORKSPACE = '22222222-2222-4222-8222-222222222222';
const ASSET = '11111111-1111-4111-8111-111111111111';
class AuthError extends Error { constructor(message,statusCode){super(message);this.statusCode=statusCode;} }
function route({owner=true}={}) {
 const queries=[];
 const dependencies={
  'next/server':{NextResponse:Response},
  '@/lib/auth-resolver':{AuthError,requireAuthenticatedUser:async()=>({userId:'server-user',workspaceId:WORKSPACE,admin:false,workspace:{role:'client'}})},
  '@/lib/auth-database':{authPool:{query:async(sql,values)=>{queries.push({sql,values});return /SELECT 1 FROM media_manifests/.test(sql)?{rowCount:owner?1:0,rows:[]}:{rowCount:1,rows:[{profile:{}}]};}}},
  '@/lib/api-security':{sameOrigin(){},authError:error=>Response.json({error:error.message},{status:error.statusCode||500})},
  '@/lib/beauty-world':{}, '@/app/api/me/route':{GET(){}},
 };
 const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../app/api/users/me/route.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const module={exports:{}};
 vm.runInNewContext('(function(require,module,exports){'+code+String.fromCharCode(10)+'})',{URL,Response,console})((name)=>{if(!(name in dependencies))throw new Error(name);return dependencies[name];},module,module.exports);
 return {queries,save:(value)=>module.exports.PATCH(new Request('https://styld.test/api/users/me',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({profileImageUrl:value})}))};
}
test('profile pending-image ownership uses the server workspace and rejects other owners before update',async()=>{
 const allowed=route();
 assert.equal((await allowed.save('/api/media/pending/'+ASSET)).status,200);
 assert.equal(allowed.queries[0].values[0],ASSET);
 assert.equal(allowed.queries[0].values[1],WORKSPACE);
 assert.match(allowed.queries[0].sql,/revoked=false/);
 const outsider=route({owner:false});
 assert.equal((await outsider.save('/api/media/pending/'+ASSET)).status,403);
 assert.equal(outsider.queries.length,1);
});
test('absolute and query-bearing pending image paths cannot evade the owner lookup',async()=>{
 for(const value of ['https://other.test/api/media/pending/'+ASSET,'/api/media/pending/'+ASSET+'?other=1','/api/media/%70ending/'+ASSET,'/api/media/%2570ending/'+ASSET,'/api/media/%252570ending/'+ASSET,'data:image/png;base64,AAAB','blob:https://styld.test/local']){
  const h=route();assert.equal((await h.save(value)).status,400);assert.equal(h.queries.length,0);
 }
});
