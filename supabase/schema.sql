-- =============================================
-- OpenRemover — Full Supabase Schema
-- =============================================

-- 1. Profiles table (linked to Supabase Auth)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  credits integer not null default 10,
  tier text not null default 'free'
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Users can only read/update their own profile
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- 2. API Keys table
create table if not exists public.api_keys (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  key_hash text not null unique,
  name text not null default 'Default Key',
  usage_count integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.api_keys enable row level security;

-- Users can manage their own API keys
create policy "Users can view own api_keys" on public.api_keys
  for select using (auth.uid() = user_id);

create policy "Users can insert own api_keys" on public.api_keys
  for insert with check (auth.uid() = user_id);

create policy "Users can delete own api_keys" on public.api_keys
  for delete using (auth.uid() = user_id);

-- 3. Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, credits, tier)
  values (new.id, new.email, 10, 'free');
  return new;
end;
$$;

-- Drop existing trigger if it exists, then recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 4. Atomic credit deduction RPC
create or replace function try_use_credit(p_user_id uuid)
returns boolean
language plpgsql
security definer
as $$
declare
  rows_affected integer;
begin
  update public.profiles
  set credits = credits - 1
  where id = p_user_id and credits > 0;
  
  get diagnostics rows_affected = row_count;
  return rows_affected > 0;
end;
$$;
