-- Fix the profile creation to handle metadata properly after email verification
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only create profile if email is confirmed
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    -- Create profile with basic info, metadata will be updated separately
    insert into public.profiles (id, username, email, points, token)
    values (
      new.id,
      'user_' || substr(new.id::text, 1, 8), -- Default username
      new.email,
      1000, -- Default points
      'agri_' || encode(gen_random_bytes(16), 'hex') -- Generate unique token
    )
    on conflict (id) do update set
      email_confirmed_at = now(),
      token = coalesce(profiles.token, 'agri_' || encode(gen_random_bytes(16), 'hex'));
  end if;

  return new;
end;
$$;

-- Ensure trigger only fires on email confirmation
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_updated on auth.users;

-- Only trigger on email confirmation, not on user creation
create trigger on_auth_user_updated
  after update on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function public.handle_new_user();
