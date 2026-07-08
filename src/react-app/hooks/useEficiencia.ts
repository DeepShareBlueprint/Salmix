import { useState, useEffect } from 'react';

export interface DadosEficiencia {
  regiao: string;
  numVendedores: number;
  valorYTD: number;
  eficiencia: number;
  ier: number;
  contribuicao: number;
  classificacao: 'Alta' | 'Média' | 'Baixa';
}

export interface EficienciaKPIs {
  eficienciaMediaGeral: number;
  regiaoMaisEficiente: {
    nome: string;
    eficiencia: number;
  };
  regiaoMenosEficiente: {
    nome: string;
    eficiencia: number;
  };
  insights: string;
}

export interface EficienciaFilters {
  dataInicio?: string;
  dataFim?: string;
  negocio?: string;
}

export function useEficiencia(filters?: EficienciaFilters) {
  const [dadosEficiencia, setDadosEficiencia] = useState<DadosEficiencia[]>([]);
  const [kpis, setKpis] = useState<EficienciaKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEficienciaData(filters);
  }, [filters]);

  const fetchEficienciaData = async (currentFilters?: EficienciaFilters) => {
    try {
      setLoading(true);
      
      let dataInicio: string;
      let dataFim: string;
      
      if (currentFilters?.dataInicio && currentFilters?.dataFim) {
        dataInicio = currentFilters.dataInicio;
        dataFim = currentFilters.dataFim;
      } else {
        // Buscar o ano e mês mais recentes disponíveis nos dados
        const ultimaVendaResponse = await fetch('/api/vendas?dataInicio=2020-01-01&dataFim=2030-12-31');
        if (ultimaVendaResponse.ok) {
          const vendas = await ultimaVendaResponse.json();
          
          if (vendas.length > 0) {
            // Encontrar a data mais recente
            const datasOrdenadas = vendas
              .map((v: any) => v.data_venda)
              .sort()
              .reverse();
            
            const dataRecente = datasOrdenadas[0];
            const [anoRecente] = dataRecente.split('-');
            
            // Usar o ano mais recente dos dados
            dataInicio = `${anoRecente}-01-01`;
            dataFim = `${anoRecente}-12-31`;
          } else {
            // Se não há vendas, usar ano atual
            const hoje = new Date();
            const anoAtual = hoje.getFullYear();
            dataInicio = `${anoAtual}-01-01`;
            dataFim = `${anoAtual}-12-31`;
          }
        } else {
          // Fallback em caso de erro
          const hoje = new Date();
          const anoAtual = hoje.getFullYear();
          dataInicio = `${anoAtual}-01-01`;
          dataFim = `${anoAtual}-12-31`;
        }
      }
      
      const params = new URLSearchParams();
      params.append('dataInicio', dataInicio);
      params.append('dataFim', dataFim);
      
      // Adicionar filtro de negócio se especificado
      if (currentFilters?.negocio) {
        params.append('negocio', currentFilters.negocio);
      }
      
      const response = await fetch(`/api/vendas?${params.toString()}`);
      if (!response.ok) throw new Error('Erro ao carregar dados de vendas');
      const vendas = await response.json();

      // Agrupar dados por Vendedor1 (representante)
      const dadosPorVendedor = new Map<string, {
        valorTotal: number;
        numTransacoes: number;
      }>();

      vendas.forEach((venda: any) => {
        // Usar representante como "região" (campo "Vendedor 1" do CSV)
        const vendedor = venda.representante?.trim() || 'Não Informado';
        
        // Ignorar registros sem dados válidos
        if (vendedor === 'Não Informado') {
          return;
        }
        
        if (!dadosPorVendedor.has(vendedor)) {
          dadosPorVendedor.set(vendedor, {
            valorTotal: 0,
            numTransacoes: 0
          });
        }
        
        const dados = dadosPorVendedor.get(vendedor)!;
        dados.valorTotal += venda.valor_total;
        dados.numTransacoes += 1;
      });

      // Calcular eficiência por vendedor
      const eficienciasPorVendedor: DadosEficiencia[] = [];
      const valorTotalGeral = Array.from(dadosPorVendedor.values())
        .reduce((total, dados) => total + dados.valorTotal, 0);

      let somaEficiencias = 0;
      
      dadosPorVendedor.forEach((dados, vendedor) => {
        const numTransacoes = dados.numTransacoes; // Número de vendas/transações
        const valorYTD = dados.valorTotal;
        const eficiencia = numTransacoes > 0 ? valorYTD / numTransacoes : 0;
        const contribuicao = valorTotalGeral > 0 ? (valorYTD / valorTotalGeral) * 100 : 0;
        
        eficienciasPorVendedor.push({
          regiao: vendedor, // Usando vendedor como "região"
          numVendedores: numTransacoes, // Número de transações
          valorYTD,
          eficiencia,
          ier: 0, // Será calculado após a média geral
          contribuicao,
          classificacao: 'Média' // Será calculado após IER
        });
        
        somaEficiencias += eficiencia;
      });

      // Calcular eficiência média geral
      const eficienciaMediaGeral = eficienciasPorVendedor.length > 0 
        ? somaEficiencias / eficienciasPorVendedor.length 
        : 0;

      // Calcular IER e classificação
      eficienciasPorVendedor.forEach(item => {
        item.ier = eficienciaMediaGeral > 0 ? (item.eficiencia / eficienciaMediaGeral) * 100 : 0;
        
        // Classificação baseada no IER
        if (item.ier >= 120) {
          item.classificacao = 'Alta';
        } else if (item.ier >= 80) {
          item.classificacao = 'Média';
        } else {
          item.classificacao = 'Baixa';
        }
      });

      // Ordenar por eficiência (maior → menor)
      eficienciasPorVendedor.sort((a, b) => b.eficiencia - a.eficiencia);

      // Calcular KPIs
      const vendedorMaisEficiente = eficienciasPorVendedor[0] || { regiao: 'N/A', eficiencia: 0 };
      const vendedorMenosEficiente = eficienciasPorVendedor[eficienciasPorVendedor.length - 1] || { regiao: 'N/A', eficiencia: 0 };

      // Gerar insights automáticos
      const vendedoresAbaixoMedia = eficienciasPorVendedor.filter(item => item.ier < 50);
      const percentualAcimaMedia = vendedorMaisEficiente.ier > 0 
        ? Math.round(((vendedorMaisEficiente.ier - 100) / 100) * 100) 
        : 0;

      let insights = '';
      if (vendedorMaisEficiente.regiao !== 'N/A') {
        insights = `O vendedor ${vendedorMaisEficiente.regiao} apresentou a maior eficiência (R$ ${Math.round(vendedorMaisEficiente.eficiencia).toLocaleString('pt-BR')}/venda)`;
        
        if (percentualAcimaMedia > 0) {
          insights += `, ${percentualAcimaMedia}% acima da média geral`;
        }
        insights += '.';
        
        if (vendedoresAbaixoMedia.length > 0) {
          const nomesVendedores = vendedoresAbaixoMedia.length > 3 
            ? `${vendedoresAbaixoMedia.length} vendedores`
            : vendedoresAbaixoMedia.map(v => v.regiao).join(', ');
          insights += ` ${vendedoresAbaixoMedia.length === 1 ? 'O vendedor' : 'Os vendedores'} ${nomesVendedores} ${vendedoresAbaixoMedia.length === 1 ? 'está' : 'estão'} abaixo de 50% da média e ${vendedoresAbaixoMedia.length === 1 ? 'demanda' : 'demandam'} revisão de estratégias comerciais.`;
        }
      }

      const kpisCalculados: EficienciaKPIs = {
        eficienciaMediaGeral,
        regiaoMaisEficiente: {
          nome: vendedorMaisEficiente.regiao,
          eficiencia: vendedorMaisEficiente.eficiencia
        },
        regiaoMenosEficiente: {
          nome: vendedorMenosEficiente.regiao,
          eficiencia: vendedorMenosEficiente.eficiencia
        },
        insights
      };

      setDadosEficiencia(eficienciasPorVendedor);
      setKpis(kpisCalculados);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const refetch = (newFilters?: EficienciaFilters) => {
    fetchEficienciaData(newFilters || filters);
  };

  return { dadosEficiencia, kpis, loading, error, refetch };
}
