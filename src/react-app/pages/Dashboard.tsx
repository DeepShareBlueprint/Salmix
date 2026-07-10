import Navbar from '@/react-app/components/Navbar';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, Package, DollarSign, Target, AlertTriangle, RefreshCw, Calendar, Building2 } from 'lucide-react';
import { useDashboard } from '@/react-app/hooks/useDashboard';
import { useState, useEffect } from 'react';

interface DashboardFilters {
  negocio?: string;
  representante?: string;
  dataInicio?: string;
  dataFim?: string;
}

function Dashboard() {
  const [filters, setFilters] = useState<DashboardFilters>({});
  const [userProfile, setUserProfile] = useState<{nivel_acesso: string; unidade_negocio: string | null; vendedor?: string | null} | null>(null);
  const { kpis, loading, error } = useDashboard(filters, userProfile || undefined);
  const [negocios, setNegocios] = useState<string[]>([]);
  const [representantes, setRepresentantes] = useState<Array<{vendedor: string, nome_vendedor: string, regional: string, negocio: string}>>([]);
  const [metasMensais, setMetasMensais] = useState<{[key: string]: number}>({});
  const [profileLoading, setProfileLoading] = useState(true);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<string | null>(null);
  
  // Estados locais para os inputs de data
  const [localDataInicio, setLocalDataInicio] = useState('');
  const [localDataFim, setLocalDataFim] = useState('');
  
  // Estados para comentários de IA
  const [comentariosIA, setComentariosIA] = useState<{[key: string]: string}>({});
  const [loadingComentarios, setLoadingComentarios] = useState<{[key: string]: boolean}>({});

  // Buscar data da última atualização
  const fetchUltimaAtualizacao = async () => {
    try {
      const response = await fetch('/api/ultima-atualizacao');
      if (response.ok) {
        const data = await response.json();
        setUltimaAtualizacao(data.ultima_data);
      }
    } catch (error) {
      console.error('Erro ao buscar última atualização:', error);
    }
  };

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
            const filtrosAutomaticos: DashboardFilters = {};
            
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
            } else if (localUser.nivel_acesso === 'Coord Tec Rum BR') {
              // Coord Tec Rum BR vê apenas Ruminantes, excluindo vendedor 3600
              filtrosAutomaticos.negocio = 'Ruminantes';
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
  useEffect(() => {
    let isMounted = true;
    
    const init = async () => {
      if (isMounted) {
        await fetchUserProfile();
        await fetchFilterOptions();
        await fetchUltimaAtualizacao();
      }
    };
    
    init();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Recarregar representantes quando o negócio mudar
  useEffect(() => {
    fetchRepresentantes(filters.negocio);
  }, [filters.negocio]);

  const fetchFilterOptions = async () => {
    try {
      // Buscar negócios da tabela vendedores (tem os nomes amigáveis)
      const vendedoresResponse = await fetch('/api/budget/representantes');
      if (vendedoresResponse.ok) {
        const vendedores = await vendedoresResponse.json();
        const negociosUnicos = [...new Set(vendedores.map((v: any) => v.negocio).filter((n: any): n is string => Boolean(n)))].sort() as string[];
        setNegocios(negociosUnicos);
      }
      
      // Buscar representantes inicial
      fetchRepresentantes();
    } catch (error) {
      console.error('Erro ao buscar opções de filtro:', error);
    }
  };

  const fetchRepresentantes = async (negocio?: string) => {
    try {
      // Construir URL com filtros
      const params = new URLSearchParams();
      if (negocio) {
        params.append('negocio', negocio);
      }
      
      // Adicionar filtros especiais para Coord Tec Rum BR
      if (userProfile?.nivel_acesso === 'Coord Tec Rum BR') {
        params.append('nivel_acesso', 'Coord Tec Rum BR');
        params.append('vendedor_bloqueado', '3633');
      }
      
      const url = `/api/budget/representantes${params.toString() ? `?${params.toString()}` : ''}`;
      
      const budgetResponse = await fetch(url);
      if (budgetResponse.ok) {
        const reps = await budgetResponse.json() as Array<{vendedor: string, nome_vendedor: string, regional: string, negocio: string}>;
        setRepresentantes(reps);
      }
    } catch (error) {
      console.error('Erro ao buscar representantes:', error);
    }
  };

  

  // Buscar metas mensais do budget para o gráfico - DINÂMICO PARA 2025 E 2026
  const fetchMetasMensais = async (currentFilters: DashboardFilters = {}) => {
    try {
      const params = new URLSearchParams();
      
      // Converter nome para código antes de enviar
      if (currentFilters.negocio) {
        // Importar dinamicamente para evitar circular dependency
        const { obterCodigoNegocio } = await import('@/shared/negocio-mapping');
        const codigo = obterCodigoNegocio(currentFilters.negocio);
        if (codigo) {
          params.append('negocio', codigo);
        }
      }
      
      if (currentFilters.representante) params.append('vendedor', currentFilters.representante);
      
      const response = await fetch(`/api/budget?${params.toString()}`);
      if (response.ok) {
        const budgetData = await response.json() as any[];
        
        // Calcular metas mensais totais para 2025 E 2026
        const metas: {[key: string]: number} = {};
        const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        
        // Meses 2025
        const mesesCampos2025 = ['jan_25', 'fev_25', 'mar_25', 'abr_25', 'mai_25', 'jun_25', 
                                 'jul_25', 'ago_25', 'set_25', 'out_25', 'nov_25', 'dez_25'];
        
        // Meses 2026
        const mesesCampos2026 = ['jan_26', 'fev_26', 'mar_26', 'abr_26', 'mai_26', 'jun_26', 
                                 'jul_26', 'ago_26', 'set_26', 'out_26', 'nov_26', 'dez_26'];
        
        // Processar metas para 2025
        mesesNomes.forEach((mes, index) => {
          const campo = mesesCampos2025[index];
          const totalMes = budgetData.reduce((acc, item) => acc + (item[campo] || 0), 0);
          metas[`${mes}-2025`] = totalMes;
        });
        
        // Processar metas para 2026
        mesesNomes.forEach((mes, index) => {
          const campo = mesesCampos2026[index];
          const totalMes = budgetData.reduce((acc, item) => acc + (item[campo] || 0), 0);
          metas[`${mes}-2026`] = totalMes;
        });
        
        setMetasMensais(metas);
      }
    } catch (error) {
      console.error('Erro ao buscar metas mensais:', error);
      setMetasMensais({});
    }
  };

  // Buscar metas mensais quando os filtros mudarem
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchMetasMensais(filters);
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [filters.negocio, filters.representante]);

  // Gerar comentários de IA para cada negócio
  const gerarComentarioIA = async (negocio: any) => {
    const key = negocio.negocio;
    
    // Evitar chamadas duplicadas
    if (loadingComentarios[key] || comentariosIA[key]) {
      return;
    }
    
    setLoadingComentarios(prev => ({ ...prev, [key]: true }));
    
    try {
      const evolucaoYtd = negocio.evolucao_ytd || 0;
      
      // Determinar status
      let status = 'Estável';
      if (evolucaoYtd < -5) status = 'Crítico';
      else if (evolucaoYtd < 5) status = 'Atenção';
      
      // Determinar tendência
      let tendencia = 'Estável';
      if (evolucaoYtd > 10) tendencia = 'Crescimento';
      else if (evolucaoYtd < -10) tendencia = 'Queda';
      
      const response = await fetch('/api/ai/comentario-executivo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          segmento: negocio.negocio,
          status,
          ytd_atual: negocio.valor_ytd_2025,
          variacao_yoy: negocio.evolucao_ytd,
          variacao_mensal: negocio.evolucao_mes,
          participacao: negocio.participacao,
          tendencia
        })
      });
      
      const result = await response.json();
      
      if (result.success && result.comentario) {
        setComentariosIA(prev => ({ ...prev, [key]: result.comentario }));
      } else {
        setComentariosIA(prev => ({ ...prev, [key]: 'Comentário não disponível no momento.' }));
      }
    } catch (error) {
      console.error('Erro ao gerar comentário:', error);
      setComentariosIA(prev => ({ ...prev, [key]: 'Erro ao gerar comentário.' }));
    } finally {
      setLoadingComentarios(prev => ({ ...prev, [key]: false }));
    }
  };

  // Gerar comentários ao carregar os KPIs
  useEffect(() => {
    if (kpis?.vendasPorNegocio && kpis.vendasPorNegocio.length > 0) {
      // Gerar comentários para cada negócio com pequeno delay entre eles
      kpis.vendasPorNegocio.forEach((negocio: any, index: number) => {
        setTimeout(() => {
          gerarComentarioIA(negocio);
        }, index * 1000); // 1 segundo de delay entre cada chamada
      });
      
      // Gerar comentário para o Total Consolidado
      setTimeout(() => {
        const totalYtd2025 = kpis.vendasPorNegocio.reduce((acc: number, neg: any) => acc + (neg.valor_ytd_2025 || 0), 0);
        const totalYtd2024 = kpis.vendasPorNegocio.reduce((acc: number, neg: any) => acc + (neg.valor_ytd_2024 || 0), 0);
        const totalMesAtual = kpis.vendasPorNegocio.reduce((acc: number, neg: any) => acc + (neg.valor_mes_atual || 0), 0);
        const totalMesAnterior = kpis.vendasPorNegocio.reduce((acc: number, neg: any) => acc + (neg.valor_mes_anterior || 0), 0);
        
        const evolucaoYtdTotal = totalYtd2024 > 0 ? ((totalYtd2025 - totalYtd2024) / totalYtd2024) * 100 : 0;
        const evolucaoMesTotal = totalMesAnterior > 0 ? ((totalMesAtual - totalMesAnterior) / totalMesAnterior) * 100 : 0;
        
        let statusTotal = 'Estável';
        if (evolucaoYtdTotal < -5) statusTotal = 'Crítico';
        else if (evolucaoYtdTotal < 5) statusTotal = 'Atenção';
        
        let tendenciaTotal = 'Estável';
        if (evolucaoYtdTotal > 10) tendenciaTotal = 'Crescimento';
        else if (evolucaoYtdTotal < -10) tendenciaTotal = 'Queda';
        
        const negocioTotal = {
          negocio: 'Total Consolidado',
          valor_ytd_2025: totalYtd2025,
          valor_ytd_2024: totalYtd2024,
          valor_mes_atual: totalMesAtual,
          valor_mes_anterior: totalMesAnterior,
          evolucao_ytd: evolucaoYtdTotal,
          evolucao_mes: evolucaoMesTotal,
          participacao: 100,
          status: statusTotal,
          tendencia: tendenciaTotal
        };
        
        gerarComentarioIA(negocioTotal);
      }, kpis.vendasPorNegocio.length * 1000 + 500); // Gerar por último
    }
  }, [kpis?.vendasPorNegocio]);

  const updateFilter = (key: keyof DashboardFilters, value: any) => {
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
    
    // Coord Tec Rum BR não pode alterar filtro de negócio
    if (userProfile?.nivel_acesso === 'Coord Tec Rum BR') {
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

  const handleDataInicioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalDataInicio(value);
    // Não atualizar filtros aqui - será feito pelo useEffect com debounce
  };

  const handleDataFimChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalDataFim(value);
    // Não atualizar filtros aqui - será feito pelo useEffect com debounce
  };
  
  // Sincronizar valores locais com filtros após delay
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setFilters(prev => {
        const newFilters = { ...prev };
        let changed = false;
        
        if (localDataInicio !== (prev.dataInicio || '')) {
          newFilters.dataInicio = localDataInicio === '' ? undefined : localDataInicio;
          changed = true;
        }
        if (localDataFim !== (prev.dataFim || '')) {
          newFilters.dataFim = localDataFim === '' ? undefined : localDataFim;
          changed = true;
        }
        
        return changed ? newFilters : prev;
      });
    }, 800); // 800ms de delay para permitir digitação completa
    
    return () => clearTimeout(timeoutId);
  }, [localDataInicio, localDataFim]);

  const clearFilters = () => {
    // Limpar apenas filtros que o usuário pode alterar
    let emptyFilters: DashboardFilters = {};
    
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
    } else if (userProfile?.nivel_acesso === 'Coord Tec Rum BR') {
      emptyFilters.negocio = 'Ruminantes';
    }
    
    setFilters(emptyFilters);
    setLocalDataInicio('');
    setLocalDataFim('');
  };

  const formatCurrencyInteger = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Usar apenas os dados vindos do backend - não calcular nada no frontend
  // Verificar se tem filtros de data personalizados
  const temFiltrosData = Boolean(filters.dataInicio || filters.dataFim);
  const anoAtual = kpis?.anoAtualDados || 2025;
  const mesAtual = kpis?.mesAtualDados || 11;
  const valorAno2024 = kpis?.totalVendas2024 || 0;
  const valorAno2025 = kpis?.totalVendas2025 || 0;
  const valorMes2024 = kpis?.totalVendasMes2024 || 0;
  const valorMes2025 = kpis?.totalVendasMes2025 || 0;
  
  // Metas vêm direto do backend agora
  const metaValor = kpis?.metaYTD || 0;
  const metaValorMensal = kpis?.metaMensal || 0;
  const metaLoading = loading;

  // Função para gerar texto "Jan - Mes atual"
  const getMesPeriodo = () => {
    const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `Jan - ${mesesNomes[mesAtual - 1]}`;
  };

  // Usar valores de evolução já calculados no backend
  const evolucaoYTD = kpis?.totalVendasEvolucao || 0;
  const evolucaoMensal = kpis?.totalVendasMesEvolucao || 0;
  
  // CÁLCULO DA META: Usar vendasParaMeta (apenas Ruminantes + Ave/Sui)
  // Os cards de valor mostram totalVendas (todas unidades)
  // Mas o % da meta compara vendasParaMeta (sem Salmix) vs metaValor
  const vendasParaComparacao = kpis?.vendasParaMeta || 0;
  const vendasMensalParaComparacao = kpis?.vendasMensalParaMeta || 0;
  
  const percentualMetaYTD = metaValor > 0 ? (vendasParaComparacao / metaValor) * 100 : 0;
  const percentualMetaMensal = metaValorMensal > 0 ? (vendasMensalParaComparacao / metaValorMensal) * 100 : 0;

  // Verificar se o usuário pode ver os filtros de negócio/vendedor
  const podeVerFiltroNegocio = userProfile?.nivel_acesso === 'Administrador' || userProfile?.nivel_acesso === 'Gerente' || userProfile?.nivel_acesso === 'Coord Tec Rum BR';
  const podeVerFiltroVendedor = userProfile?.nivel_acesso === 'Administrador' || userProfile?.nivel_acesso === 'Gerente' || userProfile?.nivel_acesso === 'Coord Tec Rum BR';

  if (loading || profileLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 min-h-screen">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-300 text-lg">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 min-h-screen">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-300 text-lg">Erro ao carregar dados: {error}</p>
        </div>
      </div>
    );
  }

  if (!kpis) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 min-h-screen">
        <div className="text-center">
          <Package className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-300 text-lg">Nenhum dado disponível</p>
        </div>
      </div>
    );
  }

  // Preparar dados para o gráfico de evolução de vendas - 12 MESES MÓVEIS
  // A Meta é sempre o orçamento do ano-calendário corrente (o único com budget real
  // cadastrado), independente de qual ano cada barra da janela móvel representa
  const anoBudgetCorrente = new Date().getFullYear();
  const dadosProjecao = kpis.vendasPorMes?.map((mes: any) => {
    const metaKey = `${mes.mes}-${anoBudgetCorrente}`;
    const metaMes = metasMensais[metaKey] || 0;

    return {
      ...mes,
      meta: metaMes,
    };
  }) || [];

  // CustomTooltip para gráficos
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-600 p-3 rounded-lg shadow-xl">
          <p className="text-slate-200 font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: R$ {entry.value?.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // CustomTooltip com porcentagem para gráfico de colunas empilhadas
  const CustomTooltipWithPercentage = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Calcular total do mês somando todos os valores do payload
      const total = payload.reduce((acc: number, entry: any) => acc + (entry.value || 0), 0);
      
      return (
        <div className="bg-slate-800 border border-slate-600 p-3 rounded-lg shadow-xl">
          <p className="text-slate-200 font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => {
            const valor = entry.value || 0;
            const porcentagem = total > 0 ? (valor / total) * 100 : 0;
            
            return (
              <p key={index} style={{ color: entry.color }} className="text-sm">
                {entry.name}: R$ {valor.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} | {porcentagem.toFixed(1)}%
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  // Componente para gauge com agulha
  const GaugeChart = ({ 
    title, 
    percentage,
    type = 'evolution'
  }: { 
    title: string; 
    percentage: number;
    type?: 'evolution' | 'saldo';
  }) => {
    // Para gauges de saldo, inverter a lógica
    const isSaldoGauge = type === 'saldo';
    const displayValue = isSaldoGauge ? 100 - percentage : percentage;
    
    // Determinar cor baseado no tipo de gauge
    const getColor = () => {
      if (isSaldoGauge) {
        // Gauge de saldo: Verde quando falta pouco, Vermelho quando falta muito
        if (displayValue <= 20) return '#10b981'; // Verde - falta pouco
        if (displayValue <= 50) return '#f59e0b'; // Amarelo - falta médio
        return '#ef4444'; // Vermelho - falta muito
      } else {
        // Gauge de evolução: Verde positivo, Vermelho negativo
        return percentage >= 0 ? '#10b981' : '#ef4444';
      }
    };
    
    return (
      <div className="flex-1 rounded-xl p-4 border border-slate-500/50 shadow-xl" style={{ background: 'radial-gradient(ellipse at top left, rgba(139, 92, 246, 0.4) 0%, rgba(15, 23, 42, 0.95) 70%), linear-gradient(135deg, transparent 50%, rgba(0, 0, 0, 0.4) 100%)' }}>
        <h4 className="text-sm font-medium text-slate-200 mb-3 text-center">{title}</h4>
        <div className="relative" style={{ height: '140px' }}>
          <svg width="100%" height="100%" viewBox="0 0 200 145" preserveAspectRatio="xMidYMid meet">
            {/* Fundo do arco */}
            <path
              d="M 30 100 A 70 70 0 0 1 170 100"
              fill="none"
              stroke="#334155"
              strokeWidth="16"
              strokeLinecap="round"
            />
            
            {/* Arco colorido baseado no valor */}
            {(() => {
              const value = isSaldoGauge 
                ? Math.max(0, Math.min(100, displayValue))
                : Math.max(-100, Math.min(100, percentage));
              
              if (isSaldoGauge) {
                // Para gauge de saldo: arco cresce da direita (0%) para esquerda (100%)
                const angle = (value / 100) * 180; // 0 a 180 graus
                const startAngle = 0; // Começa à direita (0°)
                const endAngle = angle; // Termina onde o valor indica
                
                const startRad = (startAngle * Math.PI) / 180;
                const endRad = (endAngle * Math.PI) / 180;
                
                const x1 = 100 + 70 * Math.cos(Math.PI - startRad);
                const y1 = 100 + 70 * Math.sin(Math.PI - startRad);
                const x2 = 100 + 70 * Math.cos(Math.PI - endRad);
                const y2 = 100 + 70 * Math.sin(Math.PI - endRad);
                
                const largeArcFlag = angle > 90 ? 1 : 0;
                
                return (
                  <path
                    d={`M ${x1} ${y1} A 70 70 0 ${largeArcFlag} 1 ${x2} ${y2}`}
                    fill="none"
                    stroke={getColor()}
                    strokeWidth="16"
                    strokeLinecap="round"
                  />
                );
              } else {
                // Para gauge de evolução: lógica original
                const isPositive = value >= 0;
                const absValue = Math.abs(value);
                const angle = (absValue / 100) * 90; // 0 a 90 graus
                
                const startAngle = isPositive ? 180 : (180 - angle);
                const endAngle = isPositive ? (180 + angle) : 180;
                
                const startRad = (startAngle * Math.PI) / 180;
                const endRad = (endAngle * Math.PI) / 180;
                
                const x1 = 100 + 70 * Math.cos(startRad);
                const y1 = 100 + 70 * Math.sin(startRad);
                const x2 = 100 + 70 * Math.cos(endRad);
                const y2 = 100 + 70 * Math.sin(endRad);
                
                const largeArcFlag = angle > 90 ? 1 : 0;
                
                return (
                  <path
                    d={`M ${x1} ${y1} A 70 70 0 ${largeArcFlag} 1 ${x2} ${y2}`}
                    fill="none"
                    stroke={getColor()}
                    strokeWidth="16"
                    strokeLinecap="round"
                  />
                );
              }
            })()}
            
            {/* Agulha */}
            {(() => {
              let angle;
              if (isSaldoGauge) {
                // Para gauge de saldo: agulha vai de 0° (direita) a 180° (esquerda)
                const value = Math.max(0, Math.min(100, displayValue));
                angle = 180 - (value / 100) * 180; // 100% falta = 0°, 0% falta = 180°
              } else {
                // Para gauge de evolução: lógica original
                const value = Math.max(-100, Math.min(100, percentage));
                angle = 180 + (value / 100) * 90; // -100% = 90°, 0% = 180°, +100% = 270°
              }
              
              const angleRad = (angle * Math.PI) / 180;
              
              const needleLength = 55;
              const needleX = 100 + needleLength * Math.cos(angleRad);
              const needleY = 100 + needleLength * Math.sin(angleRad);
              
              return (
                <>
                  <line
                    x1="100"
                    y1="100"
                    x2={needleX}
                    y2={needleY}
                    stroke="#ffffff"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <circle cx="100" cy="100" r="5" fill="#ffffff" />
                </>
              );
            })()}
            
            {/* Valor inferior */}
            <text 
              x="100" 
              y="130" 
              fill={getColor()}
              fontSize="16" 
              fontWeight="bold" 
              textAnchor="middle"
            >
              {isSaldoGauge ? `${displayValue.toFixed(1)}%` : `${percentage >= 0 ? '+' : ''}${percentage.toFixed(1)}%`}
            </text>
          </svg>
        </div>
      </div>
    );
  };

  

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <Navbar />
      <div className="lg:ml-64 p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Dashboard Executivo</h1>
              <p className="text-slate-400 text-lg">Visão geral de vendas e performance • Atualizado em tempo real</p>
            </div>
            {ultimaAtualizacao && (
              <div className="text-right">
                <p className="text-xs text-slate-500">Última atualização de dados</p>
                <p className="text-sm text-slate-400">
                  🕒 {(() => {
                    const [year, month, day] = ultimaAtualizacao.split('-');
                    return `${day}/${month}/${year}`;
                  })()}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Resultado Financeiro Section */}
        <div className="mb-8">
          {/* Filtros em linha única - 4 colunas ou 2 colunas dependendo do nível de acesso */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700 shadow-xl mb-6">
            <div className={`grid grid-cols-1 ${podeVerFiltroNegocio && podeVerFiltroVendedor ? 'md:grid-cols-4' : 'md:grid-cols-2'} gap-4`}>
              {/* Unidade de Negócio - Apenas para Gerentes e Administradores */}
              {podeVerFiltroNegocio && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center">
                    <Building2 className="w-3 h-3 mr-1" />
                    Unidade de Negócio
                  </label>
                  <select
                    value={filters.negocio || ''}
                    onChange={(e) => updateFilter('negocio', e.target.value)}
                    disabled={userProfile?.nivel_acesso === 'Gerente' || userProfile?.nivel_acesso === 'Coord Tec Rum BR'}
                    className={`w-full px-3 py-2 text-sm text-white rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500 ${
                      userProfile?.nivel_acesso === 'Gerente' || userProfile?.nivel_acesso === 'Coord Tec Rum BR'
                        ? 'bg-slate-600 text-slate-300 cursor-not-allowed' 
                        : 'bg-slate-700'
                    }`}
                  >
                    <option value="">Todas</option>
                    {negocios.map(neg => (
                      <option key={neg} value={neg}>{neg}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Representante - Apenas para Gerentes e Administradores */}
              {podeVerFiltroVendedor && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center">
                    <Users className="w-3 h-3 mr-1" />
                    Vendedor
                  </label>
                  <select
                    value={filters.representante || ''}
                    onChange={(e) => updateFilter('representante', e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Todos</option>
                    {representantes.map(rep => (
                      <option key={rep.vendedor} value={rep.vendedor}>
                        {rep.negocio}, {rep.vendedor}, {rep.nome_vendedor}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Data Início */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  Data Início
                </label>
                <input
                  type="date"
                  value={localDataInicio}
                  onChange={handleDataInicioChange}
                  className="w-full px-3 py-2 text-sm bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Data Fim */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  Data Fim
                </label>
                <input
                  type="date"
                  value={localDataFim}
                  onChange={handleDataFimChange}
                  className="w-full px-3 py-2 text-sm bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Ações e info */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700">
              <div>
                {!filters.dataInicio && !filters.dataFim && (
                  <p className="text-xs text-slate-400 italic">
                    Sem datas selecionadas: usando valores YTD e mês atual
                  </p>
                )}
              </div>
              {(filters.representante || filters.dataInicio || filters.dataFim) && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-slate-400 hover:text-white transition-colors flex items-center space-x-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Limpar Filtros</span>
                </button>
              )}
            </div>
          </div>

          {/* Layout dos cards */}
          <div className="space-y-4">
            {/* Primeira linha de cards - Valores Anuais */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {/* Card de Valor Ano 2024 (YTD) */}
                <div>
                  <label className="block text-xs font-medium text-yellow-300 mb-2">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    <span className="text-sm font-semibold">Valor Ano 2024</span>
                  </label>
                  <div className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-2 border-yellow-500/50 rounded-lg px-4 py-3">
                    <div>
                      <p className="text-yellow-100 text-xs font-medium">Total YTD 2024</p>
                      <p className="text-yellow-300 text-base font-bold">
                        {formatCurrencyInteger(valorAno2024)}
                      </p>
                      <p className="text-yellow-400 text-xs mt-1">
                        {filters.dataInicio && filters.dataFim ? 'Mesmo período' : `Jan - ${['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][mesAtual - 1]}`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card de Valor Ano 2025 YTD */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    <span className="text-sm font-semibold">Valor Ano 2025</span>
                  </label>
                  <div className="bg-gradient-to-r from-slate-600/20 to-slate-500/20 border-2 border-slate-500/50 rounded-lg px-4 py-3">
                    <div>
                      <p className="text-slate-100 text-xs font-medium">Total 2025</p>
                      <p className="text-slate-300 text-base font-bold">
                        {formatCurrencyInteger(valorAno2025)}
                      </p>
                      <p className="text-slate-400 text-xs mt-1">
                        {filters.dataInicio && filters.dataFim ? 'Mesmo período' : `Jan - ${['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][mesAtual - 1]}`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card de Valor Total YTD */}
                <div>
                  <label className="block text-xs font-medium text-green-300 mb-2">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    <span className="text-sm font-semibold">Valor Ano Atual</span>
                  </label>
                  <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-500/50 rounded-lg px-4 py-3">
                    <div>
                      <p className="text-green-100 text-xs font-medium">Total</p>
                      <p className="text-green-300 text-base font-bold">
                        {formatCurrencyInteger(kpis?.totalVendas || 0)}
                      </p>
                      <p className="text-green-400 text-xs mt-1">
                        {temFiltrosData ? 'Período personalizado' : getMesPeriodo()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card de Meta */}
                <div>
                  <label className="block text-xs font-medium text-blue-300 mb-2">
                    <Target className="w-4 h-4 inline mr-1" />
                    <span className="text-sm font-semibold">Meta</span>
                  </label>
                  <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-2 border-blue-500/50 rounded-lg px-4 py-3">
                    <div>
                      <p className="text-blue-100 text-xs font-medium">Meta Período</p>
                      <p className="text-blue-300 text-base font-bold">
                        {metaLoading ? (
                          <RefreshCw className="w-5 h-5 animate-spin inline" />
                        ) : (
                          formatCurrencyInteger(metaValor)
                        )}
                      </p>
                      <p className="text-blue-400 text-xs mt-1">
                        {metaLoading ? 'Calculando...' : (
                          vendasParaComparacao > 0 && metaValor > 0 
                            ? `${Math.round(percentualMetaYTD)}% atingido` 
                            : 'Em andamento'
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card de Saldo da Meta */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">
                    <TrendingUp className="w-4 h-4 inline mr-1" />
                    <span className="text-sm font-semibold">Saldo da Meta</span>
                  </label>
                  <div className={`bg-gradient-to-r border-2 rounded-lg px-4 py-3 ${
                    (() => {
                      if (percentualMetaYTD < 50) {
                        return 'from-red-500/20 to-red-600/20 border-red-500/50';
                      } else if (percentualMetaYTD >= 51 && percentualMetaYTD <= 90) {
                        return 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/50';
                      } else {
                        return 'from-purple-500/20 to-purple-600/20 border-purple-500/50';
                      }
                    })()
                  }`}>
                    <div>
                      <p className={`text-xs font-medium ${
                        (() => {
                          if (metaValor === 0) return 'text-slate-100';
                          if (percentualMetaYTD < 50) return 'text-red-100';
                          if (percentualMetaYTD >= 51 && percentualMetaYTD <= 90) return 'text-yellow-100';
                          return 'text-purple-100';
                        })()
                      }`}>
                        {metaLoading ? 'Calculando...' : (
                          metaValor === 0 ? 'Meta não definida' : (
                            vendasParaComparacao >= metaValor ? 'Valor acima da meta' : 'Saldo Restante'
                          )
                        )}
                      </p>
                      <p className={`text-base font-bold ${
                        (() => {
                          if (metaValor === 0) return 'text-slate-300';
                          if (percentualMetaYTD < 50) return 'text-red-300';
                          if (percentualMetaYTD >= 51 && percentualMetaYTD <= 90) return 'text-yellow-300';
                          return 'text-purple-300';
                        })()
                      }`}>
                        {metaLoading ? (
                          <RefreshCw className="w-4 h-4 animate-spin inline" />
                        ) : (
                          metaValor === 0 ? 'R$ 0' : (
                            vendasParaComparacao >= metaValor ? (
                              formatCurrencyInteger(vendasParaComparacao - metaValor)
                            ) : (
                              formatCurrencyInteger(metaValor - vendasParaComparacao)
                            )
                          )
                        )}
                      </p>
                      <p className={`text-xs mt-1 ${
                        (() => {
                          if (metaValor === 0) return 'text-slate-400';
                          if (percentualMetaYTD < 50) return 'text-red-400';
                          if (percentualMetaYTD >= 51 && percentualMetaYTD <= 90) return 'text-yellow-400';
                          return 'text-purple-400';
                        })()
                      }`}>
                        {metaLoading ? '' : (
                          metaValor === 0 ? 'Sem dados de orçamento' : (
                            vendasParaComparacao >= metaValor ? 'Meta superada!' : `${Math.round(100 - percentualMetaYTD)}% a realizar`
                          )
                        )}
                      </p>
                    </div>
                  </div>
                </div>
            </div>

            {/* Segunda linha de cards - Valores Mensais */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {/* Card de Valor Mensal 2024 */}
                <div>
                  <label className="block text-xs font-medium text-yellow-300 mb-2">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    <span className="text-sm font-semibold">Valor Mensal 2024</span>
                  </label>
                  <div className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-2 border-yellow-500/50 rounded-lg px-4 py-3">
                    <div>
                      <p className="text-yellow-100 text-xs font-medium">Mês 2024</p>
                      <p className="text-yellow-300 text-base font-bold">
                        {formatCurrencyInteger(valorMes2024)}
                      </p>
                      <p className="text-yellow-400 text-xs mt-1">
                        {new Date(2024, mesAtual - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card de Valor Mensal 2025 */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    <span className="text-sm font-semibold">Valor Mensal 2025</span>
                  </label>
                  <div className="bg-gradient-to-r from-slate-600/20 to-slate-500/20 border-2 border-slate-500/50 rounded-lg px-4 py-3">
                    <div>
                      <p className="text-slate-100 text-xs font-medium">Mês 2025</p>
                      <p className="text-slate-300 text-base font-bold">
                        {formatCurrencyInteger(valorMes2025)}
                      </p>
                      <p className="text-slate-400 text-xs mt-1">
                        {new Date(2025, mesAtual - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card de Valor Mensal Atual */}
                <div>
                  <label className="block text-xs font-medium text-green-300 mb-2">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    <span className="text-sm font-semibold">Valor Mensal Atual</span>
                  </label>
                  <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-500/50 rounded-lg px-4 py-3">
                    <div>
                      <p className="text-green-100 text-xs font-medium">Valor Mensal</p>
                      <p className="text-green-300 text-base font-bold">
                        {formatCurrencyInteger(kpis?.totalVendasMes || 0)}
                      </p>
                      <p className="text-green-400 text-xs mt-1">
                        {new Date(anoAtual, mesAtual - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card de Meta */}
                <div>
                  <label className="block text-xs font-medium text-blue-300 mb-2">
                    <Target className="w-4 h-4 inline mr-1" />
                    <span className="text-sm font-semibold">Meta</span>
                  </label>
                  <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-2 border-blue-500/50 rounded-lg px-4 py-3">
                    <div>
                      <p className="text-blue-100 text-xs font-medium">Meta Mensal</p>
                      <p className="text-blue-300 text-base font-bold">
                        {metaLoading ? (
                          <RefreshCw className="w-5 h-5 animate-spin inline" />
                        ) : (
                          formatCurrencyInteger(metaValorMensal)
                        )}
                      </p>
                      <p className="text-blue-400 text-xs mt-1">
                        {metaLoading ? 'Calculando...' : (
                          vendasMensalParaComparacao > 0 && metaValorMensal > 0 
                            ? `${Math.round(percentualMetaMensal)}% atingido` 
                            : 'Em andamento'
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card de Saldo da Meta Mensal */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">
                    <TrendingUp className="w-4 h-4 inline mr-1" />
                    <span className="text-sm font-semibold">Saldo da Meta</span>
                  </label>
                  <div className={`bg-gradient-to-r border-2 rounded-lg px-4 py-3 min-w-[220px] ${
                    (() => {
                      if (percentualMetaMensal < 50) {
                        return 'from-red-500/20 to-red-600/20 border-red-500/50';
                      } else if (percentualMetaMensal >= 51 && percentualMetaMensal <= 90) {
                        return 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/50';
                      } else {
                        return 'from-purple-500/20 to-purple-600/20 border-purple-500/50';
                      }
                    })()
                  }`}>
                    <div>
                      <p className={`text-xs font-medium ${
                        (() => {
                          if (metaValorMensal === 0) return 'text-slate-100';
                          if (percentualMetaMensal < 50) return 'text-red-100';
                          if (percentualMetaMensal >= 51 && percentualMetaMensal <= 90) return 'text-yellow-100';
                          return 'text-purple-100';
                        })()
                      }`}>
                        {metaLoading ? 'Calculando...' : (
                          metaValorMensal === 0 ? 'Meta não definida' : (
                            vendasMensalParaComparacao >= metaValorMensal ? 'Valor acima da meta' : 'Saldo Restante'
                          )
                        )}
                      </p>
                      <p className={`text-base font-bold ${
                        (() => {
                          if (metaValorMensal === 0) return 'text-slate-300';
                          if (percentualMetaMensal < 50) return 'text-red-300';
                          if (percentualMetaMensal >= 51 && percentualMetaMensal <= 90) return 'text-yellow-300';
                          return 'text-purple-300';
                        })()
                      }`}>
                        {metaLoading ? (
                          <RefreshCw className="w-4 h-4 animate-spin inline" />
                        ) : (
                          metaValorMensal === 0 ? 'R$ 0' : (
                            vendasMensalParaComparacao >= metaValorMensal ? (
                              formatCurrencyInteger(vendasMensalParaComparacao - metaValorMensal)
                            ) : (
                              formatCurrencyInteger(metaValorMensal - vendasMensalParaComparacao)
                            )
                          )
                        )}
                      </p>
                      <p className={`text-xs mt-1 ${
                        (() => {
                          if (metaValorMensal === 0) return 'text-slate-400';
                          if (percentualMetaMensal < 50) return 'text-red-400';
                          if (percentualMetaMensal >= 51 && percentualMetaMensal <= 90) return 'text-yellow-400';
                          return 'text-purple-400';
                        })()
                      }`}>
                        {metaLoading ? '' : (
                          metaValorMensal === 0 ? 'Sem dados de orçamento' : (
                            vendasMensalParaComparacao >= metaValorMensal ? 'Meta superada!' : `${Math.round(100 - percentualMetaMensal)}% a realizar`
                          )
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
          </div>
        </div>

        {/* Card com 5 Gráficos - Todos Gauges com Agulha */}
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <GaugeChart 
              title="Evolução 25/24 (%)"
              percentage={valorAno2024 > 0 ? ((valorAno2025 - valorAno2024) / valorAno2024) * 100 : 0}
            />
            <GaugeChart 
              title="Evolução 26/25 (%)"
              percentage={evolucaoYTD}
            />
            <GaugeChart 
              title="Evolução Mensal (%)"
              percentage={evolucaoMensal}
            />
            <GaugeChart 
              title="% Meta Realizada YTD"
              percentage={percentualMetaYTD}
            />
            <div className="flex-1 rounded-xl p-4 border border-slate-500/50 shadow-xl" style={{ background: 'radial-gradient(ellipse at top left, rgba(139, 92, 246, 0.4) 0%, rgba(15, 23, 42, 0.95) 70%), linear-gradient(135deg, transparent 50%, rgba(0, 0, 0, 0.4) 100%)' }}>
              <h4 className="text-sm font-medium text-slate-200 mb-3 text-center">% Meta a Realizar</h4>
              <div className="relative" style={{ height: '140px' }}>
                <svg width="100%" height="100%" viewBox="0 0 200 145" preserveAspectRatio="xMidYMid meet">
                  {(() => {
                    const value = Math.max(0, Math.min(100, 100 - percentualMetaMensal));
                    
                    // Determinar cor baseada no valor
                    const getColor = () => {
                      if (value <= 20) return '#10b981'; // Verde
                      if (value <= 40) return '#eab308'; // Amarelo
                      if (value <= 60) return '#f97316'; // Laranja
                      return '#ef4444'; // Vermelho
                    };
                    
                    const color = getColor();
                    
                    return (
                      <>
                        {/* Arco semi-circular completo em cor única */}
                        <path
                          d="M 30 100 A 70 70 0 0 1 170 100"
                          fill="none"
                          stroke={color}
                          strokeWidth="16"
                          strokeLinecap="round"
                        />
                        
                        {/* Agulha */}
                        {(() => {
                          // Converter valor (0-100%) para ângulo (180-0 graus)
                          // 0% = 180° (esquerda), 100% = 0° (direita)
                          const angle = 180 - (value / 100) * 180;
                          const angleRad = (angle * Math.PI) / 180;
                          
                          const needleLength = 55;
                          const needleX = 100 + needleLength * Math.cos(angleRad);
                          const needleY = 100 - needleLength * Math.sin(angleRad);
                          
                          return (
                            <>
                              <line
                                x1="100"
                                y1="100"
                                x2={needleX}
                                y2={needleY}
                                stroke="#ffffff"
                                strokeWidth="3"
                                strokeLinecap="round"
                              />
                              <circle cx="100" cy="100" r="6" fill="#ffffff" />
                            </>
                          );
                        })()}
                        
                        {/* Valor central */}
                        <text 
                          x="100" 
                          y="130" 
                          fill="#ffffff"
                          fontSize="16" 
                          fontWeight="bold" 
                          textAnchor="middle"
                        >
                          {value.toFixed(1)}%
                        </text>
                      </>
                    );
                  })()}
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Gráfico de Evolução das Vendas */}
        <div className="mb-8">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Evolução das Vendas 12 Meses Móveis R$ (K)</h3>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-slate-300">2024</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-slate-300">2025</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm text-slate-300">2026</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-sm text-slate-300">Meta</span>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={dadosProjecao}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="mes" 
                  stroke="#9ca3af" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#9ca3af" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => (value / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="venda2024" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#3b82f6' }}
                  name="2024"
                />
                <Line 
                  type="monotone" 
                  dataKey="venda2025" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#10b981' }}
                  name="2025"
                />
                <Line 
                  type="monotone" 
                  dataKey="venda2026" 
                  stroke="#eab308" 
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#eab308' }}
                  name="2026"
                />
                <Line 
                  type="monotone" 
                  dataKey="meta" 
                  stroke="#8b5cf6" 
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  dot={{ r: 4, fill: '#8b5cf6' }}
                  name="Meta"
                />
              </LineChart>
            </ResponsiveContainer>

            {/* Tabela de Dados */}
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-1.5 px-2 text-slate-300 font-normal">R$ (K)</th>
                    {dadosProjecao.map((item: any) => (
                      <th key={item.mes} className="text-center py-1.5 px-2 text-slate-300 font-normal whitespace-nowrap">
                        {item.mes}
                      </th>
                    ))}
                    <th className="text-center py-1.5 px-2 text-slate-300 font-semibold whitespace-nowrap border-l border-slate-700">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Linha 2024 */}
                  <tr className="border-b border-slate-700/50">
                    <td className="py-1.5 px-2 text-blue-400">2024</td>
                    {dadosProjecao.map((item: any) => (
                      <td key={`2024-${item.mes}`} className="text-center py-1.5 px-2 text-slate-300 whitespace-nowrap">
                        {((item.venda2024 || 0) / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                      </td>
                    ))}
                    <td className="text-center py-1.5 px-2 text-blue-400 font-semibold whitespace-nowrap border-l border-slate-700">
                      {(dadosProjecao.reduce((acc: number, item: any) => acc + (item.venda2024 || 0), 0) / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                    </td>
                  </tr>
                  
                  {/* Linha 2025 */}
                  <tr className="border-b border-slate-700/50">
                    <td className="py-1.5 px-2 text-green-400">2025</td>
                    {dadosProjecao.map((item: any) => (
                      <td key={`2025-${item.mes}`} className="text-center py-1.5 px-2 text-slate-300 whitespace-nowrap">
                        {((item.venda2025 || 0) / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                      </td>
                    ))}
                    <td className="text-center py-1.5 px-2 text-green-400 font-semibold whitespace-nowrap border-l border-slate-700">
                      {(dadosProjecao.reduce((acc: number, item: any) => acc + (item.venda2025 || 0), 0) / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                    </td>
                  </tr>
                  
                  {/* Linha 2026 */}
                  <tr className="border-b border-slate-700/50">
                    <td className="py-1.5 px-2 text-yellow-400">2026</td>
                    {dadosProjecao.map((item: any) => (
                      <td key={`2026-${item.mes}`} className="text-center py-1.5 px-2 text-slate-300 whitespace-nowrap">
                        {((item.venda2026 || 0) / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                      </td>
                    ))}
                    <td className="text-center py-1.5 px-2 text-yellow-400 font-semibold whitespace-nowrap border-l border-slate-700">
                      {(dadosProjecao.reduce((acc: number, item: any) => acc + (item.venda2026 || 0), 0) / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                    </td>
                  </tr>
                  
                  {/* Linha Meta */}
                  <tr className="border-b border-slate-700/50">
                    <td className="py-1.5 px-2 text-purple-400">Meta</td>
                    {dadosProjecao.map((item: any) => (
                      <td key={`meta-${item.mes}`} className="text-center py-1.5 px-2 text-slate-300 whitespace-nowrap">
                        {((item.meta || 0) / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                      </td>
                    ))}
                    <td className="text-center py-1.5 px-2 text-purple-400 font-semibold whitespace-nowrap border-l border-slate-700">
                      {(dadosProjecao.reduce((acc: number, item: any) => acc + (item.meta || 0), 0) / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                    </td>
                  </tr>
                  
                  {/* Linha Variação 25/24 */}
                  <tr>
                    <td className="py-1.5 px-2 text-slate-400">Var 25/24</td>
                    {dadosProjecao.map((item: any) => {
                      const variacao = item.venda2024 > 0 
                        ? ((item.venda2025 - item.venda2024) / item.venda2024) * 100 
                        : 0;
                      const corVariacao = variacao >= 0 ? 'text-green-400' : 'text-red-400';
                      
                      return (
                        <td key={`var25-${item.mes}`} className={`text-center py-1.5 px-2 whitespace-nowrap ${corVariacao}`}>
                          {variacao >= 0 ? '+' : ''}{variacao.toFixed(0)}%
                        </td>
                      );
                    })}
                    <td className={`text-center py-1.5 px-2 font-semibold whitespace-nowrap border-l border-slate-700 ${
                      (() => {
                        const total2024 = dadosProjecao.reduce((acc: number, item: any) => acc + (item.venda2024 || 0), 0);
                        const total2025 = dadosProjecao.reduce((acc: number, item: any) => acc + (item.venda2025 || 0), 0);
                        const variacaoTotal = total2024 > 0 ? ((total2025 - total2024) / total2024) * 100 : 0;
                        return variacaoTotal >= 0 ? 'text-green-400' : 'text-red-400';
                      })()
                    }`}>
                      {(() => {
                        const total2024 = dadosProjecao.reduce((acc: number, item: any) => acc + (item.venda2024 || 0), 0);
                        const total2025 = dadosProjecao.reduce((acc: number, item: any) => acc + (item.venda2025 || 0), 0);
                        const variacaoTotal = total2024 > 0 ? ((total2025 - total2024) / total2024) * 100 : 0;
                        return `${variacaoTotal >= 0 ? '+' : ''}${variacaoTotal.toFixed(0)}%`;
                      })()}
                    </td>
                  </tr>
                  
                  {/* Linha Variação 26/25 */}
                  <tr>
                    <td className="py-1.5 px-2 text-slate-400">Var 26/25</td>
                    {dadosProjecao.map((item: any) => {
                      const variacao = item.venda2025 > 0 
                        ? ((item.venda2026 - item.venda2025) / item.venda2025) * 100 
                        : 0;
                      const corVariacao = variacao >= 0 ? 'text-green-400' : 'text-red-400';
                      
                      return (
                        <td key={`var26-${item.mes}`} className={`text-center py-1.5 px-2 whitespace-nowrap ${corVariacao}`}>
                          {variacao >= 0 ? '+' : ''}{variacao.toFixed(0)}%
                        </td>
                      );
                    })}
                    <td className={`text-center py-1.5 px-2 font-semibold whitespace-nowrap border-l border-slate-700 ${
                      (() => {
                        const total2025 = dadosProjecao.reduce((acc: number, item: any) => acc + (item.venda2025 || 0), 0);
                        const total2026 = dadosProjecao.reduce((acc: number, item: any) => acc + (item.venda2026 || 0), 0);
                        const variacaoTotal = total2025 > 0 ? ((total2026 - total2025) / total2025) * 100 : 0;
                        return variacaoTotal >= 0 ? 'text-green-400' : 'text-red-400';
                      })()
                    }`}>
                      {(() => {
                        const total2025 = dadosProjecao.reduce((acc: number, item: any) => acc + (item.venda2025 || 0), 0);
                        const total2026 = dadosProjecao.reduce((acc: number, item: any) => acc + (item.venda2026 || 0), 0);
                        const variacaoTotal = total2025 > 0 ? ((total2026 - total2025) / total2025) * 100 : 0;
                        return `${variacaoTotal >= 0 ? '+' : ''}${variacaoTotal.toFixed(0)}%`;
                      })()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Gráfico de Vendas por Unidade de Negócio ou Vendedor - Colunas Empilhadas */}
        <div className="mb-8">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700 shadow-2xl">
            {(() => {
              // Extrair chaves dinâmicas dos dados (excluir mes, anoCompleto, mesNumero e campos _evolucao)
              const dataKeys = (kpis.vendasMensaisPorNegocio || []).length > 0
                ? Object.keys(kpis.vendasMensaisPorNegocio[0]).filter(key => 
                    key !== 'mes' && 
                    key !== 'anoCompleto' && 
                    key !== 'mesNumero' &&
                    !key.includes('_evolucao') &&
                    key !== 'Sem Classificação'
                  )
                : [];
              
              // Paleta de cores para até 5 itens
              const cores = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899'];
              
              // Título dinâmico
              const titulo = filters.negocio 
                ? `Vendas por Vendedor - ${filters.negocio} - 12 Meses Móveis R$ (K)`
                : 'Vendas por Unidade de Negócio - 12 Meses Móveis R$ (K)';
              
              return (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white">{titulo}</h3>
                    <div className="flex items-center space-x-4">
                      {dataKeys.map((key, index) => (
                        <div key={key} className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cores[index % cores.length] }}></div>
                          <span className="text-sm text-slate-300">{key}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={kpis.vendasMensaisPorNegocio || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey="mes" 
                        stroke="#9ca3af" 
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        stroke="#9ca3af" 
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => (value / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                      />
                      <Tooltip content={<CustomTooltipWithPercentage />} />
                      {dataKeys.map((key, index) => (
                        <Bar 
                          key={key}
                          dataKey={key} 
                          stackId="a" 
                          fill={cores[index % cores.length]} 
                          radius={index === dataKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                          name={key}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>

                  {/* Tabela de Dados Dinâmica */}
                  <div className="mt-6 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="text-left py-1.5 px-2 text-slate-300 font-normal">R$ (K)</th>
                          {(kpis.vendasMensaisPorNegocio || []).map((item: any) => (
                            <th key={item.mes} className="text-center py-1.5 px-2 text-slate-300 font-normal whitespace-nowrap">
                              {item.mes}
                            </th>
                          ))}
                          <th className="text-center py-1.5 px-2 text-slate-300 font-semibold whitespace-nowrap border-l border-slate-700">
                            Total
                          </th>
                          <th className="text-center py-1.5 px-2 text-slate-300 font-semibold whitespace-nowrap">
                            %
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Linhas dinâmicas */}
                        {dataKeys.map((key, index) => {
                          const cor = cores[index % cores.length];
                          const corTexto = `rgb(${parseInt(cor.slice(1,3), 16)}, ${parseInt(cor.slice(3,5), 16)}, ${parseInt(cor.slice(5,7), 16)})`;
                          const totalLinha = (kpis.vendasMensaisPorNegocio || []).reduce((acc: number, item: any) => acc + (item[key] || 0), 0);
                          const totalGeral = (kpis.vendasMensaisPorNegocio || []).reduce((acc: number, item: any) => {
                            return acc + dataKeys.reduce((sum, k) => sum + (item[k] || 0), 0);
                          }, 0);
                          const percentualLinha = totalGeral > 0 ? (totalLinha / totalGeral) * 100 : 0;
                          
                          return (
                            <tr key={key} className="border-b border-slate-700/50">
                              <td className="py-1.5 px-2 font-medium" style={{ color: corTexto }}>{key}</td>
                              {(kpis.vendasMensaisPorNegocio || []).map((item: any) => (
                                <td key={`${key}-${item.mes}`} className="text-center py-1.5 px-2 text-slate-300 whitespace-nowrap">
                                  {((item[key] || 0) / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                </td>
                              ))}
                              <td className="text-center py-1.5 px-2 font-semibold whitespace-nowrap border-l border-slate-700" style={{ color: corTexto }}>
                                {(totalLinha / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                              </td>
                              <td className="text-center py-1.5 px-2 font-semibold whitespace-nowrap" style={{ color: corTexto }}>
                                {percentualLinha.toFixed(1)}%
                              </td>
                            </tr>
                          );
                        })}
                        
                        {/* Linha Total */}
                        <tr className="bg-slate-700/30">
                          <td className="py-1.5 px-2 text-white font-semibold">Total</td>
                          {(kpis.vendasMensaisPorNegocio || []).map((item: any) => {
                            const total = dataKeys.reduce((acc, key) => acc + (item[key] || 0), 0);
                            return (
                              <td key={`total-${item.mes}`} className="text-center py-1.5 px-2 text-white font-semibold whitespace-nowrap">
                                {(total / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                              </td>
                            );
                          })}
                          <td className="text-center py-1.5 px-2 text-white font-bold whitespace-nowrap border-l border-slate-700">
                            {(() => {
                              const totalGeral = (kpis.vendasMensaisPorNegocio || []).reduce((acc: number, item: any) => {
                                return acc + dataKeys.reduce((sum, key) => sum + (item[key] || 0), 0);
                              }, 0);
                              return (totalGeral / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
                            })()}
                          </td>
                          <td className="text-center py-1.5 px-2 text-white font-bold whitespace-nowrap">
                            100.0%
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* Análise de Tendência dos Negócios - BACKUP (comentado) */}
        {/* 
        <div className="mb-8">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-6">Análise de Tendência BKP</h3>
        */}
        
        {/* Análise de Tendência dos Negócios - NOVA VERSÃO EXECUTIVA */}
        <div className="mb-8">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-6">Análise de Tendência</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {(kpis.vendasPorNegocio || []).map((negocio: any) => {
                const evolucaoYtd = negocio.evolucao_ytd || 0;
                const evolucaoMes = negocio.evolucao_mes || 0;
                
                // Determinar status do card
                const getStatus = () => {
                  if (evolucaoYtd >= 5) return { color: 'green', icon: '🟢', label: 'Estável', text: 'Crescimento consistente no período' };
                  if (evolucaoYtd >= -5) return { color: 'yellow', icon: '🟡', label: 'Atenção', text: 'Leve variação, monitorar próximos meses' };
                  return { color: 'red', icon: '🔴', label: 'Crítico', text: 'Retração significativa, requer ação imediata' };
                };
                
                const status = getStatus();
                
                return (
                  <div 
                    key={negocio.negocio}
                    className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-6 hover:border-slate-600 transition-all"
                  >
                    {/* Cabeçalho com Status */}
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="text-base font-semibold text-slate-300">{negocio.negocio}</h4>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{status.icon}</span>
                        <span className={`text-xs font-medium ${
                          status.color === 'green' ? 'text-green-400' : 
                          status.color === 'yellow' ? 'text-yellow-400' : 
                          'text-red-400'
                        }`}>
                          {status.label}
                        </span>
                      </div>
                    </div>
                    
                    {/* 1. Número Principal */}
                    <div className="text-center mb-6">
                      <p className="text-sm text-slate-400 mb-2">YTD {anoAtual}</p>
                      <p className="text-2xl font-bold text-white mb-1">
                        {formatCurrencyInteger(negocio.valor_ytd_2025 || 0)}
                      </p>
                    </div>
                    
                    {/* 2. Comparação Anual */}
                    <div className="bg-slate-800/50 rounded-lg p-4 mb-4">
                      <p className="text-xs text-slate-400 mb-2">Performance vs Ano Anterior</p>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xl font-bold ${evolucaoYtd >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {evolucaoYtd >= 0 ? '📈' : '📉'} {evolucaoYtd >= 0 ? '+' : ''}{evolucaoYtd.toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-semibold">
                        Base: YTD {anoAtual - 1} — {formatCurrencyInteger(negocio.valor_ytd_2024 || 0)}
                      </p>
                    </div>
                    
                    {/* 3. Tendência Recente */}
                    <div className="bg-slate-800/50 rounded-lg p-4 mb-4">
                      <p className="text-xs text-slate-400 mb-2">Tendência Recente</p>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-white font-semibold">
                          {new Date(anoAtual, mesAtual - 1).toLocaleDateString('pt-BR', { month: 'short' })}/{anoAtual.toString().slice(-2)}
                        </span>
                        <span className="text-sm font-bold text-white">
                          {formatCurrencyInteger(negocio.valor_mes_atual || 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Variação mensal:</span>
                        <span className={`text-sm font-bold ${evolucaoMes >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {evolucaoMes >= 0 ? '📈' : '📉'} {evolucaoMes >= 0 ? '+' : ''}{evolucaoMes.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    
                    {/* 4. Representatividade */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-400">Participação no faturamento</span>
                        <span className="text-sm font-bold text-blue-400">
                          {(negocio.participacao || 0).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-1.5">
                        <div 
                          className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, negocio.participacao || 0)}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* 5. Comentário Executivo com IA */}
                    <div className="mt-4 pt-4 border-t border-slate-700">
                      <p className="text-xs font-semibold text-slate-300 mb-2">Comentário Executivo</p>
                      {loadingComentarios[negocio.negocio] ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                          <p className="text-xs text-slate-400 italic">Gerando análise...</p>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {comentariosIA[negocio.negocio] || status.text}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Card de Total */}
              {(() => {
                const totalYtd2025 = (kpis.vendasPorNegocio || []).reduce((acc: number, neg: any) => acc + (neg.valor_ytd_2025 || 0), 0);
                const totalYtd2024 = (kpis.vendasPorNegocio || []).reduce((acc: number, neg: any) => acc + (neg.valor_ytd_2024 || 0), 0);
                const totalMesAtual = (kpis.vendasPorNegocio || []).reduce((acc: number, neg: any) => acc + (neg.valor_mes_atual || 0), 0);
                const totalMesAnterior = (kpis.vendasPorNegocio || []).reduce((acc: number, neg: any) => acc + (neg.valor_mes_anterior || 0), 0);
                
                const evolucaoYtdTotal = totalYtd2024 > 0 ? ((totalYtd2025 - totalYtd2024) / totalYtd2024) * 100 : 0;
                const evolucaoMesTotal = totalMesAnterior > 0 ? ((totalMesAtual - totalMesAnterior) / totalMesAnterior) * 100 : 0;
                
                // Determinar status do Total
                const getStatusTotal = () => {
                  if (evolucaoYtdTotal >= 5) return { color: 'green', icon: '🟢', label: 'Estável', text: 'O faturamento anual apresenta crescimento saudável e consistente' };
                  if (evolucaoYtdTotal >= -5) return { color: 'yellow', icon: '🟡', label: 'Atenção', text: 'O faturamento anual está estável, porém há sinal de desaceleração no curto prazo que merece acompanhamento' };
                  return { color: 'red', icon: '🔴', label: 'Crítico', text: 'O faturamento apresenta retração significativa, recomenda-se revisão estratégica imediata' };
                };
                
                const statusTotal = getStatusTotal();
                
                return (
                  <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-2 border-blue-500/50 rounded-2xl p-6 hover:border-blue-400/50 transition-all">
                    {/* Cabeçalho com Status */}
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="text-base font-semibold text-blue-200">Total Consolidado</h4>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{statusTotal.icon}</span>
                        <span className={`text-xs font-medium ${
                          statusTotal.color === 'green' ? 'text-green-400' : 
                          statusTotal.color === 'yellow' ? 'text-yellow-400' : 
                          'text-red-400'
                        }`}>
                          {statusTotal.label}
                        </span>
                      </div>
                    </div>
                    
                    {/* 1. Número Principal */}
                    <div className="text-center mb-6">
                      <p className="text-sm text-blue-300 mb-2">YTD {anoAtual}</p>
                      <p className="text-3xl font-bold text-white mb-1">
                        {formatCurrencyInteger(totalYtd2025)}
                      </p>
                    </div>
                    
                    {/* 2. Comparação Anual */}
                    <div className="bg-blue-900/30 rounded-lg p-4 mb-4">
                      <p className="text-xs text-blue-300 mb-2">Performance vs Ano Anterior</p>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xl font-bold ${evolucaoYtdTotal >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {evolucaoYtdTotal >= 0 ? '📈' : '📉'} {evolucaoYtdTotal >= 0 ? '+' : ''}{evolucaoYtdTotal.toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-xs text-blue-400 font-semibold">
                        Base: YTD {anoAtual - 1} — {formatCurrencyInteger(totalYtd2024)}
                      </p>
                    </div>
                    
                    {/* 3. Tendência Recente */}
                    <div className="bg-blue-900/30 rounded-lg p-4 mb-4">
                      <p className="text-xs text-blue-300 mb-2">Tendência Recente</p>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-white font-semibold">
                          {new Date(anoAtual, mesAtual - 1).toLocaleDateString('pt-BR', { month: 'short' })}/{anoAtual.toString().slice(-2)}
                        </span>
                        <span className="text-sm font-bold text-white">
                          {formatCurrencyInteger(totalMesAtual)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-blue-400">Variação mensal:</span>
                        <span className={`text-sm font-bold ${evolucaoMesTotal >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {evolucaoMesTotal >= 0 ? '📈' : '📉'} {evolucaoMesTotal >= 0 ? '+' : ''}{evolucaoMesTotal.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    
                    {/* 4. Representatividade */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-blue-300">Participação no faturamento</span>
                        <span className="text-sm font-bold text-blue-400">
                          100%
                        </span>
                      </div>
                      <div className="w-full bg-blue-900/50 rounded-full h-1.5">
                        <div 
                          className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: '100%' }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* 5. Comentário Executivo com IA */}
                    <div className="mt-4 pt-4 border-t border-blue-700/50">
                      <p className="text-xs font-semibold text-blue-200 mb-2">Comentário Executivo</p>
                      {loadingComentarios['Total Consolidado'] ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                          <p className="text-xs text-blue-300 italic">Gerando análise...</p>
                        </div>
                      ) : (
                        <p className="text-xs text-blue-300 leading-relaxed">
                          {comentariosIA['Total Consolidado'] || statusTotal.text}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
            
            
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
