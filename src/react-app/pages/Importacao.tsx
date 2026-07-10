import { useState } from 'react';
import Navbar from '@/react-app/components/Navbar';
import { Upload, FileText, CheckCircle, AlertCircle, Download, Info } from 'lucide-react';

interface ImportResult {
  success: boolean;
  message: string;
  recordsProcessed?: number;
  recordsRejected?: number;
  errors?: string[];
  diagnostico?: {
    valorAceito: number;
    valorRejeitado: number;
    valorBanco: number;
    diferenca: number;
    vendasBanco: number;
    motivosRejeicao: { [key: string]: number };
  };
}

export default function Importacao() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<'forecast' | 'vendas' | 'estoque' | 'budget' | 'inventory' | 'price_table' | 'clientes' | 'vendedores'>('forecast');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setSelectedFile(file);
      setResult(null);
    } else {
      alert('Por favor, selecione apenas arquivos CSV');
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setImporting(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('type', importType);

      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
        setResult({
          success: false,
          message: errorData.message || 'Erro ao processar importação',
          errors: errorData.errors || [`Status HTTP: ${response.status}`]
        });
        return;
      }

      const data = await response.json();
      
      // Se a importação foi bem-sucedida e é de vendas ou vendedores, executar procedimento de correção
      if (data.success && (importType === 'vendas' || importType === 'vendedores')) {
        try {
          const fixResponse = await fetch('/api/data/fix-vendedores-negocios', {
            method: 'POST',
          });

          if (fixResponse.ok) {
            const fixData = await fixResponse.json();
            // Adicionar informação sobre procedimentos executados na mensagem
            data.message = `${data.message} Procedimentos de correção aplicados automaticamente: ${fixData.vendedoresRedistribuidos || 0} vendedores redistribuídos, ${fixData.vendasUpdated || 0} vendas classificadas, ${fixData.budgetUpdated || 0} budgets atualizados.`;
          }
        } catch (fixError) {
          console.error('Erro ao executar procedimentos de correção:', fixError);
          // Não falhar a importação se a correção falhar
        }
      }
      
      setResult(data);
    } catch (error) {
      console.error('Erro na importação:', error);
      setResult({
        success: false,
        message: 'Erro ao processar importação',
        errors: [error instanceof Error ? error.message : 'Erro de conexão com o servidor']
      });
    } finally {
      setImporting(false);
    }
  };

  

  

  const downloadTemplate = (type: string) => {
    const templates = {
      vendas: 'Cliente;Num. Docto.;Loja;Serie;Nome;DT Emissao;Tipo da nota;Estado;Vendedor 1;Vendedor 2;Cond. Pagto;Produto;Descricao;Quantidade;Valor Unitario;Valor Mercadoria;Armaz;Cfo;Tes;Pedido;It;Valor IPI;Valor Icms;Valor Iss;Desp.Acessorias;Total\n001088;049694;01;1;GREMIO;11/01/2024;N;GO;NORTE/CO;;003;00370004;QUIABO;100;29,00;2.900,20;02;6101;606;047729;01;-;81,21;-;-;2.900,20',
      estoque: 'codigo_produto;quantidade_estoque;local_armazenamento;estoque_minimo\nVET001;100;Depósito A;20',
      forecast: 'mes;ano;codigo_produto;nome_produto;quantidade_prevista;preco_previsto;negocio\n1;2025;VET001;VACINA ANTIRRÁBICA;150;29.50;Ave/Sui',
      budget: 'Negocio;Vendedor 1;jan/25;fev/25;mar/25;abr/25;mai/25;jun/25;jul/25;ago/25;set/25;out/25;nov/25;dez/25\nAve/Sui;VENDEDOR A;150000;160000;170000;180000;190000;200000;210000;220000;230000;240000;250000;260000',
      inventory: 'product_id;product_name;lote;validade;quantidade_disponivel;unidade_medida;armazem;data_atualizacao\nVET001;VACINA ANTIRRÁBICA;LOT123;31/12/2025;500;UN;Depósito A;17/11/2025',
      price_table: 'product_id;product_name;preco_base;preco_minimo;max_desconto_permitido;politica_preco\nVET001;VACINA ANTIRRÁBICA;29.50;25.00;0.11;padrão',
      clientes: 'codigo_cliente;nome_cliente;cnpj;email;telefone;endereco;cidade;estado\n001088;CLIENTE EXEMPLO LTDA;12.345.678/0001-90;contato@cliente.com;(11) 98765-4321;Rua Exemplo 123;São Paulo;SP',
      vendedores: 'Negócio;Vendedor;Nome;Regional\nAve/Sui;4201;João da Silva;Sul\nRuminantes;3601;Maria Santos;Norte'
    };

    const csvContent = templates[type as keyof typeof templates];
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template_${type}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 pt-20 lg:pt-6 lg:ml-64">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Importação de Dados</h1>
            <p className="text-slate-400">Upload e processamento de arquivos CSV</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Import Form */}
            <div className="lg:col-span-2 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700 shadow-xl">
              <h3 className="text-lg font-semibold text-white mb-6 flex items-center space-x-2">
                <Upload className="w-5 h-5 text-blue-400" />
                <span>Importar Dados CSV</span>
              </h3>

              {/* Type Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Tipo de Dados
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { value: 'forecast', label: 'Forecast', icon: FileText },
                    { value: 'vendas', label: 'Vendas', icon: FileText },
                    { value: 'budget', label: 'Budget', icon: FileText },
                    { value: 'inventory', label: 'Estoque', icon: FileText },
                    { value: 'price_table', label: 'Tabela Preços', icon: FileText },
                    { value: 'clientes', label: 'Clientes', icon: FileText },
                    { value: 'vendedores', label: 'Vendedores', icon: FileText }
                  ].map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.value}
                        onClick={() => setImportType(type.value as any)}
                        className={`flex items-center space-x-2 p-3 rounded-lg border transition-all ${
                          importType === type.value
                            ? (type as any).special 
                              ? 'bg-gradient-to-r from-purple-600 to-pink-600 border-purple-500 text-white shadow-lg shadow-purple-500/50'
                              : 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* File Upload */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Arquivo CSV
                </label>
                <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label htmlFor="csv-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-300 font-medium mb-1">
                      Clique para selecionar um arquivo CSV
                    </p>
                    <p className="text-slate-500 text-sm">
                      Ou arraste e solte o arquivo aqui
                    </p>
                  </label>
                </div>
                
                {selectedFile && (
                  <div className="mt-3 p-3 bg-green-900/20 border border-green-700/50 rounded-lg">
                    <p className="text-green-400 text-sm">
                      <CheckCircle className="w-4 h-4 inline mr-2" />
                      {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </p>
                  </div>
                )}
              </div>

              {/* Import Button */}
              <button
                onClick={handleImport}
                disabled={!selectedFile || importing}
                className={`w-full py-3 rounded-lg font-medium transition-all ${
                  selectedFile && !importing
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:shadow-lg hover:shadow-blue-500/50'
                    : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                }`}
              >
                {importing ? (
                  <span className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Processando...</span>
                  </span>
                ) : (
                  'Iniciar Importação'
                )}
              </button>

              {/* Result */}
              {result && (
                <div className={`mt-6 p-4 rounded-lg border ${
                  result.success
                    ? 'bg-green-900/20 border-green-700/50'
                    : 'bg-red-900/20 border-red-700/50'
                }`}>
                  <div className="flex items-start space-x-3">
                    {result.success ? (
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className={`font-medium ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                        {result.message}
                      </p>
                      {result.recordsProcessed && (
                        <p className="text-sm text-slate-300 mt-1">
                          {result.recordsProcessed} registros processados
                          {result.recordsRejected ? `, ${result.recordsRejected} rejeitados` : ''}
                        </p>
                      )}
                      {result.diagnostico && (
                        <div className="mt-3 p-3 bg-slate-800/50 rounded-lg border border-slate-600 space-y-2">
                          <p className="text-sm font-medium text-purple-400">📊 Diagnóstico Detalhado</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <p className="text-slate-400">Valor Aceito (CSV)</p>
                              <p className="text-white font-medium">
                                R$ {result.diagnostico.valorAceito.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-400">Valor Rejeitado</p>
                              <p className="text-red-400 font-medium">
                                R$ {result.diagnostico.valorRejeitado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-400">Valor no Banco</p>
                              <p className="text-white font-medium">
                                R$ {result.diagnostico.valorBanco.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-400">Diferença</p>
                              <p className={`font-medium ${Math.abs(result.diagnostico.diferenca) > 1000 ? 'text-yellow-400' : 'text-green-400'}`}>
                                R$ {result.diagnostico.diferenca.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                            </div>
                          </div>
                          {result.diagnostico.motivosRejeicao && Object.keys(result.diagnostico.motivosRejeicao).length > 0 && (
                            <div className="mt-2 pt-2 border-t border-slate-600">
                              <p className="text-sm font-medium text-yellow-400 mb-1">Motivos de Rejeição:</p>
                              <div className="space-y-1">
                                {Object.entries(result.diagnostico.motivosRejeicao).map(([motivo, count]) => (
                                  <p key={motivo} className="text-xs text-slate-300">
                                    • {motivo}: <span className="text-yellow-400 font-medium">{count}</span> linha(s)
                                  </p>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {result.errors && result.errors.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm text-red-400 font-medium">Erros encontrados:</p>
                          <ul className="list-disc list-inside mt-1 space-y-1">
                            {result.errors.map((error, index) => (
                              <li key={index} className="text-sm text-red-300">{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Templates and Help */}
            <div className="space-y-6">
              {/* Templates */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700 shadow-xl">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                  <Download className="w-5 h-5 text-green-400" />
                  <span>Templates CSV</span>
                </h3>
                
                <div className="space-y-3">
                  {[
                    { type: 'vendas', label: 'Vendas' },
                    { type: 'forecast', label: 'Forecast' },
                    { type: 'budget', label: 'Budget' },
                    { type: 'inventory', label: 'Estoque' },
                    { type: 'price_table', label: 'Tabela Preços' },
                    { type: 'clientes', label: 'Clientes' },
                    { type: 'vendedores', label: 'Vendedores' }
                  ].map((template) => (
                    <button
                      key={template.type}
                      onClick={() => downloadTemplate(template.type)}
                      className="w-full p-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all text-left"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{template.label}</span>
                        <Download className="w-4 h-4" />
                      </div>
                      <p className="text-slate-400 text-sm mt-1">
                        Download template_{template.type}.csv
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Help */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700 shadow-xl">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                  <Info className="w-5 h-5 text-yellow-400" />
                  <span>Como Usar</span>
                </h3>
                
                <div className="space-y-3 text-sm text-slate-300">
                  <div>
                    <p className="font-medium text-white">1. Prepare seu Arquivo CSV</p>
                    <p>Use o arquivo CSV de vendas no formato esperado pelo sistema</p>
                  </div>
                  
                  <div>
                    <p className="font-medium text-white">2. Selecione o Tipo</p>
                    <p>Escolha o tipo de dados correspondente ao seu arquivo</p>
                  </div>
                  
                  <div>
                    <p className="font-medium text-white">3. Faça o Upload</p>
                    <p>Carregue seu arquivo CSV preenchido</p>
                  </div>
                  
                  <div>
                    <p className="font-medium text-white">4. Verifique o Resultado</p>
                    <p>Acompanhe o progresso e veja os resultados da importação</p>
                  </div>
                  
                  <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700/50 rounded-lg">
                    <p className="font-medium text-blue-400 text-xs">💡 Vendas</p>
                    <p className="text-blue-300 text-xs mt-1">A importação de vendas também cria/atualiza automaticamente os produtos relacionados.</p>
                  </div>
                  
                  <div className="mt-3 p-3 bg-orange-900/20 border border-orange-700/50 rounded-lg">
                    <p className="font-medium text-orange-400 text-xs">⚠️ Proteção Inteligente de Dados</p>
                    <p className="text-orange-300 text-xs mt-1">Para vendas: apenas os meses presentes no arquivo serão substituídos. Todos os demais dados históricos permanecem intocados.</p>
                  </div>
                  
                  <div className="mt-3 p-3 bg-green-900/20 border border-green-700/50 rounded-lg">
                    <p className="font-medium text-green-400 text-xs">🛡️ Importação Incremental</p>
                    <p className="text-green-300 text-xs mt-1">Sistema pronto para produção! Importe apenas dados novos (ex: Dez/2025) e os dados históricos (Jan-Nov/2025, 2024) permanecerão protegidos. Importações podem ser diárias, semanais ou quinzenais.</p>
                  </div>
                  
                  <div className="mt-3 p-3 bg-purple-900/20 border border-purple-700/50 rounded-lg">
                    <p className="font-medium text-purple-400 text-xs">⚙️ Executar Tudo</p>
                    <p className="text-purple-300 text-xs mt-1">O botão "Executar Tudo" aplica todos os procedimentos de correção: redistribuição de vendedores por UF, atualização de negócios, e classificação automática de vendas e budgets.</p>
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
