import { useState } from 'react';
import Navbar from '@/react-app/components/Navbar';
import { Trash2, AlertTriangle, CheckCircle, Loader2, Database, TrendingUp, Copy } from 'lucide-react';

export default function LimpezaDados() {
  const [loading, setLoading] = useState(false);
  const [loadingSalmix, setLoadingSalmix] = useState(false);
  const [loadingDuplicatas, setLoadingDuplicatas] = useState(false);
  const [loadingVendedor3633, setLoadingVendedor3633] = useState(false);
  const [loadingVendedoresNegocios, setLoadingVendedoresNegocios] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [resultSalmix, setResultSalmix] = useState<any>(null);
  const [resultDuplicatas, setResultDuplicatas] = useState<any>(null);
  const [resultVendedor3633, setResultVendedor3633] = useState<any>(null);
  const [resultVendedoresNegocios, setResultVendedoresNegocios] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorSalmix, setErrorSalmix] = useState<string | null>(null);
  const [errorDuplicatas, setErrorDuplicatas] = useState<string | null>(null);
  const [errorVendedor3633, setErrorVendedor3633] = useState<string | null>(null);
  const [errorVendedoresNegocios, setErrorVendedoresNegocios] = useState<string | null>(null);
  const [loadingDiagnostico, setLoadingDiagnostico] = useState(false);
  const [diagnosticoVendas, setDiagnosticoVendas] = useState<any>(null);
  const [loading4231, setLoading4231] = useState(false);
  const [result4231, setResult4231] = useState<any>(null);
  const [error4231, setError4231] = useState<string | null>(null);
  const [loadingAxeed, setLoadingAxeed] = useState(false);
  const [resultAxeed, setResultAxeed] = useState<any>(null);
  const [errorAxeed, setErrorAxeed] = useState<string | null>(null);

  const executarLimpeza = async () => {
    if (!confirm('Tem certeza que deseja limpar todos os nomes genéricos de produtos? Esta ação não pode ser desfeita.')) {
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/data/fix-product-names', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
      } else {
        setError(data.message || 'Erro ao executar limpeza');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const corrigirSalmix2024 = async () => {
    if (!confirm('Tem certeza que deseja corrigir os dados de Salmix B2B 2024? Esta ação irá reclassificar todas as vendas do representante 1001 para o negócio correto.')) {
      return;
    }

    setLoadingSalmix(true);
    setErrorSalmix(null);
    setResultSalmix(null);

    try {
      const response = await fetch('/api/data/fix-salmix-vendedor-1001', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setResultSalmix(data);
      } else {
        setErrorSalmix(data.message || 'Erro ao executar correção');
      }
    } catch (err) {
      setErrorSalmix('Erro ao conectar com o servidor');
    } finally {
      setLoadingSalmix(false);
    }
  };

  const removerDuplicatas = async () => {
    if (!confirm('Tem certeza que deseja remover duplicatas entre 2024 e 2025? Esta ação irá deletar vendas de 2024 que também existem em 2025, mantendo apenas as versões de 2025.')) {
      return;
    }

    setLoadingDuplicatas(true);
    setErrorDuplicatas(null);
    setResultDuplicatas(null);

    try {
      const response = await fetch('/api/data/remove-duplicatas-2024-2025', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setResultDuplicatas(data);
      } else {
        setErrorDuplicatas(data.message || 'Erro ao executar correção');
      }
    } catch (err) {
      setErrorDuplicatas('Erro ao conectar com o servidor');
    } finally {
      setLoadingDuplicatas(false);
    }
  };

  const redistribuirVendedor3633 = async () => {
    if (!confirm('Tem certeza que deseja redistribuir as vendas do vendedor 3633? Esta ação irá redistribuir todas as vendas de Ruminantes 2025 para os vendedores corretos (3601, 3602, 3603, 3604) baseado nas regiões.')) {
      return;
    }

    setLoadingVendedor3633(true);
    setErrorVendedor3633(null);
    setResultVendedor3633(null);

    try {
      const response = await fetch('/api/data/fix-vendedor-3633', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setResultVendedor3633(data);
      } else {
        setErrorVendedor3633(data.message || 'Erro ao executar redistribuição');
      }
    } catch (err) {
      setErrorVendedor3633('Erro ao conectar com o servidor');
    } finally {
      setLoadingVendedor3633(false);
    }
  };

  const diagnosticarVendasSemNegocio = async () => {
    setLoadingDiagnostico(true);
    setDiagnosticoVendas(null);

    try {
      const response = await fetch('/api/vendas/sem-negocio?mesAno=2025-12');
      const data = await response.json();
      setDiagnosticoVendas(data);
    } catch (err) {
      console.error('Erro ao buscar diagnóstico:', err);
    } finally {
      setLoadingDiagnostico(false);
    }
  };

  const corrigirVendedoresNegocios = async () => {
    if (!confirm('Tem certeza que deseja corrigir vendedores e negócios? Esta ação irá redistribuir códigos de vendedores antigos (1, 33, 36, 42) para os novos códigos e classificar todos os negócios corretamente.')) {
      return;
    }

    setLoadingVendedoresNegocios(true);
    setErrorVendedoresNegocios(null);
    setResultVendedoresNegocios(null);

    try {
      const response = await fetch('/api/data/fix-vendedores-negocios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setResultVendedoresNegocios(data);
      } else {
        setErrorVendedoresNegocios(data.message || 'Erro ao executar correção');
      }
    } catch (err) {
      setErrorVendedoresNegocios('Erro ao conectar com o servidor');
    } finally {
      setLoadingVendedoresNegocios(false);
    }
  };

  const corrigirVendedor4231 = async () => {
    if (!confirm('Tem certeza que deseja corrigir as 4 vendas de julho/2025? Esta ação irá mudar o vendedor de 42 para 31 nas vendas específicas do cliente VETFARMA (176) em 31/07/2025.')) {
      return;
    }

    setLoading4231(true);
    setError4231(null);
    setResult4231(null);

    try {
      const response = await fetch('/api/data/fix-vendedor-42-31-julho', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setResult4231(data);
      } else {
        setError4231(data.message || 'Erro ao executar correção');
      }
    } catch (err) {
      setError4231('Erro ao conectar com o servidor');
    } finally {
      setLoading4231(false);
    }
  };

  const corrigirAxeedLiquid2026 = async () => {
    if (!confirm('Tem certeza que deseja reclassificar o produto AXEED LIQUID CX 6 FRASCOS de 2026? Esta ação irá mudar do vendedor 3601 (Ruminantes) para 4231 (Ave/Sui).')) {
      return;
    }

    setLoadingAxeed(true);
    setErrorAxeed(null);
    setResultAxeed(null);

    try {
      const response = await fetch('/api/data/fix-axeed-liquid-2026', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setResultAxeed(data);
      } else {
        setErrorAxeed(data.message || 'Erro ao executar correção');
      }
    } catch (err) {
      setErrorAxeed('Erro ao conectar com o servidor');
    } finally {
      setLoadingAxeed(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 pt-20 lg:pt-6 lg:ml-64">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Limpeza de Dados</h1>
            <p className="text-slate-400">Ferramentas para corrigir inconsistências no sistema</p>
          </div>

          {/* Card de Diagnóstico Vendas sem Negócio */}
          <div className="bg-gradient-to-br from-cyan-900/20 to-slate-900 rounded-xl p-8 border border-cyan-700/30 shadow-xl">
            <div className="flex items-start space-x-4 mb-6">
              <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Database className="w-6 h-6 text-cyan-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white mb-2">
                  Diagnosticar Vendas sem Negócio 🔍
                </h2>
                <p className="text-slate-400 mb-4">
                  Identifica vendas que não estão classificadas em nenhuma unidade de negócio (Salmix B2B, Ruminantes, Ave/Sui).
                </p>

                <button
                  onClick={diagnosticarVendasSemNegocio}
                  disabled={loadingDiagnostico}
                  className="flex items-center space-x-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-600 text-white rounded-lg transition-all shadow-lg disabled:cursor-not-allowed"
                >
                  {loadingDiagnostico ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Analisando...</span>
                    </>
                  ) : (
                    <>
                      <Database className="w-5 h-5" />
                      <span>Diagnosticar Dezembro 2025</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Resultado Diagnóstico */}
            {diagnosticoVendas && (
              <div className="mt-6 bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-cyan-400 font-medium mb-2">Análise Concluída</h3>
                    <div className="text-slate-300 text-sm space-y-2">
                      <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded">
                        <span>Vendas sem negócio em {diagnosticoVendas.mesAno}:</span>
                        <span className="font-bold text-white">{diagnosticoVendas.quantidade || 0}</span>
                      </div>
                      <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded">
                        <span>Valor total sem negócio:</span>
                        <span className="font-bold text-yellow-400">
                          R$ {(diagnosticoVendas.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      
                      {diagnosticoVendas.vendas && diagnosticoVendas.vendas.length > 0 && (
                        <div className="mt-4">
                          <p className="font-medium text-white mb-2">Detalhes das vendas sem negócio:</p>
                          <div className="max-h-96 overflow-y-auto bg-slate-900/50 rounded p-3 space-y-2">
                            {diagnosticoVendas.vendas.slice(0, 20).map((venda: any, idx: number) => (
                              <div key={idx} className="text-xs border-b border-slate-700 pb-2">
                                <div className="flex justify-between">
                                  <span className="text-slate-400">ID: {venda.id}</span>
                                  <span className="text-green-400 font-medium">
                                    R$ {(venda.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                                <div className="text-slate-500 mt-1">
                                  <p>Vendedor: {venda.representante || 'N/A'} {venda.nome_vendedor ? `(${venda.nome_vendedor})` : ''}</p>
                                  <p>Cliente: {venda.nome_cliente || 'N/A'}</p>
                                  <p>Produto: {venda.nome_produto}</p>
                                  <p>Data: {venda.data_venda}</p>
                                  <p className="text-yellow-400">Negócio na venda: {venda.negocio || 'NULL'}</p>
                                  <p className="text-cyan-400">Negócio do vendedor: {venda.negocio_vendedor || 'N/A'}</p>
                                </div>
                              </div>
                            ))}
                            {diagnosticoVendas.vendas.length > 20 && (
                              <p className="text-slate-500 text-center py-2">
                                ... e mais {diagnosticoVendas.vendas.length - 20} venda(s)
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {diagnosticoVendas.quantidade > 0 && (
                        <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded">
                          <p className="text-yellow-400 text-sm">
                            💡 Execute "Corrigir Vendedores e Classificar Negócios" acima para classificar essas vendas automaticamente.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card de Correção Vendedores e Negócios - PRINCIPAL */}
          <div className="bg-gradient-to-br from-yellow-900/20 to-slate-900 rounded-xl p-8 border border-yellow-700/30 shadow-xl">
            <div className="flex items-start space-x-4 mb-6">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Database className="w-6 h-6 text-yellow-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white mb-2">
                  Corrigir Vendedores e Classificar Negócios ⚡
                </h2>
                <p className="text-slate-400 mb-4">
                  <span className="font-semibold text-yellow-400">CORREÇÃO PRINCIPAL:</span> Redistribui vendedores com códigos antigos (1, 33, 36, 42) para os novos códigos e classifica automaticamente todos os negócios nas vendas e budget.
                </p>
                
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-4">
                  <h3 className="text-white font-medium mb-2 flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    <span>CORREÇÃO AUTOMÁTICA COMPLETA</span>
                  </h3>
                  <ul className="text-slate-300 text-sm space-y-1">
                    <li>• <span className="font-medium text-yellow-400">Etapa 1:</span> Redistribui vendedores antigos (1→1001, 33→3633, 36→3601-3604, 42→4201-4203)</li>
                    <li>• <span className="font-medium text-yellow-400">Etapa 2:</span> Atualiza id_negocio na tabela vendedores (Salmix→10, Ruminantes→36, Ave/Sui→42)</li>
                    <li>• <span className="font-medium text-yellow-400">Etapa 3:</span> Classifica TODAS as vendas com o negócio correto baseado no vendedor</li>
                    <li>• <span className="font-medium text-yellow-400">Etapa 4:</span> Classifica TODOS os budgets com o negócio correto</li>
                    <li className="text-yellow-300 font-medium mt-2">✨ Resolve o problema de valores concentrados em "Todas"</li>
                  </ul>
                </div>

                <button
                  onClick={corrigirVendedoresNegocios}
                  disabled={loadingVendedoresNegocios}
                  className="flex items-center space-x-2 px-6 py-3 bg-yellow-600 hover:bg-yellow-500 disabled:bg-slate-600 text-white rounded-lg transition-all shadow-lg disabled:cursor-not-allowed font-semibold"
                >
                  {loadingVendedoresNegocios ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Executando correção completa...</span>
                    </>
                  ) : (
                    <>
                      <Database className="w-5 h-5" />
                      <span>Executar Correção Completa</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Resultado Vendedores e Negócios */}
            {resultVendedoresNegocios && (
              <div className="mt-6 bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-green-400 font-medium mb-2">{resultVendedoresNegocios.message}</h3>
                    <div className="text-slate-300 text-sm space-y-1">
                      <p className="font-medium text-white mb-2">Estatísticas da correção:</p>
                      <ul className="list-disc list-inside space-y-0.5 text-slate-400">
                        <li>Vendedores redistribuídos: <span className="text-white">{resultVendedoresNegocios.vendedoresRedistribuidos || 0}</span></li>
                        <li>Vendedores atualizados: <span className="text-white">{resultVendedoresNegocios.vendedoresAtualizados || 0}</span></li>
                        <li>Vendas classificadas: <span className="text-white">{resultVendedoresNegocios.vendasUpdated || 0}</span></li>
                        <li>Budgets classificados: <span className="text-white">{resultVendedoresNegocios.budgetUpdated || 0}</span></li>
                      </ul>
                      <p className="text-green-400 font-medium mt-3">✅ Agora os valores devem aparecer distribuídos corretamente por unidade de negócio!</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Erro Vendedores e Negócios */}
            {errorVendedoresNegocios && (
              <div className="mt-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-red-400 font-medium mb-1">Erro</h3>
                    <p className="text-slate-300 text-sm">{errorVendedoresNegocios}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card de Redistribuição Vendedor 3633 */}
          <div className="bg-gradient-to-br from-emerald-900/20 to-slate-900 rounded-xl p-8 border border-emerald-700/30 shadow-xl">
            <div className="flex items-start space-x-4 mb-6">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white mb-2">
                  Redistribuir Vendedor 3633 (Ruminantes)
                </h2>
                <p className="text-slate-400 mb-4">
                  Redistribui as vendas de Ruminantes 2025 que estão concentradas no vendedor 3633 para os vendedores corretos baseado nas regiões.
                </p>
                
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 mb-4">
                  <h3 className="text-white font-medium mb-2 flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-emerald-400" />
                    <span>REDISTRIBUIÇÃO POR REGIÃO</span>
                  </h3>
                  <ul className="text-slate-300 text-sm space-y-1">
                    <li>• <span className="font-medium text-emerald-400">3601 (Sul):</span> PR, SC, RS</li>
                    <li>• <span className="font-medium text-emerald-400">3602 (Sudeste):</span> SP, MG, RJ, ES</li>
                    <li>• <span className="font-medium text-emerald-400">3603 (Centro-Oeste):</span> GO, DF, MT, MS</li>
                    <li>• <span className="font-medium text-emerald-400">3604 (Norte/Nordeste):</span> Demais estados</li>
                  </ul>
                </div>

                <button
                  onClick={redistribuirVendedor3633}
                  disabled={loadingVendedor3633}
                  className="flex items-center space-x-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 text-white rounded-lg transition-all shadow-lg disabled:cursor-not-allowed"
                >
                  {loadingVendedor3633 ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Redistribuindo vendas...</span>
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-5 h-5" />
                      <span>Redistribuir Vendedor 3633</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Resultado Vendedor 3633 */}
            {resultVendedor3633 && (
              <div className="mt-6 bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-green-400 font-medium mb-2">{resultVendedor3633.message}</h3>
                    {resultVendedor3633.detalhes && (
                      <div className="text-slate-300 text-sm space-y-1">
                        <p className="font-medium text-white mb-2">Vendas redistribuídas por vendedor:</p>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-400">
                          <li>3601 (Sul): {resultVendedor3633.detalhes.vendedor_3601_sul || 0} vendas</li>
                          <li>3602 (Sudeste): {resultVendedor3633.detalhes.vendedor_3602_sudeste || 0} vendas</li>
                          <li>3603 (Centro-Oeste): {resultVendedor3633.detalhes.vendedor_3603_centro_oeste || 0} vendas</li>
                          <li>3604 (Norte/Nordeste): {resultVendedor3633.detalhes.vendedor_3604_norte_nordeste || 0} vendas</li>
                          {resultVendedor3633.detalhes.vendas_restantes_3633 > 0 && (
                            <li className="text-orange-400">Vendas ainda no 3633: {resultVendedor3633.detalhes.vendas_restantes_3633}</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Erro Vendedor 3633 */}
            {errorVendedor3633 && (
              <div className="mt-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-red-400 font-medium mb-1">Erro</h3>
                    <p className="text-slate-300 text-sm">{errorVendedor3633}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card de Remoção de Duplicatas 2024/2025 */}
          <div className="bg-gradient-to-br from-purple-900/20 to-slate-900 rounded-xl p-8 border border-purple-700/30 shadow-xl">
            <div className="flex items-start space-x-4 mb-6">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Copy className="w-6 h-6 text-purple-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white mb-2">
                  Remover Duplicatas 2024/2025
                </h2>
                <p className="text-slate-400 mb-4">
                  Remove vendas duplicadas que aparecem tanto em 2024 quanto em 2025, mantendo apenas as versões corretas de 2025.
                </p>
                
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 mb-4">
                  <h3 className="text-white font-medium mb-2 flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-purple-400" />
                    <span>CORREÇÃO DE DUPLICATAS ENTRE ANOS</span>
                  </h3>
                  <ul className="text-slate-300 text-sm space-y-1">
                    <li>• Identifica vendas com mesma transação (produto, quantidade, valor, cliente, vendedor) em 2024 e 2025</li>
                    <li>• Remove a versão de 2024 quando existe versão correspondente em 2025</li>
                    <li>• Corrige inflação artificial dos valores de 2024</li>
                    <li>• Mantém integridade dos dados históricos de 2025</li>
                  </ul>
                </div>

                <button
                  onClick={removerDuplicatas}
                  disabled={loadingDuplicatas}
                  className="flex items-center space-x-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-600 text-white rounded-lg transition-all shadow-lg disabled:cursor-not-allowed"
                >
                  {loadingDuplicatas ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Removendo duplicatas...</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      <span>Remover Duplicatas</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Resultado Duplicatas */}
            {resultDuplicatas && (
              <div className="mt-6 bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-green-400 font-medium mb-2">{resultDuplicatas.message}</h3>
                    <div className="text-slate-300 text-sm space-y-1">
                      <p>Duplicatas removidas: <span className="font-medium text-white">{resultDuplicatas.duplicatasRemovidas}</span></p>
                      {resultDuplicatas.valorRemovido && (
                        <p>Valor removido de 2024: <span className="font-medium text-white">R$ {resultDuplicatas.valorRemovido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
                      )}
                      {resultDuplicatas.diagnostico && (
                        <div className="mt-2 text-xs text-slate-400">
                          <p>Vendas 2024 antes: {resultDuplicatas.diagnostico.vendas2024Antes}</p>
                          <p>Vendas 2024 depois: {resultDuplicatas.diagnostico.vendas2024Depois}</p>
                          <p>Vendas 2025: {resultDuplicatas.diagnostico.vendas2025}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Erro Duplicatas */}
            {errorDuplicatas && (
              <div className="mt-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-red-400 font-medium mb-1">Erro</h3>
                    <p className="text-slate-300 text-sm">{errorDuplicatas}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card de Correção Salmix 2024 */}
          <div className="bg-gradient-to-br from-blue-900/20 to-slate-900 rounded-xl p-8 border border-blue-700/30 shadow-xl">
            <div className="flex items-start space-x-4 mb-6">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-6 h-6 text-blue-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white mb-2">
                  Corrigir Dados Salmix B2B 2024
                </h2>
                <p className="text-slate-400 mb-4">
                  Reclassifica todas as vendas do representante 1001 para o negócio Salmix B2B (código 10).
                </p>
                
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
                  <h3 className="text-white font-medium mb-2 flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-blue-400" />
                    <span>CORREÇÃO ESPECÍFICA PARA SALMIX 2024</span>
                  </h3>
                  <ul className="text-slate-300 text-sm space-y-1">
                    <li>• Identifica vendas do representante 1001 classificadas em negócios errados</li>
                    <li>• Reclassifica TODAS para Salmix B2B (código 10)</li>
                    <li>• Corrige discrepância entre valores esperados e valores reais</li>
                    <li>• Impacto esperado: ~R$ 1,5 milhões reclassificados</li>
                  </ul>
                </div>

                <button
                  onClick={corrigirSalmix2024}
                  disabled={loadingSalmix}
                  className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 text-white rounded-lg transition-all shadow-lg disabled:cursor-not-allowed"
                >
                  {loadingSalmix ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Executando correção...</span>
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-5 h-5" />
                      <span>Corrigir Salmix 2024</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Resultado Salmix */}
            {resultSalmix && (
              <div className="mt-6 bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-green-400 font-medium mb-2">{resultSalmix.message}</h3>
                    <div className="text-slate-300 text-sm space-y-1">
                      <p>Vendas reclassificadas: <span className="font-medium text-white">{resultSalmix.vendasReclassificadas}</span></p>
                      {resultSalmix.valorTotal && (
                        <p>Valor total reclassificado: <span className="font-medium text-white">R$ {resultSalmix.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Erro Salmix */}
            {errorSalmix && (
              <div className="mt-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-red-400 font-medium mb-1">Erro</h3>
                    <p className="text-slate-300 text-sm">{errorSalmix}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card de Correção AXEED LIQUID 2026 */}
          <div className="bg-gradient-to-br from-indigo-900/20 to-slate-900 rounded-xl p-8 border border-indigo-700/30 shadow-xl">
            <div className="flex items-start space-x-4 mb-6">
              <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Database className="w-6 h-6 text-indigo-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white mb-2">
                  Reclassificar AXEED LIQUID 2026
                </h2>
                <p className="text-slate-400 mb-4">
                  Reclassifica vendas do produto AXEED LIQUID CX 6 FRASCOS em 2026 do vendedor 3601 (Ruminantes) para 4231 (Ave/Sui).
                </p>
                
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4 mb-4">
                  <h3 className="text-white font-medium mb-2 flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-indigo-400" />
                    <span>AJUSTE DE CLASSIFICAÇÃO</span>
                  </h3>
                  <ul className="text-slate-300 text-sm space-y-1">
                    <li>• Produto: <span className="font-medium text-indigo-400">AXEED LIQUID CX 6 FRASCOS (170005)</span></li>
                    <li>• Ano: <span className="font-medium text-indigo-400">2026</span></li>
                    <li>• De: <span className="font-medium text-red-400">Vendedor 3601 - Vago Sul (Ruminantes)</span></li>
                    <li>• Para: <span className="font-medium text-green-400">Vendedor 4231 - PR (Ave/Sui)</span></li>
                  </ul>
                </div>

                <button
                  onClick={corrigirAxeedLiquid2026}
                  disabled={loadingAxeed}
                  className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-600 text-white rounded-lg transition-all shadow-lg disabled:cursor-not-allowed"
                >
                  {loadingAxeed ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Corrigindo...</span>
                    </>
                  ) : (
                    <>
                      <Database className="w-5 h-5" />
                      <span>Reclassificar AXEED LIQUID</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Resultado AXEED */}
            {resultAxeed && (
              <div className="mt-6 bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-green-400 font-medium mb-2">{resultAxeed.message}</h3>
                    <div className="text-slate-300 text-sm space-y-1">
                      <p>Vendas corrigidas: <span className="font-medium text-white">{resultAxeed.vendasCorrigidas}</span></p>
                      {resultAxeed.diagnostico && (
                        <div className="mt-2">
                          <p className="font-medium text-white mb-1">Antes:</p>
                          <pre className="text-xs bg-slate-800/50 p-2 rounded">{JSON.stringify(resultAxeed.diagnostico.antes, null, 2)}</pre>
                          <p className="font-medium text-white mb-1 mt-2">Depois:</p>
                          <pre className="text-xs bg-slate-800/50 p-2 rounded">{JSON.stringify(resultAxeed.diagnostico.depois, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Erro AXEED */}
            {errorAxeed && (
              <div className="mt-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-red-400 font-medium mb-1">Erro</h3>
                    <p className="text-slate-300 text-sm">{errorAxeed}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card de Correção Vendedor 42→31 Julho/2025 */}
          <div className="bg-gradient-to-br from-pink-900/20 to-slate-900 rounded-xl p-8 border border-pink-700/30 shadow-xl">
            <div className="flex items-start space-x-4 mb-6">
              <div className="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Database className="w-6 h-6 text-pink-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white mb-2">
                  Correção 42→31 Julho/2025
                </h2>
                <p className="text-slate-400 mb-4">
                  Corrige 4 vendas específicas de julho/2025 (cliente VETFARMA 176) mudando o vendedor de 42 para 31.
                </p>
                
                <div className="bg-pink-500/10 border border-pink-500/20 rounded-lg p-4 mb-4">
                  <h3 className="text-white font-medium mb-2 flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-pink-400" />
                    <span>CORREÇÃO PONTUAL</span>
                  </h3>
                  <ul className="text-slate-300 text-sm space-y-1">
                    <li>• Cliente: 176 (VETFARMA COMERCIO PROD AGROPECUARIOS LTD)</li>
                    <li>• Data: 31/07/2025</li>
                    <li>• Estado: PR</li>
                    <li>• Produtos: 170073 (HOOFCARE - BD 20 KG) e 170089 (HOOFCARE - POTE 1,2 KG)</li>
                    <li>• Total: 4 linhas de vendas</li>
                  </ul>
                </div>

                <button
                  onClick={corrigirVendedor4231}
                  disabled={loading4231}
                  className="flex items-center space-x-2 px-6 py-3 bg-pink-600 hover:bg-pink-500 disabled:bg-slate-600 text-white rounded-lg transition-all shadow-lg disabled:cursor-not-allowed"
                >
                  {loading4231 ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Corrigindo...</span>
                    </>
                  ) : (
                    <>
                      <Database className="w-5 h-5" />
                      <span>42→31</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Resultado 42-31 */}
            {result4231 && (
              <div className="mt-6 bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-green-400 font-medium mb-2">{result4231.message}</h3>
                    <div className="text-slate-300 text-sm space-y-1">
                      <p>Vendas corrigidas: <span className="font-medium text-white">{result4231.vendasCorrigidas}</span></p>
                      {result4231.valorCorrigido && (
                        <p>Valor corrigido: <span className="font-medium text-white">R$ {result4231.valorCorrigido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Erro 42-31 */}
            {error4231 && (
              <div className="mt-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-red-400 font-medium mb-1">Erro</h3>
                    <p className="text-slate-300 text-sm">{error4231}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card de Limpeza de Produtos */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-8 border border-slate-700 shadow-xl">
            <div className="flex items-start space-x-4 mb-6">
              <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Database className="w-6 h-6 text-orange-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white mb-2">
                  Limpar Nomes Genéricos de Produtos
                </h2>
                <p className="text-slate-400 mb-4">
                  Remove nomes genéricos como "Produto X", "Peosuto", "Terceiros" e substitui pelos nomes corretos em todas as tabelas do sistema.
                </p>
                
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
                  <h3 className="text-white font-medium mb-2 flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span>SOLUÇÃO DEFINITIVA PARA "PEOSUTO TERCEIROS"</span>
                  </h3>
                  <ul className="text-slate-300 text-sm space-y-1">
                    <li>• Remove TODOS os nomes genéricos ("Produto X", "Peosuto", "Terceiros")</li>
                    <li>• Substitui por nomes reais da tabela de vendas</li>
                    <li>• Remove registros órfãos que não podem ser corrigidos</li>
                    <li>• Atualiza 6 tabelas: produtos, vendas, forecast, inventory, price_table, order_items</li>
                  </ul>
                </div>

                <button
                  onClick={executarLimpeza}
                  disabled={loading}
                  className="flex items-center space-x-2 px-6 py-3 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-600 text-white rounded-lg transition-all shadow-lg disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Executando limpeza...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-5 h-5" />
                      <span>Executar Limpeza</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Resultado */}
            {result && (
              <div className="mt-6 bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-green-400 font-medium mb-2">{result.message}</h3>
                    <div className="text-slate-300 text-sm space-y-1">
                      <p>Total de registros corrigidos: <span className="font-medium text-white">{result.totalCorrigido}</span></p>
                      {result.detalhes && (
                        <div className="mt-3 space-y-1">
                          <p className="font-medium text-white">Detalhes da correção:</p>
                          <ul className="list-disc list-inside space-y-0.5 text-slate-400">
                            <li>Produtos: {result.detalhes.produtosCorrigidos || 0}</li>
                            <li>Vendas: {result.detalhes.vendasCorrigidas || 0}</li>
                            <li>Forecast: {result.detalhes.forecastCorrigido || 0}</li>
                            <li>Inventory: {result.detalhes.inventoryCorrigido || 0}</li>
                            <li>Tabela de Preços: {result.detalhes.priceTableCorrigido || 0}</li>
                            <li>Itens de Pedidos: {result.detalhes.orderItemsCorrigido || 0}</li>
                            {result.detalhes.forecastOrfaosDeletados > 0 && (
                              <li className="text-orange-400">Registros órfãos removidos: {result.detalhes.forecastOrfaosDeletados}</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Erro */}
            {error && (
              <div className="mt-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-red-400 font-medium mb-1">Erro</h3>
                    <p className="text-slate-300 text-sm">{error}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Informações Adicionais */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700 shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-4">Como funcionam as correções?</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-white mb-2">Correção Vendedores e Negócios (PRINCIPAL)</h4>
                <div className="space-y-2 text-slate-300 text-sm">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-yellow-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-yellow-400 font-bold text-xs">1</span>
                    </div>
                    <p className="text-slate-400">Redistribui vendedores com códigos antigos (1, 33, 36, 42) para os novos códigos corretos</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-yellow-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-yellow-400 font-bold text-xs">2</span>
                    </div>
                    <p className="text-slate-400">Atualiza códigos de negócio na tabela vendedores (Salmix B2B = 10, Ruminantes = 36, Ave/Sui = 42)</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-yellow-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-yellow-400 font-bold text-xs">3</span>
                    </div>
                    <p className="text-slate-400">Classifica TODAS as vendas com o negócio correto (resolve valores em "Todas")</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-yellow-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-yellow-400 font-bold text-xs">4</span>
                    </div>
                    <p className="text-slate-400">Classifica TODOS os budgets com o negócio correto</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-white mb-2">Redistribuição Vendedor 3633</h4>
                <div className="space-y-2 text-slate-300 text-sm">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-emerald-400 font-bold text-xs">1</span>
                    </div>
                    <p className="text-slate-400">Identifica vendas de Ruminantes 2025 do vendedor 3633</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-emerald-400 font-bold text-xs">2</span>
                    </div>
                    <p className="text-slate-400">Redistribui para vendedores corretos baseado na região (estado)</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-emerald-400 font-bold text-xs">3</span>
                    </div>
                    <p className="text-slate-400">Corrige concentração incorreta de vendas em um único vendedor</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-white mb-2">Remoção de Duplicatas 2024/2025</h4>
                <div className="space-y-2 text-slate-300 text-sm">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-purple-400 font-bold text-xs">1</span>
                    </div>
                    <p className="text-slate-400">Identifica vendas com mesma transação (produto, qtd, valor, cliente, vendedor)</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-purple-400 font-bold text-xs">2</span>
                    </div>
                    <p className="text-slate-400">Para cada duplicata, mantém versão de 2025 e remove de 2024</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-purple-400 font-bold text-xs">3</span>
                    </div>
                    <p className="text-slate-400">Corrige inflação artificial dos totais de 2024</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-white mb-2">Limpeza de Nomes de Produtos</h4>
                <div className="space-y-2 text-slate-300 text-sm">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-orange-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-orange-400 font-bold text-xs">1</span>
                    </div>
                    <p className="text-slate-400">Busca nomes reais na tabela de vendas e atualiza produtos</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-orange-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-orange-400 font-bold text-xs">2</span>
                    </div>
                    <p className="text-slate-400">Propaga correções para todas as tabelas relacionadas</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-orange-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-orange-400 font-bold text-xs">3</span>
                    </div>
                    <p className="text-slate-400">Remove registros órfãos sem correspondência válida</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
