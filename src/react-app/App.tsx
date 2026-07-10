import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from '@/react-app/hooks/useAuth';
import HomePage from "@/react-app/pages/Home";
import Login from "@/react-app/pages/Login";
import AuthCallback from "@/react-app/pages/AuthCallback";
import Dashboard from "@/react-app/pages/Dashboard";
import Produtos from "@/react-app/pages/Produtos";
import Forecast from "@/react-app/pages/Forecast";
import Vendas from "@/react-app/pages/Vendas";
import Estoque from "@/react-app/pages/Estoque";
import ImportacaoProtegida from "@/react-app/pages/ImportacaoProtegida";
import Representantes from "@/react-app/pages/Representantes";
import Vendedores from "@/react-app/pages/Vendedores";
import Usuarios from "@/react-app/pages/Usuarios";
import TesteEmail from "@/react-app/pages/TesteEmail";
import AccessRequest from "@/react-app/pages/AccessRequest";
import Relatorios from "@/react-app/pages/Relatorios";
import ForecastRelatorios from "@/react-app/pages/ForecastRelatorios";
import EficienciaVendedor from "@/react-app/pages/EficienciaVendedor";
import PRD from "@/react-app/pages/PRD";
import Budget from "@/react-app/pages/Budget";
import NovoPedido from "@/react-app/pages/NovoPedido";
import ListaPedidos from "@/react-app/pages/ListaPedidos";
import ConfirmarPedido from "@/react-app/pages/ConfirmarPedido";
import RecebePedido from "@/react-app/pages/RecebePedido";
import EditarPedido from "@/react-app/pages/EditarPedido";
import Agenda from "@/react-app/pages/Agenda";
import DiarioCompromissos from "@/react-app/pages/DiarioCompromissos";
import RotaInteligente from "@/react-app/pages/RotaInteligente";
import Config from "@/react-app/pages/Config";
import LimpezaDados from "@/react-app/pages/LimpezaDados";
import RoleProtectedRoute from "@/react-app/components/RoleProtectedRoute";
import { useSessionRenewal } from "@/react-app/hooks/useSessionRenewal";
import { Loader2 } from 'lucide-react';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isPending } = useAuth();
  const [userLevel, setUserLevel] = React.useState<string | null>(null);
  const [checkingLevel, setCheckingLevel] = React.useState(true);

  React.useEffect(() => {
    if (!user?.email) {
      setCheckingLevel(false);
      return;
    }

    const fetchUserLevel = async () => {
      try {
        const response = await fetch('/api/users/me');
        if (response.ok) {
          const userData = await response.json();
          const userResponse = await fetch(`/api/usuarios?email=${encodeURIComponent(userData.email)}`);
          if (userResponse.ok) {
            const localUsers = await userResponse.json();
            const localUser = localUsers.find((u: any) => u.email === userData.email);
            if (localUser) {
              setUserLevel(localUser.nivel_acesso);
            }
          }
        }
      } catch (error) {
        console.error('Erro ao buscar nível do usuário:', error);
      } finally {
        setCheckingLevel(false);
      }
    };

    fetchUserLevel();
  }, [user?.email]);

  if (isPending || checkingLevel) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirecionar Coord Tec Rum BR para /vendas
  if (userLevel === 'Coord Tec Rum BR' && window.location.pathname !== '/vendas') {
    return <Navigate to="/vendas" replace />;
  }

  return <>{children}</>;
}

function SessionManager() {
  // Hook único para renovar sessão automaticamente enquanto ativo
  useSessionRenewal();
  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <SessionManager />
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/access-request" element={<AccessRequest />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={['Administrador']}>
                  <Dashboard />
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/produtos"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={['Administrador', 'Gerente']}>
                  <Produtos />
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/forecast"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={['Administrador', 'Gerente']}>
                  <Forecast />
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendas"
            element={
              <ProtectedRoute>
                <Vendas />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendas/eficiencia"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={['Administrador', 'Gerente']}>
                  <EficienciaVendedor />
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendas/agenda"
            element={
              <ProtectedRoute>
                <Agenda />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendas/diario"
            element={
              <ProtectedRoute>
                <DiarioCompromissos />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendas/rota"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={['Administrador', 'Gerente', 'Representante']}>
                  <RotaInteligente />
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendas/pedidos"
            element={
              <ProtectedRoute>
                <NovoPedido />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendas/pedidos/lista"
            element={
              <ProtectedRoute>
                <ListaPedidos />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendas/pedidos/confirmar"
            element={
              <ProtectedRoute>
                <ConfirmarPedido />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendas/pedidos/editar/:id"
            element={
              <ProtectedRoute>
                <EditarPedido />
              </ProtectedRoute>
            }
          />
          <Route
            path="/estoque"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={['Administrador', 'Gerente']}>
                  <Estoque />
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/importacao"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={['Administrador', 'Gerente', 'Operador']}>
                  <ImportacaoProtegida />
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/representantes"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={['Administrador', 'Gerente']}>
                  <Representantes />
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/usuarios"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={['Administrador', 'Gerente', 'Operador']}>
                  <Usuarios />
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/teste-email"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={['Administrador', 'Gerente', 'Operador']}>
                  <TesteEmail />
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/relatorios"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={['Administrador', 'Gerente']}>
                  <Relatorios />
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendedores"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={['Administrador', 'Gerente']}>
                  <Vendedores />
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/forecast/relatorios"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={['Administrador', 'Gerente']}>
                  <ForecastRelatorios />
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/forecast/budget"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={['Administrador', 'Gerente']}>
                  <Budget />
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/prd"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={['Administrador', 'Gerente', 'Operador']}>
                  <PRD />
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/recebe-pedido"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={['Administrador', 'Gerente', 'Operador']}>
                  <RecebePedido />
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/config"
            element={
              <ProtectedRoute>
                <Config />
              </ProtectedRoute>
            }
          />
          <Route
            path="/limpeza-dados"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute allowedRoles={['Administrador', 'Gerente', 'Operador']}>
                  <LimpezaDados />
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
