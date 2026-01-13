-- 1. Create Profiles Table
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  credits integer default 5, -- 5 Free credits on signup
  tier text default 'free'
);

-- 2. Enable RLS (Security)
alter table public.profiles enable row level security;

-- 3. Policies
-- Allow users to read their own profile
create policy "Users can view own profile" on public.profiles
  for select using ( auth.uid() = id );

-- Allow users to update their own profile (uncomment if needed, but credits should only be updated by server/admin)
-- create policy "Users can update own profile" on public.profiles
--   for update using ( auth.uid() = id );

-- 4. Trigger to automatically create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, credits)
  values (new.id, 5); -- Start with 5 credits
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists to avoid conflicts during dev re-runs
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5. Backfill existing users (Optional: Run this if you already have users)
insert into public.profiles (id, credits)
select id, 5 from auth.users
on conflict (id) do nothing;
