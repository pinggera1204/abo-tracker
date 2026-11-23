create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  category text not null default 'Sonstiges' check (char_length(trim(category)) between 1 and 50),
  amount numeric(10, 2) not null check (amount >= 0),
  billing_interval text not null default 'monthly' check (billing_interval in ('monthly', 'quarterly', 'yearly')),
  next_payment date,
  active boolean not null default true,
  notes text check (notes is null or char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_user_id_idx on public.subscriptions (user_id);

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, ''));
  return new;
end;
$$;

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.is_admin() from public;
revoke all on function private.handle_new_user() from public;
revoke all on function private.set_updated_at() from public;
grant execute on function private.is_admin() to authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function private.set_updated_at();

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;

revoke all on public.profiles from anon, authenticated;
revoke all on public.subscriptions from anon, authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.subscriptions to authenticated;

create policy "profiles_select_own_or_admin"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()));

create policy "subscriptions_select_own"
  on public.subscriptions for select to authenticated
  using (user_id = (select auth.uid()));

create policy "subscriptions_insert_own"
  on public.subscriptions for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "subscriptions_update_own"
  on public.subscriptions for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "subscriptions_delete_own"
  on public.subscriptions for delete to authenticated
  using (user_id = (select auth.uid()));
