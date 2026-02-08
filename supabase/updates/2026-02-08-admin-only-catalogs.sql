-- Restrict categories, merchants, currencies to admin-only writes

-- Categories policies
DROP POLICY IF EXISTS "Categories select" ON public.categories;
DROP POLICY IF EXISTS "Categories insert" ON public.categories;
DROP POLICY IF EXISTS "Categories update" ON public.categories;
DROP POLICY IF EXISTS "Categories delete" ON public.categories;

CREATE POLICY "Categories select" ON public.categories
  FOR SELECT USING (user_id = auth.uid() OR is_system = true OR public.is_admin(auth.uid()));

CREATE POLICY "Categories insert" ON public.categories
  FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Categories update" ON public.categories
  FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE POLICY "Categories delete" ON public.categories
  FOR DELETE USING (public.is_admin(auth.uid()));

-- Merchants policies
DROP POLICY IF EXISTS "Merchants select" ON public.merchants;
DROP POLICY IF EXISTS "Merchants insert" ON public.merchants;
DROP POLICY IF EXISTS "Merchants update" ON public.merchants;
DROP POLICY IF EXISTS "Merchants delete" ON public.merchants;

CREATE POLICY "Merchants select" ON public.merchants
  FOR SELECT USING (public.is_admin(user_id) OR user_id = auth.uid());

CREATE POLICY "Merchants insert" ON public.merchants
  FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Merchants update" ON public.merchants
  FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE POLICY "Merchants delete" ON public.merchants
  FOR DELETE USING (public.is_admin(auth.uid()));

-- Currencies policies
DROP POLICY IF EXISTS "Currencies select" ON public.currencies;
DROP POLICY IF EXISTS "Currencies insert" ON public.currencies;
DROP POLICY IF EXISTS "Currencies update" ON public.currencies;
DROP POLICY IF EXISTS "Currencies delete" ON public.currencies;

CREATE POLICY "Currencies select" ON public.currencies
  FOR SELECT USING (true);

CREATE POLICY "Currencies insert" ON public.currencies
  FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Currencies update" ON public.currencies
  FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE POLICY "Currencies delete" ON public.currencies
  FOR DELETE USING (public.is_admin(auth.uid()));
