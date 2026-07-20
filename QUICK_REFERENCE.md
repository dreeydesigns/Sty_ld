# Multi-Role Admin - Quick Reference Card

## 🔑 Account Credentials (Copy & Paste)

```
Username:  Wanjiku
Email:     dreeydesigns@gmail.com
Phone:     +254743817931
Password:  Mobisa123
Passcode:  123456
Roles:     client, professional, salon, admin, super_admin
```

---

## 🚀 Quick API Commands

### 1. Check Setup Status
```bash
curl http://localhost:3000/api/setup/init-admin
```

### 2. Initialize System (DEV ONLY)
```bash
curl -X POST http://localhost:3000/api/setup/init-admin
```

### 3. Login Without Role Selection
```bash
curl -X POST http://localhost:3000/api/auth/signin-multi-role \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+254743817931",
    "password": "Mobisa123"
  }'
```

### 4. Login With Specific Role
```bash
curl -X POST http://localhost:3000/api/auth/signin-multi-role \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+254743817931",
    "password": "Mobisa123",
    "assumedRole": "admin"
  }'
```

### 5. Get Current Session
```bash
curl http://localhost:3000/api/auth/session
```

### 6. Switch Role
```bash
curl -X POST http://localhost:3000/api/auth/session \
  -H "Content-Type: application/json" \
  -d '{ "newRole": "client" }'
```

---

## 🗂️ File Locations

| What | Where |
|------|-------|
| Database schema | `sql/add-user-roles.sql` |
| Auth logic | `lib/auth-multi-role.ts` |
| Login API | `app/api/auth/signin-multi-role/route.ts` |
| Session API | `app/api/auth/session/route.ts` |
| Setup API | `app/api/setup/init-admin/route.ts` |
| React hook | `lib/hooks/useMultiRoleAuth.tsx` |
| Middleware utils | `lib/middleware-multi-role.ts` |
| Test scenarios | `lib/test-multi-role-scenarios.ts` |
| Full docs | `ADMIN_ACCOUNT_SETUP.md` |
| Quick start | `IMPLEMENTATION_QUICK_START.md` |
| This file | `QUICK_REFERENCE.md` |

---

## 🧩 Integration Steps

### In Your Signin Component
```typescript
import { useMultiRoleAuth } from '@/lib/hooks/useMultiRoleAuth';

export function LoginForm() {
  const { signIn, error, loading } = useMultiRoleAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = await signIn(phone, password);
    
    if (result.user?.available_roles.length > 1) {
      // Show role picker
      return <RolePickerScreen />;
    }
  }
  
  return (
    <form onSubmit={handleSubmit}>
      {/* form inputs */}
    </form>
  );
}
```

### In Your Middleware
```typescript
import { hasRole } from '@/lib/middleware-multi-role';

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/admin')) {
    const isAdmin = await hasRole(req, 'admin');
    if (!isAdmin) {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }
  }
  return NextResponse.next();
}
```

### In Your Protected Routes
```typescript
import { hasRole } from '@/lib/middleware-multi-role';

export async function GET(req: NextRequest) {
  const isAdmin = await hasRole(req, 'admin');
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  // Your route logic
}
```

---

## 🧪 Testing Checklist

- [ ] Can reach `/api/setup/init-admin` (GET)
- [ ] Can initialize system (POST)
- [ ] Wanjiku account exists in database
- [ ] Can login with phone + password
- [ ] Get available_roles array (5 roles)
- [ ] Can login with assumedRole
- [ ] Session cookie is set
- [ ] GET /api/auth/session returns assumed_role
- [ ] Can switch roles with POST /api/auth/session
- [ ] Multiple devices stay independent
- [ ] Regular users still work normally

---

## 🐛 Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| "Setup endpoints disabled" | Add to `.env.local`: `NODE_ENV=development` |
| "User not found" | Run POST /api/setup/init-admin |
| "Invalid role" | Role not in available_roles - check user_roles table |
| "Session not found" | Delete browser cookies and login again |
| "User does not have access" | User not assigned role in user_roles table |

---

## 📊 Database Quick Checks

### Verify Admin Account
```sql
SELECT id, first_name, email, phone, is_universal_admin 
FROM users 
WHERE phone = '+254743817931';
```

### See Admin's Roles
```sql
SELECT ur.role, ur.assigned_at
FROM user_roles ur
JOIN users u ON ur.user_id = u.id
WHERE u.phone = '+254743817931'
ORDER BY ur.role;
```

### Check Active Sessions
```sql
SELECT s.id, s.assumed_role, s.device_name, s.created_at
FROM sessions s
JOIN users u ON s.user_id = u.id
WHERE u.phone = '+254743817931'
ORDER BY s.created_at DESC;
```

### Clear All Sessions (CAUTION!)
```sql
DELETE FROM sessions 
WHERE user_id = (SELECT id FROM users WHERE phone = '+254743817931');
```

---

## 🎯 Key Features

| Feature | Status | Usage |
|---------|--------|-------|
| Multi-role account | ✅ | Wanjiku only |
| Role selection on login | ✅ | POST signin-multi-role |
| Role switching in session | ✅ | POST /api/auth/session |
| Multi-device support | ✅ | Each device independent |
| Permission checks | ✅ | Use hasRole() middleware |
| Regular user auth | ✅ | Unaffected |

---

## 🔄 Typical Workflow

```
1. User opens app
2. Clicks "Login"
3. Enters: +254743817931 + Mobisa123
4. System returns 5 available roles
5. User selects role (e.g., "admin")
6. Session created with assumed_role="admin"
7. Redirected to admin dashboard
8. Later: POST /api/auth/session { newRole: "client" }
9. Session now has assumed_role="client"
10. Dashboard re-renders as client view
```

---

## 💡 Pro Tips

1. **First time setup?** Run POST /api/setup/init-admin
2. **Multiple browsers?** Each can have different role
3. **Want to test all roles?** Use same account, different devices
4. **Switching roles?** No refresh needed, just API call
5. **Need to logout?** Existing signout works normally

---

## 🔐 Security Reminders

- 🚫 `/api/setup/init-admin` only works in development
- 🚫 Wanjiku account is for demos/testing only
- 🚫 Regular users cannot access multi-role features
- 🚫 Each session tracked with assumed_role
- ✅ Permission checks still enforced
- ✅ No credentials bypassed

---

## 📞 Need Help?

1. Read: `ADMIN_ACCOUNT_SETUP.md` (comprehensive)
2. Check: `IMPLEMENTATION_QUICK_START.md` (step-by-step)
3. Review: `lib/test-multi-role-scenarios.ts` (examples)
4. Query: Database checks above

---

**Ready?** Start with: `curl -X POST http://localhost:3000/api/setup/init-admin`
