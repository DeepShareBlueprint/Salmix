import { useState, useEffect } from 'react';
import { useAuth } from '@/react-app/hooks/useAuth';
import Navbar from '@/react-app/components/Navbar';
import { Calendar, Clock, Plus, Edit2, Trash2, User, FileText, X } from 'lucide-react';
import { useAgenda } from '@/react-app/hooks/useAgenda';

export default function AgendaPage() {
  const { user } = useAuth();
  const [vendedorFiltro, setVendedorFiltro] = useState<string>('');
  const { compromissos, loading, addCompromisso, updateCompromisso, deleteCompromisso } = useAgenda(vendedorFiltro);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [clientes, setClientes] = useState<any[]>([]);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [userLevel, setUserLevel] = useState<string>('Representante');
  
  // Form state
  const [formData, setFormData] = useState({
    data: '',
    hora: '',
    cliente_id: '',
    tipo_atividade: 'visita',
    observacao: '',
    mensagem_gerente: '',
    status_visita: '',
    motivo_cancelamento: '',
  });

  // Buscar nível de acesso do usuário
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
    };

    fetchUserLevel();
  }, [user]);

  // Buscar clientes
  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const response = await fetch('/api/clientes');
        if (response.ok) {
          const data = await response.json();
          setClientes(data);
        }
      } catch (error) {
        console.error('Erro ao buscar clientes:', error);
      }
    };

    fetchClientes();
  }, []);

  // Buscar vendedores (apenas para Administradores)
  useEffect(() => {
    const fetchVendedores = async () => {
      if (userLevel === 'Administrador' || userLevel === 'Gerente') {
        try {
          const response = await fetch('/api/agenda/vendedores');
          if (response.ok) {
            const data = await response.json();
            setVendedores(data);
          }
        } catch (error) {
          console.error('Erro ao buscar vendedores:', error);
        }
      }
    };

    fetchVendedores();
  }, [userLevel]);

  // Filtrar compromissos de hoje e futuros
  const hoje = new Date().toISOString().split('T')[0];
  const proximosCompromissos = compromissos
    .filter(c => c.data >= hoje)
    .sort((a, b) => {
      if (a.data === b.data) {
        return a.hora.localeCompare(b.hora);
      }
      return a.data.localeCompare(b.data);
    })
    .slice(0, 5);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const vendedorId = user?.id || '';
    const success = editingId
      ? await updateCompromisso(editingId, { ...formData, vendedor_id: vendedorId })
      : await addCompromisso({ ...formData, vendedor_id: vendedorId });

    if (success) {
      setShowModal(false);
      setEditingId(null);
      setFormData({
        data: '',
        hora: '',
        cliente_id: '',
        tipo_atividade: 'visita',
        observacao: '',
        mensagem_gerente: '',
        status_visita: '',
        motivo_cancelamento: '',
      });
    }
  };

  const handleEdit = (compromisso: any) => {
    setEditingId(compromisso.id);
    setFormData({
      data: compromisso.data,
      hora: compromisso.hora,
      cliente_id: compromisso.cliente_id || '',
      tipo_atividade: compromisso.tipo_atividade,
      observacao: compromisso.observacao || '',
      mensagem_gerente: compromisso.mensagem_gerente || '',
      status_visita: compromisso.status_visita || '',
      motivo_cancelamento: compromisso.motivo_cancelamento || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Deseja realmente excluir este compromisso?')) {
      await deleteCompromisso(id);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5);
  };

  const getTipoAtividadeLabel = (tipo: string) => {
    const labels: { [key: string]: string } = {
      'visita': 'Visita',
      'follow-up': 'Follow-up',
      'entrega': 'Entrega de Material',
      'reuniao': 'Reunião',
      'outro': 'Outro',
    };
    return labels[tipo] || tipo;
  };

  const isAdminOrManager = userLevel === 'Administrador' || userLevel === 'Gerente';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <Navbar />
      
      <main className="lg:ml-64 p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Calendar className="w-8 h-8 sm:w-10 sm:h-10 text-blue-400" />
            Agenda do Vendedor
          </h1>
          <p className="text-slate-400 text-sm sm:text-base">
            {isAdminOrManager 
              ? 'Visualize e gerencie compromissos de todos os vendedores'
              : 'Gerencie seus compromissos de forma rápida e simples'}
          </p>
        </div>

        {/* Dia Atual */}
        <div className="mb-6 bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl p-6 shadow-xl">
          <div className="text-center">
            <p className="text-blue-100 text-sm font-medium mb-1">Hoje</p>
            <p className="text-white text-3xl font-bold">
              {new Date().toLocaleDateString('pt-BR', { 
                weekday: 'long', 
                day: '2-digit', 
                month: 'long', 
                year: 'numeric' 
              })}
            </p>
          </div>
        </div>

        

        {/* Botão Adicionar Compromisso */}
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({
              data: '',
              hora: '',
              cliente_id: '',
              tipo_atividade: 'visita',
              observacao: '',
              mensagem_gerente: '',
              status_visita: '',
              motivo_cancelamento: '',
            });
            setShowModal(true);
          }}
          className="w-full mb-6 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white rounded-2xl p-6 shadow-xl transition-all flex items-center justify-center gap-3 text-xl font-bold"
        >
          <Plus className="w-8 h-8" />
          Novo Compromisso
        </button>

        {/* Próximos Compromissos */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-slate-700">
          <div className="flex items-center justify-between mb-4 gap-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Clock className="w-6 h-6 text-blue-400" />
              Próximos Compromissos
            </h2>
            
            {isAdminOrManager && (
              <select
                value={vendedorFiltro}
                onChange={(e) => setVendedorFiltro(e.target.value)}
                className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm min-w-[200px]"
              >
                <option value="">Todos os Vendedores</option>
                {vendedores.map((v) => (
                  <option key={v.vendedor_id} value={v.vendedor_id}>
                    {v.vendedor_nome}
                  </option>
                ))}
              </select>
            )}
          </div>

          {loading ? (
            <div className="text-center py-8 text-slate-400">Carregando...</div>
          ) : proximosCompromissos.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Nenhum compromisso agendado</p>
              <p className="text-sm mt-2">Clique em "Novo Compromisso" para adicionar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {proximosCompromissos.map((compromisso) => (
                <div
                  key={compromisso.id}
                  className="bg-slate-700/50 rounded-xl p-4 border border-slate-600 hover:border-blue-500 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <div className="bg-blue-500/20 rounded-lg px-3 py-1">
                          <p className="text-blue-300 text-sm font-medium">
                            {formatDate(compromisso.data)}
                          </p>
                        </div>
                        <div className="bg-slate-600/50 rounded-lg px-3 py-1">
                          <p className="text-slate-300 text-sm font-medium">
                            {formatTime(compromisso.hora)}
                          </p>
                        </div>
                        {isAdminOrManager && !vendedorFiltro && compromisso.vendedor_nome && (
                          <>
                            <div className="bg-green-500/20 rounded-lg px-3 py-1">
                              <p className="text-green-300 text-sm font-medium">
                                {compromisso.vendedor_nome}
                              </p>
                            </div>
                            {compromisso.status_visita && (
                              <div className={`rounded-lg px-3 py-1 ${
                                compromisso.status_visita === 'concluida' 
                                  ? 'bg-green-500/20' 
                                  : compromisso.status_visita === 'cancelada'
                                  ? 'bg-red-500/20'
                                  : 'bg-yellow-500/20'
                              }`}>
                                <p className={`text-sm font-medium ${
                                  compromisso.status_visita === 'concluida' 
                                    ? 'text-green-300' 
                                    : compromisso.status_visita === 'cancelada'
                                    ? 'text-red-300'
                                    : 'text-yellow-300'
                                }`}>
                                  {compromisso.status_visita === 'concluida' && 'Concluída'}
                                  {compromisso.status_visita === 'cancelada' && 'Cancelada'}
                                  {compromisso.status_visita === 'alterada' && 'Alterada'}
                                </p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <p className="text-white font-medium">
                          {getTipoAtividadeLabel(compromisso.tipo_atividade)}
                        </p>
                      </div>
                      
                      {compromisso.nome_cliente && (
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <p className="text-slate-300 text-sm truncate">
                            {compromisso.nome_cliente}
                            {(compromisso.cidade || compromisso.estado) && (
                              <span className="text-slate-400 ml-1">
                                - {[compromisso.cidade, compromisso.estado].filter(Boolean).join('/')}
                              </span>
                            )}
                          </p>
                        </div>
                      )}
                      
                      {compromisso.observacao && (
                        <p className="text-slate-400 text-sm mt-2 line-clamp-2">
                          {compromisso.observacao}
                        </p>
                      )}
                      
                      {compromisso.mensagem_gerente && (
                        <div className="mt-3 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                          <p className="text-blue-300 text-xs font-semibold mb-1">Mensagem do Gerente</p>
                          <p className="text-blue-100 text-sm">{compromisso.mensagem_gerente}</p>
                        </div>
                      )}
                      
                      {compromisso.status_visita && (
                        <div className={`mt-3 rounded-lg p-3 ${
                          compromisso.status_visita === 'concluida' 
                            ? 'bg-green-500/10 border border-green-500/30' 
                            : compromisso.status_visita === 'cancelada'
                            ? 'bg-red-500/10 border border-red-500/30'
                            : 'bg-yellow-500/10 border border-yellow-500/30'
                        }`}>
                          <p className={`text-xs font-semibold mb-1 ${
                            compromisso.status_visita === 'concluida' 
                              ? 'text-green-300' 
                              : compromisso.status_visita === 'cancelada'
                              ? 'text-red-300'
                              : 'text-yellow-300'
                          }`}>
                            {compromisso.status_visita === 'concluida' && 'Visita Concluída'}
                            {compromisso.status_visita === 'cancelada' && 'Visita Cancelada'}
                            {compromisso.status_visita === 'alterada' && 'Data da visita alterada'}
                          </p>
                          {compromisso.motivo_cancelamento && (
                            <p className={`text-sm ${
                              compromisso.status_visita === 'concluida' 
                                ? 'text-green-100' 
                                : compromisso.status_visita === 'cancelada'
                                ? 'text-red-100'
                                : 'text-yellow-100'
                            }`}>
                              {compromisso.motivo_cancelamento}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleEdit(compromisso)}
                        className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
                        title="Editar"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(compromisso.id!)}
                        className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all"
                        title="Excluir"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-700">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">
                  {editingId ? 'Editar Compromisso' : 'Novo Compromisso'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-all"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Data *
                  </label>
                  <input
                    type="date"
                    value={formData.data}
                    onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                    required
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Horário *
                  </label>
                  <input
                    type="time"
                    value={formData.hora}
                    onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                    required
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Cliente
                  </label>
                  <select
                    value={formData.cliente_id}
                    onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                  >
                    <option value="">Selecione um cliente</option>
                    {clientes.map((cliente) => (
                      <option key={cliente.codigo_cliente} value={cliente.codigo_cliente}>
                        {cliente.nome_cliente}
                        {(cliente.cidade || cliente.estado) && ` - ${[cliente.cidade, cliente.estado].filter(Boolean).join('/')}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Tipo de Atividade *
                  </label>
                  <select
                    value={formData.tipo_atividade}
                    onChange={(e) => setFormData({ ...formData, tipo_atividade: e.target.value })}
                    required
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                  >
                    <option value="visita">Visita</option>
                    <option value="follow-up">Follow-up</option>
                    <option value="entrega">Entrega de Material</option>
                    <option value="reuniao">Reunião</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Observação
                  </label>
                  <textarea
                    value={formData.observacao}
                    onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg resize-none"
                    placeholder="Detalhes do compromisso..."
                  />
                </div>

                {userLevel === 'Administrador' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Mensagem do Gerente
                    </label>
                    <textarea
                      value={formData.mensagem_gerente}
                      onChange={(e) => setFormData({ ...formData, mensagem_gerente: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg resize-none"
                      placeholder="Mensagem para o vendedor..."
                    />
                  </div>
                )}

                {editingId && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Status da Visita
                      </label>
                      <select
                        value={formData.status_visita}
                        onChange={(e) => setFormData({ ...formData, status_visita: e.target.value, motivo_cancelamento: e.target.value !== 'cancelada' ? '' : formData.motivo_cancelamento })}
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                      >
                        <option value="">Selecione o status</option>
                        <option value="concluida">Visita Concluída</option>
                        <option value="cancelada">Visita Cancelada</option>
                        <option value="alterada">Data da visita alterada</option>
                      </select>
                    </div>

                    {formData.status_visita === 'cancelada' && (
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Motivo do Cancelamento *
                        </label>
                        <textarea
                          value={formData.motivo_cancelamento}
                          onChange={(e) => setFormData({ ...formData, motivo_cancelamento: e.target.value })}
                          rows={3}
                          required
                          className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg resize-none"
                          placeholder="Explique o motivo do cancelamento..."
                        />
                      </div>
                    )}
                  </>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all font-medium text-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-lg transition-all font-medium text-lg shadow-lg"
                  >
                    {editingId ? 'Salvar' : 'Criar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
