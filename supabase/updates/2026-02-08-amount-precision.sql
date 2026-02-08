-- Increase amount precision to allow 12 integer digits + 2 decimals
alter table public.expenses
  alter column amount type numeric(14,2),
  alter column amount_dop type numeric(14,2);
