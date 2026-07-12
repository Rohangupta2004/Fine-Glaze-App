create table if not exists public.personal_todos (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  due_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists personal_todos_profile_created_idx on public.personal_todos(profile_id, created_at desc);
alter table public.personal_todos enable row level security;
create policy "Users manage own todos" on public.personal_todos for all
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create table if not exists public.quote_calculations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  title text not null,
  currency text not null default 'INR',
  subtotal numeric not null default 0,
  tax_pct numeric not null default 0,
  total numeric not null default 0,
  line_items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.quote_calculations enable row level security;
create policy "Creators manage quote calculations" on public.quote_calculations for all
  using (created_by = auth.uid()) with check (created_by = auth.uid());
