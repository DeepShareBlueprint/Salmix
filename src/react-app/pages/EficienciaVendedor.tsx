import { useEficiencia, type EficienciaFilters } from '@/react-app/hooks/useEficiencia';
import { useVendas } from '@/react-app/hooks/useVendas';
import Navbar from '@/react-app/components/Navbar';
import KPICard from '@/react-app/components/KPICard';
import { 
  Users, 
  TrendingUp, 
  Target, 
  Award,
  AlertCircle,
  BarChart3,
  PieChart,
  RefreshCw,
  Download,
  TrendingDown,
  Filter,
  Calendar
} from 'lucide-react';
import { BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState, useEffect } from 'react';

export default function EficienciaVendedor() {
  const [filters, setFilters] = useState<EficienciaFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const { dadosEficiencia, kpis, loading, error, refetch } = useEficiencia(filters);
  const { getFilterOptions } = useVendas();

  // Configurar filtros padrão (YTD do ano mais recente com dados)
  useEffect(() => {
    const buscarAnoMaisRecente = async () => {
      try {
        const response = await fetch('/api/vendas?dataInicio=2020-01-01&dataFim=2030-12-31');
        if (response.ok) {
          const vendas = await response.json();
          
          if (vendas.length > 0) {
            // Encontrar a data mais recente
            const datasOrdenadas = vendas
              .map((v: any) => v.data_venda)
              .sort()
              .reverse();
            
            const dataRecente = datasOrdenadas[0];
            const [anoRecente] = dataRecente.split('-');
            
            // Usar o ano mais recente dos dados
            setFilters({
              dataInicio: `${anoRecente}-01-01`,
              dataFim: `${anoRecente}-12-31`
            });
          } else {
            // Se não há vendas, usar ano atual
            const hoje = new Date();
            const anoAtual = hoje.getFullYear();
            setFilters({
              dataInicio: `${anoAtual}-01-01`,
              dataFim: `${anoAtual}-12-31`
            });
          }
        }
      } catch (error) {
        console.error('Erro ao buscar ano mais recente:', error);
        // Fallback para ano atual
        const hoje = new Date();
        const anoAtual = hoje.getFullYear();
        setFilters({
          dataInicio: `${anoAtual}-01-01`,
          dataFim: `${anoAtual}-12-31`
        });
      }
    };
    
    buscarAnoMaisRecente();
  }, []);

  const applyFilters = (newFilters: EficienciaFilters) => {
    setFilters(newFilters);
    refetch(newFilters);
  };

  const clearFilters = async () => {
    try {
      const response = await fetch('/api/vendas?dataInicio=2020-01-01&dataFim=2030-12-31');
      if (response.ok) {
        const vendas = await response.json();
        
        if (vendas.length > 0) {
          // Encontrar a data mais recente
          const datasOrdenadas = vendas
            .map((v: any) => v.data_venda)
            .sort()
            .reverse();
          
          const dataRecente = datasOrdenadas[0];
          const [anoRecente] = dataRecente.split('-');
          
          // Usar o ano mais recente dos dados
          const defaultFilters: EficienciaFilters = {
            dataInicio: `${anoRecente}-01-01`,
            dataFim: `${anoRecente}-12-31`
          };
          setFilters(defaultFilters);
          refetch(defaultFilters);
        } else {
          // Se não há vendas, usar ano atual
          const hoje = new Date();
          const anoAtual = hoje.getFullYear();
          const defaultFilters: EficienciaFilters = {
            dataInicio: `${anoAtual}-01-01`,
            dataFim: `${anoAtual}-12-31`
          };
          setFilters(defaultFilters);
          refetch(defaultFilters);
        }
      }
    } catch (error) {
      console.error('Erro ao limpar filtros:', error);
      // Fallback para ano atual
      const hoje = new Date();
      const anoAtual = hoje.getFullYear();
      const defaultFilters: EficienciaFilters = {
        dataInicio: `${anoAtual}-01-01`,
        dataFim: `${anoAtual}-12-31`
      };
      setFilters(defaultFilters);
      refetch(defaultFilters);
    }
  };

  const { negocios } = getFilterOptions();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0
    }).format(value);
  };

  const exportToCSV = () => {
    if (!dadosEficiencia.length) return;
    
    const headers = [
      'Vendedor',
      'Nº Transações',
      'Valor YTD (R$)',
      'Eficiência (R$/venda)',
      'IER (%)',
      'Contribuição (%)',
      'Classificação'
    ];

    const csvContent = [
      headers.join(','),
      ...dadosEficiencia.map(item => [
        `"${item.regiao}"`,
        item.numVendedores,
        item.valorYTD.toFixed(2),
        item.eficiencia.toFixed(2),
        item.ier.toFixed(1),
        item.contribuicao.toFixed(1),
        item.classificacao
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eficiencia_vendedor_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading || !kpis) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 pt-20 lg:pt-6 lg:ml-64">
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center space-x-3 text-white">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span>Carregando dados de eficiência...</span>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 pt-20 lg:pt-6 lg:ml-64">
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center space-x-3 text-red-400">
              <AlertCircle className="w-6 h-6" />
              <span>Erro ao carregar dados: {error}</span>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Preparar dados para gráficos
  const dadosGraficoBarras = dadosEficiencia.map(item => ({
    regiao: item.regiao.length > 15 ? `${item.regiao.substring(0, 15)}...` : item.regiao,
    eficiencia: item.eficiencia,
    ier: item.ier
  }));

  const dadosContribuicao = dadosEficiencia.map(item => ({
    vendedor: item.regiao,
    participacao: item.contribuicao,
    valor: item.valorYTD
  }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#f97316', '#06b6d4', '#ec4899'];

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 pt-20 lg:pt-6 lg:ml-64">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white">Eficiência por Vendedor</h1>
              </div>
              <p className="text-slate-400">Análise de performance e produtividade por vendedor</p>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Botão Filtros */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all shadow-lg ${
                  showFilters 
                    ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/50' 
                    : 'bg-slate-700 hover:bg-slate-600 shadow-slate-700/50'
                } text-white`}
              >
                <Filter className="w-4 h-4" />
                <span>Filtros</span>
              </button>
              
              {/* Botão Exportar */}
              <button
                onClick={exportToCSV}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-all shadow-lg hover:shadow-green-500/50"
              >
                <Download className="w-4 h-4" />
                <span>Exportar CSV</span>
              </button>
            </div>
          </div>

          {/* Filtros */}
          {showFilters && (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700 shadow-xl">
              <div className="flex items-center space-x-3 mb-4">
                <Filter className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-semibold text-white">Filtros de Análise</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Data Início */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Data Início
                  </label>
                  <input
                    type="date"
                    value={filters.dataInicio || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, dataInicio: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    value={filters.dataFim || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, dataFim: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Unidade de Negócio */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Unidade de Negócio
                  </label>
                  <select
                    value={filters.negocio || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, negocio: e.target.value || undefined }))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Todas as Unidades</option>
                    {negocios.map(negocio => (
                      <option key={negocio} value={negocio}>{negocio}</option>
                    ))}
                  </select>
                </div>

                {/* Ações */}
                <div className="flex flex-col justify-end space-y-2">
                  <button
                    onClick={() => applyFilters(filters)}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all shadow-lg hover:shadow-blue-500/50"
                  >
                    Aplicar Filtros
                  </button>
                  <button
                    onClick={clearFilters}
                    className="w-full px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-all"
                  >
                    Limpar (YTD)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <KPICard
              title="Vendedor Mais Eficiente"
              value={kpis.regiaoMaisEficiente.nome}
              subtitle={formatCurrency(kpis.regiaoMaisEficiente.eficiencia) + '/venda'}
              icon={Award}
              color="green"
              trend="up"
              trendValue={`${((kpis.regiaoMaisEficiente.eficiencia / kpis.eficienciaMediaGeral - 1) * 100).toFixed(1)}%`}
            />
            
            <KPICard
              title="Eficiência Média Geral"
              value={formatCurrency(kpis.eficienciaMediaGeral)}
              subtitle="Por venda"
              icon={Target}
              color="blue"
            />
            
            <KPICard
              title="Vendedor Menos Eficiente"
              value={kpis.regiaoMenosEficiente.nome}
              subtitle={formatCurrency(kpis.regiaoMenosEficiente.eficiencia) + '/venda'}
              icon={TrendingDown}
              color="red"
              trend="down"
              trendValue={`${((kpis.regiaoMenosEficiente.eficiencia / kpis.eficienciaMediaGeral - 1) * 100).toFixed(1)}%`}
            />
          </div>

          {/* Insights Automáticos */}
          {kpis.insights && (
            <div className="bg-gradient-to-br from-blue-600/20 to-blue-700/20 border border-blue-500/50 rounded-xl p-6">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center mt-0.5">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-blue-300 font-semibold mb-2">💡 Insights Automáticos</h3>
                  <p className="text-blue-100 leading-relaxed">{kpis.insights}</p>
                </div>
              </div>
            </div>
          )}

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de Barras - Eficiência por Região */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700 shadow-xl">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5 text-emerald-400" />
                  <span>Eficiência por Vendedor</span>
                </h3>
                <p className="text-slate-400 text-sm">Valor YTD / Número de Transações (R$/venda)</p>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dadosGraficoBarras} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.3} />
                  <XAxis 
                    dataKey="regiao" 
                    stroke="#94a3b8" 
                    fontSize={11}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={11}
                    tickFormatter={(value) => formatCurrency(value)}
                  />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                      border: '1px solid #10b981', 
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)'
                    }}
                    labelStyle={{ color: '#e2e8f0', fontWeight: 'bold' }}
                    formatter={(value: any, name: any) => [
                      name === 'eficiencia' ? `${formatCurrency(value)}/venda` : `${value.toFixed(1)}%`,
                      name === 'eficiencia' ? 'Eficiência' : 'IER'
                    ]}
                  />
                  <Bar 
                    dataKey="eficiencia" 
                    fill="#10b981" 
                    radius={[4, 4, 0, 0]}
                    animationDuration={1000}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Gráfico de Contribuição no Valor Total YTD */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700 shadow-xl">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <PieChart className="w-4 h-4 text-white" />
                  </div>
                  <span>Contribuição no Valor Total YTD</span>
                </h3>
                <p className="text-slate-400 text-sm mt-1">Participação de cada vendedor no faturamento total</p>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-center">
                {/* Gráfico de Donut - Agora maior */}
                <div className="lg:col-span-3 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={dadosContribuicao}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={125}
                        paddingAngle={1}
                        dataKey="valor"
                        fill="#8884d8"
                        stroke="none"
                      >
                        {dadosContribuicao.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ 
                          backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                          border: '1px solid #475569',
                          borderRadius: '8px',
                          color: '#e2e8f0'
                        }}
                        formatter={(value: any) => [formatCurrency(value), 'Vendas']}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legenda Externa Mini */}
                <div className="lg:col-span-2">
                  <div className="space-y-1">
                    {dadosContribuicao.map((vendedor, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div 
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        ></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-slate-200 text-xs font-medium truncate leading-tight">
                            {vendedor.vendedor}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-white text-xs font-bold leading-tight">
                            {vendedor.participacao.toFixed(1)}%
                          </p>
                          <p className="text-slate-400 text-xs leading-tight">
                            {formatCurrency(vendedor.valor)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Total Summary Mini */}
                  <div className="mt-3 pt-2 border-t border-slate-600/50">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300 text-xs font-medium">Total YTD</span>
                      <span className="text-white font-bold text-sm">
                        {formatCurrency(dadosContribuicao.reduce((sum, v) => sum + v.valor, 0))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabela de Eficiência */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white">📊 Ranking de Eficiência por Vendedor</h3>
              <p className="text-slate-400 text-sm mt-1">Ordenado por eficiência (maior → menor)</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900 border-b border-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Posição
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Vendedor
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Nº Transações
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Valor YTD (R$)
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Eficiência (R$/venda)
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      IER (%)
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Contribuição (%)
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Classificação
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {dadosEficiencia.map((item, index) => (
                    <tr key={item.regiao} className="hover:bg-slate-700/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                            index === 1 ? 'bg-gray-400/20 text-gray-300' :
                            index === 2 ? 'bg-orange-600/20 text-orange-400' :
                            'bg-slate-600/20 text-slate-400'
                          }`}>
                            {index + 1}º
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-white font-medium">{item.regiao}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-blue-400 font-semibold">{item.numVendedores}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-green-400 font-bold">{formatCurrency(item.valorYTD)}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-emerald-300 font-bold text-lg">
                          {formatCurrency(item.eficiencia)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`font-semibold ${
                          item.ier >= 120 ? 'text-green-400' :
                          item.ier >= 80 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {item.ier.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-purple-400 font-medium">{item.contribuicao.toFixed(1)}%</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          item.classificacao === 'Alta' 
                            ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                            : item.classificacao === 'Média'
                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                            : 'bg-red-500/20 text-red-400 border border-red-500/50'
                        }`}>
                          {item.classificacao}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Resumo */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700 shadow-xl">
            <div className="flex items-center justify-between text-slate-400">
              <p>
                Total de <span className="text-white font-medium">{dadosEficiencia.length}</span> vendedores analisados
              </p>
              <div className="flex items-center space-x-6">
                <span className="text-sm">
                  Eficiência Média: <span className="text-blue-400 font-bold">{formatCurrency(kpis.eficienciaMediaGeral)}/venda</span>
                </span>
                <span className="text-sm">
                  Ano: <span className="text-green-400 font-medium">{new Date().getFullYear()}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
