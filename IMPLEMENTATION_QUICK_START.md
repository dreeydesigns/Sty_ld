# Multi-Role Admin Account - Implementation Guide

## Quick Start

### 1. Initialize the System

**Option A: Using the API (Easiest)**

```bash
# Check setup status
curl http://localhost:3000/api/setup/init-admin

# Run initialization
curl -X POST http://localhost:3000/api/setup/init-admin
```

**Option B: Manual Database**

```bash
# Run the SQL migration
cat sql/add-user-roles.sql | psql $DATABASE_URL

# Then seed the account (from Node.js context)
npm run db:seed
```

### 2. Test the Account

```bash
# Test login as admin role
curl -X POST http://localhost:3000/api/auth/signin-multi-role \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+254743817931",
    "password": "Mobisa123",
    "assumedRole": "admin"
  }'

# Response includes session cookie + assumed_role
```

### 3. Use in Frontend

```typescript
// pages/login.tsx
'use client';
import { useMultiRoleAuth } from '@/lib/hooks/useMultiRoleAuth';

export default function LoginPage() {
  const { signIn, user, assumedRole, error } = useMultiRoleAuth();

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // First, just verify credentials (get available roles)
    const result = await signIn(
      formData.get('phone') as string,
      formData.get('password') as string
      // No assumedRole yet - let user choose
    );

    if (result.success && user?.available_roles.length > 1) {
      // Show role picker for multi-role accounts
      return <RolePickerScreen user={user} />;
    }
  }

  return (
    <form onSubmit={handleLogin}>
      <input name="phone" type="tel" placeholder="+254 7xx xxx xxx" required />
      <input name="password" type="password" placeholder="Password" required />
      <button type="submit">Login</button>
    </form>
  );
}
```

## Account Details

```
┌─────────────────────┬──────────────────────────────┐
│ Field               │ Value                        │
├─────────────────────┼──────────────────────────────┤
│ Username            │ Wanjiku                      │
│ Email               │ dreeydesigns@gmail.com       │
│ Phone               │ +254 743817931               │
│ Password            │ Mobisa123                    │
│ Passcode (OTP)      │ 123456                       │
│ Available Roles     │ client, professional        │
│                     │ salon, admin, super_admin   │
│ Multi-Device        │ ✅ Yes (different roles)    │
│ Role Switching      │ ✅ Yes (in same session)    │
└─────────────────────┴──────────────────────────────┘
```

## User Stories & Testing

### Story 1: Comprehensive Feature Testing
```
1. Start Day: Log in as "admin" on desktop
   - Access admin dashboard
   - Review reports
   - Manage system settings

2. Mid-Day: Switch to "salon" role in same session
   - Test salon dashboard features
   - View salon analytics
   - Don't need to log out

3. Afternoon: Log in as "client" on mobile
   - Test client booking flow
   - Browse services
   - Each device keeps its own role
```

### Story 2: Cross-Device Demos
```
Device 1 (Laptop):
  → Logged in as "salon"
  
Device 2 (Tablet):
  → Logged in as "professional"
  
Device 3 (Phone):
  → Logged in as "client"
  
All simultaneously without conflicts!
```

### Story 3: Role Verification
```
1. POST /api/auth/signin-multi-role (no role specified)
   Response: Returns available_roles array

2. User sees role picker UI

3. User selects "salon"
   → New session created with assumed_role="salon"
   → Cookie set with session token
   → Redirected to salon dashboard

4. Later: POST /api/auth/session 
         { newRole: "professional" }
   → Same session now assumes "professional"
   → No logout needed
```

## API Reference

### Sign In (Multi-Role)
```
POST /api/auth/signin-multi-role

# Without role (get options)
{
  "phone": "+254743817931",
  "password": "Mobisa123"
}
→ Returns user + available_roles

# With role (create session immediately)
{
  "phone": "+254743817931",
  "password": "Mobisa123",
  "assumedRole": "admin"
}
→ Returns session cookie + assumed_role
```

