-- Purposes dimension (why the money was spent)

CREATE TABLE IF NOT EXISTS public.purposes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  is_system boolean not null default true,
  created_at timestamptz not null default now(),
  constraint purposes_scope_check check (
    (is_system = true and user_id is null) or (is_system = false and user_id is not null)
  )
);

ALTER TABLE public.purposes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Purposes select" ON public.purposes;
DROP POLICY IF EXISTS "Purposes insert" ON public.purposes;
DROP POLICY IF EXISTS "Purposes update" ON public.purposes;
DROP POLICY IF EXISTS "Purposes delete" ON public.purposes;

CREATE POLICY "Purposes select" ON public.purposes
  FOR SELECT USING (
    is_system = true
    OR user_id = auth.uid()
    OR public.is_admin(user_id)
  );

CREATE POLICY "Purposes insert" ON public.purposes
  FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Purposes update" ON public.purposes
  FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE POLICY "Purposes delete" ON public.purposes
  FOR DELETE USING (public.is_admin(auth.uid()));

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS purpose_id uuid references public.purposes(id) on delete set null;

CREATE INDEX IF NOT EXISTS expenses_user_purpose_idx
  ON public.expenses (user_id, purpose_id);
