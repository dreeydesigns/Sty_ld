# Clerk Authentication Migration Plan

**Status:** APPROVED DIRECTION
**Priority:** P0 Security & Foundation
**Target:** Nairobi Pilot Launch

---

## Architecture Overview

### Split Responsibility Model

**Clerk handles:**
- Authentication (sign-in/sign-up)
- Session management
- Identity verification
- Secure auth cookies/tokens
- Password reset
- Multi-factor authentication
- User identity

**Styld database handles:**
- User profile information
- Role assignment (client, professional, salon, shop, delivery, admin)
- Business metadata (services, pricing, availability)
- Onboarding state
- Account status
- Styld-specific permissions
- Business rules and policies

### Identity Mapping

```
Clerk User ID ↔ Styld Database User
├── clerk_user_id (UUID) → External identifier
├── Internal Styld user_id → Primary database key
└── Stable mapping through clerk_users table
```

---

## Current Auth Flow Map

### Existing Custom Authentication
```
┌─────────────┐
│  User Input │
│ (phone/pass)│
└──────┬──────┘
       │
       ▼
┌─────────────────────────────┐
│ /api/auth/phone-signin     │ ← VULNERABLE - DISABLED
│ /api/auth/signin           │
│ /api/auth/signin-multi-role│
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│ Custom Auth Server         │
│ - verifyUserCredentials()   │
│ - createSession()           │
│ - Multi-role logic          │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│ Session Cookie              │
│ - session token             │
│ - user_id                   │
│ - assumed_role             │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│ Styld Database Users Table │
│ - Profile data              │
│ - Role assignment           │
└─────────────────────────────┘
```

### WhatsApp Verify Flow (Current)
```
┌─────────────┐
│ User Input  │
│ (phone)     │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────┐
│ /api/auth/whatsapp          │
│ - Twilio Verify integration │
│ - Phone verification        │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│ WhatsApp Challenge Table    │
│ - Verification tokens       │
│ - Attempt limiting          │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│ User Creation/Session       │
│ - Server-controlled roles   │
│ - Consent tracking          │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│ Session & Profile           │
└─────────────────────────────┘
```

---

## New Clerk Auth Flow Map

### Clerk Authentication Flow
```
┌─────────────┐
│ Clerk UI    │
│ (Sign In)   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────┐
│ Clerk Authentication        │
│ - Email/Phone/Social        │
│ - MFA support               │
│ - Session management        │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│ Clerk Session Token         │
│ - JWT token                 │
│ - Secure cookie             │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│ Clerk Middleware            │
│ - Token validation          │
│ - User extraction           │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│ Styld Auth Handler          │
│ - clerk_user_id mapping     │
│ - Role lookup               │
│ - Profile sync              │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│ Styld Database             │
│ - User profile              │
│ - Role assignment           │
│ - Business metadata         │
└─────────────────────────────┘
```

---

## Database Migration Changes

### New Tables

```sql
-- Clerk users mapping table
CREATE TABLE clerk_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  styld_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email TEXT,
  phone_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clerk_users_clerk_id ON clerk_users(clerk_user_id);
CREATE INDEX idx_clerk_users_styld_id ON clerk_users(styld_user_id);

-- Clerk webhooks table (for user events)
CREATE TABLE clerk_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  clerk_user_id TEXT,
  data JSONB,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Schema Updates

```sql
-- Add clerk integration fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_user_id TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'custom';
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_clerk BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified_clerk BOOLEAN DEFAULT false;

