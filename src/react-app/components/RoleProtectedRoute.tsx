import { useAuth } from '@/react-app/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function RoleProtectedRoute({ children, allowedRoles }: RoleProtectedRouteProps) {
  const { user, isPending } = useAuth();
  const [userLevel, setUserLevel] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserLevel = async () => {
      if (user) {
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
        }
      }
      setIsLoading(false);
    };

    fetchUserLevel();
  }, [user]);

  if (isPending || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Se não houver restrições de role, permite acesso
  if (!allowedRoles || allowedRoles.length === 0) {
    return <>{children}</>;
  }

  // Verifica se o usuário tem permissão
  if (userLevel && allowedRoles.includes(userLevel)) {
    return <>{children}</>;
  }

  // Redireciona para página permitida baseada no nível
  switch (userLevel) {
    case 'Administrador':
      return <Navigate to="/dashboard" replace />;
    case 'Gerente':
      return <Navigate to="/vendas" replace />;
    case 'Operador':
      return <Navigate to="/importacao" replace />;
    default:
      // Todos os outros níveis (Representante, Coord Tec Rum BR, etc) vão para Vendas
      return <Navigate to="/vendas" replace />;
  }
}
