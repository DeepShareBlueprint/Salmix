import { useEffect } from 'react';
import { useAuth } from '@/react-app/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const { exchangeCodeForSessionToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('AuthCallback: Iniciando troca de token...');
        await exchangeCodeForSessionToken();
        console.log('AuthCallback: Token trocado com sucesso');
        
        // Aguardar um pouco para garantir que o token foi processado
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Retry logic para buscar dados do usuário
        let response;
        let retries = 3;
        
        while (retries > 0) {
          try {
            console.log('AuthCallback: Buscando dados do usuário... (tentativa:', 4 - retries, ')');
            response = await fetch('/api/users/me', {
              credentials: 'include',
              headers: {
                'Cache-Control': 'no-cache'
              }
            });
            console.log('AuthCallback: Resposta de /api/users/me:', response.status);
            
            if (response.ok) {
              break;
            }
            
            if (response.status === 401 && retries > 1) {
              console.log('AuthCallback: 401 recebido, aguardando antes de tentar novamente...');
              await new Promise(resolve => setTimeout(resolve, 1000));
              retries--;
              continue;
            }
            
            break;
          } catch (fetchError) {
            console.error('AuthCallback: Erro ao fazer fetch:', fetchError);
            if (retries > 1) {
              await new Promise(resolve => setTimeout(resolve, 1000));
              retries--;
              continue;
            }
            throw fetchError;
          }
        }
        
        if (response && response.ok) {
          const userData = await response.json();
          console.log('AuthCallback: userData recebido', userData);
          
          // Verificar se o usuário está autorizado
          if (userData.authorized === false) {
            console.log('AuthCallback: Usuário não autorizado, redirecionando para solicitação de acesso');
            navigate('/access-request', { replace: true });
            return;
          }
          
          // Buscar dados do usuário na tabela local
          console.log('AuthCallback: Buscando usuário local para:', userData.email);
          const userResponse = await fetch(`/api/usuarios?email=${encodeURIComponent(userData.email)}`, {
            credentials: 'include'
          });
          console.log('AuthCallback: Resposta de /api/usuarios:', userResponse.status);
          if (userResponse.ok) {
            const localUsers = await userResponse.json();
            console.log('AuthCallback: localUsers encontrados', localUsers);
            const localUser = localUsers.find((u: any) => u.email === userData.email);
            
            if (localUser) {
              const nivelAcesso = localUser.nivel_acesso;
              console.log('AuthCallback: nível de acesso do usuário:', nivelAcesso);
              
              // Redirecionar baseado no nível de acesso
              if (nivelAcesso === 'Administrador') {
                // Apenas Administrador vai para Dashboard
                console.log('Redirecionando Administrador para Dashboard');
                navigate('/dashboard', { replace: true });
              } else if (nivelAcesso === 'Operador') {
                // Operador vai para Importação
                console.log('Redirecionando Operador para Importação');
                navigate('/importacao', { replace: true });
              } else {
                // Todos os outros (Gerente, Representante, Coord Tec Rum BR, etc) vão para Vendas
                console.log('Redirecionando para Gestão de Vendas');
                navigate('/vendas', { replace: true });
              }
              return;
            } else {
              // Usuário não encontrado na tabela local
              console.log('AuthCallback: Usuário não encontrado na tabela local');
              navigate('/access-request', { replace: true });
              return;
            }
          } else {
            console.log('AuthCallback: Erro ao buscar usuários locais');
            navigate('/access-request', { replace: true });
            return;
          }
        } else {
          console.log('AuthCallback: Erro ao buscar /api/users/me - status:', response?.status);
          navigate('/login', { replace: true });
          return;
        }
      } catch (error) {
        console.error('AuthCallback: Error exchanging code:', error);
        navigate('/login', { replace: true });
      }
    };

    handleCallback();
  }, [exchangeCodeForSessionToken, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
        <h2 className="text-2xl font-bold text-white">Autenticando...</h2>
        <p className="text-slate-400">Por favor, aguarde enquanto finalizamos seu login</p>
      </div>
    </div>
  );
}
