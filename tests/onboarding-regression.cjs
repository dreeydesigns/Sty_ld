const test = require('node:test');
const assert = require('node:assert/strict');

test('Application status page reads from API, not URL params', async () => {
  const file = require('fs').readFileSync('app/workspace/application/page.tsx', 'utf8');
  
  // Should fetch from API
  assert.ok(/fetch\(["']\/api\/workspaces/.test(file), 'Should fetch applications from API');
  
  // Should not use status from searchParams for display
  assert.ok(!/status.*searchParams\.get.*app\.status/.test(file), 'Should not use URL status for display');
  assert.ok(!/searchParams\.get\(["']status["']\)/.test(file), 'Should not read status from URL params for display');
});

test('Application status page does not trust query parameters for status display', async () => {
  const file = require('fs').readFileSync('app/workspace/application/page.tsx', 'utf8');
  
  // Status should come from API data, not URL params
  assert.ok(!/app\.status.*searchParams/.test(file), 'Should not use URL params for application status');
  assert.ok(!/status.*searchParams\.get.*display/.test(file), 'Should not use URL status for display');
});

test('WorkspaceManagement redirects to application status on submission', async () => {
  const file = require('fs').readFileSync('components/workspace-management.tsx', 'utf8');
  
  // Should redirect to application status page after submission
  assert.ok(/location\.assign\(["']\/workspace\/application\?role=/.test(file), 'Should redirect to application status page after submission');
  
  // Should include role and status in redirect
  assert.ok(/role=.*status=pending/.test(file), 'Should include role and status=pending in redirect');
});

test('Professional onboarding uses WorkspaceManagement with professional role', async () => {
  const file = require('fs').readFileSync('app/onboarding/professional/page.tsx', 'utf8');
  
  assert.ok(/initialRole=/.test(file), 'Should use initialRole');
  assert.ok(/professional/.test(file), 'Should use professional role');
  assert.ok(/WorkspaceManagement/.test(file), 'Should use WorkspaceManagement component');
});

test('Salon onboarding uses WorkspaceManagement with salon role', async () => {
  const file = require('fs').readFileSync('app/onboarding/salon/page.tsx', 'utf8');
  
  assert.ok(/initialRole=/.test(file), 'Should use initialRole');
  assert.ok(/salon/.test(file), 'Should use salon role');
  assert.ok(/WorkspaceManagement/.test(file), 'Should use WorkspaceManagement component');
});

test('WorkspaceManagement submits to /api/workspaces with correct fields', async () => {
  const file = require('fs').readFileSync('components/workspace-management.tsx', 'utf8');
  
  assert.ok(/act\('\/(api\/workspaces)/.test(file), 'Should submit to /api/workspaces');
  assert.ok(/\{role,name,description,contact\}/.test(file), 'Should submit role, name, description, contact');
});

test('Client interests API requires client role', async () => {
  const file = require('fs').readFileSync('app/api/onboarding/client-interests/route.ts', 'utf8');
  
  // Should reject non-client roles
  assert.ok(/session\.role !== 'client'/.test(file), 'Should check client role');
  assert.ok(/AuthError/.test(file), 'Should throw AuthError for non-client roles');
  assert.ok(/403/.test(file), 'Should return 403 for non-client roles');
  assert.ok(/requireAuthenticatedUser/.test(file), 'Should require authentication');
});

test('Client interests API validates interest values', async () => {
  const file = require('fs').readFileSync('app/api/onboarding/client-interests/route.ts', 'utf8');
  
  assert.ok(/validInterestsSet\.has/.test(file), 'Should validate against allowed interests list');
  assert.ok(/invalidInterests.*join/.test(file), 'Should report invalid interests');
});

test('Client interests API requires authentication', async () => {
  const file = require('fs').readFileSync('app/api/onboarding/client-interests/route.ts', 'utf8');
  
  assert.ok(/requireAuthenticatedUser/.test(file), 'Should require authentication');
  assert.ok(/session\.role !== 'client'/.test(file), 'Should reject non-client roles');
});

test('Professional onboarding form submits to workspace application API', async () => {
  const file = require('fs').readFileSync('components/workspace-management.tsx', 'utf8');
  
  assert.ok(/initialRole=.*professional/.test(file), 'Should use professional role for professional onboarding');
});

test('Salon onboarding form submits to workspace application API', async () => {
  const file = require('fs').readFileSync('components/workspace-management.tsx', 'utf8');
  
  assert.ok(/initialRole=.*salon/.test(file), 'Should use salon role for salon onboarding');
});

test('Application status page reads from API, not URL params', async () => {
  const file = require('fs').readFileSync('app/workspace/application/page.tsx', 'utf8');
  
  assert.ok(/fetch\(["']\/api\/workspaces/.test(file), 'Should fetch applications from API');
  assert.ok(!/searchParams\.get\(["']status["']\)/.test(file), 'Should not read status from URL params for display');
});

test('WorkspaceManagement redirects to application status on submission', async () => {
  const file = require('fs').readFileSync('components/workspace-management.tsx', 'utf8');
  
  assert.ok(/location\.assign\(["']\/workspace\/application\?role=/.test(file), 'Should redirect to application status page');
  assert.ok(/status=pending/.test(file), 'Should include status=pending in redirect');
});

test('WorkspaceManagement does not claim workspace access after submission', async () => {
  const file = require('fs').readFileSync('components/workspace-management.tsx', 'utf8');
  
  // Should not claim workspace access after submission
  assert.ok(!/location\.assign\(.*workspace\/professional/.test(file), 'Should not redirect to professional workspace');
  assert.ok(!/location\.assign\(.*workspace\/salon/.test(file), 'Should not redirect to salon workspace');
});

test('Onboarding forms do not claim unsupported persistence', async () => {
  const profFile = require('fs').readFileSync('app/onboarding/professional/page.tsx', 'utf8');
  const salonFile = require('fs').readFileSync('app/onboarding/salon/page.tsx', 'utf8');
  
  // Should not claim unsupported fields are saved
  assert.ok(!/areasServed.*saved|saved.*areasServed/i.test(profFile), 'Should not claim areasServed is saved');
  assert.ok(!/team.*saved|saved.*team/i.test(salonFile), 'Should not claim team members are saved');
});

test('Client interests endpoint validates interest values', async () => {
  const file = require('fs').readFileSync('app/api/onboarding/client-interests/route.ts', 'utf8');
  
  assert.ok(/validInterestsSet\.has/.test(file), 'Should validate against allowed interests');
  assert.ok(/invalidInterests.*join/.test(file), 'Should report invalid interests');
});

test('Client interests endpoint requires client role', async () => {
  const file = require('fs').readFileSync('app/api/onboarding/client-interests/route.ts', 'utf8');
  
  assert.ok(/session\.role !== 'client'/.test(file), 'Should reject non-client roles');
});

test('WorkspaceManagement redirects to application status on submission', async () => {
  const file = require('fs').readFileSync('components/workspace-management.tsx', 'utf8');
  
  assert.ok(/location\.assign\(["']\/workspace\/application\?role=/.test(file), 'Should redirect to application status page');
  assert.ok(/status=pending/.test(file), 'Should include status=pending in redirect');
});

test('WorkspaceManagement does not redirect to workspace on application submission', async () => {
  const file = require('fs').readFileSync('components/workspace-management.tsx', 'utf8');
  
  assert.ok(!/location\.assign\(.*workspace\/(professional|salon)/.test(file), 'Should not redirect to workspace on application submission');
});

test('Application status page reads from API, not URL params', async () => {
  const file = require('fs').readFileSync('app/workspace/application/page.tsx', 'utf8');
  
  assert.ok(/fetch\(["']\/api\/workspaces/.test(file), 'Should fetch applications from API');
  assert.ok(!/searchParams\.get\(["']status["']\)/.test(file), 'Should not read status from URL params for display');
});

test('Professional and Salon onboarding use WorkspaceManagement with correct roles', async () => {
  const profFile = require('fs').readFileSync('app/onboarding/professional/page.tsx', 'utf8');
  const salonFile = require('fs').readFileSync('app/onboarding/salon/page.tsx', 'utf8');
  
  assert.ok(/initialRole=.*professional/.test(profFile), 'Professional onboarding should use professional role');
  assert.ok(/initialRole=.*salon/.test(salonFile), 'Salon onboarding should use salon role');
});

test('Middleware protects onboarding routes', async () => {
  const file = require('fs').readFileSync('middleware.ts', 'utf8');
  
  assert.ok(/protectedPrefixes.*onboarding/.test(file), 'Middleware should protect onboarding routes');
});

test('Workspace routes require correct roles', async () => {
  const file = require('fs').readFileSync('middleware.ts', 'utf8');
  
  assert.ok(/roles\?\.includes\('professional'\)/.test(file), 'Professional workspace requires professional role');
  assert.ok(/roles\?\.includes\('salon'\)/.test(file), 'Salon workspace requires salon role');
});

test('Client interests API validates against allowed list', async () => {
  const file = require('fs').readFileSync('app/api/onboarding/client-interests/route.ts', 'utf8');
  
  assert.ok(/validInterestsSet\.has/.test(file), 'Should validate against allowed interests');
  assert.ok(/invalidInterests.*join/.test(file), 'Should report invalid interests');
});

test('WorkspaceManagement redirects to application status on submission', async () => {
  const file = require('fs').readFileSync('components/workspace-management.tsx', 'utf8');
  
  assert.ok(/location\.assign\(["']\/workspace\/application\?role=/.test(file), 'Should redirect to application status page');
  assert.ok(/status=pending/.test(file), 'Should include status=pending in redirect');
});

test('WorkspaceManagement does not redirect to workspace on application submission', async () => {
  const file = require('fs').readFileSync('components/workspace-management.tsx', 'utf8');
  
  assert.ok(!/location\.assign\(.*workspace\/(professional|salon)/.test(file), 'Should not redirect to workspace on application submission');
});

test('Application status page reads from API, not URL params', async () => {
  const file = require('fs').readFileSync('app/workspace/application/page.tsx', 'utf8');
  
  assert.ok(/fetch\(["']\/api\/workspaces/.test(file), 'Should fetch applications from API');
  assert.ok(!/searchParams\.get\(["']status["']\)/.test(file), 'Should not read status from URL params for display');
});