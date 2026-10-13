/** Legacy bootstrap is disabled. Existing administrator records and provider
 * configuration are preserved. New grants require a reviewed operator
 * procedure using a verified identity ID and mandatory MFA. */
export async function seedAdminAccount(): Promise<never> {
  throw new Error('Legacy administrator bootstrap is retired. Founder-approved identity provisioning is required.');
}
