import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Notification } from '../types';

/** Notifications for the current user. */
export function useNotifications(profileId: string | null | undefined, limit = 50) {
  return useQuery({
    queryKey: ['notifications', profileId, limit],
    queryFn: async (): Promise<Notification[]> => {
      if (!profileId) return [];
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', profileId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!profileId,
  });
}

/** Unread notification count. */
export function useUnreadCount(profileId: string | null | undefined) {
  return useQuery({
    queryKey: ['notifications', 'unread', profileId],
    queryFn: async (): Promise<number> => {
      if (!profileId) return 0;
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', profileId)
        .is('read_at', null);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!profileId,
  });
}

/** Mark a notification as read. */
export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

/** Mark all notifications as read. */
export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (profileId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('recipient_id', profileId)
        .is('read_at', null);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
