/**
 * usePermissions.ts — Role-based permission gating.
 *
 * Reads role_permissions for the current user's role. `owner` has all
 * permissions. Other admin-level roles (project_manager, hr, accounts)
 * see only the modules their permissions grant.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

export type PermissionKey =
  | 'projects' | 'tasks' | 'dpr_approvals' | 'materials' | 'clients'
  | 'employees' | 'attendance' | 'leave_approvals' | 'advance_approvals'
  | 'muster_export' | 'payments' | 'salary' | 'advances' | 'excel_export'
  | 'documents' | 'analytics' | 'settings';

export function usePermissions() {
  const profile = useAuthStore((s) => s.profile);
  const query = useQuery({
    queryKey: ['role_permissions', profile?.role],
    queryFn: async (): Promise<Record<string, boolean>> => {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('permissions')
        .eq('role', profile!.role)
        .maybeSingle();
      if (error) throw error;
      return (data?.permissions as Record<string, boolean>) || {};
    },
    enabled: !!profile?.role,
    staleTime: 5 * 60 * 1000,
  });

  const permissions = query.data || {};
  const isOwner = profile?.role === 'owner' || permissions.all === true;

  /** Whether the current user can access a module. Defaults to owner-only when unset. */
  const can = (key: PermissionKey | string): boolean => {
    if (isOwner) return true;
    return permissions[key] === true;
  };

  return { can, isOwner, permissions, isLoading: query.isLoading, role: profile?.role };
}
