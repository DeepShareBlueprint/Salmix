import { useAuth } from '@/react-app/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { TrendingUp, BarChart3, Package, Database, AlertCircle } from 'lucide-react';

export default function Login() {
  const { redirectToLogin, user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  // Não redirecionar automaticamente - deixar o usuário ver suas informações

  const handleLogin = async () => {
    try {
      setError(null);
      await redirectToLogin();
    } catch (err) {
      console.error('Erro ao fazer login:', err);
      setError('Erro ao conectar com o serviço de autenticação do Google. Verifique se as credenciais OAuth estão configuradas corretamente. Entre em contato com o suporte.');
    }
  };

  const handleContinue = () => {
    navigate('/dashboard');
  };

  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left Side - Branding */}
        <div className="space-y-6">
          <div className="flex items-center space-x-3">
            <img 
              src="/logo-sales-manager.png"
              alt="SalesManager Logo"
              className="w-16 h-16 rounded-2xl object-cover shadow-2xl shadow-blue-500/50"
            />
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent">
                SalesManager
              </h1>
              <p className="text-slate-400 text-sm">© 2026 Daxtellk Systems</p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-white">
              Gestão inteligente de vendas
            </h2>
            <p className="text-slate-400 text-lg">
              Plataforma de BI corporativa para o gerenciamento completo do ciclo de vendas, desde o planejamento até o acompanhamento dos resultados.
              Inclui dashboard executivo, análises de performance e controle total das operações comerciais, garantindo mais agilidade, precisão e decisões estratégicas com base em dados.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: TrendingUp, title: 'Vendas', desc: 'Acompanhamento em tempo real' },
              { icon: BarChart3, title: 'Analytics', desc: 'Insights e previsões' },
              { icon: Package, title: 'Produtos', desc: 'Gestão de catálogo' },
              { icon: Database, title: 'Estoque', desc: 'Controle automático' }
            ].map((feature, i) => (
              <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 backdrop-blur-sm">
                <feature.icon className="w-8 h-8 text-blue-400 mb-2" />
                <h3 className="text-white font-semibold">{feature.title}</h3>
                <p className="text-slate-400 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side - Login Card */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-slate-700 shadow-2xl">
          <div className="text-center space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">Bem-vindo</h3>
              {user ? (
                <div className="space-y-2">
                  <p className="text-slate-400">Você está conectado como:</p>
                  <div className="bg-slate-700/50 rounded-lg p-4 mt-2">
                    <p className="text-white font-medium">{user.google_user_data.name || 'Usuário'}</p>
                    <p className="text-blue-400 text-sm mt-1">{user.email}</p>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400">Faça login para acessar o sistema</p>
              )}
            </div>

            <div className="py-8 space-y-4">
              {user ? (
                <>
                  <button
                    onClick={handleContinue}
                    className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all font-medium"
                  >
                    Continuar para o Dashboard
                  </button>
                  <button
                    onClick={logout}
                    className="w-full px-6 py-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all font-medium"
                  >
                    Sair
                  </button>
                </>
              ) : (
                <button
                  onClick={handleLogin}
                  className="w-full flex items-center justify-center space-x-3 px-6 py-4 bg-white hover:bg-gray-100 text-slate-900 rounded-xl shadow-lg hover:shadow-xl transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span>Continuar com Google</span>
                </button>
              )}

              {error && (
                <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-red-200 font-medium mb-1">Erro de autenticação</p>
                    <p className="text-xs text-red-300">{error}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-slate-700">
              <p className="text-slate-500 text-sm">
                Sistema corporativo - Acesso exclusivo para funcionários autorizados
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
