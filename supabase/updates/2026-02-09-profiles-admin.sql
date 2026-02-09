-- Allow admins to view and update profiles (for role management)

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles select own" ON public.profiles;
DROP POLICY IF EXISTS "Profiles select admin" ON public.profiles;
DROP POLICY IF EXISTS "Profiles update admin" ON public.profiles;

CREATE POLICY "Profiles select own" ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Profiles select admin" ON public.profiles
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Profiles update admin" ON public.profiles
  FOR UPDATE USING (public.is_admin(auth.uid()));
