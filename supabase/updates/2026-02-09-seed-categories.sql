-- Seed starter system categories (safe to run multiple times)

INSERT INTO public.categories (name, is_system, user_id)
SELECT 'Groceries', true, null
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories WHERE name = 'Groceries' AND is_system = true
);

INSERT INTO public.categories (name, is_system, user_id)
SELECT 'Restaurants', true, null
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories WHERE name = 'Restaurants' AND is_system = true
);

INSERT INTO public.categories (name, is_system, user_id)
SELECT 'Transport', true, null
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories WHERE name = 'Transport' AND is_system = true
);

INSERT INTO public.categories (name, is_system, user_id)
SELECT 'Utilities', true, null
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories WHERE name = 'Utilities' AND is_system = true
);

INSERT INTO public.categories (name, is_system, user_id)
SELECT 'Rent', true, null
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories WHERE name = 'Rent' AND is_system = true
);

INSERT INTO public.categories (name, is_system, user_id)
SELECT 'Health', true, null
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories WHERE name = 'Health' AND is_system = true
);

INSERT INTO public.categories (name, is_system, user_id)
SELECT 'Education', true, null
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories WHERE name = 'Education' AND is_system = true
);

INSERT INTO public.categories (name, is_system, user_id)
SELECT 'Entertainment', true, null
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories WHERE name = 'Entertainment' AND is_system = true
);

INSERT INTO public.categories (name, is_system, user_id)
SELECT 'Travel', true, null
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories WHERE name = 'Travel' AND is_system = true
);

INSERT INTO public.categories (name, is_system, user_id)
SELECT 'Fees', true, null
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories WHERE name = 'Fees' AND is_system = true
);
