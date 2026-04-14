
-- Create subscription plan enum
CREATE TYPE public.subscription_plan AS ENUM ('trial', 'basic', 'professional', 'enterprise');
CREATE TYPE public.subscription_status AS ENUM ('active', 'trial', 'past_due', 'canceled', 'blocked');
CREATE TYPE public.tenant_role AS ENUM ('owner', 'admin', 'manager', 'seller', 'finance', 'viewer');

-- Create tenants table
CREATE TABLE public.tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  email TEXT,
  phone TEXT,
  document TEXT,
  address JSONB DEFAULT '{}',
  plan subscription_plan NOT NULL DEFAULT 'trial',
  subscription_status subscription_status NOT NULL DEFAULT 'trial',
  trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '14 days'),
  blocked_at TIMESTAMP WITH TIME ZONE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Create tenant_members table
CREATE TABLE public.tenant_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role tenant_role NOT NULL DEFAULT 'viewer',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's active tenant_id
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.tenant_members
  WHERE user_id = auth.uid() AND is_active = true
  LIMIT 1
$$;

-- Helper function: check if user belongs to tenant
CREATE OR REPLACE FUNCTION public.user_belongs_to_tenant(_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE user_id = auth.uid() AND tenant_id = _tenant_id AND is_active = true
  )
$$;

-- Helper function: check user's tenant role
CREATE OR REPLACE FUNCTION public.has_tenant_role(_tenant_id UUID, _role tenant_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE user_id = auth.uid() AND tenant_id = _tenant_id AND role = _role AND is_active = true
  )
$$;

-- Add tenant_id to existing tables
ALTER TABLE public.products ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.categories ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.orders ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.order_items ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.financial_transactions ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.menu_items ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.stock_movements ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.profiles ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Create indexes for tenant_id
CREATE INDEX idx_products_tenant ON public.products(tenant_id);
CREATE INDEX idx_categories_tenant ON public.categories(tenant_id);
CREATE INDEX idx_orders_tenant ON public.orders(tenant_id);
CREATE INDEX idx_order_items_tenant ON public.order_items(tenant_id);
CREATE INDEX idx_financial_transactions_tenant ON public.financial_transactions(tenant_id);
CREATE INDEX idx_menu_items_tenant ON public.menu_items(tenant_id);
CREATE INDEX idx_stock_movements_tenant ON public.stock_movements(tenant_id);
CREATE INDEX idx_profiles_tenant ON public.profiles(tenant_id);
CREATE INDEX idx_tenant_members_user ON public.tenant_members(user_id);
CREATE INDEX idx_tenant_members_tenant ON public.tenant_members(tenant_id);

-- RLS for tenants: members can view their own tenant
CREATE POLICY "Members can view own tenant"
ON public.tenants FOR SELECT TO authenticated
USING (public.user_belongs_to_tenant(id));

CREATE POLICY "Owner/admin can update tenant"
ON public.tenants FOR UPDATE TO authenticated
USING (
  public.has_tenant_role(id, 'owner') OR public.has_tenant_role(id, 'admin')
);

CREATE POLICY "Anyone authenticated can create tenant"
ON public.tenants FOR INSERT TO authenticated
WITH CHECK (true);

-- RLS for tenant_members
CREATE POLICY "Members can view tenant members"
ON public.tenant_members FOR SELECT TO authenticated
USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Owner/admin can manage members"
ON public.tenant_members FOR ALL TO authenticated
USING (
  public.has_tenant_role(tenant_id, 'owner') OR public.has_tenant_role(tenant_id, 'admin')
);

CREATE POLICY "Users can insert themselves as owner"
ON public.tenant_members FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND role = 'owner');

-- Drop old RLS policies and create tenant-scoped ones for products
DROP POLICY IF EXISTS "Admin/operador can manage products" ON public.products;
DROP POLICY IF EXISTS "Authenticated can read products" ON public.products;

