-- Budgets table for monthly category budgets

CREATE TABLE IF NOT EXISTS public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  month date not null,
  amount numeric(14, 2) not null,
  created_at timestamptz not null default now(),
  constraint budgets_unique unique (user_id, category_id, month)
);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Budgets select" ON public.budgets;
DROP POLICY IF EXISTS "Budgets insert" ON public.budgets;
DROP POLICY IF EXISTS "Budgets update" ON public.budgets;
DROP POLICY IF EXISTS "Budgets delete" ON public.budgets;

CREATE POLICY "Budgets select" ON public.budgets
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Budgets insert" ON public.budgets
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Budgets update" ON public.budgets
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Budgets delete" ON public.budgets
  FOR DELETE USING (user_id = auth.uid());
