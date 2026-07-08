import { useState } from 'react';
import Navbar from '@/react-app/components/Navbar';
import { Loader2, Lock, Database, Trash2 } from 'lucide-react';

interface MenuConfig {
  id: number;
  menu_key: string;
  menu_label: string;
  is_visible: boolean;
  parent_key: string | null;
}

export default function Config() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [menuConfigs, setMenuConfigs] = useState<MenuConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [clearing2024, setClearing2024] = useState(false);
  const [clearing2025, setClearing2025] = useState(false);
  const [importingSalmix, setImportingSalmix] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cleaningData, setCleaningData] = useState(false);
  const [loadingNegocios2024, setLoadingNegocios2024] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);
  const [showClearPasswordModal, setShowClearPasswordModal] = useState(false);
  const [clearPassword, setClearPassword] = useState('');
  const [fixing35To3601, setFixing35To3601] = useState(false);

  const CORRECT_PASSWORD = 'config123';

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === CORRECT_PASSWORD) {
      setIsAuthenticated(true);
      setError('');
      loadMenuConfigs();
    } else {
      setError('Senha incorreta');
    }
  };

  const loadMenuConfigs = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/menu-config');
      if (response.ok) {
        const data = await response.json();
        setMenuConfigs(data);
      } else {
        setError('Erro ao carregar configurações');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const toggleVisibility = async (menuKey: string, currentVisibility: boolean) => {
    setError('');
    setSuccess('');
    
    try {
      const response = await fetch('/api/menu-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menu_key: menuKey,
          is_visible: !currentVisibility
        })
      });

      if (response.ok) {
        setSuccess('Configuração atualizada com sucesso');
        await loadMenuConfigs();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Erro ao atualizar configuração');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
    }
  };

  

  const handleLimparBase2024 = async () => {
    // Confirmar ação
    const confirmacao = window.confirm(
      'Tem certeza que deseja limpar TODOS os dados de vendas de 2024? Esta ação não pode ser desfeita.'
    );
    
    if (!confirmacao) return;

    setError('');
    setSuccess('');
    setClearing2024(true);

    try {
      const response = await fetch('/api/data/clear-2024', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSuccess(result.message);
      } else {
        setError(result.message || 'Erro ao limpar base 2024');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
    } finally {
      setClearing2024(false);
    }
  };

  const handleLimparBase2025 = async () => {
    // Confirmar ação
    const confirmacao = window.confirm(
      'Tem certeza que deseja limpar TODOS os dados de vendas de 2025? Esta ação não pode ser desfeita.'
    );
    
    if (!confirmacao) return;

    setError('');
    setSuccess('');
    setClearing2025(true);

    try {
      const response = await fetch('/api/data/clear-2025', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSuccess(result.message);
      } else {
        setError(result.message || 'Erro ao limpar base 2025');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
    } finally {
      setClearing2025(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setSelectedFile(file);
      setError('');
    } else {
      setError('Por favor, selecione apenas arquivos CSV');
      setSelectedFile(null);
    }
  };

  

  const handleImportSalmix2024 = async () => {
    if (!selectedFile) {
      setError('Por favor, selecione um arquivo CSV');
      return;
    }

    const confirmacao = window.confirm(
      'Tem certeza que deseja importar dados de vendas para 2024? Os dados serão adicionados à base existente.'
    );
    
    if (!confirmacao) return;

    setError('');
    setSuccess('');
    setImportingSalmix(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/import/salmix-2024', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSuccess(result.message || 'Importação Salmix 2024 concluída com sucesso');
        setSelectedFile(null);
      } else {
        setError(result.message || 'Erro ao importar dados Salmix 2024');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
    } finally {
      setImportingSalmix(false);
    }
  };

  const corrigirNegocios2024 = async () => {
    if (!confirm('Tem certeza que deseja corrigir a classificação de negócios das vendas de 2024? Esta ação irá reclassificar vendas com o negócio correto baseado no vendedor.')) {
      return;
    }

    setLoadingNegocios2024(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/data/fix-negocios-2024', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(data.message || 'Correção de negócios 2024 concluída');
      } else {
        setError(data.message || 'Erro ao executar correção');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
    } finally {
      setLoadingNegocios2024(false);
    }
  };

  const handleLimparDados = () => {
    setShowClearPasswordModal(true);
  };

  const executeLimparDados = async () => {
    if (!confirm('⚠️ ATENÇÃO: Esta ação irá apagar TODOS os dados importados (vendas, produtos, estoque). Os usuários não serão afetados. Deseja continuar?')) {
      return;
    }

    setClearingAll(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/data/clear', {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess(data.message);
      } else {
        setError(data.message || 'Erro ao limpar dados');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
    } finally {
      setClearingAll(false);
    }
  };

  const handleClearPasswordSubmit = () => {
    if (clearPassword === 'PP0707') {
      setShowClearPasswordModal(false);
      setClearPassword('');
      executeLimparDados();
    } else {
      setError('Senha incorreta');
      setClearPassword('');
    }
  };

  const handleClearPasswordCancel = () => {
    setShowClearPasswordModal(false);
    setClearPassword('');
  };

  const handleFixVendedor35To3601 = async () => {
    const confirmacao = window.confirm(
      'Tem certeza que deseja corrigir o vendedor 000035 para 3601?\n\n' +
      'Esta ação irá:\n' +
      '• Reclassificar vendas do vendedor 000035 para 3601 (Ruminantes)\n' +
      '• Atribuir o negócio Ruminantes às vendas\n' +
      '• Eliminar "Sem Classificação" do Dashboard\n\n' +
      'Esta ação não pode ser desfeita.'
    );
    
    if (!confirmacao) return;

    setError('');
    setSuccess('');
    setFixing35To3601(true);

    try {
      const response = await fetch('/api/data/fix-vendedor-35-3601', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSuccess(result.message || 'Correção concluída com sucesso');
      } else {
        setError(result.message || 'Erro ao executar correção');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
    } finally {
      setFixing35To3601(false);
    }
  };

  const handleExecutarLimpeza = async () => {
    const confirmacao = window.confirm(
      'Tem certeza que deseja executar a limpeza completa? Esta ação irá:\n\n' +
      '• Remover duplicatas entre 2024 e 2025\n' +
      '• Remover nomes como "Produto X", "Peosuto", "Terceiros"\n' +
      '• Substituir por nomes reais da tabela de vendas\n' +
      '• Remover registros órfãos que não podem ser corrigidos\n' +
      '• Atualizar 6 tabelas do sistema\n\n' +
      'Esta ação não pode ser desfeita.'
    );
    
    if (!confirmacao) return;

    setError('');
    setSuccess('');
    setCleaningData(true);

    try {
      // ETAPA 1: Remover duplicatas 2024/2025
      const duplicatasResponse = await fetch('/api/data/remove-duplicatas-2024-2025', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const duplicatasResult = await duplicatasResponse.json();

      if (!duplicatasResponse.ok || !duplicatasResult.success) {
        setError(duplicatasResult.message || 'Erro ao remover duplicatas');
        return;
      }

      // ETAPA 2: Limpar nomes de produtos
      const produtosResponse = await fetch('/api/data/fix-product-names', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const produtosResult = await produtosResponse.json();

      if (produtosResponse.ok && produtosResult.success) {
        const detalhes = produtosResult.detalhes || {};
        const partes = [
          `${detalhes.produtosCorrigidos || 0} produtos`,
          `${detalhes.vendasCorrigidas || 0} vendas`,
          `${detalhes.forecastCorrigido || 0} forecast`,
          `${detalhes.inventoryCorrigido || 0} inventory`,
          `${detalhes.priceTableCorrigido || 0} preços`,
          `${detalhes.orderItemsCorrigido || 0} itens de pedido`
        ];
        
        let mensagem = `Limpeza completa concluída!\n\n`;
        mensagem += `Duplicatas: ${duplicatasResult.duplicatasRemovidas || 0} vendas removidas`;
        if (duplicatasResult.valorRemovido) {
          mensagem += ` (R$ ${duplicatasResult.valorRemovido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`;
        }
        mensagem += `.\n\nNomes de produtos: ${produtosResult.totalCorrigido} registros corrigidos (${partes.join(', ')})`;
        
        if (detalhes.forecastOrfaosDeletados > 0) {
          mensagem += `. ${detalhes.forecastOrfaosDeletados} registros órfãos removidos`;
        }
        mensagem += '.';
        
        setSuccess(mensagem);
      } else {
        setError(produtosResult.message || 'Erro ao executar limpeza de produtos');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
    } finally {
      setCleaningData(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pt-16 lg:pt-0">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="w-full max-w-md">
              <div className="bg-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 border border-slate-700">
                <div className="flex items-center justify-center mb-6">
                  <div className="p-3 sm:p-4 bg-blue-600 rounded-full">
                    <Lock className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                  </div>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-white text-center mb-2">
                  Configurações do Sistema
                </h1>
                <p className="text-sm sm:text-base text-slate-400 text-center mb-6">
                  Digite a senha para acessar
                </p>
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Digite a senha"
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                  </div>
                  {error && (
                    <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
                      {error}
                    </div>
                  )}
                  <button
                    type="submit"
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-blue-600/50"
                  >
                    Acessar
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pt-16 lg:pt-0">
        <div className="lg:ml-64 p-4 sm:p-6 lg:p-8 max-w-6xl">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              Configurações
            </h1>
            <p className="text-sm sm:text-base text-slate-400">
              Gerencie as configurações do sistema
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 sm:p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 sm:p-4 bg-green-900/50 border border-green-700 rounded-lg text-green-200 text-sm">
              {success}
            </div>
          )}

          {/* Operações de Manutenção */}
          <div className="mb-6 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-xl">
            <div className="p-4 sm:p-6 border-b border-slate-700 bg-slate-750">
              <h2 className="text-lg sm:text-xl font-semibold text-white">
                Manutenção de Dados
              </h2>
              <p className="text-sm text-slate-400 mt-2">
                Os procedimentos de correção são aplicados automaticamente durante a importação de vendas
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-750/50 border border-slate-700">
                <div>
                  <h3 className="text-white font-medium mb-1">Limpar Dados</h3>
                  <p className="text-sm text-slate-400">
                    Remove TODOS os dados importados (vendas, produtos, estoque). Os usuários não serão afetados.
                  </p>
                </div>
                <button
                  onClick={handleLimparDados}
                  disabled={clearingAll}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-red-600/50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {clearingAll ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Limpando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Limpar Dados
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-750/50 border border-slate-700">
                <div>
                  <h3 className="text-white font-medium mb-1">Limpar Base 2024</h3>
                  <p className="text-sm text-slate-400">
                    Remove todas as vendas do ano 2024 para permitir nova importação
                  </p>
                </div>
                <button
                  onClick={handleLimparBase2024}
                  disabled={clearing2024}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-red-600/50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {clearing2024 ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Limpando...
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4" />
                      Limpar Base 2024
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-750/50 border border-slate-700">
                <div>
                  <h3 className="text-white font-medium mb-1">Limpar Base 2025</h3>
                  <p className="text-sm text-slate-400">
                    Remove todas as vendas do ano 2025 para permitir nova importação
                  </p>
                </div>
                <button
                  onClick={handleLimparBase2025}
                  disabled={clearing2025}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-red-600/50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {clearing2025 ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Limpando...
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4" />
                      Limpar Base 2025
                    </>
                  )}
                </button>
              </div>

              <div className="p-4 rounded-lg bg-slate-750/50 border border-slate-700">
                <div>
                  <h3 className="text-white font-medium mb-1">Importar Salmix 2024</h3>
                  <p className="text-sm text-slate-400 mb-3">
                    Importar CSV de vendas especificamente para adicionar dados ao ano 2024
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="salmix-csv-upload"
                    />
                    <label
                      htmlFor="salmix-csv-upload"
                      className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg cursor-pointer transition-colors text-sm"
                    >
                      {selectedFile ? selectedFile.name : 'Selecionar arquivo CSV'}
                    </label>
                    <button
                      onClick={handleImportSalmix2024}
                      disabled={!selectedFile || importingSalmix}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-indigo-600/50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {importingSalmix ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Importando...
                        </>
                      ) : (
                        <>
                          <Database className="w-4 h-4" />
                          Importar
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-750/50 border border-slate-700">
                <div>
                  <h3 className="text-white font-medium mb-1">Corrigir Negócios 2024</h3>
                  <p className="text-sm text-slate-400">
                    Reclassifica vendas de 2024 com o negócio correto baseado no vendedor
                  </p>
                </div>
                <button
                  onClick={corrigirNegocios2024}
                  disabled={loadingNegocios2024}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-emerald-600/50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {loadingNegocios2024 ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Corrigindo...
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4" />
                      Corrigir Negócios 2024
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-750/50 border border-slate-700">
                <div>
                  <h3 className="text-white font-medium mb-1">Executar Limpeza</h3>
                  <p className="text-sm text-slate-400">
                    Remove duplicatas 2024/2025 e nomes genéricos de produtos em todas as tabelas
                  </p>
                </div>
                <button
                  onClick={handleExecutarLimpeza}
                  disabled={cleaningData}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-orange-600/50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {cleaningData ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Limpando...
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4" />
                      Executar Limpeza
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-750/50 border border-slate-700">
                <div>
                  <h3 className="text-white font-medium mb-1">000035→3601</h3>
                  <p className="text-sm text-slate-400">
                    Corrige vendedor 000035 para 3601 (Ruminantes) - elimina "Sem Classificação"
                  </p>
                </div>
                <button
                  onClick={handleFixVendedor35To3601}
                  disabled={fixing35To3601}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-purple-600/50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {fixing35To3601 ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Corrigindo...
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4" />
                      000035→3601
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Configuração do Menu */}
          {loading && !menuConfigs.length ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : (
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-xl">
              <div className="p-4 sm:p-6 border-b border-slate-700 bg-slate-750">
                <h2 className="text-lg sm:text-xl font-semibold text-white">
                  Opções do Menu
                </h2>
              </div>
              <div className="p-6">
                <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                  {menuConfigs.map((menu) => (
                    <label
                      key={menu.menu_key}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-750 transition-colors cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={menu.is_visible}
                        onChange={() => toggleVisibility(menu.menu_key, menu.is_visible)}
                        className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500 focus:ring-2 flex-shrink-0"
                      />
                      <span className={`text-sm font-medium ${menu.parent_key ? 'text-slate-300' : 'text-white'} truncate`}>
                        {menu.menu_label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Password Modal for Clear All Data */}
      {showClearPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 shadow-2xl w-80">
            <h3 className="text-lg font-semibold text-white mb-4">Confirmar Limpeza de Dados</h3>
            <input
              type="password"
              value={clearPassword}
              onChange={(e) => setClearPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleClearPasswordSubmit()}
              placeholder="Digite a senha"
              className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500 mb-4"
              autoFocus
            />
            <div className="flex space-x-3">
              <button
                onClick={handleClearPasswordSubmit}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all"
              >
                OK
              </button>
              <button
                onClick={handleClearPasswordCancel}
                className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
