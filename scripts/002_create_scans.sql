-- Create scans table for storing scan results
create table if not exists public.scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  image_url text,
  result text not null,
  confidence integer not null,
  treatment text,
  location text,
  points_used integer default 10,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.scans enable row level security;

-- Create policies for scans
create policy "scans_select_own"
  on public.scans for select
  using (auth.uid() = user_id);

create policy "scans_insert_own"
  on public.scans for insert
  with check (auth.uid() = user_id);

create policy "scans_update_own"
  on public.scans for update
  using (auth.uid() = user_id);

create policy "scans_delete_own"
  on public.scans for delete
  using (auth.uid() = user_id);
