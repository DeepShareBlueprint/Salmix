# Documentação do Cálculo de KPIs - Jan-Out

## Problema Identificado

O card "Valor Ano Atual" na dashboard deve mostrar vendas de Jan-Out (janeiro a outubro de 2025), mas aparentemente está incluindo dados de novembro.

## Como o Cálculo Funciona

### Sem Filtros de Data

Quando NÃO há filtros de data aplicados:

1. **Referência Fixa**: `mesAnoDisponivel = '2025-10'` (hardcoded no código)
2. **Extração**: `anoAtual = 2025`, `mesAtual = 10`
3. **Query SQL para YTD**:
   ```sql
   SELECT COALESCE(SUM(v.valor_total), 0) as total 
   FROM vendas v 
   LEFT JOIN vendedores vend ON v.representante = vend.vendedor
   WHERE 1=1
     -- Filtros de negocio/representante aqui se aplicável
     AND strftime('%Y', v.data_venda) = '2025' 
     AND CAST(strftime('%m', v.data_venda) AS INTEGER) <= 10
   ```
   
   Isso deve retornar: todas as vendas de janeiro a outubro de 2025

4. **Query para Ano Anterior**:
   ```sql
   SELECT COALESCE(SUM(v.valor_total), 0) as total 
   FROM vendas v 
   LEFT JOIN vendedores vend ON v.representante = vend.vendedor
   WHERE 1=1
     -- Filtros de negocio/representante aqui se aplicável
     AND strftime('%Y', v.data_venda) = '2024'
     AND CAST(strftime('%m', v.data_venda) AS INTEGER) <= 10
   ```
   
   Isso deve retornar: todas as vendas de janeiro a outubro de 2024

### Com Filtros de Data

Quando há filtros dataInicio e dataFim:

1. **Usa período exato**: As queries usam `>= dataInicio AND <= dataFim`
2. **Ano anterior**: Calcula o mesmo período um ano antes
3. **Exemplo**: Se filtro é Mar-Jun 2025, ano anterior será Mar-Jun 2024

## Fluxo de Dados

1. **Backend** (`/api/dashboard/kpis`):
   - Calcula os valores usando as queries SQL
   - Retorna objeto com:
     - `totalVendas`: Total YTD ou período filtrado
     - `totalVendasAnoAnterior`: Mesmo período do ano anterior
     - `mesAtualDados`: Mês de referência (10 sem filtros)
     - `anoAtualDados`: Ano de referência (2025 sem filtros)

2. **Frontend** (`useDashboard` hook):
   - Faz fetch do endpoint `/api/dashboard/kpis`
   - Passa filtros como query params
   - Retorna os KPIs para o componente

3. **Dashboard Component**:
   - Recebe KPIs do hook
   - Usa `kpis.totalVendas` para exibir no card "Valor Ano Atual"
   - Usa `kpis.anoAtualDados` e `kpis.mesAtualDados` para labels
   
## Pontos de Verificação

Para debugar o problema:

1. ✅ **Backend está usando valores fixos corretos?**
   - Linha 148 worker/index.ts: `const mesAnoDisponivel = '2025-10';`
   - CORRETO: está fixo em outubro

2. ✅ **Query SQL está limitando corretamente?**
   - Linha 177-178: `AND CAST(strftime('%m', v.data_venda) AS INTEGER) <= ?`
   - Com parâmetro `mesAtual` (10)
   - CORRETO: deve limitar até mês 10

3. ❓ **Os dados no banco estão corretos?**
   - Precisa verificar: há vendas de novembro ou dezembro na tabela?
   - Se sim, elas estão sendo filtradas corretamente?

4. ❓ **O frontend está recebendo os valores corretos?**
   - Verificar o objeto KPIs retornado pela API
   - Verificar se `totalVendas` está correto

## Próximos Passos de Investigação

1. Adicionar console.log no backend para ver:
   - Valores de `anoAtual` e `mesAtual` calculados
   - Query SQL completa gerada
   - Parâmetros passados para a query
   - Resultado retornado pela query

2. Verificar dados reais no banco:
   - Quais meses têm vendas em 2025?
   - Há vendas em nov/dez 2025?
   - Qual é o valor total de cada mês?

3. Comparar valor retornado pela API com cálculo manual:
   - Somar manualmente vendas de jan-out 2025
   - Comparar com valor retornado em `kpis.totalVendas`
