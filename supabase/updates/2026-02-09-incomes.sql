-- Incomes table for tracking incoming cash flow

CREATE TABLE IF NOT EXISTS public.incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(14, 2) not null,
  currency text not null,
  fx_rate_to_dop numeric(14, 4),
  amount_dop numeric(14, 2) not null,
  income_date date not null,
  source text,
  notes text,
  created_at timestamptz not null default now()
);

ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Incomes select" ON public.incomes;
DROP POLICY IF EXISTS "Incomes insert" ON public.incomes;
DROP POLICY IF EXISTS "Incomes update" ON public.incomes;
DROP POLICY IF EXISTS "Incomes delete" ON public.incomes;

CREATE POLICY "Incomes select" ON public.incomes
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Incomes insert" ON public.incomes
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Incomes update" ON public.incomes
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Incomes delete" ON public.incomes
  FOR DELETE USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS incomes_user_date_idx
  ON public.incomes (user_id, income_date DESC);
