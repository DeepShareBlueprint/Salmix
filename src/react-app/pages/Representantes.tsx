import { useState, useEffect } from 'react';
import Navbar from '@/react-app/components/Navbar';
import { 
  TrendingUp, 
  Filter, 
  Download, 
  Calendar, 
  Users, 
  MapPin, 
  Package, 
  Building2,
  DollarSign,
  Search,
  RefreshCw,
  X,
  Shield
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { obterCodigoNegocio } from '@/shared/negocio-mapping';

interface Venda {
  id: number;
  data_venda: string;
  codigo_produto: string;
  nome_produto: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  representante: string | null;
  regiao: string | null;
  cliente: string | null;
  nome_cliente: string | null;
  negocio: string | null;
}

interface UserProfile {
  nivel_acesso: string;
  unidade_negocio: string | null;
  vendedor: string | null;
}

export default function Representantes() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [metaValor, setMetaValor] = useState(0);
  const [metaLoading, setMetaLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  // Filtros
  const [negocio, setNegocio] = useState('');
  const [representante, setRepresentante] = useState('');
  const [regiao, setRegiao] = useState('');
  const [produto, setProduto] = useState('');
  const [cliente, setCliente] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  
  // Opções para os filtros
  const [negocios, setNegocios] = useState<string[]>([]);
  const [representantes, setRepresentantes] = useState<string[]>([]);
  const [regioes, setRegioes] = useState<string[]>([]);
  const [produtos, setProdutos] = useState<string[]>([]);
  const [clientes, setClientes] = useState<string[]>([]);

  // Buscar perfil do usuário ao carregar
  useEffect(() => {
    fetchUserProfile();
  }, []);

  // Buscar vendas quando perfil ou filtros mudarem
  useEffect(() => {
    if (userProfile) {
      fetchVendas();
      fetchMeta();
    }
  }, [userProfile, negocio, representante, regiao, produto, cliente, dataInicio, dataFim]);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/users/me');
      if (response.ok) {
        const userData = await response.json();
        const userResponse = await fetch(`/api/usuarios?email=${encodeURIComponent(userData.email)}`);
        if (userResponse.ok) {
          const localUsers = await userResponse.json();
          const localUser = localUsers.find((u: any) => u.email === userData.email);
          if (localUser) {
            const profile: UserProfile = {
              nivel_acesso: localUser.nivel_acesso,
              unidade_negocio: localUser.unidade_negocio,
              vendedor: localUser.vendedor
            };
            setUserProfile(profile);
            
            // Se for representante, aplicar filtro automático
            if (profile.nivel_acesso === 'Representante' && profile.unidade_negocio) {
              setNegocio(profile.unidade_negocio);
            }
          }
        }
      }
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
    }
  };

  const fetchVendas = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      // Aplicar filtros apenas se tiverem valor
      // IMPORTANTE: Converter nome de negócio para código antes de enviar
      if (negocio) {
        const codigoNegocio = obterCodigoNegocio(negocio);
        if (codigoNegocio) {
          params.append('negocio', codigoNegocio);
        }
      }
      if (representante) params.append('representante', representante);
      if (regiao) params.append('regiao', regiao);
      if (produto) params.append('produto', produto);
      if (cliente) params.append('cliente', cliente);
      if (dataInicio) params.append('dataInicio', dataInicio);
      if (dataFim) params.append('dataFim', dataFim);
      
      const url = `/api/vendas${params.toString() ? '?' + params.toString() : ''}`;
      console.log('Fetching vendas from:', url);
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        console.log('Vendas recebidas:', data.length);
        setVendas(data);
        
        // Atualizar opções de filtros baseado nos dados
        const negociosSet = new Set<string>();
        const representantesSet = new Set<string>();
        const regioesSet = new Set<string>();
        const produtosSet = new Set<string>();
        const clientesSet = new Set<string>();
        
        data.forEach((v: Venda) => {
          if (v.negocio) negociosSet.add(v.negocio);
          if (v.representante) representantesSet.add(v.representante);
          if (v.regiao) regioesSet.add(v.regiao);
          if (v.nome_produto) produtosSet.add(v.nome_produto);
          if (v.nome_cliente) clientesSet.add(v.nome_cliente);
        });
        
        setNegocios(Array.from(negociosSet).sort());
        setRepresentantes(Array.from(representantesSet).sort());
        setRegioes(Array.from(regioesSet).sort());
        setProdutos(Array.from(produtosSet).sort());
        setClientes(Array.from(clientesSet).sort());
      } else {
        console.error('Erro ao buscar vendas:', response.status);
      }
    } catch (error) {
      console.error('Erro ao buscar vendas:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMeta = async () => {
    try {
      setMetaLoading(true);
      const params = new URLSearchParams();
      
      // Converter nome de negócio para código
      if (negocio) {
        const codigoNegocio = obterCodigoNegocio(negocio);
        if (codigoNegocio) {
          params.append('negocio', codigoNegocio);
        }
      }
      if (representante) params.append('representante', representante);
      if (dataInicio) params.append('dataInicio', dataInicio);
      if (dataFim) params.append('dataFim', dataFim);
      
      const response = await fetch(`/api/vendas/meta?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setMetaValor(data.meta || 0);
      }
    } catch (error) {
      console.error('Erro ao buscar meta:', error);
      setMetaValor(0);
    } finally {
      setMetaLoading(false);
    }
  };

  const clearFilters = () => {
    setRepresentante('');
    setRegiao('');
    setProduto('');
    setCliente('');
    setDataInicio('');
    setDataFim('');
    setSearchTerm('');
    
    // Se for representante, manter filtro de negócio
    if (userProfile?.nivel_acesso !== 'Representante') {
      setNegocio('');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    if (dateString.includes('/')) {
      return dateString;
    }
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  // Filtrar vendas pelo termo de busca
  const vendasFiltradas = vendas.filter(venda => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      venda.nome_produto.toLowerCase().includes(term) ||
      venda.codigo_produto.toLowerCase().includes(term) ||
      (venda.representante && venda.representante.toLowerCase().includes(term)) ||
      (venda.nome_cliente && venda.nome_cliente.toLowerCase().includes(term))
    );
  });

  // Calcular totais
  const totalVendas = vendasFiltradas.reduce((acc, v) => acc + v.valor_total, 0);
  const percentualMeta = metaValor > 0 ? (totalVendas / metaValor) * 100 : 0;
  const saldoMeta = metaValor - totalVendas;

  const exportToCSV = () => {
    const headers = [
      'Data',
      'Código',
      'Produto',
      'Quantidade',
      'Valor Unitário',
      'Valor Total',
      'Representante',
      'Região',
      'Cliente',
      'Negócio'
    ];

    const rows = vendasFiltradas.map(v => [
      formatDate(v.data_venda),
      v.codigo_produto,
      v.nome_produto,
      v.quantidade,
      v.valor_unitario,
      v.valor_total,
      v.representante || '',
      v.regiao || '',
      v.nome_cliente || '',
      v.negocio || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vendas_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 pt-20 lg:pt-6 lg:ml-64">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white">Área dos Representantes</h1>
              </div>
              <p className="text-slate-400">Portal exclusivo para representantes de vendas</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                  showFilters 
                    ? 'bg-purple-600 text-white shadow-lg' 
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span>Filtros</span>
              </button>
              <button
                onClick={exportToCSV}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-all shadow-lg"
              >
                <Download className="w-4 h-4" />
                <span>Exportar</span>
              </button>
            </div>
          </div>

          {/* Filtros */}
          {showFilters && (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Filtros</h3>
                <button
                  onClick={clearFilters}
                  className="flex items-center space-x-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Limpar</span>
                </button>
              </div>

              {/* Cards de KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Valor Total */}
                <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-500/50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-xs font-medium">Valor Total</p>
                      <p className="text-green-300 text-2xl font-bold">
                        {formatCurrency(totalVendas)}
                      </p>
                      <p className="text-green-400 text-xs mt-1">
                        {vendasFiltradas.length} vendas
                      </p>
                    </div>
                    <DollarSign className="w-8 h-8 text-green-400" />
                  </div>
                </div>

                {/* Meta */}
                <div className="bg-gradient-to-r from-purple-500/20 to-purple-600/20 border-2 border-purple-500/50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-xs font-medium">Meta</p>
                      <p className="text-purple-300 text-2xl font-bold">
                        {metaLoading ? '...' : formatCurrency(metaValor)}
                      </p>
                      <p className="text-purple-400 text-xs mt-1">
                        {metaLoading ? 'Calculando...' : `${Math.round(percentualMeta)}% atingido`}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-purple-400" />
                  </div>
                </div>

                {/* Saldo */}
                <div className={`bg-gradient-to-r border-2 rounded-lg p-4 ${
                  percentualMeta >= 90 ? 'from-purple-500/20 to-purple-600/20 border-purple-500/50' :
                  percentualMeta >= 50 ? 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/50' :
                  'from-red-500/20 to-red-600/20 border-red-500/50'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-xs font-medium ${
                        percentualMeta >= 90 ? 'text-purple-100' :
                        percentualMeta >= 50 ? 'text-yellow-100' :
                        'text-red-100'
                      }`}>
                        Saldo da Meta
                      </p>
                      <p className={`text-2xl font-bold ${
                        percentualMeta >= 90 ? 'text-purple-300' :
                        percentualMeta >= 50 ? 'text-yellow-300' :
                        'text-red-300'
                      }`}>
                        {formatCurrency(Math.abs(saldoMeta))}
                      </p>
                      <p className={`text-xs mt-1 ${
                        percentualMeta >= 90 ? 'text-purple-400' :
                        percentualMeta >= 50 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {saldoMeta > 0 ? 'Restante' : 'Acima da meta'}
                      </p>
                    </div>
                    <div className="relative w-16 h-16">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { value: Math.min(100, percentualMeta) },
                              { value: Math.max(0, 100 - percentualMeta) }
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={20}
                            outerRadius={30}
                            startAngle={90}
                            endAngle={-270}
                            dataKey="value"
                            stroke="none"
                          >
                            <Cell fill={percentualMeta >= 90 ? '#8b5cf6' : percentualMeta >= 50 ? '#f59e0b' : '#ef4444'} />
                            <Cell fill="#334155" />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`text-xs font-bold ${
                          percentualMeta >= 90 ? 'text-purple-400' :
                          percentualMeta >= 50 ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>
                          {Math.round(percentualMeta)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Filtros */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Unidade de Negócio */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <Building2 className="w-4 h-4 inline mr-1" />
                    Unidade de Negócio
                  </label>
                  <select
                    value={negocio}
                    onChange={(e) => {
                      if (userProfile?.nivel_acesso !== 'Representante') {
                        setNegocio(e.target.value);
                        setRepresentante(''); // Limpar representante ao mudar negócio
                      }
                    }}
                    disabled={userProfile?.nivel_acesso === 'Representante'}
                    className={`w-full px-3 py-2 rounded-lg border focus:outline-none transition-all ${
                      userProfile?.nivel_acesso === 'Representante'
                        ? 'bg-slate-600 text-slate-300 border-slate-500 cursor-not-allowed'
                        : 'bg-slate-700 text-white border-slate-600 focus:border-purple-500'
                    }`}
                  >
                    <option value="">Todas</option>
                    {negocios.map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>

                {/* Representante */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <Users className="w-4 h-4 inline mr-1" />
                    Representante
                  </label>
                  <select
                    value={representante}
                    onChange={(e) => setRepresentante(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-purple-500"
                  >
                    <option value="">Todos</option>
                    {representantes.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                {/* Região */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Região
                  </label>
                  <select
                    value={regiao}
                    onChange={(e) => setRegiao(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-purple-500"
                  >
                    <option value="">Todas</option>
                    {regioes.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                {/* Data Início */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Data Início
                  </label>
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Data Fim */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Data Fim
                  </label>
                  <input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Produto */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <Package className="w-4 h-4 inline mr-1" />
                    Produto
                  </label>
                  <select
                    value={produto}
                    onChange={(e) => setProduto(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-purple-500"
                  >
                    <option value="">Todos</option>
                    {produtos.slice(0, 50).map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                {/* Cliente */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <Building2 className="w-4 h-4 inline mr-1" />
                    Cliente
                  </label>
                  <select
                    value={cliente}
                    onChange={(e) => setCliente(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-purple-500"
                  >
                    <option value="">Todos</option>
                    {clientes.slice(0, 50).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Busca */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700 shadow-xl">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por produto, código, representante ou cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-700 text-white placeholder-slate-400 rounded-lg border border-slate-600 focus:outline-none focus:border-purple-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Tabela */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 shadow-xl overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-white">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                <span>Carregando vendas...</span>
              </div>
            ) : vendasFiltradas.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <p>Nenhuma venda encontrada com os filtros aplicados.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-900 border-b border-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Data</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Produto</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Cliente</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Representante</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Região</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase">Qtd</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase">Valor Unit.</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {vendasFiltradas.slice(0, 100).map((venda) => (
                      <tr key={venda.id} className="hover:bg-slate-700/50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-slate-300 text-sm">
                          {formatDate(venda.data_venda)}
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-white font-medium text-sm">{venda.nome_produto}</p>
                            <p className="text-purple-400 text-xs">{venda.codigo_produto}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-white text-sm">
                          {venda.nome_cliente || '-'}
                        </td>
                        <td className="px-4 py-3 text-slate-300 text-sm">
                          {venda.representante || '-'}
                        </td>
                        <td className="px-4 py-3 text-slate-300 text-sm">
                          {venda.regiao || '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-white font-medium">
                          {venda.quantidade.toLocaleString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 text-right text-green-400 font-medium text-sm">
                          {formatCurrency(venda.valor_unitario)}
                        </td>
                        <td className="px-4 py-3 text-right text-green-400 font-bold">
                          {formatCurrency(venda.valor_total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700 shadow-xl">
            <div className="flex items-center justify-between text-slate-400">
              <p>
                Exibindo <span className="text-white font-medium">{Math.min(vendasFiltradas.length, 100)}</span> de{' '}
                <span className="text-white font-medium">{vendasFiltradas.length}</span> vendas
              </p>
              <div className="text-sm">
                Total: <span className="text-green-400 font-bold">{formatCurrency(totalVendas)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
