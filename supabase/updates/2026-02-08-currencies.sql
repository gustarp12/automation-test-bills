-- Currencies table + policies + seed
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

alter table public.currencies enable row level security;

create policy "Currencies select" on public.currencies
  for select using (true);

create policy "Currencies insert" on public.currencies
  for insert with check (public.is_admin(auth.uid()));

create policy "Currencies update" on public.currencies
  for update using (public.is_admin(auth.uid()));

create policy "Currencies delete" on public.currencies
  for delete using (public.is_admin(auth.uid()));

insert into public.currencies (code, name, symbol, is_active)
values
  ('DOP', 'Dominican Peso', 'RD$', true),
  ('USD', 'US Dollar', '$', true),
  ('EUR', 'Euro', '€', true)
on conflict (code) do nothing;
