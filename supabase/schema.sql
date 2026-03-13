-- FormMate Supabase schema scaffold (pre-auth migration friendly)
-- Table stores profile/settings/vault/history as JSONB blobs keyed by user_id.
-- Note: Until Supabase Auth is integrated, you likely want RLS disabled for this table
-- or a temporary policy that matches your current auth approach.

create table if not exists public.formmate_user_data (
  user_id text primary key,
  profile jsonb,
  settings jsonb,
  vault jsonb,
  form_history jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists formmate_user_data_updated_at_idx
  on public.formmate_user_data (updated_at desc);

