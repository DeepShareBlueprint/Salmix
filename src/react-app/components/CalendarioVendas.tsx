import { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, Edit2, Trash2, User, FileText, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAgenda } from '@/react-app/hooks/useAgenda';

type ViewMode = 'mensal' | 'semanal' | 'diaria';

interface CalendarioVendasProps {
  userLevel: string;
  userId: string;
}

export default function CalendarioVendas({ userId }: CalendarioVendasProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('mensal');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [clientes, setClientes] = useState<any[]>([]);
  
  const { compromissos, loading, addCompromisso, updateCompromisso, deleteCompromisso } = useAgenda();
  
  const [formData, setFormData] = useState({
    data: '',
    hora: '',
    cliente_id: '',
    tipo_atividade: 'visita',
    observacao: '',
  });

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

  // Navegação de datas
  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewMode === 'mensal') {
      newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'semanal') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Gerar dias do mês
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days: Array<{ date: Date; isCurrentMonth: boolean }> = [];
    
    // Dias do mês anterior
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false
      });
    }
    
    // Dias do mês atual
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }
    
    // Dias do próximo mês
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }
    
    return days;
  };

  // Gerar dias da semana
  const getWeekDays = () => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day;
    startOfWeek.setDate(diff);
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      days.push(date);
    }
    return days;
  };

  // Filtrar compromissos por data
  const getCompromissosPorData = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return compromissos.filter(c => c.data === dateStr);
  };

  // Handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const success = editingId
      ? await updateCompromisso(editingId, { ...formData, vendedor_id: userId })
      : await addCompromisso({ ...formData, vendedor_id: userId });

    if (success) {
      setShowModal(false);
      setEditingId(null);
      setFormData({
        data: '',
        hora: '',
        cliente_id: '',
        tipo_atividade: 'visita',
        observacao: '',
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
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Deseja realmente excluir este compromisso?')) {
      await deleteCompromisso(id);
    }
  };

  const openNewModal = (date?: Date) => {
    setEditingId(null);
    const dateStr = date ? date.toISOString().split('T')[0] : '';
    setFormData({
      data: dateStr,
      hora: '',
      cliente_id: '',
      tipo_atividade: 'visita',
      observacao: '',
    });
    setShowModal(true);
  };

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5);
  };

  const getTipoAtividadeLabel = (tipo: string) => {
    const labels: { [key: string]: string } = {
      'visita': 'Visita',
      'follow-up': 'Follow-up',
      'entrega': 'Entrega',
      'reuniao': 'Reunião',
      'outro': 'Outro',
    };
    return labels[tipo] || tipo;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getHeaderText = () => {
    if (viewMode === 'mensal') {
      return currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    } else if (viewMode === 'semanal') {
      const weekDays = getWeekDays();
      const start = weekDays[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
      const end = weekDays[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
      return `${start} - ${end}`;
    } else {
      return currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
        <div className="text-center py-8 text-slate-400">Carregando calendário...</div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <Calendar className="w-7 h-7 text-blue-400" />
          Calendário de Compromissos
        </h2>
        <button
          onClick={() => openNewModal()}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all"
        >
          <Plus className="w-5 h-5" />
          Novo Compromisso
        </button>
      </div>

      {/* Controles de navegação e visualização */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        {/* Botões de visualização */}
        <div className="flex bg-slate-700 rounded-lg p-1">
          <button
            onClick={() => setViewMode('mensal')}
            className={`px-4 py-2 rounded-md transition-all ${
              viewMode === 'mensal'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Mês
          </button>
          <button
            onClick={() => setViewMode('semanal')}
            className={`px-4 py-2 rounded-md transition-all ${
              viewMode === 'semanal'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Semana
          </button>
          <button
            onClick={() => setViewMode('diaria')}
            className={`px-4 py-2 rounded-md transition-all ${
              viewMode === 'diaria'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Dia
          </button>
        </div>

        {/* Navegação de datas */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigateDate('prev')}
            className="p-2 hover:bg-slate-700 rounded-lg transition-all"
          >
            <ChevronLeft className="w-5 h-5 text-slate-300" />
          </button>
          
          <button
            onClick={goToToday}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all"
          >
            Hoje
          </button>
          
          <button
            onClick={() => navigateDate('next')}
            className="p-2 hover:bg-slate-700 rounded-lg transition-all"
          >
            <ChevronRight className="w-5 h-5 text-slate-300" />
          </button>
        </div>

        {/* Título da data */}
        <div className="text-lg font-semibold text-white capitalize">
          {getHeaderText()}
        </div>
      </div>

      {/* Conteúdo do calendário */}
      <div className="bg-slate-900/50 rounded-xl p-4 min-h-[500px]">
        {viewMode === 'mensal' && (
          <div>
            {/* Cabeçalho dos dias da semana */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div key={day} className="text-center text-sm font-semibold text-slate-400 py-2">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Grid de dias */}
            <div className="grid grid-cols-7 gap-2">
              {getDaysInMonth().map((day, index) => {
                const dayCompromissos = getCompromissosPorData(day.date);
                const isCurrentDay = isToday(day.date);
                
                return (
                  <div
                    key={index}
                    onClick={() => openNewModal(day.date)}
                    className={`min-h-[100px] p-2 rounded-lg border transition-all cursor-pointer ${
                      day.isCurrentMonth
                        ? isCurrentDay
                          ? 'bg-blue-900/30 border-blue-500 hover:bg-blue-900/40'
                          : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
                        : 'bg-slate-900/50 border-slate-800 opacity-50'
                    }`}
                  >
                    <div className={`text-sm font-medium mb-1 ${
                      isCurrentDay ? 'text-blue-300' : day.isCurrentMonth ? 'text-white' : 'text-slate-500'
                    }`}>
                      {day.date.getDate()}
                    </div>
                    
                    <div className="space-y-1">
                      {dayCompromissos.slice(0, 2).map(comp => (
                        <div
                          key={comp.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(comp);
                          }}
                          className="text-xs bg-blue-600/20 text-blue-300 px-1 py-0.5 rounded truncate hover:bg-blue-600/30"
                        >
                          {formatTime(comp.hora)} {getTipoAtividadeLabel(comp.tipo_atividade)}
                        </div>
                      ))}
                      {dayCompromissos.length > 2 && (
                        <div className="text-xs text-slate-400">
                          +{dayCompromissos.length - 2} mais
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {viewMode === 'semanal' && (
          <div>
            {/* Cabeçalho da semana */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              {getWeekDays().map((day, index) => {
                const isCurrentDay = isToday(day);
                return (
                  <div
                    key={index}
                    className={`text-center p-2 rounded-lg ${
                      isCurrentDay ? 'bg-blue-900/30 border border-blue-500' : 'bg-slate-800'
                    }`}
                  >
                    <div className="text-xs text-slate-400">
                      {day.toLocaleDateString('pt-BR', { weekday: 'short' })}
                    </div>
                    <div className={`text-lg font-bold ${isCurrentDay ? 'text-blue-300' : 'text-white'}`}>
                      {day.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Compromissos da semana */}
            <div className="grid grid-cols-7 gap-2">
              {getWeekDays().map((day, index) => {
                const dayCompromissos = getCompromissosPorData(day);
                
                return (
                  <div
                    key={index}
                    onClick={() => openNewModal(day)}
                    className="min-h-[300px] p-2 bg-slate-800 rounded-lg border border-slate-700 hover:bg-slate-700 transition-all cursor-pointer"
                  >
                    <div className="space-y-2">
                      {dayCompromissos.map(comp => (
                        <div
                          key={comp.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(comp);
                          }}
                          className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-2 hover:bg-blue-600/30 transition-all"
                        >
                          <div className="flex items-center gap-1 text-xs text-blue-300 mb-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(comp.hora)}
                          </div>
                          <div className="text-xs text-white font-medium">
                            {getTipoAtividadeLabel(comp.tipo_atividade)}
                          </div>
                          {comp.nome_cliente && (
                            <div className="text-xs text-slate-400 truncate">
                              {comp.nome_cliente}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {viewMode === 'diaria' && (
          <div>
            {/* Compromissos do dia */}
            <div className="space-y-3">
              {getCompromissosPorData(currentDate).length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Nenhum compromisso para este dia</p>
                  <button
                    onClick={() => openNewModal(currentDate)}
                    className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
                  >
                    Adicionar Compromisso
                  </button>
                </div>
              ) : (
                getCompromissosPorData(currentDate)
                  .sort((a, b) => a.hora.localeCompare(b.hora))
                  .map(compromisso => (
                    <div
                      key={compromisso.id}
                      className="bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-blue-500 transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="bg-blue-500/20 rounded-lg px-3 py-1">
                              <p className="text-blue-300 text-sm font-medium">
                                {formatTime(compromisso.hora)}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="w-4 h-4 text-slate-400" />
                            <p className="text-white font-medium">
                              {getTipoAtividadeLabel(compromisso.tipo_atividade)}
                            </p>
                          </div>
                          
                          {compromisso.nome_cliente && (
                            <div className="flex items-center gap-2 mb-1">
                              <User className="w-4 h-4 text-slate-400" />
                              <p className="text-slate-300 text-sm">
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
                            <p className="text-slate-400 text-sm mt-2">
                              {compromisso.observacao}
                            </p>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(compromisso)}
                            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(compromisso.id!)}
                            className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal de compromisso */}
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Data *
                </label>
                <input
                  type="date"
                  value={formData.data}
                  onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                  required
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Cliente
                </label>
                <select
                  value={formData.cliente_id}
                  onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Detalhes do compromisso..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-lg transition-all font-medium shadow-lg"
                >
                  {editingId ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
