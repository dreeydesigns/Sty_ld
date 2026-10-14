// HTTP smoke only. No browser, real email or database mutation.
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const fs=require('node:fs');
async function main(){
 if(fs.existsSync('.env.local'))throw new Error('Run only in the isolated recovery worktree without .env.local');
 const origin='http://127.0.0.1:4329';
 const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p','4329','-H','127.0.0.1'],{windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,POSTGRES_URL:'',DATABASE_URL:'',POSTGRES_URL_NON_POOLING:'',BETTER_AUTH_URL:origin,BETTER_AUTH_SECRET:'local-smoke-only-not-production-secret-1234567890',RESEND_API_KEY:'',RESEND_FROM_EMAIL:'',GOOGLE_AUTH_VERIFIED:'false'}});
 const output=fs.createWriteStream('smoke-server.log');child.stdout.pipe(output);child.stderr.pipe(output);
 try{
  let ready=false;
  for(let i=0;i<60;i++){try{if((await fetch(origin,{signal:AbortSignal.timeout(2000)})).status===200){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,1000));}
  assert.ok(ready,'Local server did not start');
  for(const path of ['/','/home','/discover','/salons','/professionals','/counter','/book','/auth/sign-in']){
   const r=await fetch(origin+path,{redirect:'manual'});assert.equal(r.status,200,path);
   if(path==='/auth/sign-in')assert.ok(!(await r.text()).includes('accounts.dev'));
   console.log('PASS GET',path,200);
  }
  for(const path of ['/settings','/activity','/admin','/onboarding/client','/onboarding/professional','/onboarding/salon']){const r=await fetch(origin+path,{redirect:'manual'});assert.equal(r.status,307,path);assert.ok(r.headers.get('location').includes('/auth/sign-in'));console.log('PASS protected',path);}
  const me=await fetch(origin+'/api/me');assert.equal(me.status,401);console.log('PASS guest has no authenticated identity');
  const booked=await fetch(origin+'/api/bookings',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:'{}'});assert.equal(booked.status,401);console.log('PASS guest booking denied');
  const application=await fetch(origin+'/api/workspaces',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify({role:'professional',name:'Fixture',description:'Fixture services',contact:'fixture@example.test'})});assert.equal(application.status,401);console.log('PASS guest provider application denied');
  for(const path of ['/api/auth/phone-signin','/api/auth/whatsapp','/api/setup/init-admin']){const r=await fetch(origin+path,{method:'POST',headers:{origin,'Content-Type':'application/json'},body:'{}'});assert.equal(r.status,410,path);console.log('PASS retired',path);}
  const options=await(await fetch(origin+'/api/auth/options')).json();assert.equal(options.google,false);console.log('PASS Google hidden without verified configuration');
 }finally{child.kill();output.end();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
