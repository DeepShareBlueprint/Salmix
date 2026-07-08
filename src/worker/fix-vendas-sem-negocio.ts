// Endpoint para corrigir vendas sem classificação de negócio
// Classifica vendas baseado no mapeamento vendedor -> negócio da tabela vendedores

export async function fixVendasSemNegocio(db: any): Promise<{
  success: boolean;
  message: string;
  vendasCorrigidas: number;
  diagnostico: any;
}> {
  try {
    // DIAGNÓSTICO INICIAL
    const diagnosticoInicial = await db.prepare(
      `SELECT 
        COUNT(*) as total_sem_negocio,
        SUM(valor_total) as valor_sem_negocio
       FROM vendas 
       WHERE (negocio IS NULL OR negocio = '')
       AND strftime('%Y', data_venda) = '2024'`
    ).first() as any;
    
    console.log('=== DIAGNÓSTICO VENDAS SEM NEGÓCIO ===');
    console.log('Vendas 2024 sem negócio:', diagnosticoInicial?.total_sem_negocio || 0);
    console.log('Valor total:', diagnosticoInicial?.valor_sem_negocio || 0);
    
    // Corrigir vendas sem negócio usando o mapeamento da tabela vendedores
    const result = await db.prepare(
      `UPDATE vendas 
       SET negocio = (
         SELECT vend.id_negocio 
         FROM vendedores vend 
         WHERE vend.vendedor = vendas.representante
       )
       WHERE (negocio IS NULL OR negocio = '')
       AND strftime('%Y', data_venda) = '2024'
       AND representante IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM vendedores vend 
         WHERE vend.vendedor = vendas.representante 
         AND vend.id_negocio IS NOT NULL
       )`
    ).run();
    
    const vendasCorrigidas = result.meta.changes || 0;
    
    // DIAGNÓSTICO FINAL
    const diagnosticoFinal = await db.prepare(
      `SELECT 
        COUNT(*) as total_sem_negocio,
        SUM(valor_total) as valor_sem_negocio
       FROM vendas 
       WHERE (negocio IS NULL OR negocio = '')
       AND strftime('%Y', data_venda) = '2024'`
    ).first() as any;
    
    // Estatísticas por negócio após correção
    const estatisticas = await db.prepare(
      `SELECT 
        negocio,
        COUNT(*) as total,
        SUM(valor_total) as valor
       FROM vendas 
       WHERE strftime('%Y', data_venda) = '2024'
       GROUP BY negocio
       ORDER BY negocio`
    ).all();
    
    console.log('=== RESULTADO DA CORREÇÃO ===');
    console.log('Vendas corrigidas:', vendasCorrigidas);
    console.log('Vendas ainda sem negócio:', diagnosticoFinal?.total_sem_negocio || 0);
    console.log('Estatísticas por negócio:', JSON.stringify(estatisticas.results, null, 2));
    
    return {
      success: true,
      message: `Correção concluída. ${vendasCorrigidas} vendas de 2024 foram classificadas com o negócio correto.`,
      vendasCorrigidas,
      diagnostico: {
        antes: {
          sem_negocio: diagnosticoInicial?.total_sem_negocio || 0,
          valor_sem_negocio: diagnosticoInicial?.valor_sem_negocio || 0
        },
        depois: {
          sem_negocio: diagnosticoFinal?.total_sem_negocio || 0,
          valor_sem_negocio: diagnosticoFinal?.valor_sem_negocio || 0
        },
        estatisticas: estatisticas.results
      }
    };
    
  } catch (error) {
    console.error('Erro ao corrigir vendas sem negócio:', error);
    return {
      success: false,
      message: 'Erro ao executar correção: ' + String(error),
      vendasCorrigidas: 0,
      diagnostico: null
    };
  }
}
