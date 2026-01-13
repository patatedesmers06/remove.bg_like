-- 1. Safely add columns if they don't exist
alter table public.profiles 
add column if not exists credits integer default 5,
add column if not exists tier text default 'free';

-- 2. Enable RLS (Safe to run multiple times)
alter table public.profiles enable row level security;

-- 3. Update Policies (Drop first to avoid duplication errors)
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles
  for select using ( auth.uid() = id );

-- 4. Create/Update Trigger Function
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- Insert profile if not exists, otherwise do nothing
  insert into public.profiles (id, credits)
  values (new.id, 5)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- 5. Re-create Trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 6. Backfill existing users (Optional but safe)
insert into public.profiles (id, credits)
select id, 5 from auth.users
on conflict (id) do nothing;
