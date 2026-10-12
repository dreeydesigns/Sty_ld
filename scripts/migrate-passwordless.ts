import { loadEnvConfig } from '@next/env';
import { readFileSync,writeFileSync } from 'node:fs';
loadEnvConfig(process.cwd());
async function main(){
 const {auth}=await import('../lib/better-auth');
 const {authPool}=await import('../lib/auth-database');
 const {getMigrations}=await import('better-auth/db/migration');
 try{
  // Never silently merge duplicate email identities.
  const duplicates=await authPool.query('SELECT lower(trim(email)) FROM users WHERE email IS NOT NULL GROUP BY lower(trim(email)) HAVING count(*)>1');
  if(duplicates.rowCount)throw new Error('Duplicate email addresses require review before migration.');
  const counts=await authPool.query('SELECT count(*) AS users,count(email) AS with_email FROM users');
  console.log('Existing accounts:',counts.rows[0]);
  const plan=await getMigrations(auth.options);
  const sql=await plan.compileMigrations();
  writeFileSync('sql/passwordless-generated.sql',sql);
  console.log('Schema plan saved to sql/passwordless-generated.sql.');
  if(!process.argv.includes('--apply'))return;
  // Additive app migration and normalization run atomically. Existing identifiers stay unchanged.
  const client=await authPool.connect();
  try{
   await client.query('BEGIN');
   await client.query(readFileSync('sql/migrations/010_passwordless_auth.sql','utf8'));
   await client.query('UPDATE users SET email=lower(trim(email)) WHERE email IS NOT NULL');
   await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  await plan.runMigrations();
  console.log('Passwordless schema ready. Legacy account and session records preserved for rollback.');
 }finally{await authPool.end();}
}
main().catch(e=>{console.error('Migration failed:',e.message);process.exitCode=1;});