### Get Current Session
```
GET /api/auth/session
→ Returns: user_id, assumed_role, available_roles
```

### Switch Role
```
POST /api/auth/session
{
  "newRole": "professional"
}
→ Switches role in current session
```

## Database Schema

```sql
-- New tables
user_roles
├─ id (UUID PK)
├─ user_id (UUID FK to users)
├─ role (VARCHAR)
├─ assigned_at (TIMESTAMP)
└─ assigned_by_admin (BOOLEAN)

admin_account_config
├─ id (UUID PK)
├─ user_id (UUID FK to users, UNIQUE)
├─ is_universal_admin (BOOLEAN)
├─ can_assume_roles (BOOLEAN)
├─ description (VARCHAR)
└─ created_at (TIMESTAMP)

-- Modified tables
users (+columns):
├─ passcode (VARCHAR) → "123456"
├─ is_universal_admin (BOOLEAN) → true for Wanjiku

sessions (+columns):
└─ assumed_role (VARCHAR) → tracks which role in this session
```

## Security Considerations

### What This System Does:
✅ Allows one special account (Wanjiku) to test all roles  
✅ Maintains session isolation per device  
✅ Tracks which role per session  
✅ Supports role switching within same session  

### What It Does NOT Do:
❌ Does NOT affect regular user authentication  
❌ Does NOT allow regular users to have multiple roles  
❌ Does NOT create credential-free access  
❌ Does NOT bypass permission checks  

### Before Production:
1. Remove or password-protect `/api/setup/init-admin`
2. Change the test credentials
3. Add audit logging for admin role switches
4. Consider implementing 2FA for admin account

## Troubleshooting

### Issue: "User does not have access to role"
```
Cause: Trying to use a role not assigned to user
Fix: Check user_roles table - role must exist in table
```

### Issue: Session not maintaining role
```
Cause: Middleware checking users.role instead of sessions.assumed_role
Fix: Update middleware to check assumed_role from session
```

### Issue: Can't switch roles
```
Cause: User not marked as is_universal_admin
Fix: Update users table: UPDATE users SET is_universal_admin=true WHERE id=...
```

### Issue: Multiple login attempts creating multiple sessions
```
Cause: Not deleting old sessions when user logs back in
Fix: Call deleteOtherSessions or deleteOtherDeviceSessions on login
```

## Files Created/Modified

### New Files
- `sql/add-user-roles.sql` - Database schema
- `lib/seed-admin.ts` - Seed script
- `lib/auth-multi-role.ts` - Core multi-role logic
- `app/api/auth/signin-multi-role/route.ts` - Login endpoint
- `app/api/auth/session/route.ts` - Session management
- `app/api/setup/init-admin/route.ts` - Setup endpoint
- `lib/hooks/useMultiRoleAuth.tsx` - React hooks
- `ADMIN_ACCOUNT_SETUP.md` - Detailed documentation

### Next Steps
1. ✅ Files created - review if needed
2. ⏳ Run `POST /api/setup/init-admin`
3. ⏳ Update frontend signin flow to support role selection
4. ⏳ Update middleware to check `assumed_role` from sessions
5. ⏳ Test with Wanjiku account across multiple devices

## Testing Checklist

- [ ] POST /api/setup/init-admin returns success
- [ ] GET /api/setup/init-admin shows admin account exists
- [ ] Login with phone +254743817931 and password Mobisa123
- [ ] Available roles include all 5 roles
- [ ] Can login with specific role (assumedRole: "admin")
- [ ] Can call GET /api/auth/session and see assumed_role
- [ ] Can switch roles with POST /api/auth/session
- [ ] Each device maintains independent role
- [ ] Regular user accounts still work normally
- [ ] Regular users can't assume multiple roles

## Questions?

Refer to `ADMIN_ACCOUNT_SETUP.md` for comprehensive documentation.
