import { createHash } from 'node:crypto';

export function applicationReviewVersion(application: {
  user_id: string; role: string; name: string; description: string | null; contact: string | null;
}) {
  // A concurrency precondition only. Server authorization still controls every decision.
  const values = [application.user_id, application.role, application.name, application.description, application.contact];
  if (values.some(value => value !== null && typeof value !== 'string')) throw new Error('Invalid application snapshot.');
  return createHash('sha256').update(JSON.stringify(values)).digest('hex');
}
