// Script temporário para consultar vendas por unidade de negócio
// Mostra os totais de 2024 e 2025 por unidade baseado no mapeamento de vendedores

export async function consultarVendasPorNegocio(db: any) {
  // Mapeamento de vendedor -> negócio baseado na tabela vendedores
  const vendedoresMap = new Map<string, string>();
  
  // Carregar mapeamento de vendedores
  const vendedoresResult = await db.prepare(
    "SELECT vendedor, id_negocio, negocio FROM vendedores WHERE id_negocio IS NOT NULL"
  ).all();
  
  (vendedoresResult.results as any[]).forEach((v: any) => {
    vendedoresMap.set(v.vendedor, v.negocio);
  });
  
  // Buscar todas as vendas 2024 e 2025
  const vendasResult = await db.prepare(
    `SELECT 
       strftime('%Y', data_venda) as ano,
       representante,
       COUNT(*) as qtd_vendas,
       SUM(valor_total) as valor_total
     FROM vendas 
     WHERE strftime('%Y', data_venda) IN ('2024', '2025')
     GROUP BY strftime('%Y', data_venda), representante
     ORDER BY ano, representante`
  ).all();
  
  // Classificar vendas por negócio usando o mapeamento
  const totaisPorNegocio: { [key: string]: { [key: string]: number } } = {
    '2024': { 'Salmix B2B': 0, 'Ruminantes': 0, 'Ave/Sui': 0, 'Sem Classificação': 0 },
    '2025': { 'Salmix B2B': 0, 'Ruminantes': 0, 'Ave/Sui': 0, 'Sem Classificação': 0 }
  };
  
  (vendasResult.results as any[]).forEach((venda: any) => {
    const negocio = vendedoresMap.get(venda.representante) || 'Sem Classificação';
    totaisPorNegocio[venda.ano][negocio] += venda.valor_total || 0;
  });
  
  return totaisPorNegocio;
}
