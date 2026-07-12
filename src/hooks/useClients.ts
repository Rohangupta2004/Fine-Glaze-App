/**
 * useClients.ts — Client management (admin)
 *
 * Client orgs + client user accounts + project links.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { Profile, Project } from '../types';

export interface ClientOrg {
  id: string;
  company_id: string;
  name: string;
  contact_name: string | null;
  contact_phone: string | null;
  created_at: string;
}

export interface ClientOrgFull extends ClientOrg {
  users: Profile[];
  projects: Project[];
}

/** All client orgs with their users and linked projects. */
export function useClientOrgs() {
  return useQuery({
    queryKey: ['client_orgs'],
    queryFn: async (): Promise<ClientOrgFull[]> => {
      const [orgsRes, usersRes, projectsRes] = await Promise.all([
        supabase.from('client_orgs').select('*').order('name'),
        supabase.from('profiles').select('*').eq('role', 'client'),
        supabase.from('projects').select('*').not('client_org_id', 'is', null),
      ]);
      if (orgsRes.error) throw orgsRes.error;
      if (usersRes.error) throw usersRes.error;
      if (projectsRes.error) throw projectsRes.error;
      const users = (usersRes.data || []) as Profile[];
      const projects = (projectsRes.data || []) as Project[];
      return ((orgsRes.data || []) as ClientOrg[]).map((org) => ({
        ...org,
        users: users.filter((u) => u.client_org_id === org.id),
        projects: projects.filter((p) => p.client_org_id === org.id),
      }));
    },
  });
}

/** Create a client organisation. */
export function useCreateClientOrg() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { name: string; contact_name?: string; contact_phone?: string }) => {
      const companyId = useAuthStore.getState().profile?.company_id;
      if (!companyId) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('client_orgs')
        .insert({
          company_id: companyId,
          name: params.name.trim(),
          contact_name: params.contact_name?.trim() || null,
          contact_phone: params.contact_phone?.trim() || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as ClientOrg;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client_orgs'] }),
  });
}

/** Update a client organisation. */
export function useUpdateClientOrg() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ClientOrg> }) => {
      const { error } = await supabase.from('client_orgs').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client_orgs'] }),
  });
}

/** Link / unlink a project to a client org. */
export function useSetProjectClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, clientOrgId }: { projectId: string; clientOrgId: string | null }) => {
      const { error } = await supabase
        .from('projects')
        .update({ client_org_id: clientOrgId })
        .eq('id', projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client_orgs'] });
      qc.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

/**
 * Create a client user account via the secure `create-user` Edge Function.
 * Returns the generated temp password (show once to admin).
 */
export function useCreateClientUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      full_name: string;
      phone: string;
      client_org_id: string;
    }): Promise<{ user_id: string; temp_password: string }> => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Not authenticated');
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: { ...params, role: 'client' },
        headers: { Authorization: `Bearer ${token}` },
      });
      if (error) throw new Error(error.message || 'Failed to create client user');
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client_orgs'] });
      qc.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}
