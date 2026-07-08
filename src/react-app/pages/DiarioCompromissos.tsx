import { useState, useMemo } from 'react';
import { useAuth } from '@/react-app/hooks/useAuth';
import Navbar from '@/react-app/components/Navbar';
import { Calendar, Plus, Edit2, Trash2, X, ChevronLeft, ChevronRight, Grid3x3, List, Columns } from 'lucide-react';
import { useDiarioCompromissos } from '@/react-app/hooks/useDiarioCompromissos';

type ViewMode = 'mensal' | 'semanal' | 'diaria';

export default function DiarioCompromissosPage() {
  const { user } = useAuth();
  const { compromissos, loading, addCompromisso, updateCompromisso, deleteCompromisso } = useDiarioCompromissos();
  const [viewMode, setViewMode] = useState<ViewMode>('mensal');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    data: '',
    data_fim: '',
    hora: '',
    hora_termino: '',
  });

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
        titulo: '',
        descricao: '',
        data: '',
        data_fim: '',
        hora: '',
        hora_termino: '',
      });
    }
  };

  const handleEdit = (compromisso: any) => {
    setEditingId(compromisso.id);
    setFormData({
      titulo: compromisso.titulo || '',
      descricao: compromisso.descricao || compromisso.observacao || '',
      data: compromisso.data,
      data_fim: compromisso.data_fim || compromisso.data,
      hora: compromisso.hora,
      hora_termino: compromisso.hora_termino || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Deseja realmente excluir este compromisso?')) {
      await deleteCompromisso(id);
    }
  };

  // Funções auxiliares para navegação de datas
  const changeMonth = (increment: number) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + increment);
    setSelectedDate(newDate);
  };

  const changeWeek = (increment: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (increment * 7));
    setSelectedDate(newDate);
  };

  const changeDay = (increment: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + increment);
    setSelectedDate(newDate);
  };

  // Filtrar compromissos por data
  const compromissosDoMes = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    return compromissos.filter(c => {
      const dataComp = new Date(c.data);
      return dataComp.getFullYear() === year && dataComp.getMonth() === month;
    });
  }, [compromissos, selectedDate]);

  const compromissosDaSemana = useMemo(() => {
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    return compromissos.filter(c => {
      const dataComp = new Date(c.data);
      return dataComp >= startOfWeek && dataComp <= endOfWeek;
    });
  }, [compromissos, selectedDate]);

  const compromissosDoDia = useMemo(() => {
    const dateStr = selectedDate.toISOString().split('T')[0];
    return compromissos.filter(c => c.data === dateStr);
  }, [compromissos, selectedDate]);

  // Renderizar visualização mensal
  const renderMensalView = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days = [];
    
    // Dias vazios no início
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 border border-slate-700"></div>);
    }

    // Dias do mês
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const compromissosDoDia = compromissosDoMes.filter(c => c.data === dateStr);
      const isToday = new Date().toISOString().split('T')[0] === dateStr;
      const currentDayDate = new Date(year, month, day);
      const isWeekend = currentDayDate.getDay() === 0 || currentDayDate.getDay() === 6;

      days.push(
        <div
          key={day}
          className={`h-24 border border-slate-700 p-2 overflow-y-auto cursor-pointer hover:bg-slate-700/30 transition-all ${
            isToday ? 'bg-blue-500/10 border-blue-500' : ''
          }`}
          onClick={() => {
            setSelectedDate(new Date(year, month, day));
            setViewMode('diaria');
          }}
        >
          <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-400' : isWeekend ? 'text-red-400' : 'text-slate-300'}`}>
            {day}
          </div>
          {compromissosDoDia.slice(0, 2).map(c => {
            const compromissoDate = new Date(c.data + 'T00:00:00');
            const isCompromissoWeekend = compromissoDate.getDay() === 0 || compromissoDate.getDay() === 6;
            
            return (
              <div
                key={c.id}
                className={`text-xs rounded px-1 py-0.5 mb-1 ${
                  isCompromissoWeekend 
                    ? 'bg-red-600/20 text-red-300' 
                    : 'bg-blue-600/20 text-blue-300'
                }`}
              >
                <div className="truncate">
                  {c.hora.substring(0, 5)} {c.titulo}
                </div>
                {c.data_fim && c.data_fim !== c.data && (
                  <div className="text-[10px] text-amber-300 truncate">
                    até {new Date(c.data_fim + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </div>
                )}
              </div>
            );
          })}
          {compromissosDoDia.length > 2 && (
            <div className="text-xs text-slate-400">+{compromissosDoDia.length - 2} mais</div>
          )}
        </div>
      );
    }

    return (
      <div>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-slate-400 py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days}
        </div>
      </div>
    );
  };

  // Renderizar visualização semanal
  const renderSemanalView = () => {
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(startOfWeek);
      currentDay.setDate(startOfWeek.getDate() + i);
      const dateStr = currentDay.toISOString().split('T')[0];
      const compromissosDoDia = compromissosDaSemana.filter(c => c.data === dateStr);
      const isToday = new Date().toISOString().split('T')[0] === dateStr;

      days.push(
        <div key={i} className="border border-slate-700 rounded-lg p-3">
          <div className={`text-center mb-3 ${isToday ? 'text-blue-400' : 'text-slate-300'}`}>
            <div className="text-xs font-medium">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][i]}
            </div>
            <div className={`text-2xl font-bold ${isToday ? 'bg-blue-500 text-white rounded-full w-10 h-10 mx-auto flex items-center justify-center' : ''}`}>
              {currentDay.getDate()}
            </div>
          </div>
          <div className="space-y-2">
            {compromissosDoDia.map(c => {
              const compromissoDate = new Date(c.data + 'T00:00:00');
              const isCompromissoWeekend = compromissoDate.getDay() === 0 || compromissoDate.getDay() === 6;
              
              return (
                <div
                  key={c.id}
                  className="bg-slate-700/50 rounded-lg p-2 hover:bg-slate-700 transition-all cursor-pointer"
                  onClick={() => handleEdit(c)}
                >
                  <div className={`text-sm font-medium truncate ${isCompromissoWeekend ? 'text-red-400' : 'text-white'}`}>
                    {c.titulo}
                  </div>
                  <div className="text-xs text-slate-400">
                    {c.hora.substring(0, 5)} {c.hora_termino && `- ${c.hora_termino.substring(0, 5)}`}
                  </div>
                  {c.data_fim && c.data_fim !== c.data && (
                    <div className="text-[10px] text-amber-300 mt-1 truncate">
                      até {new Date(c.data_fim + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {days}
      </div>
    );
  };

  // Renderizar visualização diária
  const renderDiariaView = () => {
    const sortedCompromissos = [...compromissosDoDia].sort((a, b) => a.hora.localeCompare(b.hora));

    return (
      <div className="space-y-3">
        {sortedCompromissos.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Nenhum compromisso para este dia</p>
            <p className="text-sm mt-2">Clique em "Novo" para adicionar</p>
          </div>
        ) : (
          sortedCompromissos.map(c => {
            const compromissoDate = new Date(c.data + 'T00:00:00');
            const isCompromissoWeekend = compromissoDate.getDay() === 0 || compromissoDate.getDay() === 6;
            
            return (
              <div
                key={c.id}
                className="bg-slate-700/50 rounded-xl p-4 border border-slate-600 hover:border-blue-500 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`rounded-lg px-3 py-1 ${isCompromissoWeekend ? 'bg-red-500/20' : 'bg-blue-500/20'}`}>
                        <p className={`text-sm font-medium ${isCompromissoWeekend ? 'text-red-300' : 'text-blue-300'}`}>
                          {c.hora.substring(0, 5)} {c.hora_termino && `- ${c.hora_termino.substring(0, 5)}`}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-medium text-lg ${isCompromissoWeekend ? 'text-red-400' : 'text-white'}`}>
                        {c.titulo}
                      </h3>
                      {c.nome_cliente && (
                        <span className="text-slate-400 text-sm">
                          • {c.nome_cliente}{c.cidade && ` - ${c.cidade}`}
                        </span>
                      )}
                    </div>
                    
                    {c.data_fim && c.data_fim !== c.data && (
                      <p className="text-amber-400 text-xs mb-1">
                        Término: {new Date(c.data_fim + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </p>
                    )}
                    
                    {c.descricao && (
                      <p className="text-slate-400 text-sm">{c.descricao}</p>
                    )}
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(c)}
                      className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
                      title="Editar"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(c.id!)}
                      className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all"
                      title="Excluir"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  };

  const formatDateHeader = () => {
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    
    if (viewMode === 'mensal') {
      return `${months[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
    } else if (viewMode === 'semanal') {
      const startOfWeek = new Date(selectedDate);
      startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return `${startOfWeek.getDate()} - ${endOfWeek.getDate()} de ${months[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
    } else {
      return selectedDate.toLocaleDateString('pt-BR', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
    }
  };

  const handleNavigate = (increment: number) => {
    if (viewMode === 'mensal') changeMonth(increment);
    else if (viewMode === 'semanal') changeWeek(increment);
    else changeDay(increment);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <Navbar />
      
      <main className="lg:ml-64 p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Calendar className="w-8 h-8 sm:w-10 sm:h-10 text-blue-400" />
            Diário de Compromissos
          </h1>
          <p className="text-slate-400 text-sm sm:text-base">
            Gerencie seus compromissos de forma rápida e simples
          </p>
        </div>

        {/* Controles */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Botões de visualização */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('mensal')}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                viewMode === 'mensal'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <Grid3x3 className="w-4 h-4" />
              <span className="hidden sm:inline">Mensal</span>
            </button>
            <button
              onClick={() => setViewMode('semanal')}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                viewMode === 'semanal'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <Columns className="w-4 h-4" />
              <span className="hidden sm:inline">Semanal</span>
            </button>
            <button
              onClick={() => setViewMode('diaria')}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                viewMode === 'diaria'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Diária</span>
            </button>
          </div>

          {/* Botão Novo */}
          <button
            onClick={() => {
              const dateStr = selectedDate.toISOString().split('T')[0];
              setEditingId(null);
              setFormData({
                titulo: '',
                descricao: '',
                data: dateStr,
                data_fim: dateStr,
                hora: '',
                hora_termino: '',
              });
              setShowModal(true);
            }}
            className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white rounded-xl px-6 py-3 shadow-xl transition-all flex items-center justify-center gap-2 text-lg font-bold"
          >
            <Plus className="w-6 h-6" />
            Novo
          </button>
        </div>

        {/* Navegação de data */}
        <div className="mb-6 bg-slate-800/50 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-slate-700 flex items-center justify-between">
          <button
            onClick={() => handleNavigate(-1)}
            className="p-2 hover:bg-slate-700 rounded-lg transition-all"
          >
            <ChevronLeft className="w-6 h-6 text-slate-300" />
          </button>
          
          <h2 className="text-xl font-bold text-white text-center capitalize">
            {formatDateHeader()}
          </h2>
          
          <button
            onClick={() => handleNavigate(1)}
            className="p-2 hover:bg-slate-700 rounded-lg transition-all"
          >
            <ChevronRight className="w-6 h-6 text-slate-300" />
          </button>
        </div>

        {/* Visualizações */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-slate-700">
          {loading ? (
            <div className="text-center py-12 text-slate-400">Carregando...</div>
          ) : (
            <>
              {viewMode === 'mensal' && renderMensalView()}
              {viewMode === 'semanal' && renderSemanalView()}
              {viewMode === 'diaria' && renderDiariaView()}
            </>
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

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Título *
                  </label>
                  <input
                    type="text"
                    value={formData.titulo}
                    onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                    required
                    placeholder="Ex: Reunião com cliente"
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Data Início *
                    </label>
                    <input
                      type="date"
                      value={formData.data}
                      onChange={(e) => {
                        const newData = e.target.value;
                        setFormData({ 
                          ...formData, 
                          data: newData,
                          data_fim: newData // Atualizar data_fim automaticamente
                        });
                      }}
                      required
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Data Fim
                    </label>
                    <input
                      type="date"
                      value={formData.data_fim}
                      onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
                      min={formData.data}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Início *
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
                      Término
                    </label>
                    <input
                      type="time"
                      value={formData.hora_termino}
                      onChange={(e) => setFormData({ ...formData, hora_termino: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Descrição
                  </label>
                  <textarea
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    rows={3}
                    placeholder="Detalhes do compromisso..."
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg resize-none"
                  />
                </div>

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
