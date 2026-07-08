# Debug - Cálculo da Meta (Budget)

## Período Considerado para Meta YTD

### Lógica Atual (linhas 1160-1240 do index.ts)

1. **Determinar mês final (`mesFinal`)**:
   - Se há filtro `dataFim`: usa o mês da `dataFim`
   - Se NÃO há filtro de data: usa **outubro (mês 10)** como padrão

2. **Meses incluídos na soma**:
   - Para YTD: soma de **janeiro até `mesFinal`**
   - Exemplo com `mesFinal = 10`:
     ```
     mesesIncluir = ['jan_25', 'fev_25', 'mar_25', 'abr_25', 'mai_25', 'jun_25', 'jul_25', 'ago_25', 'set_25', 'out_25']
     ```

3. **Query SQL gerada**:
   ```sql
   SELECT SUM(
     COALESCE(jan_25, 0) + 
     COALESCE(fev_25, 0) + 
     COALESCE(mar_25, 0) + 
     COALESCE(abr_25, 0) + 
     COALESCE(mai_25, 0) + 
     COALESCE(jun_25, 0) + 
     COALESCE(jul_25, 0) + 
     COALESCE(ago_25, 0) + 
     COALESCE(set_25, 0) + 
     COALESCE(out_25, 0)
   ) as meta_total 
   FROM budget 
   WHERE [filtros de negócio e representante se aplicáveis]
   ```

## Exemplo Prático

### Cenário: Sem filtros de data

- `mesFinal` = 10 (outubro)
- Meses somados: jan_25 + fev_25 + mar_25 + abr_25 + mai_25 + jun_25 + jul_25 + ago_25 + set_25 + out_25
- Total: **10 meses** de meta

### Cenário: Com filtro dataFim = "2025-06-30"

- `mesFinal` = 6 (junho)  
- Meses somados: jan_25 + fev_25 + mar_25 + abr_25 + mai_25 + jun_25
- Total: **6 meses** de meta

## Código Relevante

```javascript
// Determinar qual mês final usar
let mesFinal = 10; // Padrão: outubro (mês 10)

if (dataFimParam) {
  // Se há filtro de data_fim, usar o mês da data_fim
  const [, mesFim] = dataFimParam.split('-').map(Number);
  mesFinal = mesFim;
} else {
  // Sem filtro de data: usar outubro (mês 10) como padrão
  mesFinal = 10;
}

// Lista de colunas da tabela budget
const mesesNomes = ['jan_25', 'fev_25', 'mar_25', 'abr_25', 'mai_25', 'jun_25', 
                   'jul_25', 'ago_25', 'set_25', 'out_25', 'nov_25', 'dez_25'];

// Selecionar meses de janeiro (índice 0) até mesFinal
const mesesIncluir = mesesNomes.slice(0, mesFinal);

// Construir a parte SELECT da query
const selectMeses = mesesIncluir.map(mes => `COALESCE(${mes}, 0)`).join(' + ');

// Query final
const query = `SELECT SUM(${selectMeses}) as meta_total FROM budget ${whereClause}`;
```

## Tabela Budget - Estrutura

A tabela `budget` tem as seguintes colunas mensais:
- `jan_25`, `fev_25`, `mar_25`, `abr_25`, `mai_25`, `jun_25`
- `jul_25`, `ago_25`, `set_25`, `out_25`, `nov_25`, `dez_25`

Cada linha representa um vendedor em um negócio, com valores de meta para cada mês.

## Exemplo de Dados na Tabela Budget

```
| negocio    | vendedor | jan_25 | fev_25 | mar_25 | ... | out_25 | nov_25 | dez_25 |
|------------|----------|--------|--------|--------|-----|--------|--------|--------|
| Ruminantes | VEND001  | 10000  | 12000  | 15000  | ... | 18000  | 20000  | 22000  |
| Aves       | VEND002  | 8000   | 9000   | 10000  | ... | 12000  | 13000  | 14000  |
```

Para YTD até outubro:
- VEND001: soma jan_25 até out_25
- VEND002: soma jan_25 até out_25

## Conclusão

O período usado para buscar a meta é **janeiro até outubro (10 meses)** quando não há filtros de data.

Se houver filtros de data (dataFim), o período vai de **janeiro até o mês da dataFim**.
