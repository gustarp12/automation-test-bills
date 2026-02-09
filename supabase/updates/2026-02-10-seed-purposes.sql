-- Seed starter purposes (safe to run multiple times)

INSERT INTO public.purposes (name, is_system, user_id)
SELECT 'Need', true, null
WHERE NOT EXISTS (
  SELECT 1 FROM public.purposes WHERE name = 'Need' AND is_system = true
);

INSERT INTO public.purposes (name, is_system, user_id)
SELECT 'Want', true, null
WHERE NOT EXISTS (
  SELECT 1 FROM public.purposes WHERE name = 'Want' AND is_system = true
);

INSERT INTO public.purposes (name, is_system, user_id)
SELECT 'Savings', true, null
WHERE NOT EXISTS (
  SELECT 1 FROM public.purposes WHERE name = 'Savings' AND is_system = true
);

INSERT INTO public.purposes (name, is_system, user_id)
SELECT 'Investment', true, null
WHERE NOT EXISTS (
  SELECT 1 FROM public.purposes WHERE name = 'Investment' AND is_system = true
);

INSERT INTO public.purposes (name, is_system, user_id)
SELECT 'Business', true, null
WHERE NOT EXISTS (
  SELECT 1 FROM public.purposes WHERE name = 'Business' AND is_system = true
);

INSERT INTO public.purposes (name, is_system, user_id)
SELECT 'Taxes', true, null
WHERE NOT EXISTS (
  SELECT 1 FROM public.purposes WHERE name = 'Taxes' AND is_system = true
);
