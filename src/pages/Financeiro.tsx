import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { toast } from "sonner";
import type { Enums } from "@/integrations/supabase/types";

export default function Financeiro() {
  const [showNew, setShowNew] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["transactions", typeFilter],
    queryFn: async () => {
      let q = supabase.from("financial_transactions").select("*").order("transaction_date", { ascending: false });
      if (typeFilter !== "all") q = q.eq("type", typeFilter as Enums<"transaction_type">);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const { data: summary } = useQuery({
    queryKey: ["financial-summary"],
    queryFn: async () => {
      const { data } = await supabase.from("financial_transactions").select("type, amount");
      const receita = data?.filter((t) => t.type === "receita").reduce((s, t) => s + Number(t.amount), 0) ?? 0;
      const despesa = data?.filter((t) => t.type === "despesa").reduce((s, t) => s + Number(t.amount), 0) ?? 0;
      return { receita, despesa, saldo: receita - despesa };
    },
  });

  const addTransaction = useMutation({
    mutationFn: async (t: { type: Enums<"transaction_type">; category: string; description: string; amount: number; transaction_date: string }) => {
      const { error } = await supabase.from("financial_transactions").insert({ ...t, created_by: user?.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["financial-summary"] });
      setShowNew(false);
      toast.success("Transação registrada!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">Financeiro</h1>
          <p className="text-muted-foreground">Controle de receitas e despesas</p>
        </div>
        <Dialog open={showNew} onOpenChange={setShowNew}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground gap-2"><Plus className="h-4 w-4" /> Nova Transação</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-heading">Nova Transação</DialogTitle></DialogHeader>
            <TransactionForm onSubmit={(t) => addTransaction.mutate(t)} loading={addTransaction.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
              <TrendingUp className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Receitas</p>
              <p className="text-2xl font-heading font-bold">R$ {(summary?.receita ?? 0).toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
              <TrendingDown className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Despesas</p>
              <p className="text-2xl font-heading font-bold">R$ {(summary?.despesa ?? 0).toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Saldo</p>
              <p className="text-2xl font-heading font-bold">R$ {(summary?.saldo ?? 0).toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="receita">Receitas</SelectItem>
                <SelectItem value="despesa">Despesas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : transactions && transactions.length > 0 ? transactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="text-sm">{new Date(t.transaction_date).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>
                    <Badge className={t.type === "receita" ? "bg-success/10 text-success border-0" : "bg-destructive/10 text-destructive border-0"}>
                      {t.type === "receita" ? "Receita" : "Despesa"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{t.category || "—"}</TableCell>
                  <TableCell className="text-sm">{t.description}</TableCell>
                  <TableCell className={`text-right font-mono font-semibold ${t.type === "receita" ? "text-success" : "text-destructive"}`}>
                    {t.type === "receita" ? "+" : "-"} R$ {Number(t.amount).toFixed(2)}
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma transação</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function TransactionForm({ onSubmit, loading }: { onSubmit: (t: any) => void; loading: boolean }) {
  const [form, setForm] = useState({
    type: "receita" as Enums<"transaction_type">,
    category: "",
    description: "",
    amount: 0,
    transaction_date: new Date().toISOString().split("T")[0],
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <Select value={form.type} onValueChange={(v: any) => setForm({ ...form, type: v })}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="receita">Receita</SelectItem>
          <SelectItem value="despesa">Despesa</SelectItem>
        </SelectContent>
      </Select>
      <Input placeholder="Categoria (ex: Vendas, Insumos)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
      <Input placeholder="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
      <Input type="number" step="0.01" placeholder="Valor" value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: +e.target.value })} required />
      <Input type="date" value={form.transaction_date} onChange={(e) => setForm({ ...form, transaction_date: e.target.value })} />
      <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={loading}>{loading ? "Salvando..." : "Registrar"}</Button>
    </form>
  );
}
