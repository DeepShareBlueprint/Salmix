import React, { useState, useEffect, useMemo } from 'react';
import { useVendas, type VendasFilters } from '@/react-app/hooks/useVendas';
import { useDashboard } from '@/react-app/hooks/useDashboard';
import Navbar from '@/react-app/components/Navbar';
import { 
  TrendingUp, 
  Calendar, 
  Users, 
  MapPin, 
  Package, 
  Building2,
  Search,
  RefreshCw,
  X,
  Target,
  ChevronRight,
  ChevronDown,
  DollarSign,
  ChevronLeft,
  FolderPlus,
  FolderMinus
} from 'lucide-react';


type ViewMode = 'cliente-produto' | 'produto-cliente';

interface DashboardFilters {
  negocio?: string;
  representante?: string;
  dataInicio?: string;
  dataFim?: string;
}

interface GroupedItem {
  id: string;
  name: string;
  items: string[];
  values: { [key: string]: number };
  total: number;
}

const ITEMS_PER_PAGE = 20;

export default function Vendas() {
  const [filters, setFilters] = useState<VendasFilters>({});
  const [dashboardFilters, setDashboardFilters] = useState<DashboardFilters>({});
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<string | null>(null);
  const { vendas, loading: vendasLoading, fetchVendas, fetchClientesOptions, getFilterOptions } = useVendas();
  const { kpis, loading: kpisLoading } = useDashboard(dashboardFilters);
  
  const [showFilters] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [userProfile, setUserProfile] = useState<{nivel_acesso: string; unidade_negocio: string | null; vendedor?: string | null} | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [negocios, setNegocios] = useState<string[]>([]);
  const [representantes, setRepresentantes] = useState<Array<{vendedor: string; nome_vendedor: string; regional: string; negocio?: string}>>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('cliente-produto');
  const [showComparative, setShowComparative] = useState(false);
  const [vendasAnoAnterior, setVendasAnoAnterior] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Estados para agrupamento
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [groups, setGroups] = useState<GroupedItem[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const loading = vendasLoading || kpisLoading;

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
            const filtrosDashboard: DashboardFilters = {};
            
            if (localUser.nivel_acesso === 'Gerente' && localUser.unidade_negocio) {
              // Gerentes veem apenas sua unidade de negócio
              filtrosAutomaticos.negocio = localUser.unidade_negocio;
              filtrosDashboard.negocio = localUser.unidade_negocio;
            } else if (localUser.nivel_acesso === 'Representante') {
              // Representantes veem apenas sua unidade de negócio e seu vendedor
              if (localUser.unidade_negocio) {
                filtrosAutomaticos.negocio = localUser.unidade_negocio;
                filtrosDashboard.negocio = localUser.unidade_negocio;
              }
              
              if (localUser.vendedor) {
                filtrosAutomaticos.representante = localUser.vendedor;
                filtrosDashboard.representante = localUser.vendedor;
              }
            } else if (localUser.nivel_acesso === 'Coord Tec Rum BR') {
              // Coord Tec Rum BR vê apenas Ruminantes
              filtrosAutomaticos.negocio = 'Ruminantes';
              filtrosDashboard.negocio = 'Ruminantes';
            }
            
            setFilters(filtrosAutomaticos);
            setDashboardFilters(filtrosDashboard);
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
      // Usar valores fixos de negócios em vez de buscar das vendas
      // Isso garante que os negócios sempre apareçam, mesmo sem vendas
      const negociosDisponiveis = ['Salmix B2B', 'Ruminantes', 'Ave/Sui'];
      setNegocios(negociosDisponiveis);
      
      // Passar o filtro de negócio ao buscar representantes
      fetchRepresentantes(negocioFiltro);
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
      
      const response = await fetch(url);
      if (response.ok) {
        const reps = await response.json() as Array<{vendedor: string; nome_vendedor: string; regional: string}>;
        setRepresentantes(reps);
      }
    } catch (error) {
      console.error('Erro ao buscar representantes:', error);
    }
  };

  

  const fetchVendasAnoAnterior = async (currentFilters: DashboardFilters) => {
    try {
      const params = new URLSearchParams();
      
      if (currentFilters.dataInicio && currentFilters.dataFim) {
        // Com filtros de data: buscar mesmo período do ano anterior
        const anoInicio = parseInt(currentFilters.dataInicio.split('-')[0]);
        const mesInicio = currentFilters.dataInicio.substring(5);
        const anoFim = parseInt(currentFilters.dataFim.split('-')[0]);
        const mesFim = currentFilters.dataFim.substring(5);
        
        const dataInicioAnoAnterior = `${anoInicio - 1}-${mesInicio}`;
        const dataFimAnoAnterior = `${anoFim - 1}-${mesFim}`;
        
        params.append('dataInicio', dataInicioAnoAnterior);
        params.append('dataFim', dataFimAnoAnterior);
      } else {
        // Sem filtros de data: buscar YTD do ano anterior
        // O backend já retorna YTD por padrão, então só precisamos não passar datas
        // Mas vamos garantir que buscamos do ano anterior explicitamente
        const anoAnterior = anoAtual - 1;
        params.append('dataInicio', `${anoAnterior}-01-01`);
        params.append('dataFim', `${anoAnterior}-${mesAtual.toString().padStart(2, '0')}-31`);
      }
      
      if (currentFilters.negocio) params.append('negocio', currentFilters.negocio);
      if (currentFilters.representante) params.append('representante', currentFilters.representante);
      
      const response = await fetch(`/api/vendas?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setVendasAnoAnterior(data);
        console.log('✅ Vendas ano anterior carregadas:', data.length, 'registros');
      }
    } catch (error) {
      console.error('Erro ao buscar vendas do ano anterior:', error);
      setVendasAnoAnterior([]);
    }
  };

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

  useEffect(() => {
    const initializePage = async () => {
      await fetchUserProfile();
      await fetchUltimaAtualizacao();
    };
    initializePage();
  }, []);
  
  // Buscar opções de filtro após ter o perfil do usuário
  useEffect(() => {
    if (!profileLoading) {
      fetchFilterOptions(filters.negocio);
    }
  }, [profileLoading]);

  useEffect(() => {
    fetchRepresentantes(filters.negocio);
    fetchClientesOptions(filters.negocio);
  }, [filters.negocio]);

  useEffect(() => {
    if (!profileLoading) {
      fetchVendas(filters);
      fetchVendasAnoAnterior(dashboardFilters);
    }
  }, [filters, dashboardFilters, profileLoading]);

  // Resetar página quando filtros ou busca mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, searchTerm, viewMode, showComparative]);

  // Resetar seleções e grupos quando mudar o modo de visualização ou comparativo
  useEffect(() => {
    setSelectedItems(new Set());
    setGroups([]);
    setExpandedGroups(new Set());
  }, [viewMode, showComparative]);

  const filterOptions = getFilterOptions(filters);

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

    // Atualizar também os filtros do dashboard para manter os cards sincronizados
    if (key === 'negocio' || key === 'representante' || key === 'dataInicio' || key === 'dataFim') {
      setDashboardFilters(prev => {
        const newDashFilters = {
          ...prev,
          [key]: value === '' ? undefined : value
        };
        
        if (key === 'negocio') {
          newDashFilters.representante = undefined;
        }
        
        return newDashFilters;
      });
    }
  };

  const clearFilters = () => {
    // Limpar apenas filtros que o usuário pode alterar
    let emptyFilters: VendasFilters = {};
    let emptyDashFilters: DashboardFilters = {};
    
    // Manter filtros obrigatórios baseado no nível de acesso
    if (userProfile?.nivel_acesso === 'Gerente' && userProfile.unidade_negocio) {
      emptyFilters.negocio = userProfile.unidade_negocio;
      emptyDashFilters.negocio = userProfile.unidade_negocio;
    } else if (userProfile?.nivel_acesso === 'Representante') {
      if (userProfile.unidade_negocio) {
        emptyFilters.negocio = userProfile.unidade_negocio;
        emptyDashFilters.negocio = userProfile.unidade_negocio;
      }
      if (userProfile.vendedor) {
        emptyFilters.representante = userProfile.vendedor;
        emptyDashFilters.representante = userProfile.vendedor;
      }
    } else if (userProfile?.nivel_acesso === 'Coord Tec Rum BR') {
      emptyFilters.negocio = 'Ruminantes';
      emptyDashFilters.negocio = 'Ruminantes';
    }
    
    setFilters(emptyFilters);
    setDashboardFilters(emptyDashFilters);
    setSearchTerm('');
  };

  const toggleItemExpansion = (itemNome: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemNome)) {
        newSet.delete(itemNome);
      } else {
        newSet.add(itemNome);
      }
      return newSet;
    });
  };

  const toggleGroupExpansion = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const toggleItemSelection = (itemNome: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemNome)) {
        newSet.delete(itemNome);
      } else {
        newSet.add(itemNome);
      }
      return newSet;
    });
  };

  const createGroup = () => {
    if (selectedItems.size === 0) return;
    
    const itemsArray = Array.from(selectedItems);
    const groupId = `group-${Date.now()}`;
    const groupName = `Grupo ${groups.length + 1}`;
    
    // Calcular valores agrupados baseado no modo de visualização
    const valores: { [key: string]: number } = {};
    let total = 0;
    
    if (viewMode === 'cliente-produto') {
      const clientesSelecionados = dadosClientes.filter(c => selectedItems.has(c.cliente));
      meses.forEach(mes => {
        const soma = clientesSelecionados.reduce((acc, c) => acc + (c[mes] || 0), 0);
        valores[mes] = soma;
        total += soma;
      });
    } else {
      const produtosSelecionados = dadosProdutos.filter(p => selectedItems.has(p.produto));
      meses.forEach(mes => {
        const soma = produtosSelecionados.reduce((acc, p) => acc + (p[mes] || 0), 0);
        valores[mes] = soma;
        total += soma;
      });
    }
    
    const newGroup: GroupedItem = {
      id: groupId,
      name: groupName,
      items: itemsArray,
      values: valores,
      total
    };
    
    setGroups(prev => [...prev, newGroup]);
    setSelectedItems(new Set());
  };

  const removeGroup = (groupId: string) => {
    setGroups(prev => prev.filter(g => g.id !== groupId));
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      newSet.delete(groupId);
      return newSet;
    });
  };

  const formatCurrencyInteger = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Usar metas que já vêm do dashboard (evita chamadas duplicadas)
  const metaValor = kpis?.metaYTD || 0;
  const metaValorMensal = kpis?.metaMensal || 0;
  const metaLoading = kpisLoading;

  // Determinar ano e mês de referência baseado nos dados reais das vendas
  // NUNCA usar a data atual do sistema - sempre usar os dados da base
  let anoAtual = kpis?.anoAtualDados || 2024;
  let mesAtual = kpis?.mesAtualDados || 10;
  
  // Verificar se há filtros de data aplicados
  const temFiltrosData = dashboardFilters.dataInicio && dashboardFilters.dataFim;
  
  if (temFiltrosData && dashboardFilters.dataFim) {
    // Quando há filtros de data, usar a data fim do filtro como referência
    const [ano, mes] = dashboardFilters.dataFim.split('-').map(Number);
    anoAtual = ano;
    mesAtual = mes;
  }
  // Caso contrário, anoAtual e mesAtual já foram definidos com os valores dos dados reais (kpis?.anoAtualDados e kpis?.mesAtualDados)

  

  

  // Os filtros agora são aplicados no backend via API
  // Aqui apenas usamos os dados retornados pela API que já estão filtrados
  let vendasParaCalcular = vendas;

  // Aplicar busca
  vendasParaCalcular = vendasParaCalcular.filter(venda => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      venda.nome_produto.toLowerCase().includes(searchLower) ||
      venda.codigo_produto.toLowerCase().includes(searchLower) ||
      (venda.representante && venda.representante.toLowerCase().includes(searchLower)) ||
      (venda.nome_cliente && venda.nome_cliente.toLowerCase().includes(searchLower))
    );
  });

  // Usar os mesmos valores que o Dashboard usa para comparação com Meta
  // Esses valores já vêm calculados do backend (apenas Ruminantes + Ave/Sui, excluindo Salmix B2B)
  const vendasParaComparacao = kpis?.vendasParaMeta || 0;
  const vendasMensalParaComparacao = kpis?.vendasMensalParaMeta || 0;
  
  // Calcular percentuais da meta
  const percentualMetaYTD = metaValor > 0 ? (vendasParaComparacao / metaValor) * 100 : 0;
  const percentualMetaMensal = metaValorMensal > 0 ? (vendasMensalParaComparacao / metaValorMensal) * 100 : 0;

  

  // Processar dados agrupados por cliente com valores mensais e produtos (memoizado)
  const { dadosClientes, meses: mesesCliente } = useMemo(() => {
    // Se não há vendas, retornar vazio
    if (!vendasParaCalcular || vendasParaCalcular.length === 0) {
      console.log('❌ Vendas.tsx - Nenhuma venda para processar');
      return { dadosClientes: [], meses: [] };
    }
    
    console.log('✅ Vendas.tsx - Total de vendas recebidas:', vendasParaCalcular.length);
    console.log('📅 Vendas.tsx - Primeiras 10 datas:', vendasParaCalcular.slice(0, 10).map(v => v.data_venda));
    console.log('📅 Vendas.tsx - Últimas 10 datas:', vendasParaCalcular.slice(-10).map(v => v.data_venda));
    
    // Debug: contagem por mês
    const vendasPorMesDebug = new Map<string, number>();
    vendasParaCalcular.forEach(v => {
      if (v.data_venda && v.data_venda.length >= 7) {
        const mesAno = v.data_venda.substring(0, 7);
        vendasPorMesDebug.set(mesAno, (vendasPorMesDebug.get(mesAno) || 0) + 1);
      }
    });
    console.log('📊 Vendas.tsx - Distribuição por mês recebida:');
    Array.from(vendasPorMesDebug.keys()).sort().forEach(mes => {
      console.log(`  ${mes}: ${vendasPorMesDebug.get(mes)} vendas`);
    });
    
    // IMPORTANTE: Vendas já vêm filtradas do backend
    // Se não há filtros de data, o backend já aplicou YTD automaticamente (Janeiro até mês atual)
    let vendasParaProcessar = vendasParaCalcular;
    
    // Gerar lista de meses no período baseado APENAS nos dados reais
    const meses: string[] = [];
    
    // SEMPRE gerar meses baseado nos dados disponíveis, não nos filtros
    // Isso garante que se há dados de Jan-Nov, todos os 11 meses sejam mostrados
    const datas = vendasParaProcessar.map(v => {
      // Garantir que a data está no formato YYYY-MM-DD
      const data = v.data_venda;
      if (data && data.length >= 7) {
        return data.substring(0, 7); // Pegar apenas YYYY-MM
      }
      return null;
    }).filter(Boolean) as string[];
    
    // Obter todos os meses únicos presentes nos dados
    const mesesUnicos = [...new Set(datas)].sort();
    
    console.log('📊 Vendas.tsx - Meses únicos encontrados nos dados:', mesesUnicos);
    
    if (mesesUnicos.length === 0) {
      console.log('❌ Vendas.tsx - Nenhum mês único encontrado');
      return { dadosClientes: [], meses: [] };
    }
    
    // Se não há filtros de data, usar Janeiro até o último mês com dados
    if (!filters.dataInicio && !filters.dataFim) {
      const [ultimoAno, ultimoMes] = mesesUnicos[mesesUnicos.length - 1].split('-').map(Number);
      console.log(`📅 Vendas.tsx - Gerando meses de Janeiro até ${ultimoMes}/${ultimoAno}`);
      for (let mes = 1; mes <= ultimoMes; mes++) {
        const mesAno = `${ultimoAno}-${mes.toString().padStart(2, '0')}`;
        meses.push(mesAno);
      }
    } else {
      // Com filtros: usar todos os meses presentes nos dados filtrados
      meses.push(...mesesUnicos);
    }
    
    console.log('✅ Vendas.tsx - Meses gerados para tabela:', meses);
    
    // Agrupar vendas por cliente e por NOME de produto dentro de cada cliente (consolida códigos iguais)
    const vendasPorCliente = new Map<string, {
      vendasMes: Map<string, number>,
      produtos: Map<string, {nomeProduto: string, vendasMes: Map<string, number>}>
    }>();
    
    vendasParaProcessar.forEach(venda => {
      // Priorizar nome_cliente, depois cliente, senão usar 'Cliente não identificado'
      const cliente = (venda.nome_cliente && venda.nome_cliente.trim()) || 
                      (venda.cliente && venda.cliente.trim()) || 
                      'Cliente não identificado';
      const nomeProduto = venda.nome_produto;
      const mesAno = venda.data_venda.substring(0, 7); // YYYY-MM
      
      if (!vendasPorCliente.has(cliente)) {
        vendasPorCliente.set(cliente, {
          vendasMes: new Map(),
          produtos: new Map()
        });
      }
      
      const dadosCliente = vendasPorCliente.get(cliente)!;
      
      // Atualizar total do cliente no mês
      const valorAtualCliente = dadosCliente.vendasMes.get(mesAno) || 0;
      dadosCliente.vendasMes.set(mesAno, valorAtualCliente + venda.valor_total);
      
      // Atualizar vendas do produto no mês (usando NOME do produto como chave para consolidar)
      if (!dadosCliente.produtos.has(nomeProduto)) {
        dadosCliente.produtos.set(nomeProduto, {
          nomeProduto,
          vendasMes: new Map()
        });
      }
      const dadosProduto = dadosCliente.produtos.get(nomeProduto)!;
      const valorAtualProduto = dadosProduto.vendasMes.get(mesAno) || 0;
      dadosProduto.vendasMes.set(mesAno, valorAtualProduto + venda.valor_total);
    });
    
    // Converter para array e calcular totais
    const dadosClientes = Array.from(vendasPorCliente.entries()).map(([cliente, dados]) => {
      const valores: any = { cliente };
      let total = 0;
      
      meses.forEach(mes => {
        const valor = dados.vendasMes.get(mes) || 0;
        valores[mes] = valor;
        total += valor;
      });
      
      valores.total = total;
      
      // Processar produtos do cliente
      const produtos = Array.from(dados.produtos.values()).map((dadosProduto) => {
        const valoresProduto: any = { 
          produto: dadosProduto.nomeProduto
        };
        let totalProduto = 0;
        
        meses.forEach(mes => {
          const valor = dadosProduto.vendasMes.get(mes) || 0;
          valoresProduto[mes] = valor;
          totalProduto += valor;
        });
        
        valoresProduto.total = totalProduto;
        return valoresProduto;
      });
      
      // Ordenar produtos por total (maior para menor)
      produtos.sort((a, b) => b.total - a.total);
      valores.produtos = produtos;
      
      return valores;
    });
    
    // Ordenar por total (maior para menor) - sem filtrar por total > 0
    dadosClientes.sort((a, b) => b.total - a.total);
    
    return { dadosClientes, meses };
  }, [vendasParaCalcular, filters.dataInicio, filters.dataFim, anoAtual, mesAtual]);

  // Processar dados agrupados por produto com valores mensais e clientes (memoizado)
  const { dadosProdutos, meses: mesesProduto } = useMemo(() => {
    // Se não há vendas, retornar vazio
    if (!vendasParaCalcular || vendasParaCalcular.length === 0) {
      return { dadosProdutos: [], meses: [] };
    }
    
    // IMPORTANTE: Vendas já vêm filtradas do backend
    // Se não há filtros de data, o backend já aplicou YTD automaticamente (Janeiro até mês atual)
    let vendasParaProcessar = vendasParaCalcular;
    
    // Gerar lista de meses no período baseado APENAS nos dados reais
    const meses: string[] = [];
    
    // SEMPRE gerar meses baseado nos dados disponíveis, não nos filtros
    // Isso garante que se há dados de Jan-Nov, todos os 11 meses sejam mostrados
    const datas = vendasParaProcessar.map(v => {
      // Garantir que a data está no formato YYYY-MM-DD
      const data = v.data_venda;
      if (data && data.length >= 7) {
        return data.substring(0, 7); // Pegar apenas YYYY-MM
      }
      return null;
    }).filter(Boolean) as string[];
    
    // Obter todos os meses únicos presentes nos dados
    const mesesUnicos = [...new Set(datas)].sort();
    
    if (mesesUnicos.length === 0) {
      return { dadosProdutos: [], meses: [] };
    }
    
    // Se não há filtros de data, usar Janeiro até o último mês com dados
    if (!filters.dataInicio && !filters.dataFim) {
      const [ultimoAno, ultimoMes] = mesesUnicos[mesesUnicos.length - 1].split('-').map(Number);
      for (let mes = 1; mes <= ultimoMes; mes++) {
        const mesAno = `${ultimoAno}-${mes.toString().padStart(2, '0')}`;
        meses.push(mesAno);
      }
    } else {
      // Com filtros: usar todos os meses presentes nos dados filtrados
      meses.push(...mesesUnicos);
    }
    
    // Agrupar vendas por NOME de produto (consolida todos os códigos do mesmo produto) e por cliente dentro de cada produto
    const vendasPorProduto = new Map<string, {
      nomeProduto: string,
      vendasMes: Map<string, number>,
      clientes: Map<string, Map<string, number>>
    }>();
    
    vendasParaProcessar.forEach(venda => {
      const nomeProduto = venda.nome_produto;
      // Priorizar nome_cliente, depois cliente, senão usar 'Cliente não identificado'
      const cliente = (venda.nome_cliente && venda.nome_cliente.trim()) || 
                      (venda.cliente && venda.cliente.trim()) || 
                      'Cliente não identificado';
      const mesAno = venda.data_venda.substring(0, 7); // YYYY-MM
      
      // Usar nome do produto como chave para consolidar todos os códigos do mesmo produto
      if (!vendasPorProduto.has(nomeProduto)) {
        vendasPorProduto.set(nomeProduto, {
          nomeProduto,
          vendasMes: new Map(),
          clientes: new Map()
        });
      }
      
      const dadosProduto = vendasPorProduto.get(nomeProduto)!;
      
      // Atualizar total do produto no mês
      const valorAtualProduto = dadosProduto.vendasMes.get(mesAno) || 0;
      dadosProduto.vendasMes.set(mesAno, valorAtualProduto + venda.valor_total);
      
      // Atualizar vendas do cliente no mês
      if (!dadosProduto.clientes.has(cliente)) {
        dadosProduto.clientes.set(cliente, new Map());
      }
      const vendasCliente = dadosProduto.clientes.get(cliente)!;
      const valorAtualCliente = vendasCliente.get(mesAno) || 0;
      vendasCliente.set(mesAno, valorAtualCliente + venda.valor_total);
    });
    
    // Converter para array e calcular totais
    const dadosProdutos = Array.from(vendasPorProduto.values()).map((dados) => {
      const valores: any = { 
        produto: dados.nomeProduto
      };
      let total = 0;
      
      meses.forEach(mes => {
        const valor = dados.vendasMes.get(mes) || 0;
        valores[mes] = valor;
        total += valor;
      });
      
      valores.total = total;
      
      // Processar clientes do produto
      const clientes = Array.from(dados.clientes.entries()).map(([cliente, vendasMes]) => {
        const valoresCliente: any = { cliente };
        let totalCliente = 0;
        
        meses.forEach(mes => {
          const valor = vendasMes.get(mes) || 0;
          valoresCliente[mes] = valor;
          totalCliente += valor;
        });
        
        valoresCliente.total = totalCliente;
        return valoresCliente;
      });
      
      // Ordenar clientes por total (maior para menor)
      clientes.sort((a, b) => b.total - a.total);
      valores.clientes = clientes;
      
      return valores;
    });
    
    // Ordenar por total (maior para menor) - sem filtrar por total > 0
    dadosProdutos.sort((a, b) => b.total - a.total);
    
    return { dadosProdutos, meses };
  }, [vendasParaCalcular, filters.dataInicio, filters.dataFim, anoAtual, mesAtual]);
  
  // Processar dados comparativos (ano atual vs ano anterior)
  const { dadosComparativos, mesesComparativos } = useMemo(() => {
    if (!showComparative || vendasAnoAnterior.length === 0) {
      return { dadosComparativos: [], mesesComparativos: [] };
    }
    
    // Processar vendas do ano anterior da mesma forma que o ano atual
    const vendasAnoAnteriorProcessadas = vendasAnoAnterior.filter(venda => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        venda.nome_produto.toLowerCase().includes(searchLower) ||
        venda.codigo_produto.toLowerCase().includes(searchLower) ||
        (venda.representante && venda.representante.toLowerCase().includes(searchLower)) ||
        (venda.nome_cliente && venda.nome_cliente.toLowerCase().includes(searchLower))
      );
    });
    
    // Determinar os meses únicos presentes nos dados
    const mesesAnoAnterior = [...new Set(vendasAnoAnteriorProcessadas.map(v => v.data_venda.substring(0, 7)))].sort();
    
    // Usar os meses do ano anterior como referência (convertidos para formato de exibição)
    const meses = mesesAnoAnterior.map(mesAno => {
      const [, mes] = mesAno.split('-');
      return mes; // Apenas o mês (01, 02, etc)
    });
    
    if (viewMode === 'cliente-produto') {
      // Agrupar por cliente
      const vendasPorCliente = new Map<string, {
        vendasAnoAtual: Map<string, number>,
        vendasAnoAnterior: Map<string, number>
      }>();
      
      // Processar ano atual
      vendasParaCalcular.forEach(venda => {
        const cliente = (venda.nome_cliente && venda.nome_cliente.trim()) || 
                        (venda.cliente && venda.cliente.trim()) || 
                        'Cliente não identificado';
        const mes = venda.data_venda.substring(5, 7); // Pegar apenas o mês (MM)
        
        if (!vendasPorCliente.has(cliente)) {
          vendasPorCliente.set(cliente, {
            vendasAnoAtual: new Map(),
            vendasAnoAnterior: new Map()
          });
        }
        
        const dados = vendasPorCliente.get(cliente)!;
        const valorAtual = dados.vendasAnoAtual.get(mes) || 0;
        dados.vendasAnoAtual.set(mes, valorAtual + venda.valor_total);
      });
      
      // Processar ano anterior
      vendasAnoAnteriorProcessadas.forEach(venda => {
        const cliente = (venda.nome_cliente && venda.nome_cliente.trim()) || 
                        (venda.cliente && venda.cliente.trim()) || 
                        'Cliente não identificado';
        const mes = venda.data_venda.substring(5, 7); // Pegar apenas o mês (MM)
        
        if (!vendasPorCliente.has(cliente)) {
          vendasPorCliente.set(cliente, {
            vendasAnoAtual: new Map(),
            vendasAnoAnterior: new Map()
          });
        }
        
        const dados = vendasPorCliente.get(cliente)!;
        const valorAtual = dados.vendasAnoAnterior.get(mes) || 0;
        dados.vendasAnoAnterior.set(mes, valorAtual + venda.valor_total);
      });
      
      // Converter para array
      const dadosComparativos = Array.from(vendasPorCliente.entries()).map(([cliente, dados]) => {
        const valores: any = { cliente };
        let totalAtual = 0;
        let totalAnterior = 0;
        
        meses.forEach(mes => {
          const valorAtual = dados.vendasAnoAtual.get(mes) || 0;
          const valorAnterior = dados.vendasAnoAnterior.get(mes) || 0;
          valores[`${mes}_atual`] = valorAtual;
          valores[`${mes}_anterior`] = valorAnterior;
          totalAtual += valorAtual;
          totalAnterior += valorAnterior;
        });
        
        valores.totalAtual = totalAtual;
        valores.totalAnterior = totalAnterior;
        
        return valores;
      });
      
      dadosComparativos.sort((a, b) => b.totalAtual - a.totalAtual);
      
      return { dadosComparativos, mesesComparativos: meses };
    } else {
      // Agrupar por produto
      const vendasPorProduto = new Map<string, {
        vendasAnoAtual: Map<string, number>,
        vendasAnoAnterior: Map<string, number>
      }>();
      
      // Processar ano atual
      vendasParaCalcular.forEach(venda => {
        const produto = venda.nome_produto;
        const mes = venda.data_venda.substring(5, 7);
        
        if (!vendasPorProduto.has(produto)) {
          vendasPorProduto.set(produto, {
            vendasAnoAtual: new Map(),
            vendasAnoAnterior: new Map()
          });
        }
        
        const dados = vendasPorProduto.get(produto)!;
        const valorAtual = dados.vendasAnoAtual.get(mes) || 0;
        dados.vendasAnoAtual.set(mes, valorAtual + venda.valor_total);
      });
      
      // Processar ano anterior
      vendasAnoAnteriorProcessadas.forEach(venda => {
        const produto = venda.nome_produto;
        const mes = venda.data_venda.substring(5, 7);
        
        if (!vendasPorProduto.has(produto)) {
          vendasPorProduto.set(produto, {
            vendasAnoAtual: new Map(),
            vendasAnoAnterior: new Map()
          });
        }
        
        const dados = vendasPorProduto.get(produto)!;
        const valorAtual = dados.vendasAnoAnterior.get(mes) || 0;
        dados.vendasAnoAnterior.set(mes, valorAtual + venda.valor_total);
      });
      
      // Converter para array
      const dadosComparativos = Array.from(vendasPorProduto.entries()).map(([produto, dados]) => {
        const valores: any = { produto };
        let totalAtual = 0;
        let totalAnterior = 0;
        
        meses.forEach(mes => {
          const valorAtual = dados.vendasAnoAtual.get(mes) || 0;
          const valorAnterior = dados.vendasAnoAnterior.get(mes) || 0;
          valores[`${mes}_atual`] = valorAtual;
          valores[`${mes}_anterior`] = valorAnterior;
          totalAtual += valorAtual;
          totalAnterior += valorAnterior;
        });
        
        valores.totalAtual = totalAtual;
        valores.totalAnterior = totalAnterior;
        
        return valores;
      });
      
      dadosComparativos.sort((a, b) => b.totalAtual - a.totalAtual);
      
      return { dadosComparativos, mesesComparativos: meses };
    }
  }, [showComparative, vendasAnoAnterior, vendasParaCalcular, viewMode, searchTerm]);
  
  // Usar os meses do modo atual
  const meses = showComparative ? mesesComparativos : (viewMode === 'cliente-produto' ? mesesCliente : mesesProduto);
  
  const getMesNome = (mesAno: string) => {
    const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const [ano, mes] = mesAno.split('-');
    const mesNum = parseInt(mes) - 1;
    return `${mesesNomes[mesNum]}/${ano.slice(2)}`;
  };

  // Função para gerar texto "Jan - Mes atual"
  const getMesPeriodo = () => {
    const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `Jan - ${mesesNomes[mesAtual - 1]}`;
  };

  // Filtrar dados baseado na busca e excluir itens que estão em grupos (memoizado)
  const itemsInGroups = useMemo(() => {
    const itemsSet = new Set<string>();
    groups.forEach(group => {
      group.items.forEach(item => itemsSet.add(item));
    });
    return itemsSet;
  }, [groups]);

  const dadosFiltrados = useMemo(() => {
    if (showComparative) {
      return dadosComparativos.filter(item => {
        if (!searchTerm) return true;
        const nome = viewMode === 'cliente-produto' ? item.cliente : item.produto;
        return nome.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }
    
    return viewMode === 'cliente-produto'
      ? dadosClientes.filter(cliente => {
          if (itemsInGroups.has(cliente.cliente)) return false;
          if (!searchTerm) return true;
          return cliente.cliente.toLowerCase().includes(searchTerm.toLowerCase());
        })
      : dadosProdutos.filter(produto => {
          if (itemsInGroups.has(produto.produto)) return false;
          if (!searchTerm) return true;
          return produto.produto.toLowerCase().includes(searchTerm.toLowerCase());
        });
  }, [showComparative, dadosComparativos, viewMode, dadosClientes, dadosProdutos, itemsInGroups, searchTerm]);

  // Calcular paginação
  const totalItems = dadosFiltrados.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const dadosPaginados = dadosFiltrados.slice(startIndex, endIndex);

  // Gerar números de página para exibição
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 7;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 pt-20 lg:pt-6 lg:ml-64">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Gestão de Vendas</h1>
              <p className="text-slate-400">Análise e acompanhamento de vendas realizadas</p>
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

          {/* Filters Panel */}
          {showFilters && (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700 shadow-xl">
              {/* Filtros principais em linha única - igual à Dashboard */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Unidade de Negócio - Sempre visível, desabilitado para alguns níveis */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center">
                    <Building2 className="w-3 h-3 mr-1" />
                    Unidade de Negócio
                  </label>
                  <select
                    value={filters.negocio || ''}
                    onChange={(e) => updateFilter('negocio', e.target.value)}
                    disabled={userProfile?.nivel_acesso === 'Gerente' || userProfile?.nivel_acesso === 'Coord Tec Rum BR' || userProfile?.nivel_acesso === 'Representante'}
                    className={`w-full px-3 py-2 text-sm text-white rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500 ${
                      userProfile?.nivel_acesso === 'Gerente' || userProfile?.nivel_acesso === 'Coord Tec Rum BR' || userProfile?.nivel_acesso === 'Representante'
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

                {/* Vendedor - Sempre visível, desabilitado para alguns níveis */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center">
                    <Users className="w-3 h-3 mr-1" />
                    Vendedor
                  </label>
                  <select
                    value={filters.representante || ''}
                    onChange={(e) => updateFilter('representante', e.target.value)}
                    disabled={userProfile?.nivel_acesso === 'Representante'}
                    className={`w-full px-3 py-2 text-sm text-white rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500 ${
                      userProfile?.nivel_acesso === 'Representante'
                        ? 'bg-slate-600 text-slate-300 cursor-not-allowed' 
                        : 'bg-slate-700'
                    }`}
                  >
                    <option value="">Todos</option>
                    {representantes.map(rep => (
                      <option key={rep.vendedor} value={rep.vendedor}>
                        {rep.negocio}, {rep.vendedor}, {rep.nome_vendedor}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Data Início */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    Data Início
                  </label>
                  <input
                    type="date"
                    value={filters.dataInicio || ''}
                    onChange={(e) => updateFilter('dataInicio', e.target.value)}
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
                    value={filters.dataFim || ''}
                    onChange={(e) => updateFilter('dataFim', e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Ações e info */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700">
                <div>
                  {!filters.dataInicio && !filters.dataFim && (
                    <p className="text-xs text-slate-400 italic">
                      Sem datas selecionadas: exibindo YTD (Janeiro a {new Date(anoAtual, mesAtual - 1).toLocaleDateString('pt-BR', { month: 'long' })})
                    </p>
                  )}
                </div>
                <button
                  onClick={clearFilters}
                  className="text-xs text-slate-400 hover:text-white transition-colors flex items-center space-x-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Limpar Filtros</span>
                </button>
              </div>
            </div>
          )}

          {/* Cards Section */}
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
                        {formatCurrencyInteger(kpis?.totalVendas2024 || 0)}
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
                        {formatCurrencyInteger(kpis?.totalVendas2025 || 0)}
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
                      const metaAtingida = metaValor > 0 ? ((kpis?.totalVendas || 0) / metaValor) * 100 : 0;
                      if (metaAtingida < 50) {
                        return 'from-red-500/20 to-red-600/20 border-red-500/50';
                      } else if (metaAtingida >= 51 && metaAtingida <= 90) {
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
                        {formatCurrencyInteger(kpis?.totalVendasMes2024 || 0)}
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
                        {formatCurrencyInteger(kpis?.totalVendasMes2025 || 0)}
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
                      const metaAtingida = metaValorMensal > 0 ? ((kpis?.totalVendasMes || 0) / metaValorMensal) * 100 : 0;
                      if (metaAtingida < 50) {
                        return 'from-red-500/20 to-red-600/20 border-red-500/50';
                      } else if (metaAtingida >= 51 && metaAtingida <= 90) {
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

          {/* Secondary Filters */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700 shadow-xl">
            <h4 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider">Filtros Secundários</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Region */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  UF
                </label>
                <select
                  value={filters.regiao || ''}
                  onChange={(e) => updateFilter('regiao', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500"
                >
                  <option value="">Todas</option>
                  {filterOptions.regioes.map(regiao => (
                    <option key={regiao} value={regiao}>{regiao}</option>
                  ))}
                </select>
              </div>

              {/* Product */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  <Package className="w-4 h-4 inline mr-1" />
                  Produto
                </label>
                <select
                  value={filters.produto || ''}
                  onChange={(e) => updateFilter('produto', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500"
                >
                  <option value="">Todos</option>
                  {filterOptions.produtos.map(produto => (
                    <option key={produto} value={produto}>{produto}</option>
                  ))}
                </select>
              </div>

              {/* Client */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  <Building2 className="w-4 h-4 inline mr-1" />
                  Cliente
                </label>
                <select
                  value={filters.cliente || ''}
                  onChange={(e) => updateFilter('cliente', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500"
                >
                  <option value="">Todos</option>
                  {filterOptions.clientes.map((cliente, idx) => (
                    <option key={`${cliente}-${idx}`} value={cliente}>{cliente}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* View Mode Selector and Search Bar */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              {/* View Mode Toggle */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-slate-300">Visualização:</label>
                <div className="flex bg-slate-700 rounded-lg p-1">
                  <button
                    onClick={() => {
                      setViewMode('cliente-produto');
                      setExpandedItems(new Set());
                    }}
                    disabled={showComparative}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all ${
                      viewMode === 'cliente-produto' && !showComparative
                        ? 'bg-blue-600 text-white shadow-lg'
                        : showComparative
                        ? 'text-slate-500 cursor-not-allowed'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    <span className="text-sm font-medium">Cliente/Produto</span>
                  </button>
                  <button
                    onClick={() => {
                      setViewMode('produto-cliente');
                      setExpandedItems(new Set());
                    }}
                    disabled={showComparative}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all ${
                      viewMode === 'produto-cliente' && !showComparative
                        ? 'bg-blue-600 text-white shadow-lg'
                        : showComparative
                        ? 'text-slate-500 cursor-not-allowed'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Package className="w-4 h-4" />
                    <span className="text-sm font-medium">Produto/Cliente</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowComparative(!showComparative);
                      setExpandedItems(new Set());
                    }}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all ${
                      showComparative
                        ? 'bg-purple-600 text-white shadow-lg'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm font-medium">Comparativo</span>
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder={viewMode === 'cliente-produto' ? 'Buscar por cliente...' : 'Buscar por produto...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-700 text-white placeholder-slate-400 rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500 transition-all"
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

            {/* Grouping Controls */}
            {selectedItems.size > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-700">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-300">
                    {selectedItems.size} {viewMode === 'cliente-produto' ? 'cliente(s)' : 'produto(s)'} selecionado(s)
                  </p>
                  <button
                    onClick={createGroup}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
                  >
                    <FolderPlus className="w-4 h-4" />
                    <span className="text-sm font-medium">Criar Grupo</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sales Table */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 shadow-xl overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-white">
                <div className="flex items-center justify-center space-x-3">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                  <span>Carregando vendas...</span>
                </div>
              </div>
            ) : showComparative ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-900 border-b border-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider sticky left-0 bg-slate-900 z-10 w-48 min-w-48">
                        {viewMode === 'cliente-produto' ? 'Cliente' : 'Produto'}
                      </th>
                      {mesesComparativos.map(mes => {
                        const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                        const mesNome = mesesNomes[parseInt(mes) - 1];
                        
                        return (
                          <React.Fragment key={mes}>
                            <th className="px-3 py-3 text-right text-xs font-semibold text-blue-300 uppercase tracking-wider w-24 min-w-24">
                              {mesNome}/{(anoAtual - 1).toString().slice(-2)}
                            </th>
                            <th className="px-3 py-3 text-right text-xs font-semibold text-green-300 uppercase tracking-wider w-24 min-w-24">
                              {mesNome}/{anoAtual.toString().slice(-2)}
                            </th>
                          </React.Fragment>
                        );
                      })}
                      <th className="px-3 py-3 text-right text-xs font-semibold text-blue-300 uppercase tracking-wider w-28 min-w-28">
                        Total {anoAtual - 1}
                      </th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-green-300 uppercase tracking-wider w-28 min-w-28">
                        Total {anoAtual}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {dadosPaginados.map((item: any, index: number) => {
                      const nome = viewMode === 'cliente-produto' ? item.cliente : item.produto;
                      
                      return (
                        <tr key={index} className="hover:bg-slate-700/50 transition-colors">
                          <td className="px-4 py-3 sticky left-0 bg-slate-800 z-10 w-48 min-w-48">
                            <span className="text-white font-medium text-sm truncate block" title={nome}>{nome}</span>
                          </td>
                          {mesesComparativos.map(mes => (
                            <React.Fragment key={mes}>
                              <td className="px-3 py-3 text-right">
                                <span className="text-blue-200 text-sm">
                                  {item[`${mes}_anterior`] > 0 ? formatCurrencyInteger(item[`${mes}_anterior`]) : '-'}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-right">
                                <span className="text-green-200 text-sm">
                                  {item[`${mes}_atual`] > 0 ? formatCurrencyInteger(item[`${mes}_atual`]) : '-'}
                                </span>
                              </td>
                            </React.Fragment>
                          ))}
                          <td className="px-3 py-3 text-right">
                            <span className="text-blue-400 font-bold">
                              {formatCurrencyInteger(item.totalAnterior)}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <span className="text-green-400 font-bold">
                              {formatCurrencyInteger(item.totalAtual)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : viewMode === 'cliente-produto' ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-900 border-b border-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider sticky left-0 bg-slate-900 z-10 w-64 min-w-64 max-w-64">
                        <div className="flex items-center space-x-2">
                          <span className="w-5"></span>
                          <span>Cliente</span>
                        </div>
                      </th>
                      {meses.map(mes => (
                        <th key={mes} className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider w-28 min-w-28">
                          {getMesNome(mes)}
                        </th>
                      ))}
                      <th className="px-4 py-3 text-right text-xs font-semibold text-blue-300 uppercase tracking-wider w-32 min-w-32">
                        <div className="flex items-center justify-end space-x-1">
                          <span>Total</span>
                          <TrendingUp className="w-3 h-3" />
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {/* Renderizar Grupos */}
                    {groups.map((group) => {
                      const isExpanded = expandedGroups.has(group.id);
                      
                      return (
                        <React.Fragment key={group.id}>
                          {/* Linha do Grupo */}
                          <tr className="bg-gradient-to-r from-blue-900/30 to-blue-800/20 hover:from-blue-900/40 hover:to-blue-800/30 transition-colors">
                            <td className="px-4 py-3 sticky left-0 bg-gradient-to-r from-blue-900/30 to-blue-800/20 z-10 w-64 min-w-64 max-w-64">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => toggleGroupExpansion(group.id)}
                                  className="flex-shrink-0 p-1 hover:bg-slate-700 rounded transition-colors"
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-blue-400" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-slate-400" />
                                  )}
                                </button>
                                <span className="text-blue-300 font-bold text-sm truncate" title={group.name}>{group.name}</span>
                                <button
                                  onClick={() => removeGroup(group.id)}
                                  className="ml-2 p-1 hover:bg-red-600 rounded transition-colors flex-shrink-0"
                                  title="Remover grupo"
                                >
                                  <FolderMinus className="w-4 h-4 text-red-400" />
                                </button>
                              </div>
                            </td>
                            {meses.map(mes => (
                              <td key={mes} className="px-4 py-3 text-right">
                                <span className="text-blue-200 font-bold text-sm">
                                  {group.values[mes] > 0 ? formatCurrencyInteger(group.values[mes]) : '-'}
                                </span>
                              </td>
                            ))}
                            <td className="px-4 py-3 text-right">
                              <span className="text-blue-400 font-bold text-base">
                                {formatCurrencyInteger(group.total)}
                              </span>
                            </td>
                          </tr>
                          
                          {/* Mostrar itens do grupo quando expandido */}
                          {isExpanded && group.items.map((itemNome, idx) => {
                            const itemData = dadosClientes.find(c => c.cliente === itemNome);
                            if (!itemData) return null;
                            
                            return (
                              <tr key={`${group.id}-item-${idx}`} className="bg-slate-900/50">
                                <td className="px-4 py-2 sticky left-0 bg-slate-900/50 z-10 w-64 min-w-64 max-w-64">
                                  <div className="pl-12">
                                    <span className="text-slate-400 text-xs truncate block" title={itemNome}>{itemNome}</span>
                                  </div>
                                </td>
                                {meses.map(mes => (
                                  <td key={mes} className="px-4 py-2 text-right">
                                    <span className="text-slate-400 text-xs">
                                      {itemData[mes] > 0 ? formatCurrencyInteger(itemData[mes]) : '-'}
                                    </span>
                                  </td>
                                ))}
                                <td className="px-4 py-2 text-right">
                                  <span className="text-slate-300 text-xs font-medium">
                                    {formatCurrencyInteger(itemData.total)}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                    
                    {/* Renderizar Clientes Normais */}
                    {dadosPaginados.map((cliente, index) => {
                        const isExpanded = expandedItems.has(cliente.cliente);
                        const isSelected = selectedItems.has(cliente.cliente);
                        
                        return (
                          <React.Fragment key={index}>
                            {/* Linha do Cliente */}
                            <tr className="hover:bg-slate-700/50 transition-colors">
                              <td className="px-4 py-3 sticky left-0 bg-slate-800 z-10 w-64 min-w-64 max-w-64">
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleItemSelection(cliente.cliente)}
                                    className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-800 cursor-pointer flex-shrink-0"
                                  />
                                  <button
                                    onClick={() => toggleItemExpansion(cliente.cliente)}
                                    className="flex-shrink-0"
                                  >
                                    {isExpanded ? (
                                      <ChevronDown className="w-4 h-4 text-blue-400" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4 text-slate-400" />
                                    )}
                                  </button>
                                  <span className="text-white font-medium text-sm truncate" title={cliente.cliente}>{cliente.cliente}</span>
                                </div>
                              </td>
                              {meses.map(mes => (
                                <td key={mes} className="px-4 py-3 text-right">
                                  <span className="text-slate-300 text-sm font-medium">
                                    {cliente[mes] > 0 ? formatCurrencyInteger(cliente[mes]) : '-'}
                                  </span>
                                </td>
                              ))}
                              <td className="px-4 py-3 text-right">
                                <span className="text-green-400 font-bold">
                                  {formatCurrencyInteger(cliente.total)}
                                </span>
                              </td>
                            </tr>
                            
                            {/* Linhas dos Produtos (quando expandido) */}
                            {isExpanded && cliente.produtos.map((produto: any, prodIndex: number) => (
                              <tr key={`${index}-produto-${prodIndex}`} className="bg-slate-900/50">
                                <td className="px-4 py-2 sticky left-0 bg-slate-900/50 z-10 w-64 min-w-64 max-w-64">
                                  <div className="pl-14 overflow-hidden">
                                    <span className="text-slate-400 text-xs truncate block" title={produto.produto}>{produto.produto}</span>
                                  </div>
                                </td>
                                {meses.map(mes => (
                                  <td key={mes} className="px-4 py-2 text-right">
                                    <span className="text-slate-400 text-xs">
                                      {produto[mes] > 0 ? formatCurrencyInteger(produto[mes]) : '-'}
                                    </span>
                                  </td>
                                ))}
                                <td className="px-4 py-2 text-right">
                                  <span className="text-slate-300 text-xs font-medium">
                                    {formatCurrencyInteger(produto.total)}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-900 border-b border-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider sticky left-0 bg-slate-900 z-10 w-64 min-w-64 max-w-64">
                        <div className="flex items-center space-x-2">
                          <span className="w-5"></span>
                          <span>Produto</span>
                        </div>
                      </th>
                      {meses.map(mes => (
                        <th key={mes} className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider w-28 min-w-28">
                          {getMesNome(mes)}
                        </th>
                      ))}
                      <th className="px-4 py-3 text-right text-xs font-semibold text-blue-300 uppercase tracking-wider w-32 min-w-32">
                        <div className="flex items-center justify-end space-x-1">
                          <span>Total</span>
                          <TrendingUp className="w-3 h-3" />
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {/* Renderizar Grupos */}
                    {groups.map((group) => {
                      const isExpanded = expandedGroups.has(group.id);
                      
                      return (
                        <React.Fragment key={group.id}>
                          {/* Linha do Grupo */}
                          <tr className="bg-gradient-to-r from-blue-900/30 to-blue-800/20 hover:from-blue-900/40 hover:to-blue-800/30 transition-colors">
                            <td className="px-4 py-3 sticky left-0 bg-gradient-to-r from-blue-900/30 to-blue-800/20 z-10 w-64 min-w-64 max-w-64">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => toggleGroupExpansion(group.id)}
                                  className="flex-shrink-0 p-1 hover:bg-slate-700 rounded transition-colors"
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-blue-400" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-slate-400" />
                                  )}
                                </button>
                                <span className="text-blue-300 font-bold text-sm truncate" title={group.name}>{group.name}</span>
                                <button
                                  onClick={() => removeGroup(group.id)}
                                  className="ml-2 p-1 hover:bg-red-600 rounded transition-colors flex-shrink-0"
                                  title="Remover grupo"
                                >
                                  <FolderMinus className="w-4 h-4 text-red-400" />
                                </button>
                              </div>
                            </td>
                            {meses.map(mes => (
                              <td key={mes} className="px-4 py-3 text-right">
                                <span className="text-blue-200 font-bold text-sm">
                                  {group.values[mes] > 0 ? formatCurrencyInteger(group.values[mes]) : '-'}
                                </span>
                              </td>
                            ))}
                            <td className="px-4 py-3 text-right">
                              <span className="text-blue-400 font-bold text-base">
                                {formatCurrencyInteger(group.total)}
                              </span>
                            </td>
                          </tr>
                          
                          {/* Mostrar itens do grupo quando expandido */}
                          {isExpanded && group.items.map((itemNome, idx) => {
                            const itemData = dadosProdutos.find(p => p.produto === itemNome);
                            if (!itemData) return null;
                            
                            return (
                              <tr key={`${group.id}-item-${idx}`} className="bg-slate-900/50">
                                <td className="px-4 py-2 sticky left-0 bg-slate-900/50 z-10 w-64 min-w-64 max-w-64">
                                  <div className="pl-12">
                                    <span className="text-slate-400 text-xs truncate block" title={itemNome}>{itemNome}</span>
                                  </div>
                                </td>
                                {meses.map(mes => (
                                  <td key={mes} className="px-4 py-2 text-right">
                                    <span className="text-slate-400 text-xs">
                                      {itemData[mes] > 0 ? formatCurrencyInteger(itemData[mes]) : '-'}
                                    </span>
                                  </td>
                                ))}
                                <td className="px-4 py-2 text-right">
                                  <span className="text-slate-300 text-xs font-medium">
                                    {formatCurrencyInteger(itemData.total)}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                    
                    {/* Renderizar Produtos Normais */}
                    {dadosPaginados.map((produto, index) => {
                        const isExpanded = expandedItems.has(produto.produto);
                        const isSelected = selectedItems.has(produto.produto);
                        
                        return (
                          <React.Fragment key={index}>
                            {/* Linha do Produto */}
                            <tr className="hover:bg-slate-700/50 transition-colors">
                              <td className="px-4 py-3 sticky left-0 bg-slate-800 z-10 w-64 min-w-64 max-w-64">
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleItemSelection(produto.produto)}
                                    className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-800 cursor-pointer flex-shrink-0"
                                  />
                                  <button
                                    onClick={() => toggleItemExpansion(produto.produto)}
                                    className="flex-shrink-0"
                                  >
                                    {isExpanded ? (
                                      <ChevronDown className="w-4 h-4 text-blue-400" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4 text-slate-400" />
                                    )}
                                  </button>
                                  <span className="text-white font-medium text-sm truncate" title={produto.produto}>{produto.produto}</span>
                                </div>
                              </td>
                              {meses.map(mes => (
                                <td key={mes} className="px-4 py-3 text-right">
                                  <span className="text-slate-300 text-sm font-medium">
                                    {produto[mes] > 0 ? formatCurrencyInteger(produto[mes]) : '-'}
                                  </span>
                                </td>
                              ))}
                              <td className="px-4 py-3 text-right">
                                <span className="text-green-400 font-bold">
                                  {formatCurrencyInteger(produto.total)}
                                </span>
                              </td>
                            </tr>
                            
                            {/* Linhas dos Clientes (quando expandido) */}
                            {isExpanded && produto.clientes.map((cliente: any, cliIndex: number) => (
                              <tr key={`${index}-cliente-${cliIndex}`} className="bg-slate-900/50">
                                <td className="px-4 py-2 sticky left-0 bg-slate-900/50 z-10 w-64 min-w-64 max-w-64">
                                  <div className="pl-14 overflow-hidden">
                                    <span className="text-slate-400 text-xs truncate block" title={cliente.cliente}>{cliente.cliente}</span>
                                  </div>
                                </td>
                                {meses.map(mes => (
                                  <td key={mes} className="px-4 py-2 text-right">
                                    <span className="text-slate-400 text-xs">
                                      {cliente[mes] > 0 ? formatCurrencyInteger(cliente[mes]) : '-'}
                                    </span>
                                  </td>
                                ))}
                                <td className="px-4 py-2 text-right">
                                  <span className="text-slate-300 text-xs font-medium">
                                    {formatCurrencyInteger(cliente.total)}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700 shadow-xl">
              <div className="flex items-center justify-between">
                <p className="text-slate-400 text-sm">
                  Exibindo {startIndex + 1} a {Math.min(endIndex, totalItems)} de {totalItems} {viewMode === 'cliente-produto' ? 'clientes' : 'produtos'}
                </p>
                
                <div className="flex items-center space-x-2">
                  {/* Botão Anterior */}
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className={`px-3 py-2 rounded-lg transition-all ${
                      currentPage === 1
                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                        : 'bg-slate-700 text-white hover:bg-slate-600'
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* Números de Página */}
                  {getPageNumbers().map((page, index) => (
                    <button
                      key={index}
                      onClick={() => typeof page === 'number' && setCurrentPage(page)}
                      disabled={page === '...'}
                      className={`px-4 py-2 rounded-lg transition-all ${
                        page === currentPage
                          ? 'bg-blue-600 text-white font-bold'
                          : page === '...'
                          ? 'bg-transparent text-slate-400 cursor-default'
                          : 'bg-slate-700 text-white hover:bg-slate-600'
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                  {/* Botão Próximo */}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-2 rounded-lg transition-all ${
                      currentPage === totalPages
                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                        : 'bg-slate-700 text-white hover:bg-slate-600'
                    }`}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Summary Info */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700 shadow-xl">
            <div className="flex items-center justify-between text-slate-400">
              <p>
                Total de {viewMode === 'cliente-produto' ? 'clientes' : 'produtos'}: <span className="text-white font-medium">{totalItems}</span>
                {groups.length > 0 && (
                  <span className="ml-4">
                    Grupos criados: <span className="text-blue-400 font-medium">{groups.length}</span>
                  </span>
                )}
              </p>
              <div className="flex items-center">
                <span className="text-xs text-slate-400">
                  Total Período: <span className="text-blue-400 font-semibold">{formatCurrencyInteger(kpis?.totalVendas || 0)}</span>
                </span>
              </div>
            </div>
          </div>

          
        </div>
      </div>
    </>
  );
}