CREATE POLICY "Tenant members can read products"
ON public.products FOR SELECT TO authenticated
USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Tenant admin/manager/seller can manage products"
ON public.products FOR ALL TO authenticated
USING (public.user_belongs_to_tenant(tenant_id));

-- categories
DROP POLICY IF EXISTS "Admin/operador can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated can read categories" ON public.categories;

CREATE POLICY "Tenant members can read categories"
ON public.categories FOR SELECT TO authenticated
USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Tenant members can manage categories"
ON public.categories FOR ALL TO authenticated
USING (public.user_belongs_to_tenant(tenant_id));

-- orders
DROP POLICY IF EXISTS "Admin/operador can manage orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated can read orders" ON public.orders;

CREATE POLICY "Tenant members can read orders"
ON public.orders FOR SELECT TO authenticated
USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Tenant members can manage orders"
ON public.orders FOR ALL TO authenticated
USING (public.user_belongs_to_tenant(tenant_id));

-- order_items
DROP POLICY IF EXISTS "Admin/operador can manage order_items" ON public.order_items;
DROP POLICY IF EXISTS "Authenticated can read order_items" ON public.order_items;

CREATE POLICY "Tenant members can read order_items"
ON public.order_items FOR SELECT TO authenticated
USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Tenant members can manage order_items"
ON public.order_items FOR ALL TO authenticated
USING (public.user_belongs_to_tenant(tenant_id));

-- financial_transactions
DROP POLICY IF EXISTS "Admin/operador can manage financial_transactions" ON public.financial_transactions;
DROP POLICY IF EXISTS "Authenticated can read financial_transactions" ON public.financial_transactions;

CREATE POLICY "Tenant members can read financial_transactions"
ON public.financial_transactions FOR SELECT TO authenticated
USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Tenant members can manage financial_transactions"
ON public.financial_transactions FOR ALL TO authenticated
USING (public.user_belongs_to_tenant(tenant_id));

-- menu_items
DROP POLICY IF EXISTS "Admin/operador can manage menu_items" ON public.menu_items;
DROP POLICY IF EXISTS "Authenticated can read menu_items" ON public.menu_items;

CREATE POLICY "Tenant members can read menu_items"
ON public.menu_items FOR SELECT TO authenticated
USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Tenant members can manage menu_items"
ON public.menu_items FOR ALL TO authenticated
USING (public.user_belongs_to_tenant(tenant_id));

-- stock_movements
DROP POLICY IF EXISTS "Admin/operador can manage stock_movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Authenticated can read stock_movements" ON public.stock_movements;

CREATE POLICY "Tenant members can read stock_movements"
ON public.stock_movements FOR SELECT TO authenticated
USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Tenant members can manage stock_movements"
ON public.stock_movements FOR ALL TO authenticated
USING (public.user_belongs_to_tenant(tenant_id));

-- profiles: update to be tenant-scoped
DROP POLICY IF EXISTS "Profiles viewable by authenticated" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Tenant members can view profiles"
ON public.profiles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (user_id = auth.uid());

-- Update handle_new_user to create a default tenant
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_tenant_id UUID;
BEGIN
  -- Create a default tenant for the new user
  INSERT INTO public.tenants (name, slug, email)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'company_name', 'Minha Empresa'),
    COALESCE(NEW.raw_user_meta_data->>'company_slug', 'empresa-' || substr(NEW.id::text, 1, 8)),
    NEW.email
  )
  RETURNING id INTO new_tenant_id;

  -- Create profile linked to tenant
  INSERT INTO public.profiles (user_id, display_name, tenant_id)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email), new_tenant_id);

  -- Add user as owner of their tenant
  INSERT INTO public.tenant_members (tenant_id, user_id, role)
  VALUES (new_tenant_id, NEW.id, 'owner');

  -- Keep legacy user_roles for backward compatibility
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');

  RETURN NEW;
END;
$$;

-- Add triggers for updated_at
CREATE TRIGGER update_tenants_updated_at
BEFORE UPDATE ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_members_updated_at
BEFORE UPDATE ON public.tenant_members
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
