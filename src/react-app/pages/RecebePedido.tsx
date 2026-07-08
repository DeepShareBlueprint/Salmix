import { useState, useEffect } from 'react';
import Navbar from '@/react-app/components/Navbar';
import { Mail, Plus, Trash2, AlertCircle, Check } from 'lucide-react';

interface Recipient {
  id: number;
  nome: string;
  email: string;
  ativo: boolean;
}

export default function RecebePedido() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ nome: '', email: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRecipients();
  }, []);

  const fetchRecipients = async () => {
    try {
      const response = await fetch('/api/pedido-recipients');
      if (!response.ok) throw new Error('Erro ao buscar destinatários');
      const data = await response.json();
      setRecipients(data);
    } catch (error) {
      console.error('Erro ao carregar destinatários:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome.trim() || !formData.email.trim()) {
      alert('Por favor, preencha todos os campos');
      return;
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      alert('Por favor, insira um email válido');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/pedido-recipients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Erro ao adicionar destinatário');

      await fetchRecipients();
      setShowModal(false);
      setFormData({ nome: '', email: '' });
    } catch (error) {
      alert('Erro ao adicionar destinatário: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (id: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/pedido-recipients/${id}/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo: !currentStatus }),
      });

      if (!response.ok) throw new Error('Erro ao atualizar status');

      await fetchRecipients();
    } catch (error) {
      alert('Erro ao atualizar status: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja remover este destinatário?')) return;

    try {
      const response = await fetch(`/api/pedido-recipients/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Erro ao remover destinatário');

      await fetchRecipients();
    } catch (error) {
      alert('Erro ao remover destinatário: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 pt-20 lg:pt-6 lg:ml-64 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400">Carregando destinatários...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-6 pt-20 lg:pt-6 lg:ml-64">
        <div className="max-w-5xl mx-auto space-y-4 md:space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Recebe Pedido</h1>
              <p className="text-slate-400 text-sm md:text-base">Gerenciar destinatários de pedidos por email</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center justify-center space-x-2 px-4 md:px-6 py-2.5 md:py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-lg transition-all shadow-lg hover:shadow-blue-500/50"
            >
              <Plus className="w-4 h-4 md:w-5 md:h-5" />
              <span className="text-sm md:text-base">Adicionar Destinatário</span>
            </button>
          </div>

          {/* Info Card */}
          <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/20 rounded-xl p-4 md:p-6 border border-blue-700/50 shadow-xl">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm md:text-base text-blue-300">
                  Os emails cadastrados abaixo receberão automaticamente os pedidos em formato CSV quando forem finalizados pelos vendedores.
                </p>
              </div>
            </div>
          </div>

          {/* Recipients List */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 md:p-6 border border-slate-700 shadow-xl">
            <h3 className="text-base md:text-lg font-semibold text-white mb-4 flex items-center space-x-2">
              <Mail className="w-4 h-4 md:w-5 md:h-5 text-green-400" />
              <span>Destinatários Cadastrados</span>
              {recipients.filter(r => r.ativo).length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-green-600 text-white text-xs rounded-full">
                  {recipients.filter(r => r.ativo).length} ativos
                </span>
              )}
            </h3>

            {recipients.length === 0 ? (
              <div className="text-center py-8 md:py-12">
                <Mail className="w-12 h-12 md:w-16 md:h-16 text-slate-600 mx-auto mb-3 md:mb-4" />
                <p className="text-slate-400 text-sm md:text-base">Nenhum destinatário cadastrado</p>
                <p className="text-slate-500 text-xs md:text-sm mt-1">Clique em "Adicionar Destinatário" para começar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recipients.map((recipient) => (
                  <div
                    key={recipient.id}
                    className={`p-3 md:p-4 rounded-lg border transition-all ${
                      recipient.ativo
                        ? 'bg-slate-700/50 border-slate-600'
                        : 'bg-slate-800/50 border-slate-700 opacity-60'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="font-medium text-white text-sm md:text-base truncate">
                            {recipient.nome}
                          </p>
                          {recipient.ativo && (
                            <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs md:text-sm text-slate-400 truncate">{recipient.email}</p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleToggleActive(recipient.id, recipient.ativo)}
                          className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg transition-all text-xs md:text-sm font-medium ${
                            recipient.ativo
                              ? 'bg-green-600 hover:bg-green-500 text-white'
                              : 'bg-slate-600 hover:bg-slate-500 text-white'
                          }`}
                        >
                          {recipient.ativo ? 'Ativo' : 'Inativo'}
                        </button>
                        <button
                          onClick={() => handleDelete(recipient.id)}
                          className="p-1.5 md:p-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-2xl w-full max-w-md">
            <div className="p-4 md:p-6 border-b border-slate-700">
              <h3 className="text-lg md:text-xl font-semibold text-white">Adicionar Destinatário</h3>
            </div>

            <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nome
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Digite o nome..."
                  className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500 text-sm md:text-base"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Digite o email..."
                  className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500 text-sm md:text-base"
                />
              </div>

              <div className="flex flex-col-reverse md:flex-row gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setFormData({ nome: '', email: '' });
                  }}
                  className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all text-sm md:text-base"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-lg transition-all shadow-lg hover:shadow-blue-500/50 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed disabled:shadow-none text-sm md:text-base"
                >
                  {submitting ? 'Adicionando...' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
