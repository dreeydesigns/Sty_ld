const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function load(file,deps={}){
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 const module={exports:{}};
 vm.runInNewContext(`(function(require,module,exports){${code}\n})`,{console,process,Buffer,Date,URL,Response,Headers,crypto:require('node:crypto').webcrypto})((name)=>name in deps?deps[name]:require(name),module,module.exports);
 return module.exports;
}
const policy=load('lib/auth-policy.ts');
test('return paths reject off-site destinations and authentication loops',()=>{
 for(const input of ['https://evil.test','//evil.test','/\\evil.test','/auth/sign-in','/api/auth/sign-out','/x\nLocation:evil'])assert.equal(policy.safeReturnTo(input),'/home');
 assert.equal(policy.safeReturnTo('/book?provider=123'),'/book?provider=123');
});
test('suspended/deleted accounts cannot sign in; deletion grace expires',()=>{
 assert.equal(policy.accountMaySignIn('active'),true);
 for(const state of ['suspended','deleted','unknown'])assert.equal(policy.accountMaySignIn(state),false);
 assert.equal(policy.accountMaySignIn('pending',new Date(Date.now()-31*86400000)),false);
 assert.equal(policy.accountMaySignIn('pending',new Date()),true);
});
test('retired login endpoints cannot mint sessions',async()=>{
 for(const route of ['email','google','whatsapp','signin','signin-multi-role','phone-signin','phone/verify','client/signup','passkey']){
  const endpoint=load(`app/api/auth/${route}/route.ts`,{'next/server':{NextResponse:Response}});
  assert.equal((await endpoint.POST()).status,410,route);
 }
});
class AuthError extends Error {constructor(message,statusCode=401){super(message);this.statusCode=statusCode;}}
const apiSecurity={sameOrigin:()=>{},authError:e=>Response.json({error:e.message},{status:e.statusCode||500})};
test('workspace switching cannot grant a new role or modify another session',async()=>{
 const calls=[];const session={userId:'u1',sessionId:'s1',roles:['client','professional'],mfaVerified:false};
 const endpoint=load('app/api/auth/session/route.ts',{
  'next/server':{NextResponse:Response},'@/lib/auth-resolver':{requireAuthenticatedUser:async()=>session,AuthError},
  '@/lib/auth-policy':policy,'@/lib/auth-database':{authPool:{query:async(...args)=>{calls.push(args);return {rows:[]};}}},
  '@/lib/security-events':{securityEvent:async()=>{}},'@/lib/api-security':apiSecurity,
 });
 const request=role=>({json:async()=>({newRole:role,sessionId:'someone-elses-session'}),headers:new Headers()});
 assert.equal((await endpoint.POST(request('salon'))).status,403);assert.equal(calls.length,0);
 assert.equal((await endpoint.POST(request('super_admin'))).status,403);
 assert.equal((await endpoint.POST(request('professional'))).status,200);
 assert.deepEqual(Array.from(calls[0][1]),['s1','u1','professional']);
});
test('administrator security reads require MFA before any database query',async()=>{
 let queries=0;
 const endpoint=load('app/api/admin/security/route.ts',{
  'next/server':{NextResponse:Response},'@/lib/auth-resolver':{requireAdmin:async()=>{throw new AuthError('MFA required',403);},AuthError},
  '@/lib/auth-database':{authPool:{query:async()=>{queries++;}}},'@/lib/security-events':{securityEvent:async()=>{}},'@/lib/api-security':apiSecurity,
 });
 assert.equal((await endpoint.GET({url:'https://styld.test/api/admin/security'})).status,403);assert.equal(queries,0);
});
test('session revocation is scoped to the authenticated owner',async()=>{
 const calls=[];
 const endpoint=load('app/api/auth/sessions/route.ts',{
  'next/server':{NextResponse:Response},'@/lib/auth-resolver':{requireAuthenticatedUser:async()=>({userId:'u1',sessionId:'s1'}),AuthError},
  '@/lib/auth-database':{authPool:{query:async(...args)=>{calls.push(args);return {rows:[]};}}},'@/lib/security-events':{securityEvent:async()=>{}},'@/lib/api-security':apiSecurity,
 });
 assert.equal((await endpoint.DELETE({json:async()=>({sessionId:'other-account-session',userId:'u2'})})).status,200);
 assert.ok(calls[0][0].includes('"userId"=$1'));assert.deepEqual(Array.from(calls[0][1]),['u1','other-account-session']);
});
