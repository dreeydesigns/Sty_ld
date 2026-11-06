const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const {PGlite}=require('@electric-sql/pglite');
class AuthError extends Error{constructor(message,statusCode=401){super(message);this.statusCode=statusCode;}}
const uid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
function load(db,actor){const module={exports:{}};const code=ts.transpileModule(fs.readFileSync('lib/provider-services.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext('(function(require,module,exports){'+code+'})',{})(name=>name==='./auth-database'?{authPool:db}:{AuthError,requireAuthenticatedUser:async()=>actor},module,module.exports);return module.exports;}
const actor={userId:uid(1),workspaceId:uid(2),role:'professional',workspace:{role:'professional'}};
const fields={name:'Local fixture service',description:'Private test description',price:1500.25,durationMinutes:45,category:'Hair',isActive:false,expectedWorkspaceId:uid(2),requestId:uid(40)};
test('private menu pagination binds only the server owner and bounds requested pages',async()=>{
 const calls=[],module={exports:{}};
 const source=ts.transpileModule(fs.readFileSync('app/api/provider-services/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const dependencies={'next/server':{NextResponse:Response},'@/lib/auth-database':{authPool:{query:async(sql,args)=>{calls.push({sql,args});return {rows:[]};}}},'@/lib/provider-services':{providerActor:async()=>actor,SERVICE_COLUMNS:'id,name'},'@/lib/api-security':{authError:e=>Response.json({error:e.message},{status:e.statusCode||500})},'@/lib/auth-resolver':{AuthError}};
 vm.runInNewContext('(function(require,module,exports){'+source+'})',{URL})(name=>dependencies[name],module,module.exports);
 assert.equal((await module.exports.GET(new Request('https://test.local/api/provider-services?page=2&workspaceId='+uid(9)))).status,200);
 assert.deepEqual(Array.from(calls[0].args),[uid(2),uid(1),50]);
 for(const page of ['0','-1','1.5','10001','invalid'])assert.equal((await module.exports.GET(new Request('https://test.local/api/provider-services?page='+page))).status,400);
 assert.equal(calls.length,1);
});
test('strict service input rejects malformed money, duration and unsupported image or identity fields',async()=>{
 const api=load({connect(){throw new Error('Must not connect');}},actor);
 for(const body of [{...fields,price:1.001},{...fields,price:1e-8},{...fields,price:1e10},{...fields,durationMinutes:0},{...fields,durationMinutes:1.5},{...fields,category:'x'.repeat(51)},{...fields,imageUrl:'https://unreviewed.test/image'},{...fields,userId:uid(3)}])await assert.rejects(api.saveProviderService(body,false),e=>e.statusCode===400);
 await assert.rejects(api.saveProviderService({...fields,expectedWorkspaceId:uid(3)},false),e=>e.statusCode===409);
 for(const rejected of [{...actor,role:'client',workspace:{role:'client'}},{...actor,admin:true,mfaVerified:false},{...actor,workspace:{role:'salon'}}])await assert.rejects(load({},rejected).providerActor(),e=>e.statusCode===403);
});
test('real SQL creation, stale edit, cross-workspace refusal, soft deactivation and audit rollback',async()=>{
 const db=new PGlite();try{
 await db.exec(`CREATE TABLE users(id uuid PRIMARY KEY,deletion_status text DEFAULT 'active',auth_suspended boolean DEFAULT false,suspended boolean DEFAULT false);
 CREATE TABLE identity_workspaces(id uuid PRIMARY KEY,user_id uuid,role text,status text);
 CREATE TABLE workspace_applications(user_id uuid,role text,status text);
 CREATE TABLE services(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),provider_id uuid,workspace_id uuid,name varchar(100),description text,price numeric(10,2),duration_minutes integer,category varchar(50),is_active boolean,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
 CREATE TABLE security_events(user_id uuid,event text,details jsonb);`);
 await db.query("INSERT INTO users(id) VALUES($1)",[uid(1)]);await db.query("INSERT INTO identity_workspaces VALUES($1,$2,'professional','active'),($3,$2,'professional','active')",[uid(2),uid(1),uid(3)]);await db.query("INSERT INTO workspace_applications VALUES($1,'professional','approved')",[uid(1)]);
 await db.query("INSERT INTO services(id,provider_id,workspace_id,name,price,is_active) VALUES($1,$2,$3,'Foreign workspace fixture',100,false)",[uid(39),uid(1),uid(3)]);
 const adapter={connect:async()=>({release(){},query:async(sql,args)=>{const r=await db.query(sql,args);return {...r,rowCount:/^SELECT\b/i.test(sql.trim())?r.rows.length:r.affectedRows};}})};
 const api=load(adapter,actor);
 await assert.rejects(api.saveProviderService({...fields,requestId:uid(39)},false),e=>e.statusCode===409);
 assert.equal((await db.query('SELECT count(*)::int AS n FROM services')).rows[0].n,1);
 assert.equal((await db.query('SELECT count(*)::int AS n FROM security_events')).rows[0].n,0);
 assert.equal((await db.query('SELECT name FROM services WHERE id=$1',[uid(39)])).rows[0].name,'Foreign workspace fixture');
 const created=await api.saveProviderService(fields,false);assert.equal(created.service.is_active,false);assert.equal(Number(created.service.price),1500.25);
 const {requestId:_requestId,...editingFields}=fields; const edit={...editingFields,id:created.service.id,expectedVersion:created.service.version,isActive:true};
 await assert.rejects(api.saveProviderService({...edit,expectedVersion:'old'},true),e=>e.statusCode===409);
 await assert.rejects(load(adapter,{...actor,workspaceId:uid(3)}).saveProviderService({...edit,expectedWorkspaceId:uid(3)},true),e=>e.statusCode===404);
 assert.equal((await api.saveProviderService(fields,false)).service.id,created.service.id);
 const updated=await api.saveProviderService(edit,true);assert.equal(updated.service.is_active,true);
 const inactive=await api.saveProviderService({...edit,isActive:false,expectedVersion:updated.service.version},true);assert.equal(inactive.service.is_active,false);assert.equal((await db.query('SELECT count(*)::int AS n FROM services')).rows[0].n,2);
 await db.exec("ALTER TABLE security_events ADD CONSTRAINT reject_create CHECK(event<>'provider_service_created') NOT VALID");
 await assert.rejects(api.saveProviderService({...fields,requestId:uid(41)},false));assert.equal((await db.query('SELECT count(*)::int AS n FROM services')).rows[0].n,2,'audit failure rolls back insertion');
 assert.equal((await db.query('SELECT count(*)::int AS n FROM security_events')).rows[0].n,3);
 }finally{await db.close();}
});
