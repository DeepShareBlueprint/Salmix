import { useState } from 'react';
import { useAuth } from '@getmocha/users-service/react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  Mail, 
  Send, 
  CheckCircle, 
  ArrowLeft,
  User,
  AlertCircle
} from 'lucide-react';

export default function AccessRequest() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [requested, setRequested] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    cargo: '',
    justificativa: '',
    departamento: ''
  });

  const handleSubmitRequest = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      const response = await fetch('/api/access-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          nome: user.google_user_data.name || user.email,
          cargo: formData.cargo,
          departamento: formData.departamento,
          justificativa: formData.justificativa,
        }),
      });

      if (response.ok) {
        setRequested(true);
      } else {
        const error = await response.json();
        alert(error.message || 'Erro ao enviar solicitação');
      }
    } catch (error) {
      console.error('Erro ao solicitar acesso:', error);
      alert('Erro ao enviar solicitação');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (requested) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-slate-700 shadow-2xl text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-4">
              Solicitação Enviada!
            </h2>
            
            <p className="text-slate-300 mb-6">
              Sua solicitação de acesso foi enviada para os administradores do sistema. 
              Você receberá um email quando o acesso for aprovado.
            </p>
            
            <div className="space-y-4">
              <div className="bg-slate-700/50 rounded-lg p-4 text-left">
                <p className="text-sm text-slate-400 mb-1">Email solicitante:</p>
                <p className="text-white font-medium">{user?.email}</p>
              </div>
              
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar ao Login</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600 to-red-500 p-6 text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <Shield className="w-8 h-8 text-white" />
              <h1 className="text-2xl font-bold text-white">Acesso Restrito</h1>
            </div>
            <p className="text-red-100">
              Sistema de informações gerenciais - Acesso controlado
            </p>
          </div>

          {/* Content */}
          <div className="p-8 space-y-6">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-yellow-400 font-semibold mb-1">
                    Autorização Necessária
                  </h3>
                  <p className="text-yellow-300 text-sm">
                    Seu email não está autorizado a acessar este sistema. 
                    Solicite acesso preenchendo o formulário abaixo.
                  </p>
                </div>
              </div>
            </div>

            {/* User Info */}
            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <User className="w-5 h-5 text-blue-400" />
                <h3 className="text-white font-semibold">Usuário Identificado</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-slate-400">Nome:</p>
                  <p className="text-white font-medium">
                    {user?.google_user_data.name || 'Não informado'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Email:</p>
                  <p className="text-white font-medium">{user?.email}</p>
                </div>
              </div>
            </div>

            {/* Request Form */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3 mb-4">
                <Mail className="w-5 h-5 text-green-400" />
                <h3 className="text-white font-semibold">Solicitação de Acesso</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Cargo/Função *
                  </label>
                  <input
                    type="text"
                    value={formData.cargo}
                    onChange={(e) => setFormData({...formData, cargo: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-green-500 transition-all"
                    placeholder="Ex: Gerente Regional, Representante"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Departamento/Área
                  </label>
                  <input
                    type="text"
                    value={formData.departamento}
                    onChange={(e) => setFormData({...formData, departamento: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-green-500 transition-all"
                    placeholder="Ex: Vendas, Operações"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Justificativa do Acesso *
                </label>
                <textarea
                  value={formData.justificativa}
                  onChange={(e) => setFormData({...formData, justificativa: e.target.value})}
                  rows={4}
                  className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-green-500 transition-all"
                  placeholder="Explique por que precisa acessar o sistema e como será utilizado..."
                  required
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                onClick={handleSubmitRequest}
                disabled={loading || !formData.cargo.trim() || !formData.justificativa.trim()}
                className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white rounded-lg transition-all shadow-lg hover:shadow-green-500/50 disabled:bg-slate-600 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Solicitar Acesso</span>
                  </>
                )}
              </button>
              
              <button
                onClick={handleLogout}
                disabled={loading}
                className="flex items-center justify-center space-x-2 px-6 py-3 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar</span>
              </button>
            </div>

            {/* Info */}
            <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
              <p className="text-blue-300 text-sm">
                <strong>ℹ️ Processo de Aprovação:</strong> Sua solicitação será enviada automaticamente 
                para os administradores do sistema. Você receberá um email quando o acesso for aprovado 
                e poderá então fazer login normalmente.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
