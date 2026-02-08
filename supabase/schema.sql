-- Enable required extension
create extension if not exists "pgcrypto";

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Categories
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  constraint categories_scope_check check (
    (is_system = true and user_id is null) or (is_system = false and user_id is not null)
  )
);

create unique index if not exists categories_user_name_idx
  on public.categories (user_id, lower(name))
  where user_id is not null;

create unique index if not exists categories_system_name_idx
  on public.categories (lower(name))
  where user_id is null;

-- Merchants
create table if not exists public.merchants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

-- Currencies
create table if not exists public.currencies (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  symbol text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint currencies_code_upper check (code = upper(code)),
  unique (code)
);

-- Expenses
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  merchant_id uuid references public.merchants(id),
  category_id uuid references public.categories(id),
  amount numeric(14,2) not null check (amount >= 0),
  currency text not null,
  fx_rate_to_dop numeric(12,6),
  amount_dop numeric(14,2) not null check (amount_dop >= 0),
  expense_date date not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists expenses_user_date_idx on public.expenses (user_id, expense_date);
create index if not exists expenses_user_category_idx on public.expenses (user_id, category_id);
create index if not exists expenses_user_merchant_idx on public.expenses (user_id, merchant_id);

-- Exchange rates (optional, ready for v2)
create table if not exists public.exchange_rates (
  id uuid primary key default gen_random_uuid(),
  base_currency text not null default 'DOP',
  quote_currency text not null,
  rate numeric(12,6) not null,
  as_of date not null,
  created_at timestamptz not null default now(),
  unique (base_currency, quote_currency, as_of)
);

-- Helper function for admin checks
create or replace function public.is_admin(user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = user_id and is_admin = true
  );
$$;

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.merchants enable row level security;
alter table public.expenses enable row level security;
alter table public.exchange_rates enable row level security;
alter table public.currencies enable row level security;

-- Profiles policies
create policy "Profiles select own" on public.profiles
  for select using (id = auth.uid());

create policy "Profiles update own" on public.profiles
  for update using (id = auth.uid());

create policy "Profiles insert own" on public.profiles
  for insert with check (id = auth.uid());

-- Categories policies
create policy "Categories select" on public.categories
  for select using (user_id = auth.uid() or is_system = true);

create policy "Categories insert" on public.categories
  for insert with check (
    (user_id = auth.uid() and is_system = false)
    or (is_system = true and user_id is null and public.is_admin(auth.uid()))
  );

create policy "Categories update" on public.categories
  for update using (
    (user_id = auth.uid() and is_system = false)
    or (is_system = true and user_id is null and public.is_admin(auth.uid()))
  );

create policy "Categories delete" on public.categories
  for delete using (
    (user_id = auth.uid() and is_system = false)
    or (is_system = true and user_id is null and public.is_admin(auth.uid()))
  );

-- Merchants policies
create policy "Merchants select" on public.merchants
  for select using (user_id = auth.uid());

create policy "Merchants insert" on public.merchants
  for insert with check (user_id = auth.uid());

create policy "Merchants update" on public.merchants
  for update using (user_id = auth.uid());

create policy "Merchants delete" on public.merchants
  for delete using (user_id = auth.uid());

-- Expenses policies
create policy "Expenses select" on public.expenses
  for select using (user_id = auth.uid());

create policy "Expenses insert" on public.expenses
  for insert with check (user_id = auth.uid());

create policy "Expenses update" on public.expenses
  for update using (user_id = auth.uid());

create policy "Expenses delete" on public.expenses
  for delete using (user_id = auth.uid());

-- Exchange rates policies (read-only for now; admin can insert)
create policy "Exchange rates select" on public.exchange_rates
  for select using (true);

create policy "Exchange rates insert" on public.exchange_rates
  for insert with check (public.is_admin(auth.uid()));

create policy "Exchange rates update" on public.exchange_rates
  for update using (public.is_admin(auth.uid()));

create policy "Exchange rates delete" on public.exchange_rates
  for delete using (public.is_admin(auth.uid()));

-- Currencies policies
create policy "Currencies select" on public.currencies
  for select using (true);

create policy "Currencies insert" on public.currencies
  for insert with check (public.is_admin(auth.uid()));

create policy "Currencies update" on public.currencies
  for update using (public.is_admin(auth.uid()));

create policy "Currencies delete" on public.currencies
  for delete using (public.is_admin(auth.uid()));
