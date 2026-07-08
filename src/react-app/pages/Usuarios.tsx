import { useState, useEffect } from 'react';
import Navbar from '@/react-app/components/Navbar';
import { 
  Users, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Shield, 
  Mail,
  Building2,
  Crown,
  UserCheck,
  X,
  Save,
  Loader2,
  Plus,
  UserPlus,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye
} from 'lucide-react';

interface Usuario {
  id: number;
  mocha_user_id?: string;
  nome: string;
  email: string;
  cargo: string;
  nivel_acesso: string;
  unidade_negocio?: string;
  vendedor?: string;
  created_at: string;
  updated_at: string;
}

interface SolicitacaoAcesso {
  id: number;
  email: string;
  nome: string;
  cargo: string;
  departamento: string;
  justificativa: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function Usuarios() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<SolicitacaoAcesso | null>(null);
  const [activeTab, setActiveTab] = useState<'usuarios' | 'solicitacoes'>('usuarios');
  const [newUser, setNewUser] = useState<Partial<Usuario>>({
    nome: '',
    email: '',
    cargo: '',
    nivel_acesso: 'Representante',
    unidade_negocio: 'Ruminantes'
  });
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoAcesso[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vendedoresBudget, setVendedoresBudget] = useState<Array<{vendedor: string, nome_vendedor: string, regional: string}>>([]);

  // Carregar usuários e solicitações do banco de dados
  useEffect(() => {
    fetchUsuarios();
    fetchSolicitacoes();
  }, []);

