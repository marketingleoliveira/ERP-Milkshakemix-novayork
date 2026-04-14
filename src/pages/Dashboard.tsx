import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ShoppingCart, AlertTriangle, DollarSign, TrendingUp, TrendingDown, Wallet, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from "recharts";

function StatCard({ title, value, icon: Icon, subtitle, color }: {
  title: string; value: string | number; icon: any; subtitle?: string; color: string;
}) {
  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-heading font-bold">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
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
  const { tenantId } = useTenant();

  const { data: products } = useQuery({
    queryKey: ["products-count", tenantId],
    queryFn: async () => {
      const { count } = await supabase.from("products").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId!);
      return count ?? 0;
    },
    enabled: !!tenantId,
  });

  const { data: lowStock } = useQuery({
    queryKey: ["low-stock-count", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, stock_quantity, min_stock").eq("is_active", true).eq("tenant_id", tenantId!);
      return data?.filter((p) => p.stock_quantity <= (p.min_stock ?? 0)).length ?? 0;
    },
    enabled: !!tenantId,
  });

  const { data: todayOrders } = useQuery({
    queryKey: ["today-orders", tenantId],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { count } = await supabase.from("orders").select("*", { count: "exact", head: true }).gte("created_at", today).eq("tenant_id", tenantId!);
      return count ?? 0;
    },
    enabled: !!tenantId,
  });

  const { data: todayRevenue } = useQuery({
    queryKey: ["today-revenue", tenantId],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase.from("financial_transactions").select("amount").eq("type", "receita").gte("transaction_date", today).eq("tenant_id", tenantId!);
      return data?.reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;
    },
    enabled: !!tenantId,
  });

  const { data: monthRevenue } = useQuery({
    queryKey: ["month-revenue", tenantId],
    queryFn: async () => {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const { data } = await supabase.from("financial_transactions").select("amount").eq("type", "receita").gte("transaction_date", firstDay).eq("tenant_id", tenantId!);
      return data?.reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;
    },
    enabled: !!tenantId,
  });

  const { data: ticketMedio } = useQuery({
    queryKey: ["ticket-medio", tenantId],
    queryFn: async () => {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const { data } = await supabase.from("orders").select("total").gte("created_at", firstDay).eq("tenant_id", tenantId!).not("total", "is", null);
      if (!data || data.length === 0) return 0;
      const total = data.reduce((s, o) => s + Number(o.total ?? 0), 0);
      return total / data.length;
    },
    enabled: !!tenantId,
  });

  const { data: recentOrders } = useQuery({
    queryKey: ["recent-orders", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*").eq("tenant_id", tenantId!).order("created_at", { ascending: false }).limit(5);
      return data ?? [];
    },
    enabled: !!tenantId,
  });

  const { data: financialChart } = useQuery({
    queryKey: ["financial-chart", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("financial_transactions")
        .select("type, amount, transaction_date")
        .eq("tenant_id", tenantId!)
        .order("transaction_date", { ascending: true });

      if (!data) return [];

      const byDate: Record<string, { receita: number; despesa: number }> = {};
      data.forEach((t) => {
        const date = new Date(t.transaction_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
        if (!byDate[date]) byDate[date] = { receita: 0, despesa: 0 };
        byDate[date][t.type as "receita" | "despesa"] += Number(t.amount);
      });

      return Object.entries(byDate).map(([date, vals]) => ({ date, ...vals }));
    },
    enabled: !!tenantId,
  });

  const { data: topProducts } = useQuery({
    queryKey: ["top-products", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("order_items")
        .select("name, quantity, total_price")
        .eq("tenant_id", tenantId!);

      if (!data) return [];

      const byProduct: Record<string, { name: string; total: number; qty: number }> = {};
      data.forEach((item) => {
        if (!byProduct[item.name]) byProduct[item.name] = { name: item.name, total: 0, qty: 0 };
        byProduct[item.name].total += Number(item.total_price);
        byProduct[item.name].qty += item.quantity;
      });

      return Object.values(byProduct)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);
    },
    enabled: !!tenantId,
  });

  const { data: receivables } = useQuery({
    queryKey: ["receivables", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("total")
        .eq("tenant_id", tenantId!)
        .in("status", ["pendente", "preparando", "pronto"]);
      return data?.reduce((s, o) => s + Number(o.total ?? 0), 0) ?? 0;
    },
    enabled: !!tenantId,
  });

  const { data: payables } = useQuery({
    queryKey: ["payables", tenantId],
    queryFn: async () => {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const { data } = await supabase
        .from("financial_transactions")
        .select("amount")
        .eq("type", "despesa")
        .eq("tenant_id", tenantId!)
        .gte("transaction_date", firstDay);
      return data?.reduce((s, t) => s + Number(t.amount), 0) ?? 0;
    },
    enabled: !!tenantId,
  });

  const CHART_COLORS = ["hsl(230, 80%, 56%)", "hsl(262, 83%, 58%)", "hsl(152, 60%, 42%)", "hsl(38, 92%, 50%)", "hsl(210, 80%, 52%)"];

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

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Faturamento hoje" value={`R$ ${(todayRevenue ?? 0).toFixed(2)}`} icon={DollarSign} color="bg-success/10 text-success" />
        <StatCard title="Vendas do mês" value={`R$ ${(monthRevenue ?? 0).toFixed(2)}`} icon={TrendingUp} color="bg-primary/10 text-primary" />
        <StatCard title="Ticket médio" value={`R$ ${(ticketMedio ?? 0).toFixed(2)}`} icon={BarChart3} color="bg-accent/10 text-accent" />
        <StatCard title="Pedidos hoje" value={todayOrders ?? 0} icon={ShoppingCart} color="bg-info/10 text-info" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Produtos" value={products ?? 0} icon={Package} color="bg-secondary text-secondary-foreground" />
        <StatCard title="Estoque baixo" value={lowStock ?? 0} icon={AlertTriangle} color="bg-warning/10 text-warning" />
        <StatCard title="A receber" value={`R$ ${(receivables ?? 0).toFixed(2)}`} icon={TrendingUp} subtitle="Pedidos em aberto" color="bg-success/10 text-success" />
        <StatCard title="A pagar (mês)" value={`R$ ${(payables ?? 0).toFixed(2)}`} icon={TrendingDown} subtitle="Despesas do mês" color="bg-destructive/10 text-destructive" />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Financial chart */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Gráfico Financeiro
            </CardTitle>
          </CardHeader>
          <CardContent>
            {financialChart && financialChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={financialChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(220, 9%, 46%)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(220, 9%, 46%)" />
                  <Tooltip
                    formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                    contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                  />
                  <Area type="monotone" dataKey="receita" fill="hsl(152, 60%, 42%, 0.2)" stroke="hsl(152, 60%, 42%)" name="Receitas" />
                  <Area type="monotone" dataKey="despesa" fill="hsl(0, 84%, 60%, 0.2)" stroke="hsl(0, 84%, 60%)" name="Despesas" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados financeiros ainda</p>
            )}
          </CardContent>
        </Card>

        {/* Top products */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-accent" />
              Produtos Mais Vendidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts && topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(220, 9%, 46%)" />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} stroke="hsl(220, 9%, 46%)" />
                  <Tooltip
                    formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                    contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                  />
                  <Bar dataKey="total" fill="hsl(230, 80%, 56%)" radius={[0, 6, 6, 0]} name="Faturamento" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Sem vendas registradas ainda</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent orders + Low stock */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Pedidos Recentes
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
              <AlertTriangle className="h-5 w-5 text-warning" />
              Estoque Baixo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LowStockList tenantId={tenantId} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LowStockList({ tenantId }: { tenantId: string | null }) {
  const { data } = useQuery({
    queryKey: ["low-stock-products", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, name, stock_quantity, min_stock, unit").eq("is_active", true).eq("tenant_id", tenantId!);
      return data?.filter((p) => p.stock_quantity <= (p.min_stock ?? 0)) ?? [];
    },
    enabled: !!tenantId,
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
