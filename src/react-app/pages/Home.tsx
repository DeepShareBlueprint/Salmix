import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@getmocha/users-service/react';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const { user, isPending } = useAuth();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (isPending) return;

    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    const checkUserLevelAndRedirect = async () => {
      try {
        const response = await fetch('/api/users/me');
        if (response.ok) {
          const userData = await response.json();
          const userResponse = await fetch(`/api/usuarios?email=${encodeURIComponent(userData.email)}`);
          if (userResponse.ok) {
            const localUsers = await userResponse.json();
            const localUser = localUsers.find((u: any) => u.email === userData.email);
            
            if (localUser) {
              // Administrador vai para Dashboard, todos os outros vão para Vendas
              if (localUser.nivel_acesso === 'Administrador') {
                navigate('/dashboard', { replace: true });
              } else {
                navigate('/vendas', { replace: true });
              }
            } else {
              // Se não encontrou usuário local, redireciona para vendas por segurança
              navigate('/vendas', { replace: true });
            }
          }
        }
      } catch (error) {
        console.error('Erro ao verificar nível do usuário:', error);
        navigate('/vendas', { replace: true });
      } finally {
        setChecking(false);
      }
    };

    checkUserLevelAndRedirect();
  }, [navigate, user, isPending]);

  if (isPending || checking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="text-center space-y-4">
          <div className="animate-spin">
            <Loader2 className="w-10 h-10 text-blue-500" />
          </div>
          <p className="text-slate-400">Carregando...</p>
        </div>
      </div>
    );
  }

  return null;
}
