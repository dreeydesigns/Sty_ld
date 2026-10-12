/** Pure policy shared by routes and security regression tests. */
export const MVP_ROLES = ['client', 'professional', 'salon'] as const;
export function safeReturnTo(value?: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\r\n]/.test(value)) return '/home';
  const path = value.split('?')[0];
  if (/^\/(auth|sign-in|sign-up|sso-callback|api)(\/|$)/.test(path)) return '/home';
  return value;
}
export function isAdminRole(role: string) { return role === 'admin' || role === 'super_admin'; }
export function accountMaySignIn(status: string, requestedAt?: string | Date | null, now = Date.now()) {
  return status === 'active' || (status === 'pending' && !!requestedAt && now - new Date(requestedAt).getTime() < 30 * 86400000);
}
export function recentAuthentication(createdAt: string | Date, now = Date.now()) {
  return now - new Date(createdAt).getTime() < 10 * 60000;
}
