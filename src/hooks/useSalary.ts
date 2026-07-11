import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface MonthlySalarySummary {
  profile_id: string;
  year: number;
  month: number;
  present_days: number;
  half_days: number;
  ot_hours: number;
  advances_taken: number;
  payable: number;
}

/**
 * Monthly salary summary for a worker.
 * Reads from the `monthly_salary` Postgres view defined in the PRD.
 * Falls back gracefully if the view doesn't exist yet.
 */
export function useMonthlySalary(
  profileId: string | null | undefined,
  year: number,
  month: number
) {
  return useQuery({
    queryKey: ['salary', 'monthly', profileId, year, month],
    queryFn: async (): Promise<MonthlySalarySummary | null> => {
      if (!profileId) return null;
      // Attempt to query the monthly_salary view
      const { data, error } = await supabase
        .from('monthly_salary' as any)
        .select('*')
        .eq('profile_id', profileId)
        .eq('year', year)
        .eq('month', month)
        .maybeSingle();
      if (error) {
        // View may not exist yet — return null gracefully
        console.warn('[useMonthlySalary] view query failed:', error.message);
        return null;
      }
      return data as MonthlySalarySummary | null;
    },
    enabled: !!profileId,
  });
}
