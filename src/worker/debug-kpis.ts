// Arquivo de debug para entender o cálculo dos KPIs
// Este arquivo documenta exatamente como o cálculo Jan-Out funciona

export interface KPIDebugInfo {
  // Valores de referência usados
  mesAnoDisponivel: string; // Deve ser '2025-10'
  anoAtual: number; // Deve ser 2025
  mesAtual: number; // Deve ser 10
  
  // Filtros aplicados
  filtros: {
    negocio?: string;
    representante?: string;
    dataInicio?: string;
    dataFim?: string;
  };
  
  // Query SQL gerada
  querySQLYTD: string;
  parametrosSQL: any[];
  
  // Valores calculados
  mesAtualFormatado: string; // Para cálculo mensal
  anoMesAtual: number; // Ano de referência para mês
  mesMesAtual: number; // Mês de referência
  
  // Resultados
  totalVendasAnoAtual: number;
  totalVendasAnoAnterior: number;
  totalVendasMes: number;
  totalVendasMesAnterior: number;
}

// Exemplo de como o cálculo DEVE funcionar:
// 
// SEM FILTROS DE DATA:
// 1. mesAnoDisponivel = '2025-10' (fixo, nunca muda)
// 2. anoAtual = 2025, mesAtual = 10
// 3. Query YTD: WHERE strftime('%Y', data_venda) = '2025' AND CAST(strftime('%m', data_venda) AS INTEGER) <= 10
//    - Isso pega todas as vendas de 2025-01 até 2025-10
// 4. Query Ano Anterior: WHERE strftime('%Y', data_venda) = '2024' AND CAST(strftime('%m', data_venda) AS INTEGER) <= 10
//    - Isso pega todas as vendas de 2024-01 até 2024-10
// 5. Query Mês Atual: WHERE strftime('%Y-%m', data_venda) = '2025-10'
//    - Isso pega apenas outubro de 2025
// 6. Query Mês Anterior: WHERE strftime('%Y-%m', data_venda) = '2024-10'
//    - Isso pega apenas outubro de 2024
//
// COM FILTROS DE DATA (ex: dataInicio='2025-03-01', dataFim='2025-06-30'):
// 1. anoAtual = 2025, mesAtual = 6 (do dataFim)
// 2. Query YTD: WHERE data_venda >= '2025-03-01' AND data_venda <= '2025-06-30'
//    - Isso pega vendas do período exato especificado
// 3. Query Ano Anterior: WHERE data_venda >= '2024-03-01' AND data_venda <= '2024-06-30'
//    - Mesmo período do ano anterior
// 4. mesAtualFormatado = '2025-06' (do dataFim)
// 5. Query Mês: WHERE strftime('%Y-%m', data_venda) = '2025-06'
//    - Apenas junho de 2025
// 6. Query Mês Anterior: WHERE strftime('%Y-%m', data_venda) = '2024-06'
//    - Apenas junho de 2024

export function gerarDebugInfo(
  filtros: any,
  mesAnoDisponivel: string,
  anoAtual: number,
  mesAtual: number,
  whereClause: string,
  filterParams: any[],
  resultados: any
): KPIDebugInfo {
  return {
    mesAnoDisponivel,
    anoAtual,
    mesAtual,
    filtros: {
      negocio: filtros.negocio,
      representante: filtros.representante,
      dataInicio: filtros.dataInicio,
      dataFim: filtros.dataFim
    },
    querySQLYTD: whereClause,
    parametrosSQL: filterParams,
    mesAtualFormatado: resultados.mesAtualFormatado,
    anoMesAtual: resultados.anoMesAtual,
    mesMesAtual: resultados.mesMesAtual,
    totalVendasAnoAtual: resultados.totalVendasAnoAtual,
    totalVendasAnoAnterior: resultados.totalVendasAnoAnterior,
    totalVendasMes: resultados.totalVendasMes,
    totalVendasMesAnterior: resultados.totalVendasMesAnterior
  };
}
