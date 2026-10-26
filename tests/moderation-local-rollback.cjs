const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const { PGlite } = require('@electric-sql/pglite');
function load(file, deps) { const module={exports:{}};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;vm.runInNewContext(`(function(require,module,exports){${code}})`,{URL,Response,console,process:{env:{}}})(name=>deps[name],module,module.exports);return module.exports; }
test('real local SQL rolls publication back if audit insertion fails, then commits both on retry', async () => {
  const db = new PGlite(), user='11111111-1111-4111-8111-111111111111', workspace='22222222-2222-4222-8222-222222222222', service='33333333-3333-4333-8333-333333333333', post='44444444-4444-4444-8444-444444444444';
  let failAudit=true;
  try {
    await db.exec(fs.readFileSync('tests/fixtures/review-schema.sql','utf8'));
    await db.query("INSERT INTO users(id,first_name,email) VALUES($1,'Local test','moderation@example.test')",[user]);
    const reviewer='55555555-5555-4555-8555-555555555555';
    await db.query("INSERT INTO users(id,first_name,email) VALUES($1,'Local reviewer','reviewer@example.test')",[reviewer]);
    await db.query("INSERT INTO identity_workspaces(id,user_id,role) VALUES($1,$2,'professional')",[workspace,user]);
    await db.query("INSERT INTO services(id,workspace_id,provider_id,name,price,is_active) VALUES($1,$2,$3,'Local service',2000,true)",[service,workspace,user]);
    await db.query("INSERT INTO social_posts(id,author_user_id,author_workspace_id,author_name,author_role,post_type,caption,tags,media_urls,visibility,publication_status,moderation_status) VALUES($1,$2,$3,'Local creator','professional','portfolio','Local synthetic Look',$4,ARRAY[]::text[],'public','pending','visible')",[post,user,workspace,[`svc:${service}`]]);
    const query=async(sql,params)=>{if(failAudit&&/INSERT INTO security_events/.test(sql))throw new Error('Local injected audit failure');const r=await db.query(sql,params);return{...r,rowCount:r.affectedRows??r.rows.length};};
    const next={NextResponse:{json:(body,init)=>Response.json(body,init)}};
    class AuthError extends Error{constructor(message,statusCode){super(message);this.statusCode=statusCode;}}
    const auth={AuthError,requireAdmin:async()=>({userId:reviewer,admin:true,mfaVerified:true})};
    const security=load('lib/api-security.ts',{'next/server':next,'./auth-resolver':auth});
    const look=load('lib/look-contract.ts',{});
    const moderation=load('lib/moderation.ts',{'./look-contract':look});
    const route=load('app/api/admin/moderation/route.ts',{'next/server':next,'@/lib/auth-resolver':auth,'@/lib/api-security':security,'@/lib/auth-database':{authPool:{connect:async()=>({query,release(){}})}},'@/lib/moderation':moderation,'@/lib/look-contract':look});
    const request=()=>new Request('http://localhost/api/admin/moderation',{method:'POST',headers:{origin:'http://localhost','content-type':'application/json'},body:JSON.stringify({postId:post,decision:'approve'})});
    const failed=await route.POST(request()); assert.equal(failed.status,500);
    assert.equal((await db.query('SELECT publication_status FROM social_posts WHERE id=$1',[post])).rows[0].publication_status,'pending');
    assert.equal((await db.query('SELECT count(*)::int AS n FROM security_events')).rows[0].n,0);
    failAudit=false;const approved=await route.POST(request());assert.equal(approved.status,200);
    assert.equal((await db.query('SELECT publication_status FROM social_posts WHERE id=$1',[post])).rows[0].publication_status,'published');
    assert.equal((await db.query('SELECT count(*)::int AS n FROM security_events')).rows[0].n,1);
    assert.equal((await route.POST(request())).status,409);assert.equal((await db.query('SELECT count(*)::int AS n FROM security_events')).rows[0].n,1);
  } finally {await db.close();}
});
