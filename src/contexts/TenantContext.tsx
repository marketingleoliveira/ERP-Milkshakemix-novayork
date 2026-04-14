import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  email: string | null;
  phone: string | null;
  document: string | null;
  plan: string;
  subscription_status: string;
  trial_ends_at: string | null;
  settings: Record<string, any>;
}

interface TenantMember {
  tenant_id: string;
  role: string;
  is_active: boolean;
}

interface TenantContextType {
  tenant: Tenant | null;
  tenantRole: string | null;
  loading: boolean;
  tenantId: string | null;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [tenantRole, setTenantRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setTenant(null);
      setTenantRole(null);
      setLoading(false);
      return;
    }

    const fetchTenant = async () => {
      setLoading(true);
      // Get user's tenant membership
      const { data: membership } = await supabase
        .from("tenant_members")
        .select("tenant_id, role, is_active")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1)
        .single();

      if (membership) {
        setTenantRole(membership.role);
        const { data: tenantData } = await supabase
          .from("tenants")
          .select("*")
          .eq("id", membership.tenant_id)
          .single();

        if (tenantData) {
          setTenant(tenantData as unknown as Tenant);
        }
      }
      setLoading(false);
    };

    fetchTenant();
  }, [user]);

  return (
    <TenantContext.Provider value={{ tenant, tenantRole, loading, tenantId: tenant?.id ?? null }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) throw new Error("useTenant must be used within TenantProvider");
  return context;
}