-- Add authentication tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_auth_method TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_auth_at TIMESTAMPTZ;
```

---

## Role/Permission Strategy

### Server-Side Role Control

```typescript
// Clerk role assignment strategy
const ROLE_ASSIGNMENT_STRATEGY = {
  // Default role for new users
  default: 'client',

  // Roles that require admin approval
  requiresApproval: ['professional', 'salon', 'shop', 'delivery'],

  // Roles that can be self-assigned during onboarding
  selfAssignable: ['client'],

  // Admin-only roles
  adminOnly: ['admin', 'super_admin'],

  // Role validation function
  validateRoleAssignment: (currentRole: string, newRole: string, isAdmin: boolean) => {
    if (ROLE_ASSIGNMENT_STRATEGY.adminOnly.includes(newRole)) {
      return isAdmin; // Only admins can assign admin roles
    }
    if (ROLE_ASSIGNMENT_STRATEGY.requiresApproval.includes(newRole)) {
      return isAdmin; // Provider roles require admin approval
    }
    return true; // Client role can be self-assigned
  }
};
```

### Permission Matrix

```typescript
const PERMISSIONS = {
  client: ['book_services', 'view_profiles', 'manage_own_profile'],
  professional: ['book_services', 'view_profiles', 'manage_own_profile', 'manage_services', 'manage_availability', 'view_bookings'],
  salon: ['book_services', 'view_profiles', 'manage_own_profile', 'manage_services', 'manage_availability', 'manage_team', 'view_bookings'],
  shop: ['manage_inventory', 'view_orders', 'manage_own_profile'],
  delivery: ['view_deliveries', 'manage_availability', 'manage_own_profile'],
  admin: ['all_permissions', 'manage_users', 'manage_roles', 'view_all_data'],
  super_admin: ['all_permissions', 'manage_admins', 'system_configuration']
};
```

---

## Migration Strategy

### Phase 1: Infrastructure Setup
1. Configure Clerk application for Styld
2. Set up Clerk SDK in Next.js
3. Create database migration scripts
4. Set up Clerk webhook endpoints
5. Configure Clerk middleware

### Phase 2: Data Migration
1. Create `clerk_users` mapping table
2. Migrate existing users to Clerk user IDs
3. Preserve existing role assignments
4. Maintain session continuity
5. Backup existing authentication data

### Phase 3: Authentication Integration
1. Implement Clerk authentication components
2. Create role synchronization logic
3. Set up session management
4. Implement permission checks
5. Test authentication flows

### Phase 4: Legacy Deprecation
1. Redirect legacy auth endpoints to Clerk
2. Disable custom authentication endpoints
3. Remove legacy authentication code
4. Update documentation
5. Monitor for authentication issues

---

## Rollback Plan

### Rollback Triggers
- Critical authentication failures
- Data corruption during migration
- Security vulnerabilities discovered
- Performance degradation
- User complaints exceeding threshold

### Rollback Steps
1. Re-enable legacy authentication endpoints
2. Switch database queries to use legacy user IDs
3. Restore from pre-migration backup
4. Revert middleware configuration
5. Notify users of authentication system changes

### Rollback Verification
- Test legacy authentication flows
- Verify data integrity
- Check session continuity
- Monitor error rates
- Validate user access

---

## Authentication Test Coverage

### Unit Tests
- Clerk user ID mapping logic
- Role assignment validation
- Permission checking functions
- Session management
- Token validation

### Integration Tests
- Clerk authentication flow
- Database synchronization
- Webhook processing
- Role updates
- Profile updates

### End-to-End Tests
- Complete sign-up flow
- Sign-in flow
- Role-based access control
- Session persistence
- Multi-device sessions

### Security Tests
- Token validation
- Permission escalation attempts
- Session hijacking prevention
- CSRF protection
- Rate limiting

---

## Implementation Checklist

### Configuration
- [ ] Clerk application configured
- [ ] Environment variables set
- [ ] Clerk SDK installed
- [ ] Middleware configured
- [ ] Webhook endpoints created

### Database
- [ ] Migration scripts created
- [ ] New tables created
- [ ] Indexes added
- [ ] Data migration completed
- [ ] Backups verified

### Authentication
- [ ] Clerk components integrated
- [ ] Role synchronization implemented
- [ ] Permission system deployed
- [ ] Session management working
- [ ] Legacy auth deprecated

### Testing
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Security tests passing
- [ ] Performance tests passing

### Documentation
- [ ] Architecture documented
- [ ] Migration guide created
- [ ] Rollback procedures documented
- [ ] Troubleshooting guide created
- [ ] API documentation updated

---

## Security Considerations

### Clerk Security Benefits
- Industry-standard authentication
- Regular security updates
- Compliance certifications (SOC2, GDPR)
- Built-in fraud detection
- Multi-factor authentication

### Styld Security Responsibilities
- Role assignment validation
- Permission enforcement
- Data protection
- Audit logging
- Security monitoring

### Migration Security
- Secure credential handling
- Encrypted data transfer
- Access controls during migration
- Verification of data integrity
- Monitoring for anomalies

---

## Performance Considerations

### Expected Performance Impact
- Authentication latency: +50-100ms (Clerk API calls)
- Database load: Minimal (additional joins for mapping)
- Session validation: Slightly increased (JWT verification)
- Overall impact: Acceptable for security benefits

### Optimization Strategies
- Caching of role permissions
- Lazy loading of user profiles
- Optimized database queries
- CDN for static assets
- Connection pooling

---

## Monitoring and Alerting

### Key Metrics
- Authentication success rate
- Authentication latency
- Failed authentication attempts
- Role assignment changes
- Session duration

### Alert Thresholds
- Authentication failure rate > 5%
- Authentication latency > 2s
- Failed attempts > 10 per minute
- Unauthorized role assignment attempts
- Database connection failures

---

## Timeline Estimate

### Phase 1: Infrastructure Setup (3-5 days)
- Clerk configuration: 1 day
- Database changes: 1 day
- SDK integration: 1 day
- Testing: 1-2 days

### Phase 2: Data Migration (2-3 days)
- Migration scripts: 1 day
- Data migration: 1 day
- Verification: 1 day

### Phase 3: Authentication Integration (5-7 days)
- Component integration: 2 days
- Role synchronization: 2 days
- Testing: 1-3 days

### Phase 4: Legacy Deprecation (2-3 days)
- Endpoint redirection: 1 day
- Code removal: 1 day
- Documentation: 1 day

**Total Estimated Time: 12-18 days**

---

## Success Criteria

### Technical Success
- All authentication flows work through Clerk
- Role assignments remain secure
- Data migration completes without data loss
- Performance impact is acceptable
- Security posture is improved

### Business Success
- User experience is maintained or improved
- Support burden is reduced
- Security compliance is achieved
- Scalability is improved
- Total cost of ownership is reduced

---

## Risks and Mitigations

### Technical Risks
- **Risk:** Migration data loss
  - **Mitigation:** Comprehensive backups, dry-run migrations, rollback plan

- **Risk:** Authentication downtime
  - **Mitigation:** Phased rollout, parallel operation, gradual cutover

- **Risk:** Performance degradation
  - **Mitigation:** Performance testing, optimization, monitoring

### Business Risks
- **Risk:** User confusion
  - **Mitigation:** Clear communication, training materials, support documentation

- **Risk:** Integration issues
  - **Mitigation:** Thorough testing, gradual rollout, monitoring

### Security Risks
- **Risk:** New vulnerabilities
  - **Mitigation:** Security review, penetration testing, monitoring

- **Risk:** Data exposure
  - **Mitigation:** Encryption, access controls, audit logging

---

## Next Steps

1. **Immediate:** Configure Clerk application
2. **Week 1:** Set up infrastructure and database changes
3. **Week 2:** Implement data migration
4. **Week 3:** Integrate Clerk authentication
5. **Week 4:** Testing and validation
6. **Week 5:** Legacy deprecation and monitoring

---

**Approval Required:** Database migration, production deployment, legacy endpoint deactivation
