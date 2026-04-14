import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  UtensilsCrossed,
  DollarSign,
  LogOut,
  Zap,
  Users,
  Settings,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const menuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Estoque", url: "/estoque", icon: Package },
  { title: "Pedidos", url: "/pedidos", icon: ShoppingCart },
  { title: "Cardápio", url: "/cardapio", icon: UtensilsCrossed },
  { title: "Financeiro", url: "/financeiro", icon: DollarSign },
];

const planLabels: Record<string, string> = {
  trial: "Trial",
  basic: "Básico",
  professional: "Pro",
  enterprise: "Enterprise",
};

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { signOut, profile } = useAuth();
  const { tenant } = useTenant();

  return (
    <Sidebar collapsible="icon" className="gradient-sidebar border-r-0">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 py-6 text-sidebar-foreground/60">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
                <Zap className="h-4 w-4 text-primary-foreground" />
              </div>
              {!collapsed && (
                <div>
                  <p className="font-heading text-sm font-bold text-sidebar-accent-foreground">MilkShake Mix</p>
                  <p className="text-[10px] text-sidebar-foreground/50">
                    {tenant?.name || "Sistema de Gestão"}
                  </p>
                </div>
              )}
            </div>
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sidebar-foreground/70 transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        {!collapsed && tenant && (
          <div className="mb-2 px-1">
            <Badge variant="secondary" className="text-[10px] bg-sidebar-accent text-sidebar-accent-foreground border-0">
              {planLabels[tenant.plan] || tenant.plan}
            </Badge>
          </div>
        )}
        {!collapsed && profile && (
          <p className="mb-2 truncate px-1 text-xs text-sidebar-foreground/50">
            {profile.display_name}
          </p>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="w-full justify-start gap-2 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && "Sair"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
