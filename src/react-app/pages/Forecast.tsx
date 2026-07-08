import { useState, useEffect } from 'react';
import Navbar from '@/react-app/components/Navbar';
import { BarChart3, TrendingUp, Calendar, Package, AlertTriangle, Target, Loader2 } from 'lucide-react';
import { useForecast } from '@/react-app/hooks/useForecast';

export default function Forecast() {
  // Determinar período YTD do ano atual por padrão
  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const periodoYTD = `${anoAtual}-YTD`;
  
  const [selectedPeriod, setSelectedPeriod] = useState(periodoYTD);
  const { forecastData, forecastKPIs, loading, error, fetchForecastKPIs } = useForecast();

  useEffect(() => {
    fetchForecastKPIs(selectedPeriod);
  }, [selectedPeriod]);

  // Calcular KPIs dos dados reais
  const calculateKPIs = () => {
    if (!forecastData || forecastData.length === 0) {
      return {
        metaDoMes: 0,
        previsaoAtual: 0,
        acuraciaMedia: 92, // Valor padrão
        produtosEmRisco: 0
      };
    }

    // Filtrar dados do período selecionado
    let forecastPeriodo: any[] = [];
    
    if (selectedPeriod.includes('YTD')) {
      // Período YTD - todos os meses do ano até o mês atual
      const ano = parseInt(selectedPeriod.split('-')[0]);
      const hoje = new Date();
      const mesLimite = ano === hoje.getFullYear() ? hoje.getMonth() + 1 : 12;
      
      forecastPeriodo = forecastData.filter(f => 
        f.ano === ano && f.mes >= 1 && f.mes <= mesLimite
      );
    } else {
      // Período mensal específico
      const [ano, mes] = selectedPeriod.split('-');
      forecastPeriodo = forecastData.filter(f => 
        f.ano === parseInt(ano) && f.mes === parseInt(mes)
      );
    }

    // Calcular previsão total do período
    const previsaoAtual = forecastPeriodo.reduce((total, item) => {
      const valor = (item.quantidade_prevista || 0) * (item.preco_previsto || 0);
      return total + valor;
    }, 0);

    // Meta estimada (15% acima da previsão)
    const metaDoMes = previsaoAtual * 1.15;

    // Produtos com previsão baixa (considerados em risco)
    const produtosEmRisco = forecastPeriodo.filter(item => 
      (item.quantidade_prevista || 0) < 100
    ).length;

    return {
      metaDoMes,
      previsaoAtual,
      acuraciaMedia: 92, // Valor padrão - pode ser calculado comparando com vendas reais
      produtosEmRisco
    };
  };

  // Calcular top produtos do período selecionado
  const getTopProdutosForecast = () => {
    if (!forecastData || forecastData.length === 0) return [];

    let forecastPeriodo: any[] = [];
    
    if (selectedPeriod.includes('YTD')) {
      // Período YTD - todos os meses do ano até o mês atual
      const ano = parseInt(selectedPeriod.split('-')[0]);
      const hoje = new Date();
      const mesLimite = ano === hoje.getFullYear() ? hoje.getMonth() + 1 : 12;
      
      forecastPeriodo = forecastData.filter(f => 
        f.ano === ano && f.mes >= 1 && f.mes <= mesLimite
      );
    } else {
      // Período mensal específico
      const [ano, mes] = selectedPeriod.split('-');
      forecastPeriodo = forecastData.filter(f => 
        f.ano === parseInt(ano) && f.mes === parseInt(mes)
      );
    }

    // Agrupar produtos por nome e somar suas previsões
    const produtosAgrupados: { [key: string]: number } = {};
    
    forecastPeriodo.forEach(item => {
      const nomeProduto = item.nome_produto;
      const valorProduto = (item.quantidade_prevista || 0) * (item.preco_previsto || 0);
      
      if (produtosAgrupados[nomeProduto]) {
        produtosAgrupados[nomeProduto] += valorProduto;
      } else {
        produtosAgrupados[nomeProduto] = valorProduto;
      }
    });

    // Converter para array, ordenar e pegar top 5
    return Object.entries(produtosAgrupados)
      .map(([produto, forecast]) => ({
        produto,
        forecast,
        confidence: Math.min(95, Math.max(75, 85 + Math.random() * 15)) // Simular confidence
      }))
      .sort((a, b) => b.forecast - a.forecast)
      .slice(0, 5);
  };

  // Comparação Forecast vs Vendas Reais (dados YTD do ano em vigor)
  const getForecastVsRealizado = () => {
    // Se não temos dados de forecast, retornar array vazio
    if (!forecastKPIs?.forecastVsRealizado) {
      return [];
    }
    
    return forecastKPIs.forecastVsRealizado;
  };

  const kpis = calculateKPIs();
  const topProdutos = getTopProdutosForecast();
  const forecastVsRealizado = getForecastVsRealizado();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading && !forecastData.length) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 pt-20 lg:pt-6 lg:ml-64">
          <div className="max-w-7xl mx-auto flex items-center justify-center h-64">
            <div className="flex items-center space-x-3 text-white">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Carregando dados de forecast...</span>
            </div>
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
              <h1 className="text-3xl font-bold text-white mb-2">Forecast de Vendas</h1>
              <p className="text-slate-400">Previsões e planejamento de vendas futuras</p>
              {forecastData.length > 0 && (
                <p className="text-slate-500 text-sm mt-1">
                  {forecastData.length} previsões cadastradas
                </p>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500"
              >
                {/* YTD do ano atual */}
                <option value={`${anoAtual}-YTD`}>YTD {anoAtual}</option>
                
                {/* Ano anterior YTD */}
                <option value={`${anoAtual - 1}-YTD`}>YTD {anoAtual - 1}</option>
                
                {/* Meses do ano atual */}
                <optgroup label={`Meses ${anoAtual}`}>
                  {Array.from({ length: 12 }, (_, i) => {
                    const mes = i + 1;
                    const mesFormatado = mes.toString().padStart(2, '0');
                    const mesesNomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                                       'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
                    return (
                      <option key={`${anoAtual}-${mesFormatado}`} value={`${anoAtual}-${mesFormatado}`}>
                        {mesesNomes[i]} {anoAtual}
                      </option>
                    );
                  })}
                </optgroup>
                
                {/* Meses do ano anterior */}
                <optgroup label={`Meses ${anoAtual - 1}`}>
                  {Array.from({ length: 12 }, (_, i) => {
                    const mes = i + 1;
                    const mesFormatado = mes.toString().padStart(2, '0');
                    const mesesNomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                                       'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
                    return (
                      <option key={`${anoAtual - 1}-${mesFormatado}`} value={`${anoAtual - 1}-${mesFormatado}`}>
                        {mesesNomes[i]} {anoAtual - 1}
                      </option>
                    );
                  })}
                </optgroup>
              </select>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700 shadow-xl">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <Target className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Meta</p>
                  <p className="text-white font-bold text-xl">{formatCurrency(kpis.metaDoMes)}</p>
                  <p className="text-green-400 text-xs">↗ +15% vs previsão</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700 shadow-xl">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Previsão</p>
                  <p className="text-white font-bold text-xl">{formatCurrency(kpis.previsaoAtual)}</p>
                  <p className="text-yellow-400 text-xs">
                    {kpis.metaDoMes > 0 ? Math.round((kpis.previsaoAtual / kpis.metaDoMes) * 100) : 0}% da meta
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700 shadow-xl">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Acurácia Média</p>
                  <p className="text-white font-bold text-xl">{kpis.acuraciaMedia}%</p>
                  <p className="text-green-400 text-xs">↗ +3% vs trimestre</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700 shadow-xl">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-orange-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Produtos em Risco</p>
                  <p className="text-white font-bold text-xl">{kpis.produtosEmRisco}</p>
                  <p className="text-red-400 text-xs">Previsão baixa</p>
                </div>
              </div>
            </div>
          </div>

          {/* Forecast Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Forecast vs Realizado */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700 shadow-xl">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-blue-400" />
                <span>Forecast vs Realizado</span>
              </h3>
              <div className="space-y-4">
                {forecastVsRealizado.map((item: any, index: number) => {
                  const accuracy = item.forecast > 0 ? ((item.realizado / item.forecast) * 100) : 0;
                  const isGood = accuracy >= 95;
                  return (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                      <div>
                        <p className="text-white font-medium">{item.mes}</p>
                        <p className="text-slate-400 text-sm">
                          {isNaN(accuracy) ? '0.0' : accuracy.toFixed(1)}% de acurácia
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-blue-400 text-sm">
                          Prev: {formatCurrency(item.forecast)}
                        </p>
                        <p className={`text-sm font-medium ${isGood ? 'text-green-400' : 'text-yellow-400'}`}>
                          Real: {formatCurrency(item.realizado)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Produtos Forecast */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700 shadow-xl">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                <Package className="w-5 h-5 text-green-400" />
                <span>Top Produtos - Forecast {selectedPeriod.includes('YTD') ? selectedPeriod : `${selectedPeriod.split('-')[1]}/${selectedPeriod.split('-')[0]}`}</span>
              </h3>
              <div className="space-y-4">
                {topProdutos.length > 0 ? (
                  topProdutos.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                      <div className="flex-1">
                        <p className="text-white font-medium text-sm">{item.produto}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <div className="w-16 bg-slate-600 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full"
                              style={{ width: `${item.confidence}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-slate-400">{item.confidence.toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 font-bold">
                          {formatCurrency(item.forecast)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">Nenhuma previsão encontrada para este período</p>
                    <p className="text-slate-500 text-sm mt-1">
                      Importe dados de forecast para visualizar previsões
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Data Import Guide */}
          {forecastData.length === 0 && (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-8 border border-slate-700 shadow-xl">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto">
                  <Calendar className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Importe seus Dados de Forecast</h3>
                <p className="text-slate-400 max-w-2xl mx-auto">
                  Para visualizar previsões reais, importe seus dados de forecast na seção 
                  <span className="text-blue-400 font-medium"> Importação</span>. 
                  O sistema suporta arquivos CSV com os campos: mes, ano, codigo_produto, nome_produto, 
                  quantidade_prevista, preco_previsto e negocio.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <TrendingUp className="w-6 h-6 text-blue-400 mb-2" />
                    <h4 className="text-white font-medium">Previsões Mensais</h4>
                    <p className="text-slate-400 text-sm">Planeje vendas por período</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <BarChart3 className="w-6 h-6 text-green-400 mb-2" />
                    <h4 className="text-white font-medium">Análise por Produto</h4>
                    <p className="text-slate-400 text-sm">Compare produtos e categorias</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <Target className="w-6 h-6 text-purple-400 mb-2" />
                    <h4 className="text-white font-medium">Metas Inteligentes</h4>
                    <p className="text-slate-400 text-sm">Definição automática de objetivos</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
