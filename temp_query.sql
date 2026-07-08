SELECT 
  MIN(data_venda) as primeiro_mes,
  MAX(data_venda) as ultimo_mes,
  COUNT(*) as total_registros
FROM vendas 
WHERE strftime('%Y', data_venda) = '2025';
