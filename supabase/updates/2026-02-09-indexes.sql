-- Performance indexes for frequent filters

CREATE INDEX IF NOT EXISTS expenses_user_date_idx
  ON public.expenses (user_id, expense_date DESC);

CREATE INDEX IF NOT EXISTS expenses_user_category_idx
  ON public.expenses (user_id, category_id);

CREATE INDEX IF NOT EXISTS expenses_user_merchant_idx
  ON public.expenses (user_id, merchant_id);

CREATE INDEX IF NOT EXISTS expenses_user_currency_idx
  ON public.expenses (user_id, currency);

CREATE INDEX IF NOT EXISTS budgets_user_month_idx
  ON public.budgets (user_id, month);
