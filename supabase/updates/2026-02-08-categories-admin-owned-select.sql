-- Allow all users to see categories created by admin accounts

DROP POLICY IF EXISTS "Categories select" ON public.categories;

CREATE POLICY "Categories select" ON public.categories
  FOR SELECT USING (
    is_system = true
    OR user_id = auth.uid()
    OR public.is_admin(user_id)
  );
