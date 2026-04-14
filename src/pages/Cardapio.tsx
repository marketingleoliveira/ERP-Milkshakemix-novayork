import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, UtensilsCrossed, Search } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

export default function Cardapio() {
  const [showAdd, setShowAdd] = useState(false);
  const [showAddCat, setShowAddCat] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("all");
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();

  const { data: items, isLoading } = useQuery({
    queryKey: ["menu-items", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("menu_items").select("*, categories(name)").eq("tenant_id", tenantId!).order("name");
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

  const addItem = useMutation({
    mutationFn: async (item: { name: string; description: string; price: number; category_id: string | null }) => {
      const { error } = await supabase.from("menu_items").insert({ ...item, tenant_id: tenantId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
      setShowAdd(false);
      toast.success("Item adicionado ao cardápio!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addCategory = useMutation({
    mutationFn: async (cat: { name: string; description: string }) => {
      const { error } = await supabase.from("categories").insert({ ...cat, tenant_id: tenantId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setShowAddCat(false);
      toast.success("Categoria adicionada!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleAvailability = useMutation({
    mutationFn: async ({ id, is_available }: { id: string; is_available: boolean }) => {
      const { error } = await supabase.from("menu_items").update({ is_available }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["menu-items"] }),
  });

  const filteredItems = items?.filter((item) => {
    const matchesSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCat === "all" || item.category_id === selectedCat;
    return matchesSearch && matchesCat;
  });

  // Group items by category
  const groupedItems: Record<string, typeof filteredItems> = {};
  filteredItems?.forEach((item) => {
    const catName = (item.categories as any)?.name || "Sem categoria";
    if (!groupedItems[catName]) groupedItems[catName] = [];
    groupedItems[catName]!.push(item);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold">Cardápio</h1>
          <p className="text-muted-foreground">
            {items?.length ?? 0} itens em {categories?.length ?? 0} categorias
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showAddCat} onOpenChange={setShowAddCat}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2"><Plus className="h-4 w-4" /> Categoria</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-heading">Nova Categoria</DialogTitle></DialogHeader>
              <CategoryForm onSubmit={(c) => addCategory.mutate(c)} loading={addCategory.isPending} />
            </DialogContent>
          </Dialog>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground gap-2"><Plus className="h-4 w-4" /> Item</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-heading">Novo Item</DialogTitle></DialogHeader>
              <MenuItemForm categories={categories ?? []} onSubmit={(i) => addItem.mutate(i)} loading={addItem.isPending} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar item..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={selectedCat} onValueChange={setSelectedCat}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categories?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-center py-8">Carregando...</p>
      ) : Object.keys(groupedItems).length > 0 ? (
        <div className="space-y-8">
          {Object.entries(groupedItems).map(([catName, catItems]) => (
            <div key={catName}>
              <h2 className="text-lg font-heading font-bold mb-3 flex items-center gap-2">
                <UtensilsCrossed className="h-4 w-4 text-primary" />
                {catName}
                <Badge variant="secondary" className="text-xs font-normal">{catItems?.length}</Badge>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {catItems?.map((item) => (
                  <Card key={item.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium text-sm leading-tight">{item.name}</h3>
                        <Switch
                          checked={item.is_available ?? true}
                          onCheckedChange={(v) => toggleAvailability.mutate({ id: item.id, is_available: v })}
                        />
                      </div>
                      {item.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                      )}
                      <p className="text-lg font-heading font-bold text-gradient">R$ {Number(item.price).toFixed(2)}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">Nenhum item encontrado</div>
      )}
    </div>
  );
}

function MenuItemForm({ categories, onSubmit, loading }: { categories: { id: string; name: string }[]; onSubmit: (i: any) => void; loading: boolean }) {
  const [form, setForm] = useState({ name: "", description: "", price: 0, category_id: "" as string | null });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ ...form, category_id: form.category_id || null }); }} className="space-y-4">
      <Input placeholder="Nome do item" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      <Textarea placeholder="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <Select value={form.category_id ?? ""} onValueChange={(v) => setForm({ ...form, category_id: v })}>
        <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
        <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
      </Select>
      <Input type="number" step="0.01" placeholder="Preço" value={form.price || ""} onChange={(e) => setForm({ ...form, price: +e.target.value })} required />
      <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={loading}>{loading ? "Salvando..." : "Adicionar"}</Button>
    </form>
  );
}

function CategoryForm({ onSubmit, loading }: { onSubmit: (c: any) => void; loading: boolean }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ name, description }); }} className="space-y-4">
      <Input placeholder="Nome da categoria" value={name} onChange={(e) => setName(e.target.value)} required />
      <Input placeholder="Descrição (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} />
      <Button type="submit" className="w-full" disabled={loading}>{loading ? "Salvando..." : "Criar"}</Button>
    </form>
  );
}
