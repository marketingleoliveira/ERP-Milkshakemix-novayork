import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Package, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { toast } from "sonner";

export default function Estoque() {
  const [search, setSearch] = useState("");
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showMovement, setShowMovement] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { tenantId } = useTenant();

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", search, tenantId],
    queryFn: async () => {
      let q = supabase.from("products").select("*, categories(name)").eq("is_active", true).eq("tenant_id", tenantId!).order("name");
      if (search) q = q.ilike("name", `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const { data: categories } = useQuery({
    queryKey: ["categories", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").eq("tenant_id", tenantId!).order("name");
      return data ?? [];
    },
    enabled: !!tenantId,
  });

  const addProduct = useMutation({
    mutationFn: async (product: { name: string; sku: string; unit: string; cost_price: number; sell_price: number; min_stock: number; category_id: string | null }) => {
      const { error } = await supabase.from("products").insert({ ...product, tenant_id: tenantId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setShowAddProduct(false);
      toast.success("Produto adicionado!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addMovement = useMutation({
    mutationFn: async (m: { product_id: string; type: "entrada" | "saida" | "ajuste"; quantity: number; reason: string }) => {
      const { error: movErr } = await supabase.from("stock_movements").insert({ ...m, created_by: user?.id, tenant_id: tenantId });
      if (movErr) throw movErr;
      const product = products?.find((p) => p.id === m.product_id);
      if (!product) return;
      const newQty = m.type === "entrada" ? product.stock_quantity + m.quantity : m.type === "saida" ? product.stock_quantity - m.quantity : m.quantity;
      const { error: upErr } = await supabase.from("products").update({ stock_quantity: newQty }).eq("id", m.product_id);
      if (upErr) throw upErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setShowMovement(null);
      toast.success("Movimentação registrada!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">Estoque</h1>
          <p className="text-muted-foreground">Gerencie seus produtos e insumos</p>
        </div>
        <Dialog open={showAddProduct} onOpenChange={setShowAddProduct}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground gap-2"><Plus className="h-4 w-4" /> Novo Produto</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-heading">Adicionar Produto</DialogTitle></DialogHeader>
            <AddProductForm categories={categories ?? []} onSubmit={(p) => addProduct.mutate(p)} loading={addProduct.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar produto..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Estoque</TableHead>
                <TableHead className="text-right">Custo</TableHead>
                <TableHead className="text-right">Venda</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : products && products.length > 0 ? products.map((p) => {
                const isLow = p.stock_quantity <= (p.min_stock ?? 0);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{p.sku || "—"}</TableCell>
                    <TableCell className="text-sm">{(p.categories as any)?.name || "—"}</TableCell>
                    <TableCell className="text-right font-mono">{p.stock_quantity} {p.unit}</TableCell>
                    <TableCell className="text-right">R$ {Number(p.cost_price ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right">R$ {Number(p.sell_price ?? 0).toFixed(2)}</TableCell>
                    <TableCell>
                      {isLow ? <Badge variant="destructive" className="text-xs">Baixo</Badge> : <Badge variant="secondary" className="text-xs bg-success/10 text-success border-0">OK</Badge>}
                    </TableCell>
                    <TableCell>
                      <Dialog open={showMovement === p.id} onOpenChange={(o) => setShowMovement(o ? p.id : null)}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="gap-1 text-xs"><Package className="h-3 w-3" /> Movimentar</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle className="font-heading">Movimentar: {p.name}</DialogTitle></DialogHeader>
                          <MovementForm productId={p.id} onSubmit={(m) => addMovement.mutate(m)} loading={addMovement.isPending} />
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                );
              }) : (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum produto cadastrado</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function AddProductForm({ categories, onSubmit, loading }: { categories: { id: string; name: string }[]; onSubmit: (p: any) => void; loading: boolean }) {
  const [form, setForm] = useState({ name: "", sku: "", unit: "un", cost_price: 0, sell_price: 0, min_stock: 0, category_id: "" as string | null });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ ...form, category_id: form.category_id || null }); }} className="space-y-4">
      <Input placeholder="Nome do produto" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      <div className="grid grid-cols-2 gap-3">
        <Input placeholder="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
        <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="un">Unidade</SelectItem>
            <SelectItem value="kg">Kg</SelectItem>
            <SelectItem value="L">Litro</SelectItem>
            <SelectItem value="ml">mL</SelectItem>
            <SelectItem value="g">Gramas</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Select value={form.category_id ?? ""} onValueChange={(v) => setForm({ ...form, category_id: v })}>
        <SelectTrigger><SelectValue placeholder="Categoria (opcional)" /></SelectTrigger>
        <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
      </Select>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="text-xs text-muted-foreground">Custo</label><Input type="number" step="0.01" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: +e.target.value })} /></div>
        <div><label className="text-xs text-muted-foreground">Venda</label><Input type="number" step="0.01" value={form.sell_price} onChange={(e) => setForm({ ...form, sell_price: +e.target.value })} /></div>
        <div><label className="text-xs text-muted-foreground">Estoque mín.</label><Input type="number" step="0.01" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: +e.target.value })} /></div>
      </div>
      <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={loading}>{loading ? "Salvando..." : "Adicionar"}</Button>
    </form>
  );
}

function MovementForm({ productId, onSubmit, loading }: { productId: string; onSubmit: (m: any) => void; loading: boolean }) {
  const [type, setType] = useState<"entrada" | "saida" | "ajuste">("entrada");
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState("");
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ product_id: productId, type, quantity, reason }); }} className="space-y-4">
      <Select value={type} onValueChange={(v: any) => setType(v)}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="entrada"><span className="flex items-center gap-2"><ArrowUpCircle className="h-3 w-3 text-success" /> Entrada</span></SelectItem>
          <SelectItem value="saida"><span className="flex items-center gap-2"><ArrowDownCircle className="h-3 w-3 text-destructive" /> Saída</span></SelectItem>
          <SelectItem value="ajuste">Ajuste</SelectItem>
        </SelectContent>
      </Select>
      <Input type="number" step="0.001" placeholder="Quantidade" value={quantity || ""} onChange={(e) => setQuantity(+e.target.value)} required min={0.001} />
      <Input placeholder="Motivo" value={reason} onChange={(e) => setReason(e.target.value)} />
      <Button type="submit" className="w-full" disabled={loading}>{loading ? "Salvando..." : "Registrar"}</Button>
    </form>
  );
}
