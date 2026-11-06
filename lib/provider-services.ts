import { authPool } from './auth-database';
import { AuthError, requireAuthenticatedUser } from './auth-resolver';

export const SERVICE_COLUMNS = 'id,name,description,price,duration_minutes,category,is_active,updated_at::text AS version';
export function serviceFields(body: Record<string, unknown>) {
  const text = (value: unknown, max: number, required = false, multiline = false) => {
    const controls = multiline ? /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/ : /[\x00-\x1f\x7f]/;
    if (typeof value !== 'string' || value.length > max || controls.test(value) || (required && !value.trim())) throw new AuthError('Enter valid service details.', 400);
    return value.trim();
  };
  const name = text(body.name, 100, true), description = text(body.description, 2000, false, true), category = text(body.category, 50);
  const price = body.price;
  if (typeof price !== 'number' || !Number.isFinite(price) || price < 0 || price > 99999999.99 || !/^\d+(?:\.\d{1,2})?$/.test(String(price))) throw new AuthError('Enter a valid price with up to two decimal places.', 400);
  const duration = body.durationMinutes;
  if (duration !== null && (typeof duration !== 'number' || !Number.isSafeInteger(duration) || duration < 1 || duration > 10080)) throw new AuthError('Enter a duration from 1 to 10080 minutes, or leave it blank.', 400);
  if (typeof body.isActive !== 'boolean') throw new AuthError('Choose whether this service is active.', 400);
  return [name, description || null, price, duration, category || null, body.isActive];
}
export async function providerActor() {
  const actor = await requireAuthenticatedUser();
  if (!actor.workspaceId || !actor.workspace || !['professional','salon'].includes(actor.role) || actor.workspace.role !== actor.role || (actor.admin && !actor.mfaVerified)) throw new AuthError('Select an authorised provider workspace.', 403);
  return actor;
}
export async function saveProviderService(body: unknown, editing: boolean) {
  const actor = await providerActor();
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new AuthError('Enter valid service details.', 400);
  const input = body as Record<string, unknown>;
  const allowed = ['name','description','price','durationMinutes','category','isActive','expectedWorkspaceId',...(editing ? ['id','expectedVersion'] : ['requestId'])];
  if (Object.keys(input).some(key => !allowed.includes(key))) throw new AuthError('Unsupported service field.', 400);
  if (input.expectedWorkspaceId !== actor.workspaceId) throw new AuthError('Workspace changed. Reload your services.', 409);
  const values = serviceFields(input);
  if (!editing && (typeof input.requestId !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(input.requestId))) throw new AuthError('Reload before adding a service.', 400);
  if (editing && (typeof input.id !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(input.id) || typeof input.expectedVersion !== 'string' || input.expectedVersion.length > 80)) throw new AuthError('Reload this service before editing.', 409);
  const client = await authPool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout='5s'");
    await client.query("SET LOCAL idle_in_transaction_session_timeout='5s'");
    const owned = await client.query("SELECT w.id FROM identity_workspaces w JOIN users u ON u.id=w.user_id WHERE w.id=$1 AND w.user_id=$2 AND w.status='active' AND w.role=$3 AND u.deletion_status='active' AND COALESCE(u.auth_suspended,false)=false AND COALESCE(u.suspended,false)=false AND EXISTS(SELECT 1 FROM workspace_applications a WHERE a.user_id=w.user_id AND a.role=w.role AND a.status='approved') FOR UPDATE OF w", [actor.workspaceId,actor.userId,actor.role]);
    if (!owned.rowCount) throw new AuthError('Provider workspace unavailable.', 403);
    let result;
    if (editing) {
      const current = await client.query('SELECT updated_at::text AS version FROM services WHERE id=$1 AND workspace_id=$2 AND provider_id=$3 FOR UPDATE', [input.id,actor.workspaceId,actor.userId]);
      if (!current.rows[0]) throw new AuthError('Service unavailable.', 404);
      if (current.rows[0].version !== input.expectedVersion) throw new AuthError('Service changed. Reload before saving.', 409);
      result = await client.query(`UPDATE services SET name=$4,description=$5,price=$6,duration_minutes=$7,category=$8,is_active=$9,updated_at=clock_timestamp() WHERE id=$1 AND workspace_id=$2 AND provider_id=$3 RETURNING ${SERVICE_COLUMNS}`, [input.id,actor.workspaceId,actor.userId,...values]);
    } else {
      const prior = await client.query(`SELECT ${SERVICE_COLUMNS} FROM services WHERE id=$1 AND workspace_id=$2 AND provider_id=$3 FOR UPDATE`, [input.requestId,actor.workspaceId,actor.userId]);
      if (prior.rows[0]) {
        const old = prior.rows[0];
        if (old.name!==values[0] || old.description!==values[1] || Number(old.price)!==values[2] || old.duration_minutes!==values[3] || old.category!==values[4] || old.is_active!==values[5]) throw new AuthError('An earlier save completed. Reload your services before changing it.',409);
        await client.query('COMMIT');
        return {success:true,workspaceId:actor.workspaceId,service:old};
      }
      result = await client.query(`INSERT INTO services(id,provider_id,workspace_id,name,description,price,duration_minutes,category,is_active) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(id) DO NOTHING RETURNING ${SERVICE_COLUMNS}`, [input.requestId,actor.userId,actor.workspaceId,...values]);
      if (!result.rows[0]) throw new AuthError('This save could not be completed. Start a new service draft and try again.',409);
    }
    await client.query("INSERT INTO security_events(user_id,event,details) VALUES($1,$2,$3::jsonb)", [actor.userId,editing ? 'provider_service_updated' : 'provider_service_created',JSON.stringify({workspaceId:actor.workspaceId,serviceId:result.rows[0].id,active:input.isActive})]);
    await client.query('COMMIT');
    return {success:true,workspaceId:actor.workspaceId,service:result.rows[0]};
  } catch(error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}
