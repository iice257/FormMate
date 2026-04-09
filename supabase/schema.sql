-- FormMate Supabase schema
-- Account-backed profile/preferences/vault/history storage for authenticated users.

create table if not exists public.formmate_user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  vault jsonb not null default '{}'::jsonb,
  form_history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists formmate_user_data_updated_at_idx
  on public.formmate_user_data (updated_at desc);

create or replace function public.set_formmate_user_data_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_formmate_user_data_updated_at on public.formmate_user_data;

create trigger set_formmate_user_data_updated_at
before update on public.formmate_user_data
for each row
execute function public.set_formmate_user_data_updated_at();

alter table public.formmate_user_data enable row level security;

drop policy if exists "Users can read own data" on public.formmate_user_data;
drop policy if exists "Users can insert own data" on public.formmate_user_data;
drop policy if exists "Users can update own data" on public.formmate_user_data;
drop policy if exists "Users can delete own data" on public.formmate_user_data;

create policy "Users can read own data"
  on public.formmate_user_data
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own data"
  on public.formmate_user_data
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own data"
  on public.formmate_user_data
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own data"
  on public.formmate_user_data
  for delete
  using (auth.uid() = user_id);
