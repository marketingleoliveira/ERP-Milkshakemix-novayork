
-- Fix overly permissive tenant insert policy
DROP POLICY IF EXISTS "Anyone authenticated can create tenant" ON public.tenants;

-- Tenants are created via handle_new_user trigger (SECURITY DEFINER), 
-- so we don't need a permissive INSERT policy for regular users.
-- If manual tenant creation is needed, it goes through the trigger.
