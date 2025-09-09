-- Remove foreign key to Supabase auth.users as we now use Clerk
alter table public.profiles
  drop constraint if exists profiles_id_fkey;

-- Ensure the id column auto-generates a UUID if not provided
alter table public.profiles
  alter column id set default gen_random_uuid();

-- Optional: keep existing token trigger; ensure the extension is available
create extension if not exists pgcrypto;

