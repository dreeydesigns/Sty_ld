# Multi-Role Admin Account Setup Guide

## Overview

The Mobile Salon system now supports a special **universal admin account (Wanjiku)** that can assume multiple roles (client, salon, professional, admin, super_admin) across different devices and sessions. This is used exclusively for testing, demonstrations, and system validation.

## Admin Account Credentials

| Field | Value |
|-------|-------|
| **Username** | Wanjiku |
| **Email** | dreeydesigns@gmail.com |
| **Phone** | +254 743817931 |
| **Password** | Mobisa123 |
| **Passcode/OTP** | 123456 |
| **Available Roles** | client, professional, salon, admin, super_admin |

## Features

### 1. **Multi-Role Support**
The Wanjiku account can simultaneously:
- Log in as a **client** on one device
- Log in as a **salon** on another device  
- Log in as a **professional** on a third device
- Each session maintains its own role independently

### 2. **Role Switching Within Session**
Once logged in, can switch roles within the same session via:
```
POST /api/auth/switch-role
Body: { newRole: "salon" }
```

### 3. **Device-Specific Sessions**
- Each device/browser session maintains its own assumed role
- Other regular accounts can only maintain ONE session across all devices
- Only the Wanjiku admin account can have multiple concurrent sessions with different roles

## Database Schema Changes

### New Tables Created:

#### `user_roles` (Junction Table)
Enables users to have multiple roles:
```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  role VARCHAR(20) NOT NULL,
  assigned_at TIMESTAMP DEFAULT NOW(),
  assigned_by_admin BOOLEAN DEFAULT false,
  UNIQUE(user_id, role)
);
```

#### `admin_account_config`
Marks special admin accounts:
```sql
CREATE TABLE admin_account_config (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES users(id),
  is_universal_admin BOOLEAN DEFAULT true,
  can_assume_roles BOOLEAN DEFAULT true,
  description VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Table Modifications:

#### `users` table
New columns added:
- `passcode VARCHAR(10)` - For OTP/2FA (Wanjiku has "123456")
- `is_universal_admin BOOLEAN` - Marks universal admin accounts

#### `sessions` table
New column added:
- `assumed_role VARCHAR(20)` - Tracks which role the user is assuming in this session

## API Endpoints

### 1. Sign In (Multi-Role)
```
POST /api/auth/signin-multi-role

Request:
{
  "phone": "+254743817931",
  "password": "Mobisa123",
  "assumedRole": "salon"  // Optional - if provided, creates session with this role
}

Response (without assumedRole):
{
  "success": true,
  "user": {
    "id": "uuid",
    "first_name": "Wanjiku",
    "email": "dreeydesigns@gmail.com",
    "phone": "+254743817931",
    "current_role": "admin",
    "available_roles": ["client", "professional", "salon", "admin", "super_admin"],
    "is_universal_admin": true
  },
  "message": "Please select a role to proceed"
}

Response (with assumedRole):
{
  "success": true,
  "user": { ... },
  "session": {
    "assumed_role": "salon",
    "available_roles": ["client", "professional", "salon", "admin", "super_admin"]
  }
}
```

### 2. Get Current Session
```
GET /api/auth/session

Response:
{
  "success": true,
  "session": {
    "user_id": "uuid",
    "assumed_role": "salon",
    "user": {
      "id": "uuid",
      "first_name": "Wanjiku",
      "is_universal_admin": true
    },
    "available_roles": ["client", "professional", "salon", "admin", "super_admin"]
  }
}
```

### 3. Switch Role in Session
```
POST /api/auth/session

Request:
{
  "newRole": "client"
}

Response:
{
  "success": true,
  "message": "Role switched to client",
  "new_role": "client"
}
```

## Setup Instructions

### Step 1: Run Database Migrations
Execute the SQL migration to create new tables:
```bash
npm run db:migrate
# Or manually run: sql/add-user-roles.sql
```

### Step 2: Seed Admin Account
Add the admin account to the database:

**Option A: Using Node Script**
```bash
# Create a setup script
npx ts-node lib/seed-admin.ts
```

**Option B: From API Route**
Create a temporary setup endpoint:
```typescript
// app/api/setup/seed-admin/route.ts
import { seedAdminAccount } from '@/lib/seed-admin';

export async function POST() {
  try {
    const result = await seedAdminAccount();
    return Response.json({ success: true, ...result });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
```

Then call: `POST /api/setup/seed-admin`

### Step 3: Test the Account
```bash
# Test login
curl -X POST http://localhost:3000/api/auth/signin-multi-role \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+254743817931",
    "password": "Mobisa123",
    "assumedRole": "salon"
  }'

# Check session
curl -X GET http://localhost:3000/api/auth/session

# Switch role
curl -X POST http://localhost:3000/api/auth/session \
  -H "Content-Type: application/json" \
  -d '{ "newRole": "client" }'
```

## Usage Scenarios

### Scenario 1: Demo across multiple roles
```
1. Login with Wanjiku account as "client" → test client features on Phone A
2. Open different browser and login as "salon" → test salon features on Phone B  
3. Open third browser and login as "professional" → test professional features on Laptop
```

### Scenario 2: Switch roles in same session
```
1. Login as "salon" in browser
2. Test salon dashboard
3. Call POST /api/auth/session { newRole: "admin" }
4. Switch to admin panel without logging out
```

### Scenario 3: Session isolation
```
1. Each device maintains independent session
2. Switching role on Phone A doesn't affect session on Phone B
3. Only Wanjiku account supports this pattern
4. Regular accounts: logging into different role = logs out previous session
```

## Security Notes

⚠️ **Important**: This is a TEST ACCOUNT ONLY

1. **Never use in production** - This account bypasses normal role constraints
2. **Change credentials** before going live if accidentally deployed
3. **Passcode (123456)** is visible in code - meant for demo purposes only
4. **Regular accounts** continue to follow normal single-role, single-session rules
5. **Permission checks** - Always verify assumed_role in API endpoints

## Monitoring & Debugging

### Check all sessions for Wanjiku
```sql
SELECT 
  s.id,
  s.device_name,
  s.assumed_role,
  s.created_at,
  s.last_active_at
FROM sessions s
JOIN users u ON s.user_id = u.id
WHERE u.phone = '+254743817931'
ORDER BY s.last_active_at DESC;
```

### View user roles
```sql
SELECT ur.role, ur.assigned_at
FROM user_roles ur
JOIN users u ON ur.user_id = u.id
WHERE u.phone = '+254743817931'
ORDER BY ur.role;
```

### Clear test sessions
```sql
DELETE FROM sessions 
WHERE user_id = (SELECT id FROM users WHERE phone = '+254743817931');
```

## Integration with Existing Auth

The multi-role system is **additive** and doesn't break existing authentication:

1. **Old signin routes** still work - they use `verifyUserCredentials()` from auth-server.ts
2. **New signin route** at `/api/auth/signin-multi-role` provides role selection
3. **Regular users** automatically get their role from the `users.role` column
4. **Middleware** should check `assumed_role` from session if available, fall back to `users.role`

## Next Steps

1. Run the database migrations
2. Seed the admin account
3. Test login with provided credentials
4. Use Wanjiku account for cross-role testing and demonstrations
5. Update frontend to support role selection screen
