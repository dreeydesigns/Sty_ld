/**
 * Frontend utilities for multi-role authentication
 * Use these hooks and functions in React components
 */

'use client';

import { useState, useCallback } from 'react';

interface UserWithRoles {
  id: string;
  first_name: string;
  email: string;
  phone: string;
  current_role: string;
  available_roles: string[];
  is_universal_admin: boolean;
}

interface SignInResponse {
  success: boolean;
  user: UserWithRoles;
  session?: {
    assumed_role: string;
    available_roles: string[];
  };
  message?: string;
  error?: string;
}

interface CurrentSessionResponse {
  success: boolean;
  session?: {
    user_id: string;
    assumed_role: string;
    user: Partial<UserWithRoles>;
    available_roles: string[];
  };
  error?: string;
}

/**
 * Hook for multi-role authentication
 */
export function useMultiRoleAuth() {
  const [user, setUser] = useState<UserWithRoles | null>(null);
  const [assumedRole, setAssumedRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = useCallback(async (phone: string, password: string, assumedRole?: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/signin-multi-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          password,
          assumedRole,
        }),
      });

      const data: SignInResponse = await response.json();

      if (!data.success) {
        setError(data.error || 'Sign in failed');
        return { success: false, error: data.error };
      }

      setUser(data.user);
      if (data.session) {
        setAssumedRole(data.session.assumed_role);
      }

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  const switchRole = useCallback(async (newRole: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newRole }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to switch role');
        return { success: false, error: data.error };
      }

      setAssumedRole(newRole);
      return { success: true, new_role: newRole };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  const getCurrentSession = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session', {
        method: 'GET',
      });

      const data: CurrentSessionResponse = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to get session');
        return null;
      }

      if (data.session) {
        setAssumedRole(data.session.assumed_role);
      }

      return data.session;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    }
  }, []);

  return {
    user,
    assumedRole,
    loading,
    error,
    signIn,
    switchRole,
    getCurrentSession,
  };
}

/**
 * Component for role selection
 */
export interface RolePickerProps {
  user: UserWithRoles;
  onRoleSelect: (role: string) => Promise<void>;
  loading?: boolean;
}

export function MultiRoleRolePicker({ user, onRoleSelect, loading = false }: RolePickerProps) {
  const [selectedRole, setSelectedRole] = useState<string | null>(user.current_role);

  const handleSelect = async (role: string) => {
    setSelectedRole(role);
    await onRoleSelect(role);
  };

  if (!user.is_universal_admin || user.available_roles.length <= 1) {
    return null; // Not a multi-role account
  }

  return (
    <div className="role-picker">
      <h3>Select Your Role</h3>
      <div className="role-options">
        {user.available_roles.map((role) => (
          <button
            key={role}
            onClick={() => handleSelect(role)}
            disabled={loading}
            className={`role-button ${selectedRole === role ? 'active' : ''}`}
          >
            {role.charAt(0).toUpperCase() + role.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Context provider for multi-role auth
 */
import React, { ReactNode } from 'react';

interface MultiRoleAuthContextType {
  user: UserWithRoles | null;
  assumedRole: string | null;
  loading: boolean;
  error: string | null;
  signIn: (phone: string, password: string, assumedRole?: string) => Promise<unknown>;
  switchRole: (newRole: string) => Promise<unknown>;
  getCurrentSession: () => Promise<unknown>;
}

export const MultiRoleAuthContext = React.createContext<MultiRoleAuthContextType | null>(null);

export function MultiRoleAuthProvider({ children }: { children: ReactNode }) {
  const auth = useMultiRoleAuth();

  return (
    <MultiRoleAuthContext.Provider value={auth}>
      {children}
    </MultiRoleAuthContext.Provider>
  );
}

export function useMultiRoleAuthContext() {
  const context = React.useContext(MultiRoleAuthContext);
  if (!context) {
    throw new Error('useMultiRoleAuthContext must be used within MultiRoleAuthProvider');
  }
  return context;
}
