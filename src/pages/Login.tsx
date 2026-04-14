import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { IceCreamCone } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        const slug = companyName
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName || email,
              company_name: companyName,
              company_slug: slug || `empresa-${Date.now()}`,
            },
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Verifique seu email para confirmar.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary shadow-lg">
            <Zap className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="font-heading text-2xl">Milk Shake Mix Romão</CardTitle>
            <CardDescription className="mt-1">
              {isSignUp ? "Crie sua conta e comece grátis por 14 dias" : "Acesse o sistema de gestão"}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <>
                <Input
                  placeholder="Nome da empresa"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
                <Input
                  placeholder="Seu nome"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </>
            )}
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={loading}>
              {loading ? "Carregando..." : isSignUp ? "Criar conta grátis" : "Entrar"}
            </Button>
          </form>
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {isSignUp ? "Já tem conta? Faça login" : "Não tem conta? Teste grátis"}
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
