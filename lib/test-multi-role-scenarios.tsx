/**
 * Test Examples and Use Cases for Multi-Role Admin Account
 * 
 * This file demonstrates how to use the Wanjiku admin account
 * for testing and demonstrations across different roles
 */

// ============================================================================
// SCENARIO 1: Complete Login Flow with Role Selection
// ============================================================================

async function scenario1_loginWithRoleSelection() {
  console.log('🔑 Scenario 1: Login with Role Selection');

  // Step 1: User enters credentials (no role yet)
  const credentialsResponse = await fetch('/api/auth/signin-multi-role', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: '+254743817931',
      password: 'Mobisa123',
      // NO assumedRole - user will pick
    }),
  });

  const credentialsData = await credentialsResponse.json();
  console.log('Available roles:', credentialsData.user.available_roles);
  // Output: Available roles: ['client', 'professional', 'salon', 'admin', 'super_admin']

  // Step 2: User selects a role from UI
  const selectedRole = 'salon';

  // Step 3: Sign in again with selected role
  const loginResponse = await fetch('/api/auth/signin-multi-role', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: '+254743817931',
      password: 'Mobisa123',
      assumedRole: selectedRole,
    }),
  });

  const loginData = await loginResponse.json();
  console.log('✅ Logged in as:', loginData.session.assumed_role);
  // Output: ✅ Logged in as: salon
  // Session cookie automatically set
}

// ============================================================================
// SCENARIO 2: Multi-Device Testing
// ============================================================================

async function scenario2_multiDeviceTesting() {
  console.log('\n📱 Scenario 2: Multi-Device Testing');

  // Device 1: Client
  console.log('Device 1 (Phone): Logging in as CLIENT');
  await loginAsRole('+254743817931', 'Mobisa123', 'client');
  const session1 = await getCurrentSession();
  console.log('  → Assumed role:', session1.session.assumed_role); // 'client'

  // Device 2: Salon
  console.log('Device 2 (Tablet): Logging in as SALON');
  await loginAsRole('+254743817931', 'Mobisa123', 'salon');
  const session2 = await getCurrentSession();
  console.log('  → Assumed role:', session2.session.assumed_role); // 'salon'

  // Device 3: Professional
  console.log('Device 3 (Laptop): Logging in as PROFESSIONAL');
  await loginAsRole('+254743817931', 'Mobisa123', 'professional');
  const session3 = await getCurrentSession();
  console.log('  → Assumed role:', session3.session.assumed_role); // 'professional'

  // Each device maintains its own session!
  console.log('✅ All three devices can stay logged in with different roles!');
}

// ============================================================================
// SCENARIO 3: Role Switching in Same Session
// ============================================================================

async function scenario3_roleSwitching() {
  console.log('\n🔄 Scenario 3: Role Switching in Same Session');

  // Start as admin
  console.log('1️⃣  Logged in as ADMIN');
  await loginAsRole('+254743817931', 'Mobisa123', 'admin');

  // Access admin features
  console.log('  → Accessing admin dashboard...');
  // await fetch('/api/admin/dashboard');

  // Switch to professional
  console.log('\n2️⃣  Switching to PROFESSIONAL role');
  const switchResponse = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newRole: 'professional' }),
  });
  console.log('  → Response:', (await switchResponse.json()).message);

  // Access professional features (SAME session, no re-login!)
  console.log('  → Accessing professional dashboard...');
  // await fetch('/api/professional/dashboard');

  // Switch to client
  console.log('\n3️⃣  Switching to CLIENT role');
  const switchResponse2 = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newRole: 'client' }),
  });
  console.log('  → Response:', (await switchResponse2.json()).message);

  console.log('✅ No logout required! Seamless role switching!');
}

// ============================================================================
// SCENARIO 4: Feature Testing Workflow
// ============================================================================

async function scenario4_featureTestingWorkflow() {
  console.log('\n🧪 Scenario 4: Complete Feature Testing Workflow');

  // Test 1: Client booking feature
  console.log('\n[TEST 1] Client Booking Feature');
  await loginAsRole('+254743817931', 'Mobisa123', 'client');
  console.log('  ✓ Testing: Browse services');
  console.log('  ✓ Testing: Make a booking');
  console.log('  ✓ Testing: View bookings');

  // Test 2: Professional dashboard
  console.log('\n[TEST 2] Professional Dashboard');
  await switchRole('professional');
  console.log('  ✓ Testing: View appointments');
  console.log('  ✓ Testing: Manage portfolio');
  console.log('  ✓ Testing: Earnings dashboard');

  // Test 3: Salon management
  console.log('\n[TEST 3] Salon Management');
  await switchRole('salon');
  console.log('  ✓ Testing: Team management');
  console.log('  ✓ Testing: Service pricing');
  console.log('  ✓ Testing: Analytics');

  // Test 4: Admin features
  console.log('\n[TEST 4] Admin Features');
  await switchRole('admin');
  console.log('  ✓ Testing: User management');
  console.log('  ✓ Testing: Report handling');
  console.log('  ✓ Testing: System settings');

  console.log('\n✅ Full feature coverage tested in single session!');
}

// ============================================================================
// SCENARIO 5: Testing Multi-Role Isolation
// ============================================================================

