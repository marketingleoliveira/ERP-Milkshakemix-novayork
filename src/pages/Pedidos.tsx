import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Filter } from "lucide-react";
import { toast } from "sonner";
import type { Enums } from "@/integrations/supabase/types";

const platformLabels: Record<string, string> = { balcao: "Balcão", ifood: "iFood", kreeta: "Kreeta", "99food": "99Food" };
const statusLabels: Record<string, string> = { pendente: "Pendente", preparando: "Preparando", pronto: "Pronto", entregue: "Entregue", cancelado: "Cancelado" };
const statusColors: Record<string, string> = {
  pendente: "bg-warning/10 text-warning border-0",
  preparando: "bg-info/10 text-info border-0",
  pronto: "bg-success/10 text-success border-0",
  entregue: "bg-muted text-muted-foreground border-0",
  cancelado: "bg-destructive/10 text-destructive border-0",
};

export default function Pedidos() {
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showNew, setShowNew] = useState(false);
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders", platformFilter, statusFilter],
    queryFn: async () => {
      let q = supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (platformFilter !== "all") q = q.eq("platform", platformFilter);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Enums<"order_status"> }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Status atualizado!");
    },
  });

  const createOrder = useMutation({
    mutationFn: async (order: { platform: Enums<"delivery_platform">; customer_name: string; customer_phone: string; total: number; notes: string }) => {
      const { error } = await supabase.from("orders").insert({ ...order, subtotal: order.total });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setShowNew(false);
      toast.success("Pedido criado!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">Pedidos</h1>
          <p className="text-muted-foreground">Gerencie pedidos de todas as plataformas</p>
        </div>
        <Dialog open={showNew} onOpenChange={setShowNew}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground gap-2"><Plus className="h-4 w-4" /> Novo Pedido</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-heading">Novo Pedido</DialogTitle></DialogHeader>
            <NewOrderForm onSubmit={(o) => createOrder.mutate(o)} loading={createOrder.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3 items-center flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Plataforma" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="balcao">Balcão</SelectItem>
            <SelectItem value="ifood">iFood</SelectItem>
            <SelectItem value="kreeta">Kreeta</SelectItem>
            <SelectItem value="99food">99Food</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="preparando">Preparando</SelectItem>
            <SelectItem value="pronto">Pronto</SelectItem>
            <SelectItem value="entregue">Entregue</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-center py-8">Carregando...</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orders && orders.length > 0 ? orders.map((order) => (
            <Card key={order.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-heading text-lg">#{order.order_number}</CardTitle>
                  <Badge className={statusColors[order.status]}>{statusLabels[order.status]}</Badge>
                </div>
                <Badge variant="outline" className="w-fit text-xs">{platformLabels[order.platform]}</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.customer_name && <p className="text-sm">{order.customer_name}</p>}
                <p className="text-xl font-bold font-heading">R$ {Number(order.total ?? 0).toFixed(2)}</p>
                {order.notes && <p className="text-xs text-muted-foreground">{order.notes}</p>}
                <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString("pt-BR")}</p>
                <Select value={order.status} onValueChange={(v: any) => updateStatus.mutate({ id: order.id, status: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="preparando">Preparando</SelectItem>
                    <SelectItem value="pronto">Pronto</SelectItem>
                    <SelectItem value="entregue">Entregue</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )) : (
            <div className="col-span-full text-center py-12 text-muted-foreground">Nenhum pedido encontrado</div>
          )}
        </div>
      )}
    </div>
  );
}

function NewOrderForm({ onSubmit, loading }: { onSubmit: (o: any) => void; loading: boolean }) {
  const [form, setForm] = useState({ platform: "balcao" as Enums<"delivery_platform">, customer_name: "", customer_phone: "", total: 0, notes: "" });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <Select value={form.platform} onValueChange={(v: any) => setForm({ ...form, platform: v })}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="balcao">Balcão</SelectItem>
          <SelectItem value="ifood">iFood</SelectItem>
          <SelectItem value="kreeta">Kreeta</SelectItem>
          <SelectItem value="99food">99Food</SelectItem>
        </SelectContent>
      </Select>
      <Input placeholder="Nome do cliente" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
      <Input placeholder="Telefone" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
      <Input type="number" step="0.01" placeholder="Valor total" value={form.total || ""} onChange={(e) => setForm({ ...form, total: +e.target.value })} required />
      <Input placeholder="Observações" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={loading}>{loading ? "Criando..." : "Criar Pedido"}</Button>
    </form>
  );
}
