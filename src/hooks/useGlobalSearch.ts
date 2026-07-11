/**
 * useGlobalSearch.ts
 *
 * PRD §29a — Global Search
 * One search box searches everything: employees, projects, materials,
 * documents, tasks, clients. Results grouped by type.
 * Uses Postgres pg_trgm trigram indexes already deployed in schema.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Profile, Project, Task, MaterialRequest, DocumentRow } from '../types';

export interface SearchResults {
  employees: Profile[];
  projects: Project[];
  tasks: Task[];
  materials: MaterialRequest[];
  documents: DocumentRow[];
  totalCount: number;
}

const EMPTY_RESULTS: SearchResults = {
  employees: [],
  projects: [],
  tasks: [],
  materials: [],
  documents: [],
  totalCount: 0,
};

export function useGlobalSearch(query: string) {
  const trimmed = query.trim();

  return useQuery({
    queryKey: ['global-search', trimmed],
    queryFn: async (): Promise<SearchResults> => {
      if (trimmed.length < 2) return EMPTY_RESULTS;

      const searchPattern = `%${trimmed}%`;

      // Run all queries in parallel
      const [employees, projects, tasks, materials, documents] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .or(`full_name.ilike.${searchPattern},phone.ilike.${searchPattern},worker_id.ilike.${searchPattern}`)
          .limit(10)
          .then(r => (r.data || []) as Profile[]),

        supabase
          .from('projects')
          .select('*')
          .or(`name.ilike.${searchPattern},city.ilike.${searchPattern},address.ilike.${searchPattern}`)
          .limit(10)
          .then(r => (r.data || []) as Project[]),

        supabase
          .from('tasks')
          .select('*')
          .ilike('title', searchPattern)
          .limit(10)
          .then(r => (r.data || []) as Task[]),

        supabase
          .from('material_requests')
          .select('*')
          .or(`material_name.ilike.${searchPattern},spec.ilike.${searchPattern}`)
          .limit(10)
          .then(r => (r.data || []) as MaterialRequest[]),

        supabase
          .from('documents')
          .select('*')
          .or(`title.ilike.${searchPattern},category.ilike.${searchPattern}`)
          .limit(10)
          .then(r => (r.data || []) as DocumentRow[]),
      ]);

      return {
        employees,
        projects,
        tasks,
        materials,
        documents,
        totalCount: employees.length + projects.length + tasks.length + materials.length + documents.length,
      };
    },
    enabled: trimmed.length >= 2,
    staleTime: 1000 * 30,
  });
}
