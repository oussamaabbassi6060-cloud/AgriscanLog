-- Add clerk_id column to profiles table to support Clerk authentication
alter table public.profiles 
add column if not exists clerk_id text unique;

-- Create index for clerk_id lookups
create index if not exists profiles_clerk_id_idx on public.profiles(clerk_id);

-- Update the handle_new_user function to work with clerk_id
-- This function will be called manually when creating profiles through Clerk
create or replace function public.create_profile_for_clerk_user(
  clerk_user_id text,
  user_email text,
  user_username text default null,
  user_gender text default null,
  user_age integer default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_id uuid;
begin
  -- Generate a new UUID for the profile
  profile_id := gen_random_uuid();
  
  insert into public.profiles (
    id,
    clerk_id,
    username,
    email,
    gender,
    age,
    points,
    token
  )
  values (
    profile_id,
    clerk_user_id,
    coalesce(user_username, 'user_' || substr(clerk_user_id, 1, 8)),
    user_email,
    user_gender,
    user_age,
    1000,
    encode(gen_random_bytes(32), 'hex')
  )
  on conflict (clerk_id) do nothing;

  return profile_id;
end;
$$;

-- Remove the old Supabase auth trigger since we're using Clerk now
drop trigger if exists on_auth_user_created on auth.users;

-- Create a policy for clerk-based access
drop policy if exists "profiles_select_clerk" on public.profiles;
create policy "profiles_select_clerk"
  on public.profiles for select
  using (true); -- We'll handle authorization in the application layer

drop policy if exists "profiles_insert_clerk" on public.profiles;
create policy "profiles_insert_clerk"
  on public.profiles for insert
  with check (true); -- We'll handle authorization in the application layer

drop policy if exists "profiles_update_clerk" on public.profiles;
create policy "profiles_update_clerk"
  on public.profiles for update
  using (true); -- We'll handle authorization in the application layer

drop policy if exists "profiles_delete_clerk" on public.profiles;
create policy "profiles_delete_clerk"
  on public.profiles for delete
  using (true); -- We'll handle authorization in the application layer