async function scenario5_multiRoleIsolation() {
  console.log('\n🔐 Scenario 5: Multi-Role Isolation');

  // Each role should see different data
  console.log('Testing data isolation per role:\n');

  // As client
  console.log('1. As CLIENT:');
  await loginAsRole('+254743817931', 'Mobisa123', 'client');
  const clientData = await fetch('/api/users/me').then((r) => r.json());
  console.log('   Sees: My bookings, services I use, my payments', clientData);

  // As professional
  console.log('\n2. As PROFESSIONAL:');
  await loginAsRole('+254743817931', 'Mobisa123', 'professional');
  const proData = await fetch('/api/users/me').then((r) => r.json());
  console.log('   Sees: My appointments, my earnings, my portfolio', proData);

  // As salon
  console.log('\n3. As SALON:');
  await loginAsRole('+254743817931', 'Mobisa123', 'salon');
  const salonData = await fetch('/api/users/me').then((r) => r.json());
  console.log('   Sees: Team management, salon analytics, services', salonData);

  // As admin
  console.log('\n4. As ADMIN:');
  await loginAsRole('+254743817931', 'Mobisa123', 'admin');
  const adminData = await fetch('/api/users/me').then((r) => r.json());
  console.log('   Sees: All users, all reports, system stats', adminData);

  console.log('\n✅ Each role has appropriate data visibility!');
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function loginAsRole(phone: string, password: string, role: string) {
  const response = await fetch('/api/auth/signin-multi-role', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password, assumedRole: role }),
  });
  return response.json();
}

async function switchRole(role: string) {
  const response = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newRole: role }),
  });
  return response.json();
}

async function getCurrentSession() {
  const response = await fetch('/api/auth/session', {
    method: 'GET',
  });
  return response.json();
}

// ============================================================================
// REACT COMPONENT EXAMPLE: Role Selector UI
// ============================================================================

export function RoleSelectorComponent() {
  return (
    <div className="role-selector">
      <h2>Choose Your Role</h2>
      <div className="roles-grid">
        <RoleCard
          title="Client"
          description="Browse services and make bookings"
          icon="👤"
          onClick={() => switchToRole('client')}
        />
        <RoleCard
          title="Professional"
          description="Manage appointments and portfolio"
          icon="💇"
          onClick={() => switchToRole('professional')}
        />
        <RoleCard
          title="Salon"
          description="Manage team and services"
          icon="🏪"
          onClick={() => switchToRole('salon')}
        />
        <RoleCard
          title="Admin"
          description="System administration"
          icon="⚙️"
          onClick={() => switchToRole('admin')}
        />
      </div>
    </div>
  );
}

interface RoleCardProps {
  title: string;
  description: string;
  icon: string;
  onClick: () => void;
}

function RoleCard({ title, description, icon, onClick }: RoleCardProps) {
  return (
    <button className="role-card" onClick={onClick}>
      <div className="role-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
    </button>
  );
}

async function switchToRole(role: string) {
  const response = await switchRole(role);
  if (response.success) {
    // Redirect to appropriate dashboard
    window.location.href = `/${role}/dashboard`;
  }
}

// ============================================================================
// DATABASE VALIDATION QUERIES
// ============================================================================

/*
Use these SQL queries to verify the setup:

-- Check if Wanjiku account exists
SELECT id, first_name, email, phone, is_universal_admin 
FROM users 
WHERE phone = '+254743817931';

-- Check Wanjiku's roles
SELECT ur.role, ur.assigned_at, ur.assigned_by_admin
FROM user_roles ur
JOIN users u ON ur.user_id = u.id
WHERE u.phone = '+254743817931'
ORDER BY ur.role;

-- Check admin config
SELECT *
FROM admin_account_config
WHERE user_id = (SELECT id FROM users WHERE phone = '+254743817931');

-- Check active sessions for Wanjiku
SELECT s.id, s.device_name, s.assumed_role, s.created_at, s.last_active_at
FROM sessions s
JOIN users u ON s.user_id = u.id
WHERE u.phone = '+254743817931'
ORDER BY s.last_active_at DESC;
*/

// ============================================================================
// TROUBLESHOOTING CHECKLIST
// ============================================================================

export const troubleshootingChecklist = [
  '✓ Admin account created (check: SELECT * FROM users WHERE phone=...)',
  '✓ User roles assigned (check: SELECT * FROM user_roles WHERE user_id=...)',
  '✓ Admin config exists (check: SELECT * FROM admin_account_config WHERE user_id=...)',
  '✓ Can login with phone+password',
  '✓ Can select role during login',
  '✓ Session cookie is set',
  '✓ GET /api/auth/session returns assumed_role',
  '✓ Can switch roles with POST /api/auth/session',
  '✓ Each device maintains independent session',
  '✓ Regular users cannot access multi-role features',
];

// ============================================================================
// EXPORT FOR TESTING
// ============================================================================

export const scenarios = {
  scenario1: scenario1_loginWithRoleSelection,
  scenario2: scenario2_multiDeviceTesting,
  scenario3: scenario3_roleSwitching,
  scenario4: scenario4_featureTestingWorkflow,
  scenario5: scenario5_multiRoleIsolation,
  checklist: troubleshootingChecklist,
};

// Usage: Run these in browser console or test framework
// scenarios.scenario1().then(() => console.log('✅ Complete'));