  // Buscar vendedores do budget quando unidade de negócio mudar
  const fetchVendedoresBudget = async (unidadeNegocio?: string) => {
    if (!unidadeNegocio) {
      setVendedoresBudget([]);
      return;
    }
    
    try {
      const response = await fetch(`/api/budget/representantes?negocio=${encodeURIComponent(unidadeNegocio)}`);
      if (response.ok) {
        const vendedores = await response.json();
        setVendedoresBudget(vendedores);
      }
    } catch (error) {
      console.error('Erro ao buscar vendedores do budget:', error);
      setVendedoresBudget([]);
    }
  };

  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/usuarios');
      if (response.ok) {
        const data = await response.json();
        setUsuarios(data);
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      alert('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const fetchSolicitacoes = async () => {
    try {
      const response = await fetch('/api/access-requests');
      if (response.ok) {
        const data = await response.json();
        setSolicitacoes(data);
      }
    } catch (error) {
      console.error('Erro ao carregar solicitações:', error);
    }
  };

  const filteredUsuarios = usuarios.filter(usuario =>
    usuario.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    usuario.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (usuario.cargo && usuario.cargo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredSolicitacoes = solicitacoes.filter(solicitacao =>
    solicitacao.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    solicitacao.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (solicitacao.cargo && solicitacao.cargo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const pendingSolicitacoes = solicitacoes.filter(s => s.status === 'Pendente');

  const getNivelColor = (nivel: string) => {
    switch (nivel) {
      case 'Administrador': return 'text-red-400';
      case 'Gerente': return 'text-blue-400';
      case 'Operador': return 'text-orange-400';
      case 'Representante': return 'text-green-400';
      default: return 'text-slate-400';
    }
  };

  const getNivelIcon = (nivel: string) => {
    switch (nivel) {
      case 'Administrador': return Crown;
      case 'Gerente': return Shield;
      case 'Operador': return Users;
      case 'Representante': return UserCheck;
      default: return Users;
    }
  };

  const getNivelDisplay = (nivel: string) => {
    return nivel === 'Representante' ? 'Vendedor' : nivel;
  };

  const handleEditUser = (user: Usuario) => {
    // IMPORTANTE: Se for Gerente ou Representante sem unidade_negocio, definir Ruminantes como padrão
    const userWithDefaults = {
      ...user,
      unidade_negocio: (user.nivel_acesso === 'Gerente' || user.nivel_acesso === 'Representante') && !user.unidade_negocio 
        ? 'Ruminantes' 
        : user.unidade_negocio
    };
    setEditingUser(userWithDefaults);
    setShowEditModal(true);
    // Buscar vendedores se for vendedor e não for "Todos"
    if (user.nivel_acesso === 'Representante' && userWithDefaults.unidade_negocio && userWithDefaults.unidade_negocio !== 'Todos') {
      fetchVendedoresBudget(userWithDefaults.unidade_negocio);
    } else {
      setVendedoresBudget([]);
    }
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    
    // Validações
    if (!editingUser.nome.trim()) {
      alert('O nome é obrigatório');
      return;
    }
    
    if (!editingUser.email.trim()) {
      alert('O email é obrigatório');
      return;
    }
    
    try {
      setSaving(true);
      
      // Log detalhado do que está sendo enviado
      const dataToSend = {
        nome: editingUser.nome,
        email: editingUser.email,
        cargo: editingUser.cargo,
        nivel_acesso: editingUser.nivel_acesso,
        unidade_negocio: editingUser.unidade_negocio,
        vendedor: editingUser.vendedor,
      };
      
      console.log('🔍 FRONTEND - Enviando dados para API:');
      console.log('  - ID do usuário:', editingUser.id);
      console.log('  - Dados completos:', JSON.stringify(dataToSend, null, 2));
      console.log('  - unidade_negocio:', dataToSend.unidade_negocio);
      console.log('  - vendedor:', dataToSend.vendedor);
      
      const response = await fetch(`/api/usuarios/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      if (response.ok) {
        // Atualizar lista local
        setUsuarios(prevUsuarios => 
          prevUsuarios.map(usuario => 
            usuario.id === editingUser.id ? editingUser : usuario
          )
        );
        setShowEditModal(false);
        setEditingUser(null);
        alert('Usuário atualizado com sucesso!');
      } else {
        alert('Erro ao atualizar usuário');
      }
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      alert('Erro ao salvar usuário');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) {
      return;
    }

    try {
      const response = await fetch(`/api/usuarios/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setUsuarios(prevUsuarios => prevUsuarios.filter(u => u.id !== id));
        alert('Usuário excluído com sucesso!');
      } else {
        alert('Erro ao excluir usuário');
      }
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      alert('Erro ao excluir usuário');
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingUser(null);
  };

  const handleCreateUser = async () => {
    // Validações
    if (!newUser.nome?.trim()) {
      alert('O nome é obrigatório');
      return;
    }
    
    if (!newUser.email?.trim()) {
      alert('O email é obrigatório');
      return;
    }
    
    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUser.email)) {
      alert('Por favor, insira um email válido');
      return;
    }
    
    try {
      setSaving(true);
      const response = await fetch('/api/usuarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      });

      if (response.ok) {
        const createdUser = await response.json();
        // Adicionar usuário à lista local
        setUsuarios(prevUsuarios => [...prevUsuarios, createdUser]);
        setShowCreateModal(false);
        setNewUser({
          nome: '',
          email: '',
          cargo: '',
          nivel_acesso: 'Representante',
          unidade_negocio: 'Ruminantes'
        });
        alert('Usuário criado com sucesso!');
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Erro ao criar usuário');
      }
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      alert('Erro ao criar usuário');
    } finally {
      setSaving(false);
    }
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setNewUser({
      nome: '',
      email: '',
      cargo: '',
      nivel_acesso: 'Representante',
      unidade_negocio: 'Ruminantes'
    });
  };

  const handleViewRequest = (request: SolicitacaoAcesso) => {
    setSelectedRequest(request);
    setShowRequestModal(true);
  };

  const handleApproveRequest = async (requestId: number, nivel_acesso: string = 'Representante') => {
    try {
      setSaving(true);
      const response = await fetch(`/api/access-requests/${requestId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nivel_acesso }),
      });

      if (response.ok) {
        await fetchSolicitacoes();
        await fetchUsuarios();
        setShowRequestModal(false);
        alert('Solicitação aprovada e usuário criado com sucesso!');
      } else {
        const error = await response.json();
        alert(error.error || 'Erro ao aprovar solicitação');
      }
    } catch (error) {
      console.error('Erro ao aprovar solicitação:', error);
      alert('Erro ao aprovar solicitação');
    } finally {
      setSaving(false);
    }
  };

  const handleRejectRequest = async (requestId: number) => {
    if (!confirm('Tem certeza que deseja rejeitar esta solicitação?')) {
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/access-requests/${requestId}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        await fetchSolicitacoes();
        setShowRequestModal(false);
        alert('Solicitação rejeitada!');
      } else {
        alert('Erro ao rejeitar solicitação');
      }
    } catch (error) {
      console.error('Erro ao rejeitar solicitação:', error);
      alert('Erro ao rejeitar solicitação');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pendente': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50';
      case 'Aprovada': return 'text-green-400 bg-green-500/20 border-green-500/50';
      case 'Rejeitada': return 'text-red-400 bg-red-500/20 border-red-500/50';
      default: return 'text-slate-400 bg-slate-500/20 border-slate-500/50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pendente': return Clock;
      case 'Aprovada': return CheckCircle;
      case 'Rejeitada': return XCircle;
      default: return AlertCircle;
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 pt-20 lg:pt-6 lg:ml-64 flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 pt-20 lg:pt-6 lg:ml-64">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg flex items-center justify-center shadow-lg">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white">Gestão de Usuários</h1>
              </div>
              <p className="text-slate-400">Controle de usuários, permissões e níveis de acesso</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-lg transition-all shadow-lg hover:shadow-green-500/50 hover:from-green-500 hover:to-green-400"
              >
                <UserPlus className="w-4 h-4" />
                <span>Novo Usuário</span>
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                  showFilters 
                    ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/50' 
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span>Filtros</span>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 shadow-xl">
            <div className="flex border-b border-slate-700">
              <button
                onClick={() => setActiveTab('usuarios')}
                className={`flex-1 px-6 py-4 text-center font-medium transition-all ${
                  activeTab === 'usuarios'
                    ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/10'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>Usuários Ativos ({usuarios.length})</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('solicitacoes')}
                className={`flex-1 px-6 py-4 text-center font-medium transition-all relative ${
                  activeTab === 'solicitacoes'
                    ? 'text-yellow-400 border-b-2 border-yellow-400 bg-yellow-500/10'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Clock className="w-5 h-5" />
                  <span>Solicitações ({solicitacoes.length})</span>
                  {pendingSolicitacoes.length > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      {pendingSolicitacoes.length}
                    </span>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          {activeTab === 'usuarios' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Total de Usuários</p>
                    <p className="text-white font-bold text-lg">{usuarios.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                    <Crown className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Administradores</p>
                    <p className="text-white font-bold text-lg">{usuarios.filter(u => u.nivel_acesso === 'Administrador').length}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'solicitacoes' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Pendentes</p>
                    <p className="text-white font-bold text-lg">{pendingSolicitacoes.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Aprovadas</p>
                    <p className="text-white font-bold text-lg">{solicitacoes.filter(s => s.status === 'Aprovada').length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                    <XCircle className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Rejeitadas</p>
                    <p className="text-white font-bold text-lg">{solicitacoes.filter(s => s.status === 'Rejeitada').length}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filters Panel */}
          {showFilters && (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700 shadow-xl">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                <Filter className="w-5 h-5 text-cyan-400" />
                <span>Filtros</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Nível de Acesso</label>
                  <select className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-cyan-500">
                    <option value="">Todos</option>
                    <option value="Administrador">Administrador</option>
                    <option value="Gerente">Gerente</option>
                    <option value="Operador">Operador</option>
                    <option value="Representante">Vendedor</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Cargo</label>
                  <select className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-cyan-500">
                    <option value="">Todos</option>
                    <option value="Gerente Regional">Gerente Regional</option>
                    <option value="Representante de Vendas">Representante de Vendas</option>
                    <option value="Supervisor">Supervisor</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Search Bar */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700 shadow-xl">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nome, email ou cargo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-700 text-white placeholder-slate-400 rounded-lg border border-slate-600 focus:outline-none focus:border-cyan-500 transition-all"
              />
            </div>
          </div>

          {/* Content Tables */}
          {activeTab === 'usuarios' ? (
            /* Users Table */
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-900 border-b border-slate-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Usuário</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Cargo</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Nível de Acesso</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Unidade de Negócio</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Último Acesso</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {filteredUsuarios.map((usuario) => {
                      const NivelIcon = getNivelIcon(usuario.nivel_acesso);
                      return (
                        <tr key={usuario.id} className="hover:bg-slate-700/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-full flex items-center justify-center">
                                <span className="text-white font-bold text-sm">
                                  {usuario.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="text-white font-medium">{usuario.nome}</p>
                                <p className="text-slate-400 text-sm flex items-center">
                                  <Mail className="w-3 h-3 mr-1" />
                                  {usuario.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <Building2 className="w-4 h-4 text-slate-400" />
                              <span className="text-slate-300">{usuario.cargo || '-'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <NivelIcon className={`w-4 h-4 ${getNivelColor(usuario.nivel_acesso)}`} />
                              <span className={`font-medium ${getNivelColor(usuario.nivel_acesso)}`}>
                                {getNivelDisplay(usuario.nivel_acesso)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-slate-300 text-sm">
                            {usuario.unidade_negocio ? (
                              <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs font-medium border border-purple-500/50">
                                {usuario.unidade_negocio === 'Todos' ? 'Geral' : usuario.unidade_negocio}
                              </span>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-slate-300 text-sm">
                            {new Date(usuario.updated_at).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button 
                                onClick={() => handleEditUser(usuario)}
                                className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg transition-all group"
                                title="Editar usuário"
                              >
                                <Edit className="w-4 h-4 group-hover:scale-110 transition-transform" />
                              </button>
                              <button 
                                onClick={() => handleDeleteUser(usuario.id)}
                                className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-all"
                                title="Excluir usuário"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Access Requests Table */
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-900 border-b border-slate-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Solicitante</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Cargo/Depto</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Data</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {filteredSolicitacoes.map((solicitacao) => {
                      const StatusIcon = getStatusIcon(solicitacao.status);
                      return (
                        <tr key={solicitacao.id} className="hover:bg-slate-700/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center">
                                <span className="text-white font-bold text-sm">
                                  {solicitacao.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="text-white font-medium">{solicitacao.nome}</p>
                                <p className="text-slate-400 text-sm flex items-center">
                                  <Mail className="w-3 h-3 mr-1" />
                                  {solicitacao.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <p className="text-slate-300 font-medium">{solicitacao.cargo || '-'}</p>
                              {solicitacao.departamento && (
                                <p className="text-slate-400 text-sm">{solicitacao.departamento}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <StatusIcon className="w-4 h-4" />
                              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(solicitacao.status)}`}>
                                {solicitacao.status}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-slate-300 text-sm">
                            {new Date(solicitacao.created_at).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button 
                                onClick={() => handleViewRequest(solicitacao)}
                                className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg transition-all group"
                                title="Ver detalhes"
                              >
                                <Eye className="w-4 h-4 group-hover:scale-110 transition-transform" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700 shadow-xl">
            <div className="flex items-center justify-between text-slate-400">
              {activeTab === 'usuarios' ? (
                <>
                  <p>
                    Exibindo <span className="text-white font-medium">{filteredUsuarios.length}</span> de{' '}
                    <span className="text-white font-medium">{usuarios.length}</span> usuários
                  </p>
                  <p className="text-sm text-slate-500">
                    💡 Usuários podem ser criados manualmente ou através de solicitações
                  </p>
                </>
              ) : (
                <>
                  <p>
                    Exibindo <span className="text-white font-medium">{filteredSolicitacoes.length}</span> de{' '}
                    <span className="text-white font-medium">{solicitacoes.length}</span> solicitações
                  </p>
                  <p className="text-sm text-slate-500">
                    🔔 {pendingSolicitacoes.length} solicitação(ões) aguardando aprovação
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Modal de Edição */}
        {showEditModal && editingUser && (
          <>
            {/* Overlay */}
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                      <Edit className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Editar Usuário</h2>
                      <p className="text-slate-400 text-sm">Modifique as informações do usuário</p>
                    </div>
                  </div>
                  <button
                    onClick={handleCloseEditModal}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
                    disabled={saving}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Conteúdo */}
                <div className="p-6 space-y-6">
                  {/* Informações Básicas */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white mb-4">Informações Básicas</h3>
                    
                    {/* Linha 1: Nome e Email */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Nome Completo *
                        </label>
                        <input
                          type="text"
                          value={editingUser.nome}
                          onChange={(e) => setEditingUser({...editingUser, nome: e.target.value})}
                          className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500 transition-all"
                          placeholder="Digite o nome completo"
                          disabled={saving}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Email *
                        </label>
                        <input
                          type="email"
                          value={editingUser.email}
                          onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                          className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500 transition-all"
                          placeholder="Digite o email"
                          disabled={saving}
                        />
                      </div>
                    </div>

                    {/* Linha 2: Cargo e Nível de Acesso */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Cargo
                        </label>
                        <input
                          type="text"
                          value={editingUser.cargo || ''}
                          onChange={(e) => setEditingUser({...editingUser, cargo: e.target.value})}
                          className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500 transition-all"
                          placeholder="Digite o cargo"
                          disabled={saving}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Nível de Acesso *
                        </label>
                        <select
                          value={editingUser.nivel_acesso}
                          onChange={(e) => {
                            const novoNivel = e.target.value;
                            // Definir unidade de negócio padrão para Vendedores, Gerentes e Coord Tec Rum BR
                            let novaUnidade = undefined;
                            if (novoNivel === 'Representante' || novoNivel === 'Gerente') {
                              novaUnidade = editingUser.unidade_negocio || 'Ruminantes';
                            } else if (novoNivel === 'Coord Tec Rum BR') {
                              novaUnidade = 'Ruminantes'; // Sempre Ruminantes para este nível
                            }
                            setEditingUser({
                              ...editingUser, 
                              nivel_acesso: novoNivel,
                              unidade_negocio: novaUnidade,
                              vendedor: novoNivel === 'Representante' ? editingUser.vendedor : undefined
                            });
                            if (novoNivel === 'Representante' && novaUnidade && novaUnidade !== 'Todos') {
                              fetchVendedoresBudget(novaUnidade);
                            } else {
                              setVendedoresBudget([]);
                            }
                          }}
                          className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500 transition-all"
                          disabled={saving}
                        >
                          <option value="Representante">Vendedor</option>
                          <option value="Operador">Operador</option>
                          <option value="Gerente">Gerente</option>
                          <option value="Coord Tec Rum BR">Coord Tec Rum BR</option>
                          <option value="Administrador">Administrador</option>
                        </select>
                      </div>
                    </div>

                    {/* Linha 3: Unidade de Negócio - SEMPRE VISÍVEL para Gerentes, Representantes e Coord Tec Rum BR */}
                    {(editingUser.nivel_acesso === 'Representante' || editingUser.nivel_acesso === 'Gerente' || editingUser.nivel_acesso === 'Coord Tec Rum BR') && (
                      <div className="bg-purple-900/20 border border-purple-700/50 rounded-lg p-4">
                        <label className="block text-sm font-medium text-purple-300 mb-2">
                          Unidade de Negócio *
                        </label>
                        <select
                          value={editingUser.unidade_negocio || 'Ruminantes'}
                          onChange={(e) => {
                            const novaUnidade = e.target.value;
                            setEditingUser({...editingUser, unidade_negocio: novaUnidade, vendedor: editingUser.nivel_acesso === 'Gerente' ? undefined : editingUser.vendedor});
                            // Só busca vendedores se for vendedor e não for "Todos"
                            if (editingUser.nivel_acesso === 'Representante' && novaUnidade !== 'Todos') {
                              fetchVendedoresBudget(novaUnidade);
                            } else {
                              setVendedoresBudget([]);
                            }
                          }}
                          className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-purple-600 focus:outline-none focus:border-purple-400 transition-all"
                          disabled={saving || editingUser.nivel_acesso === 'Coord Tec Rum BR'}
                        >
                          {editingUser.nivel_acesso === 'Gerente' ? (
                            <>
                              <option value="Ruminantes">Ruminantes</option>
                              <option value="Ave/Sui">Ave/Sui</option>
                              <option value="Salmix B2B">Salmix B2B</option>
                            </>
                          ) : editingUser.nivel_acesso === 'Coord Tec Rum BR' ? (
                            <option value="Ruminantes">Ruminantes</option>
                          ) : (
                            <>
                              <option value="Todos">Todos</option>
                              <option value="Ruminantes">Ruminantes</option>
                              <option value="Ave/Sui">Ave/Sui</option>
                            </>
                          )}
                        </select>
                        <p className="text-xs text-purple-200 mt-1">
                          {editingUser.nivel_acesso === 'Gerente' 
                            ? '⭐ Define qual unidade de negócios este gerente supervisiona' 
                            : editingUser.nivel_acesso === 'Coord Tec Rum BR'
                            ? '⭐ Acesso fixo a Ruminantes (não pode ser alterado)'
                            : '⭐ Define qual unidade de negócios este vendedor atende'}
                        </p>
                      </div>
                    )}

                    {/* Campo Vendedor - apenas para Vendedores e quando não for "Todos" */}
                    {editingUser.nivel_acesso === 'Representante' && editingUser.unidade_negocio !== 'Todos' && (
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Vendedor
                        </label>
                        <select
                          value={editingUser.vendedor || ''}
                          onChange={(e) => setEditingUser({...editingUser, vendedor: e.target.value})}
                          className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500 transition-all"
                          disabled={saving || vendedoresBudget.length === 0}
                        >
                          <option value="">Selecione um vendedor</option>
                          {vendedoresBudget.map((v) => (
                            <option key={v.vendedor} value={v.vendedor}>
                              {v.vendedor} - {v.nome_vendedor}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-slate-400 mt-1">
                          {vendedoresBudget.length === 0 
                            ? 'Nenhum vendedor disponível para esta unidade de negócio' 
                            : 'Selecione o vendedor da tabela de budget'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Informações do Sistema */}
                  <div className="border-t border-slate-700 pt-4">
                    <h3 className="text-lg font-semibold text-white mb-4">Informações do Sistema</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-700/50 rounded-lg p-3">
                        <p className="text-sm text-slate-400">ID do Usuário</p>
                        <p className="text-white font-medium">#{editingUser.id}</p>
                      </div>
                      <div className="bg-slate-700/50 rounded-lg p-3">
                        <p className="text-sm text-slate-400">Último Acesso</p>
                        <p className="text-white font-medium">
                          {new Date(editingUser.updated_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Nota sobre autenticação */}
                  <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
                    <p className="text-blue-300 text-sm">
                      ℹ️ <strong>Autenticação via Google:</strong> Este usuário faz login com sua conta Google. 
                      Não é possível alterar a senha através do sistema.
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end space-x-3 p-6 border-t border-slate-700">
                  <button
                    onClick={handleCloseEditModal}
                    className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
                    disabled={saving}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveUser}
                    disabled={saving}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all shadow-lg hover:shadow-blue-500/50 disabled:bg-slate-700 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Salvando...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Salvar Alterações</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Modal de Criação */}
        {showCreateModal && (
          <>
            {/* Overlay */}
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-lg">
                      <UserPlus className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Novo Usuário</h2>
                      <p className="text-slate-400 text-sm">Criar uma nova conta de usuário</p>
                    </div>
                  </div>
                  <button
                    onClick={handleCloseCreateModal}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
                    disabled={saving}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Conteúdo */}
                <div className="p-6 space-y-6">
                  {/* Informações Básicas */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white mb-4">Informações Básicas</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Nome Completo *
                        </label>
                        <input
                          type="text"
                          value={newUser.nome || ''}
                          onChange={(e) => setNewUser({...newUser, nome: e.target.value})}
                          className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-green-500 transition-all"
                          placeholder="Digite o nome completo"
                          disabled={saving}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Email *
                        </label>
                        <input
                          type="email"
                          value={newUser.email || ''}
                          onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                          className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-green-500 transition-all"
                          placeholder="Digite o email"
                          disabled={saving}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Cargo
                        </label>
                        <input
                          type="text"
                          value={newUser.cargo || ''}
                          onChange={(e) => setNewUser({...newUser, cargo: e.target.value})}
                          className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-green-500 transition-all"
                          placeholder="Digite o cargo"
                          disabled={saving}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Nível de Acesso *
                        </label>
                        <select
                          value={newUser.nivel_acesso || 'Representante'}
                          onChange={(e) => {
                            const novoNivel = e.target.value;
                            // Definir unidade de negócio padrão para Vendedores, Gerentes e Coord Tec Rum BR
                            let novaUnidade = undefined;
                            if (novoNivel === 'Representante' || novoNivel === 'Gerente') {
                              novaUnidade = newUser.unidade_negocio || 'Ruminantes';
                            } else if (novoNivel === 'Coord Tec Rum BR') {
                              novaUnidade = 'Ruminantes';
                            }
                            setNewUser({
                              ...newUser, 
                              nivel_acesso: novoNivel,
                              unidade_negocio: novaUnidade
                            });
                          }}
                          className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-green-500 transition-all"
                          disabled={saving}
                        >
                          <option value="Representante">Vendedor</option>
                          <option value="Operador">Operador</option>
                          <option value="Gerente">Gerente</option>
                          <option value="Coord Tec Rum BR">Coord Tec Rum BR</option>
                          <option value="Administrador">Administrador</option>
                        </select>
                      </div>
                    </div>

                    {/* Campo Unidade de Negócio - para Representantes, Gerentes e Coord Tec Rum BR */}
                    {((newUser.nivel_acesso || 'Representante') === 'Representante' || (newUser.nivel_acesso || 'Representante') === 'Gerente' || (newUser.nivel_acesso || 'Representante') === 'Coord Tec Rum BR') && (
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Unidade de Negócio *
                        </label>
                        <select
                          value={newUser.unidade_negocio || 'Ruminantes'}
                          onChange={(e) => setNewUser({...newUser, unidade_negocio: e.target.value})}
                          className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-green-500 transition-all"
                          disabled={saving || (newUser.nivel_acesso || 'Representante') === 'Coord Tec Rum BR'}
                        >
                          {(newUser.nivel_acesso || 'Representante') === 'Gerente' ? (
                            <>
                              <option value="Ruminantes">Ruminantes</option>
                              <option value="Ave/Sui">Ave/Sui</option>
                              <option value="Salmix B2B">Salmix B2B</option>
                            </>
                          ) : (newUser.nivel_acesso || 'Representante') === 'Coord Tec Rum BR' ? (
                            <option value="Ruminantes">Ruminantes</option>
                          ) : (
                            <>
                              <option value="Todos">Todos</option>
                              <option value="Ruminantes">Ruminantes</option>
                              <option value="Ave/Sui">Ave/Sui</option>
                            </>
                          )}
                        </select>
                        <p className="text-xs text-slate-400 mt-1">
                          {(newUser.nivel_acesso || 'Representante') === 'Gerente'
                            ? 'Define qual unidade de negócios este gerente supervisiona'
                            : (newUser.nivel_acesso || 'Representante') === 'Coord Tec Rum BR'
                            ? 'Acesso fixo a Ruminantes (não pode ser alterado)'
                            : 'Define qual unidade de negócios este representante atende'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Nota sobre autenticação */}
                  <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-4">
                    <p className="text-green-300 text-sm">
                      ℹ️ <strong>Autenticação via Google:</strong> Este usuário poderá fazer login usando uma conta Google 
                      com o email informado. Não é necessário definir senha.
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end space-x-3 p-6 border-t border-slate-700">
                  <button
                    onClick={handleCloseCreateModal}
                    className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
                    disabled={saving}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreateUser}
                    disabled={saving}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-all shadow-lg hover:shadow-green-500/50 disabled:bg-slate-700 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Criando...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Criar Usuário</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Modal de Visualização de Solicitação */}
        {showRequestModal && selectedRequest && (
          <>
            {/* Overlay */}
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center shadow-lg">
                      <Eye className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Solicitação de Acesso</h2>
                      <p className="text-slate-400 text-sm">Revisar e aprovar/rejeitar solicitação</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowRequestModal(false)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
                    disabled={saving}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Conteúdo */}
                <div className="p-6 space-y-6">
                  {/* Informações do Solicitante */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white mb-4">Dados do Solicitante</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-700/50 rounded-lg p-3">
                        <p className="text-sm text-slate-400">Nome Completo</p>
                        <p className="text-white font-medium">{selectedRequest.nome}</p>
                      </div>
                      
                      <div className="bg-slate-700/50 rounded-lg p-3">
                        <p className="text-sm text-slate-400">Email</p>
                        <p className="text-white font-medium">{selectedRequest.email}</p>
                      </div>

                      <div className="bg-slate-700/50 rounded-lg p-3">
                        <p className="text-sm text-slate-400">Cargo/Função</p>
                        <p className="text-white font-medium">{selectedRequest.cargo || 'Não informado'}</p>
                      </div>

                      <div className="bg-slate-700/50 rounded-lg p-3">
                        <p className="text-sm text-slate-400">Departamento</p>
                        <p className="text-white font-medium">{selectedRequest.departamento || 'Não informado'}</p>
                      </div>
                    </div>

                    <div className="bg-slate-700/50 rounded-lg p-3">
                      <p className="text-sm text-slate-400">Justificativa</p>
                      <p className="text-white">{selectedRequest.justificativa}</p>
                    </div>
                  </div>

                  {/* Status Atual */}
                  <div className="border-t border-slate-700 pt-4">
                    <h3 className="text-lg font-semibold text-white mb-4">Status da Solicitação</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-700/50 rounded-lg p-3">
                        <p className="text-sm text-slate-400">Status</p>
                        <div className="flex items-center space-x-2 mt-1">
                          {(() => {
                            const StatusIcon = getStatusIcon(selectedRequest.status);
                            return <StatusIcon className="w-4 h-4" />;
                          })()}
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedRequest.status)}`}>
                            {selectedRequest.status}
                          </span>
                        </div>
                      </div>
                      <div className="bg-slate-700/50 rounded-lg p-3">
                        <p className="text-sm text-slate-400">Data da Solicitação</p>
                        <p className="text-white font-medium">
                          {new Date(selectedRequest.created_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Nível de Acesso (apenas se pendente) */}
                  {selectedRequest.status === 'Pendente' && (
                    <div className="border-t border-slate-700 pt-4">
                      <h3 className="text-lg font-semibold text-white mb-4">Definir Nível de Acesso</h3>
                      <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4 mb-4">
                        <p className="text-blue-300 text-sm">
                          <strong>💡 Dica:</strong> Escolha o nível de acesso apropriado para este usuário com base em seu cargo e responsabilidades.
                        </p>
                      </div>
                      <select
                        id="nivel_acesso"
                        defaultValue="Representante"
                        className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-green-500 transition-all"
                      >
                        <option value="Representante">Vendedor</option>
                        <option value="Operador">Operador</option>
                        <option value="Gerente">Gerente</option>
                        <option value="Administrador">Administrador</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Footer - apenas se pendente */}
                {selectedRequest.status === 'Pendente' && (
                  <div className="flex items-center justify-end space-x-3 p-6 border-t border-slate-700">
                    <button
                      onClick={() => handleRejectRequest(selectedRequest.id)}
                      disabled={saving}
                      className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-all shadow-lg hover:shadow-red-500/50 disabled:bg-slate-700 disabled:cursor-not-allowed"
                    >
                      {saving ? 'Processando...' : 'Rejeitar'}
                    </button>
                    <button
                      onClick={() => {
                        const select = document.getElementById('nivel_acesso') as HTMLSelectElement;
                        handleApproveRequest(selectedRequest.id, select.value);
                      }}
                      disabled={saving}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-all shadow-lg hover:shadow-green-500/50 disabled:bg-slate-700 disabled:cursor-not-allowed"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Aprovando...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          <span>Aprovar e Criar Usuário</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
