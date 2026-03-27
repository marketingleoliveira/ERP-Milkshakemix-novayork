import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ShoppingCart, AlertTriangle, DollarSign, TrendingUp, TrendingDown } from "lucide-react";

function StatCard({ title, value, icon: Icon, trend, color }: {
  title: string; value: string | number; icon: any; trend?: string; color: string;
}) {
  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-heading font-bold">{value}</p>
            {trend && <p className="text-xs text-muted-foreground">{trend}</p>}
          </div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: products } = useQuery({
    queryKey: ["products-count"],
    queryFn: async () => {
      const { count } = await supabase.from("products").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: lowStock } = useQuery({
    queryKey: ["low-stock-count"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, stock_quantity, min_stock").eq("is_active", true);
      return data?.filter((p) => p.stock_quantity <= (p.min_stock ?? 0)).length ?? 0;
    },
  });

  const { data: todayOrders } = useQuery({
    queryKey: ["today-orders"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { count } = await supabase.from("orders").select("*", { count: "exact", head: true }).gte("created_at", today);
      return count ?? 0;
    },
  });

  const { data: todayRevenue } = useQuery({
    queryKey: ["today-revenue"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase.from("financial_transactions").select("amount").eq("type", "receita").gte("transaction_date", today);
      return data?.reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;
    },
  });

  const { data: recentOrders } = useQuery({
    queryKey: ["recent-orders"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(5);
      return data ?? [];
    },
  });

  const platformColors: Record<string, string> = {
    balcao: "bg-secondary text-secondary-foreground",
    ifood: "bg-destructive/10 text-destructive",
    kreeta: "bg-info/10 text-info",
    "99food": "bg-warning/10 text-warning",
  };

  const statusLabels: Record<string, string> = {
    pendente: "Pendente",
    preparando: "Preparando",
    pronto: "Pronto",
    entregue: "Entregue",
    cancelado: "Cancelado",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do seu negócio</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Produtos" value={products ?? 0} icon={Package} color="bg-primary/10 text-primary" />
        <StatCard title="Estoque baixo" value={lowStock ?? 0} icon={AlertTriangle} color="bg-warning/10 text-warning" />
        <StatCard title="Pedidos hoje" value={todayOrders ?? 0} icon={ShoppingCart} color="bg-info/10 text-info" />
        <StatCard title="Receita hoje" value={`R$ ${(todayRevenue ?? 0).toFixed(2)}`} icon={DollarSign} color="bg-success/10 text-success" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Pedidos recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders && recentOrders.length > 0 ? (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">#{order.order_number}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${platformColors[order.platform] ?? ""}`}>
                        {order.platform}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{statusLabels[order.status]}</span>
                      <span className="text-sm font-semibold">R$ {Number(order.total ?? 0).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum pedido encontrado</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-warning" />
              Produtos com estoque baixo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LowStockList />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LowStockList() {
  const { data } = useQuery({
    queryKey: ["low-stock-products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, name, stock_quantity, min_stock, unit").eq("is_active", true);
      return data?.filter((p) => p.stock_quantity <= (p.min_stock ?? 0)) ?? [];
    },
  });

  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">Tudo em ordem! 🎉</p>;
  }

  return (
    <div className="space-y-3">
      {data.slice(0, 5).map((p) => (
        <div key={p.id} className="flex items-center justify-between rounded-lg bg-warning/5 p-3">
          <span className="text-sm font-medium">{p.name}</span>
          <span className="text-xs font-medium text-warning">
            {p.stock_quantity} / {p.min_stock} {p.unit}
          </span>
        </div>
      ))}
    </div>
  );
}
