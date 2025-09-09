-- Drop the tokens table if it exists (cleanup from previous implementation)
drop table if exists public.tokens cascade;

-- Add token column to profiles table
alter table public.profiles 
add column if not exists token text unique;

-- Create index for token lookups
create index if not exists profiles_token_idx on public.profiles(token);

-- Function to generate a random token
create or replace function generate_user_token()
returns text as $$
begin
  return encode(gen_random_bytes(32), 'hex');
end;
$$ language plpgsql;

-- Function to automatically generate token for new profiles
create or replace function set_profile_token()
returns trigger as $$
begin
  if new.token is null then
    new.token = generate_user_token();
  end if;
  return new;
end;
$$ language plpgsql;

-- Create trigger to auto-generate token on profile creation
drop trigger if exists set_profile_token_trigger on public.profiles;
create trigger set_profile_token_trigger
  before insert on public.profiles
  for each row execute function set_profile_token();
