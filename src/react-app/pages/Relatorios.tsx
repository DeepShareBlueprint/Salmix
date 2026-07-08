import { useState, useEffect } from 'react';
import { useVendas, type VendasFilters } from '@/react-app/hooks/useVendas';
import Navbar from '@/react-app/components/Navbar';
import { 
  FileText, 
  Filter, 
  Download, 
  Calendar, 
  Users, 
  MapPin, 
  Package, 
  Building2,
  Search,
  RefreshCw,
  X
} from 'lucide-react';
import { format } from 'date-fns';

interface ABCItem {
  item: string;
  valorTotal: number;
  participacao: number;
  participacaoAcumulada: number;
  classificacao: 'A' | 'B' | 'C';
  quantidade?: number;
}

export default function Relatorios() {
  const { vendas, loading, fetchVendas, getFilterOptions } = useVendas();
  const [filters, setFilters] = useState<VendasFilters>({});
  const [showFilters, setShowFilters] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'produtos' | 'clientes'>('produtos');
  const [userProfile, setUserProfile] = useState<{nivel_acesso: string; unidade_negocio: string | null; vendedor?: string | null} | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [negocios, setNegocios] = useState<string[]>([]);
  const [representantes, setRepresentantes] = useState<Array<{vendedor: string; nome_vendedor: string; regional: string; negocio?: string}>>([]);

  // Buscar perfil do usuário logado
  const fetchUserProfile = async () => {
    try {
      setProfileLoading(true);
      const response = await fetch('/api/users/me');
      if (response.ok) {
        const userData = await response.json();
        
        const userResponse = await fetch(`/api/usuarios?email=${encodeURIComponent(userData.email)}`);
        if (userResponse.ok) {
          const localUsers = await userResponse.json();
          const localUser = localUsers.find((u: any) => u.email === userData.email);
          if (localUser) {
            setUserProfile({
              nivel_acesso: localUser.nivel_acesso,
              unidade_negocio: localUser.unidade_negocio,
              vendedor: localUser.vendedor
            });
            
            // Aplicar filtros automáticos baseado no nível de acesso
            const filtrosAutomaticos: VendasFilters = {};
            
            if (localUser.nivel_acesso === 'Gerente' && localUser.unidade_negocio) {
              // Gerentes veem apenas sua unidade de negócio
              filtrosAutomaticos.negocio = localUser.unidade_negocio;
            } else if (localUser.nivel_acesso === 'Representante') {
              // Representantes veem apenas sua unidade de negócio e seu vendedor
              if (localUser.unidade_negocio) {
                filtrosAutomaticos.negocio = localUser.unidade_negocio;
              }
              if (localUser.vendedor) {
                filtrosAutomaticos.representante = localUser.vendedor;
              }
            }
            
            setFilters(filtrosAutomaticos);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao buscar perfil do usuário:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  // Buscar opções de filtro
  const fetchFilterOptions = async (negocioFiltro?: string) => {
    try {
      const vendasResponse = await fetch('/api/vendas');
      if (vendasResponse.ok) {
        const vendas = await vendasResponse.json();
        const negociosUnicos = [...new Set(vendas.map((v: any) => v.negocio).filter((n: any): n is string => Boolean(n)))].sort() as string[];
        setNegocios(negociosUnicos);
      }
      
      fetchRepresentantes(negocioFiltro);
    } catch (error) {
      console.error('Erro ao buscar opções de filtro:', error);
    }
  };

  const fetchRepresentantes = async (negocio?: string) => {
    try {
      const url = negocio 
        ? `/api/budget/representantes?negocio=${encodeURIComponent(negocio)}`
        : '/api/budget/representantes';
      
      const response = await fetch(url);
      if (response.ok) {
        const reps = await response.json() as Array<{vendedor: string; nome_vendedor: string; regional: string}>;
        setRepresentantes(reps);
      }
    } catch (error) {
      console.error('Erro ao buscar representantes:', error);
    }
  };

  useEffect(() => {
    const initializePage = async () => {
      await fetchUserProfile();
    };
    initializePage();
  }, []);

  useEffect(() => {
    if (!profileLoading) {
      fetchFilterOptions(filters.negocio);
    }
  }, [profileLoading]);

  useEffect(() => {
    fetchRepresentantes(filters.negocio);
  }, [filters.negocio]);

  useEffect(() => {
    if (!profileLoading) {
      fetchVendas(filters);
    }
  }, [filters, profileLoading]);

  const filterOptions = getFilterOptions();

  const filteredVendas = vendas.filter(venda => {
    const searchLower = searchTerm.toLowerCase();
    return (
      venda.nome_produto.toLowerCase().includes(searchLower) ||
      venda.codigo_produto.toLowerCase().includes(searchLower) ||
      (venda.representante && venda.representante.toLowerCase().includes(searchLower)) ||
      (venda.nome_cliente && venda.nome_cliente.toLowerCase().includes(searchLower))
    );
  });

  const updateFilter = (key: keyof VendasFilters, value: any) => {
    // Representantes não podem alterar filtros de negócio e representante
    if (userProfile?.nivel_acesso === 'Representante') {
      if (key === 'negocio' || key === 'representante') {
        return;
      }
    }
    
    // Gerentes não podem alterar filtro de negócio
    if (userProfile?.nivel_acesso === 'Gerente') {
      if (key === 'negocio') {
        return;
      }
    }
    
    setFilters(prev => {
      const newFilters = {
        ...prev,
        [key]: value === '' ? undefined : value
      };
      
      if (key === 'negocio') {
        newFilters.representante = undefined;
      }
      
      return newFilters;
    });
  };

  const clearFilters = () => {
    // Limpar apenas filtros que o usuário pode alterar
    let emptyFilters: VendasFilters = {};
    
    // Manter filtros obrigatórios baseado no nível de acesso
    if (userProfile?.nivel_acesso === 'Gerente' && userProfile.unidade_negocio) {
      emptyFilters.negocio = userProfile.unidade_negocio;
    } else if (userProfile?.nivel_acesso === 'Representante') {
      if (userProfile.unidade_negocio) {
        emptyFilters.negocio = userProfile.unidade_negocio;
      }
      if (userProfile.vendedor) {
        emptyFilters.representante = userProfile.vendedor;
      }
    }
    
    setFilters(emptyFilters);
    setSearchTerm('');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Calcular Curva ABC de Produtos
  const calcularABCProdutos = (): ABCItem[] => {
    const produtoMap = new Map<string, { valor: number; quantidade: number }>();
    
    filteredVendas.forEach(venda => {
      const key = `${venda.codigo_produto} - ${venda.nome_produto}`;
      const existing = produtoMap.get(key) || { valor: 0, quantidade: 0 };
      produtoMap.set(key, {
        valor: existing.valor + venda.valor_total,
        quantidade: existing.quantidade + venda.quantidade
      });
    });

    const produtos = Array.from(produtoMap.entries()).map(([item, data]) => ({
      item,
      valorTotal: data.valor,
      quantidade: data.quantidade,
      participacao: 0,
      participacaoAcumulada: 0,
      classificacao: 'C' as 'A' | 'B' | 'C'
    }));

    // Ordenar por valor total decrescente
    produtos.sort((a, b) => b.valorTotal - a.valorTotal);

    const valorTotal = produtos.reduce((sum, p) => sum + p.valorTotal, 0);
    let acumulado = 0;

    return produtos.map(produto => {
      const participacao = valorTotal > 0 ? (produto.valorTotal / valorTotal) * 100 : 0;
      acumulado += participacao;
      
      let classificacao: 'A' | 'B' | 'C' = 'C';
      if (acumulado <= 80) classificacao = 'A';
      else if (acumulado <= 95) classificacao = 'B';

      return {
        ...produto,
        participacao,
        participacaoAcumulada: acumulado,
        classificacao
      };
    });
  };

  // Calcular Curva ABC de Clientes
  const calcularABCClientes = (): ABCItem[] => {
    const clienteMap = new Map<string, { valor: number; quantidade: number }>();
    
    filteredVendas.forEach(venda => {
      const cliente = venda.nome_cliente || venda.cliente || 'Cliente não identificado';
      const existing = clienteMap.get(cliente) || { valor: 0, quantidade: 0 };
      clienteMap.set(cliente, {
        valor: existing.valor + venda.valor_total,
        quantidade: existing.quantidade + venda.quantidade
      });
    });

    const clientes = Array.from(clienteMap.entries()).map(([item, data]) => ({
      item,
      valorTotal: data.valor,
      quantidade: data.quantidade,
      participacao: 0,
      participacaoAcumulada: 0,
      classificacao: 'C' as 'A' | 'B' | 'C'
    }));

    // Ordenar por valor total decrescente
    clientes.sort((a, b) => b.valorTotal - a.valorTotal);

    const valorTotal = clientes.reduce((sum, c) => sum + c.valorTotal, 0);
    let acumulado = 0;

    return clientes.map(cliente => {
      const participacao = valorTotal > 0 ? (cliente.valorTotal / valorTotal) * 100 : 0;
      acumulado += participacao;
      
      let classificacao: 'A' | 'B' | 'C' = 'C';
      if (acumulado <= 80) classificacao = 'A';
      else if (acumulado <= 95) classificacao = 'B';

      return {
        ...cliente,
        participacao,
        participacaoAcumulada: acumulado,
        classificacao
      };
    });
  };

  const abcProdutos = calcularABCProdutos();
  const abcClientes = calcularABCClientes();
  const currentData = activeTab === 'produtos' ? abcProdutos : abcClientes;

  const exportToCSV = () => {
    const data = activeTab === 'produtos' ? abcProdutos : abcClientes;
    const headers = [
      activeTab === 'produtos' ? 'Produto' : 'Cliente',
      'Valor Total',
      'Quantidade',
      'Participação (%)',
      'Participação Acumulada (%)',
      'Classificação ABC'
    ];

    const csvContent = [
      headers.join(','),
      ...data.map(item => [
        `"${item.item}"`,
        item.valorTotal.toFixed(2),
        item.quantidade || 0,
        item.participacao.toFixed(2),
        item.participacaoAcumulada.toFixed(2),
        item.classificacao
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `curva_abc_${activeTab}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Calcular estatísticas da curva ABC
  const statsA = currentData.filter(item => item.classificacao === 'A');
  const statsB = currentData.filter(item => item.classificacao === 'B');
  const statsC = currentData.filter(item => item.classificacao === 'C');
  
  const totalValue = currentData.reduce((sum, item) => sum + item.valorTotal, 0);
  const valueA = statsA.reduce((sum, item) => sum + item.valorTotal, 0);
  const valueB = statsB.reduce((sum, item) => sum + item.valorTotal, 0);
  const valueC = statsC.reduce((sum, item) => sum + item.valorTotal, 0);

  // Verificar se o usuário pode ver os filtros de negócio/vendedor
  const podeVerFiltroNegocio = userProfile?.nivel_acesso === 'Administrador' || userProfile?.nivel_acesso === 'Gerente';
  const podeVerFiltroVendedor = userProfile?.nivel_acesso === 'Administrador' || userProfile?.nivel_acesso === 'Gerente';

  if (loading || profileLoading) {
    return (
      <>
        <Navbar />
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 min-h-screen">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-slate-300 text-lg">Carregando relatórios...</p>
          </div>
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
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-lg">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white">Relatórios de Vendas</h1>
              </div>
              <p className="text-slate-400">Análise de Curva ABC - Produtos e Clientes</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                  showFilters 
                    ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/50' 
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span>Filtros</span>
              </button>
              <button
                onClick={exportToCSV}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-all shadow-lg hover:shadow-green-500/50"
              >
                <Download className="w-4 h-4" />
                <span>Exportar</span>
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 shadow-xl overflow-hidden">
            <div className="flex">
              <button
                onClick={() => setActiveTab('produtos')}
                className={`flex-1 px-6 py-4 text-lg font-semibold transition-all ${
                  activeTab === 'produtos'
                    ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Package className="w-5 h-5" />
                  <span>Curva ABC - Produtos</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('clientes')}
                className={`flex-1 px-6 py-4 text-lg font-semibold transition-all ${
                  activeTab === 'clientes'
                    ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>Curva ABC - Clientes</span>
                </div>
              </button>
            </div>
          </div>

          {/* ABC Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-green-600/20 to-green-700/20 border border-green-500/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <span className="text-green-400 font-bold text-xl">A</span>
                </div>
                <div className="text-right">
                  <p className="text-green-400 text-sm font-medium">Classificação A</p>
                  <p className="text-green-300 text-xs">80% do valor</p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-white text-lg font-bold">
                  {statsA.length} {activeTab === 'produtos' ? 'produtos' : 'clientes'}
                </p>
                <p className="text-green-400 font-semibold">{formatCurrency(valueA)}</p>
                <p className="text-slate-400 text-sm">
                  {((valueA / totalValue) * 100).toFixed(1)}% do faturamento
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-700/20 border border-yellow-500/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                  <span className="text-yellow-400 font-bold text-xl">B</span>
                </div>
                <div className="text-right">
                  <p className="text-yellow-400 text-sm font-medium">Classificação B</p>
                  <p className="text-yellow-300 text-xs">15% do valor</p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-white text-lg font-bold">
                  {statsB.length} {activeTab === 'produtos' ? 'produtos' : 'clientes'}
                </p>
                <p className="text-yellow-400 font-semibold">{formatCurrency(valueB)}</p>
                <p className="text-slate-400 text-sm">
                  {((valueB / totalValue) * 100).toFixed(1)}% do faturamento
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-600/20 to-red-700/20 border border-red-500/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <span className="text-red-400 font-bold text-xl">C</span>
                </div>
                <div className="text-right">
                  <p className="text-red-400 text-sm font-medium">Classificação C</p>
                  <p className="text-red-300 text-xs">5% do valor</p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-white text-lg font-bold">
                  {statsC.length} {activeTab === 'produtos' ? 'produtos' : 'clientes'}
                </p>
                <p className="text-red-400 font-semibold">{formatCurrency(valueC)}</p>
                <p className="text-slate-400 text-sm">
                  {((valueC / totalValue) * 100).toFixed(1)}% do faturamento
                </p>
              </div>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                  <Filter className="w-5 h-5 text-orange-400" />
                  <span>Filtros Avançados</span>
                </h3>
                <button
                  onClick={clearFilters}
                  className="flex items-center space-x-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Limpar</span>
                </button>
              </div>

              {/* Primary Filter - SBU - Apenas para Gerentes e Administradores */}
              {podeVerFiltroNegocio && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-orange-300 mb-3">
                    <Building2 className="w-5 h-5 inline mr-2" />
                    <span className="text-base font-semibold">Unidade de Negócios (SBU)</span>
                  </label>
                  <select
                    value={filters.negocio || ''}
                    onChange={(e) => updateFilter('negocio', e.target.value)}
                    disabled={userProfile?.nivel_acesso === 'Gerente'}
                    className={`w-full md:w-1/3 px-4 py-3 text-white rounded-lg border-2 border-orange-500/50 focus:outline-none focus:border-orange-400 transition-all text-lg ${
                      userProfile?.nivel_acesso === 'Gerente' 
                        ? 'bg-slate-600 text-slate-300 cursor-not-allowed' 
                        : 'bg-slate-700'
                    }`}
                  >
                    <option value="">Todas as Unidades</option>
                    {negocios.map(negocio => (
                      <option key={negocio} value={negocio}>{negocio}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Secondary Filters */}
              <div className="border-t border-slate-600 pt-4">
                <h4 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider">Filtros Secundários</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Date Range */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Data Início
                    </label>
                    <input
                      type="date"
                      value={filters.dataInicio || ''}
                      onChange={(e) => updateFilter('dataInicio', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Data Fim
                    </label>
                    <input
                      type="date"
                      value={filters.dataFim || ''}
                      onChange={(e) => updateFilter('dataFim', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  {/* Representative - Apenas para Gerentes e Administradores */}
                  {podeVerFiltroVendedor && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        <Users className="w-4 h-4 inline mr-1" />
                        Vendedor
                      </label>
                      <select
                        value={filters.representante || ''}
                        onChange={(e) => updateFilter('representante', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-orange-500"
                      >
                        <option value="">Todos</option>
                        {representantes.map(rep => (
                          <option key={rep.vendedor} value={rep.vendedor}>
                            {rep.negocio || rep.regional}, {rep.vendedor}, {rep.nome_vendedor}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Region */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      Região
                    </label>
                    <select
                      value={filters.regiao || ''}
                      onChange={(e) => updateFilter('regiao', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-orange-500"
                    >
                      <option value="">Todas</option>
                      {filterOptions.regioes.map(regiao => (
                        <option key={regiao} value={regiao}>{regiao}</option>
                      ))}
                    </select>
                  </div>

                  {/* Product - only show for cliente tab */}
                  {activeTab === 'clientes' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        <Package className="w-4 h-4 inline mr-1" />
                        Produto
                      </label>
                      <select
                        value={filters.produto || ''}
                        onChange={(e) => updateFilter('produto', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-orange-500"
                      >
                        <option value="">Todos</option>
                        {filterOptions.produtos.slice(0, 50).map(produto => (
                          <option key={produto} value={produto}>{produto}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Client - only show for produtos tab */}
                  {activeTab === 'produtos' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        <Building2 className="w-4 h-4 inline mr-1" />
                        Cliente
                      </label>
                      <select
                        value={filters.cliente || ''}
                        onChange={(e) => updateFilter('cliente', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-orange-500"
                      >
                        <option value="">Todos</option>
                        {filterOptions.clientes.slice(0, 50).map(cliente => (
                          <option key={cliente} value={cliente}>{cliente}</option>
                        ))}
                      </select>
                    </div>
                  )}
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
                placeholder={`Buscar ${activeTab === 'produtos' ? 'produtos' : 'clientes'}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-700 text-white placeholder-slate-400 rounded-lg border border-slate-600 focus:outline-none focus:border-orange-500 transition-all"
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

          {/* ABC Table */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 shadow-xl overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-white">
                <div className="flex items-center justify-center space-x-3">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                  <span>Carregando dados...</span>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-900 border-b border-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Classificação
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        {activeTab === 'produtos' ? 'Produto' : 'Cliente'}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Valor Total
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Quantidade
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Participação %
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Participação Acumulada %
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {currentData.slice(0, 100).map((item, index) => (
                      <tr key={index} className="hover:bg-slate-700/50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            item.classificacao === 'A' 
                              ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                              : item.classificacao === 'B'
                              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                              : 'bg-red-500/20 text-red-400 border border-red-500/50'
                          }`}>
                            {item.classificacao}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-white font-medium text-sm">{item.item}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-green-400 font-bold">{formatCurrency(item.valorTotal)}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-white font-medium">{(item.quantidade || 0).toLocaleString('pt-BR')}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-blue-400 font-medium">{item.participacao.toFixed(2)}%</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-purple-400 font-medium">{item.participacaoAcumulada.toFixed(2)}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700 shadow-xl">
            <div className="flex items-center justify-between text-slate-400">
              <p>
                Exibindo <span className="text-white font-medium">{Math.min(currentData.length, 100)}</span> de{' '}
                <span className="text-white font-medium">{currentData.length}</span> {activeTab === 'produtos' ? 'produtos' : 'clientes'}
                {currentData.length > 100 && (
                  <span className="text-yellow-400 ml-2">(Limitado a 100 registros para performance)</span>
                )}
              </p>
              <div className="flex items-center space-x-4">
                <span className="text-sm">
                  Total: <span className="text-green-400 font-bold">{formatCurrency(totalValue)}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
