import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ERPLayout } from "@/components/ERPLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Estoque from "./pages/Estoque";
import Pedidos from "./pages/Pedidos";
import Cardapio from "./pages/Cardapio";
import Financeiro from "./pages/Financeiro";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <ERPLayout>{children}</ERPLayout>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/estoque" element={<ProtectedRoute><Estoque /></ProtectedRoute>} />
            <Route path="/pedidos" element={<ProtectedRoute><Pedidos /></ProtectedRoute>} />
            <Route path="/cardapio" element={<ProtectedRoute><Cardapio /></ProtectedRoute>} />
            <Route path="/financeiro" element={<ProtectedRoute><Financeiro /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
