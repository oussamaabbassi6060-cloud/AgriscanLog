-- Update the profile creation trigger to include token generation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only create profile if email is confirmed
  if new.email_confirmed_at is not null then
    insert into public.profiles (id, username, email, gender, age, points, token)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'username', 'user_' || substr(new.id::text, 1, 8)),
      new.email,
      coalesce(new.raw_user_meta_data ->> 'gender', null),
      coalesce((new.raw_user_meta_data ->> 'age')::integer, null),
      1000,
      -- Generate unique token for verified users
      'agri_' || encode(gen_random_bytes(16), 'hex')
    )
    on conflict (id) do update set
      email_confirmed_at = now(),
      token = coalesce(profiles.token, 'agri_' || encode(gen_random_bytes(16), 'hex'));
  end if;

  return new;
end;
$$;

-- Drop and recreate trigger to handle email confirmation updates
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_updated on auth.users;

-- Trigger for new user creation
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Trigger for user updates (email confirmation)
create trigger on_auth_user_updated
  after update on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function public.handle_new_user();

-- Enable realtime for profiles table
alter publication supabase_realtime add table profiles;
