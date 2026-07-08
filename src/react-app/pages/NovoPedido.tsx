import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/react-app/components/Navbar';
import { ShoppingCart, Plus, Trash2, AlertTriangle, Check, User, Package, Calendar, Percent, X } from 'lucide-react';
import { usePedidos } from '@/react-app/hooks/usePedidos';
import { useAuth } from '@getmocha/users-service/react';
import type { OrderItem, Cliente, Inventory } from '@/shared/types';

export default function NovoPedido() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { inventory, priceTable, loading: dataLoading } = usePedidos();
  
  const [selectedUnidadeNegocio, setSelectedUnidadeNegocio] = useState<string>('');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [observacoes, setObservacoes] = useState('');
  
  // Modal state
  const [modalSearch, setModalSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<{ id: string; name: string } | null>(null);
  const [selectedLote, setSelectedLote] = useState<Inventory | null>(null);
  const [quantidade, setQuantidade] = useState<number>(1);
  const [percentualDesconto, setPercentualDesconto] = useState<number>(0);

  // Buscar dados do usuário local
  const [vendedorNome, setVendedorNome] = useState('');
  const [vendedorId, setVendedorId] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        try {
          const response = await fetch(`/api/usuarios?email=${encodeURIComponent(user.email)}`);
          if (response.ok) {
            const users = await response.json();
            const localUser = users.find((u: any) => u.email === user.email);
            if (localUser) {
              setVendedorNome(localUser.nome);
              setVendedorId(localUser.vendedor || localUser.email);
            }
          }
        } catch (error) {
          console.error('Erro ao buscar dados do usuário:', error);
        }
      }
    };
    fetchUserData();
  }, [user]);

  // Buscar clientes quando a unidade de negócio for selecionada
  useEffect(() => {
    const fetchClientes = async () => {
      console.log('');
      console.log('🔍 NOVO PEDIDO - useEffect fetchClientes disparado');
      console.log('  - selectedUnidadeNegocio:', selectedUnidadeNegocio);
      console.log('  - tipo:', typeof selectedUnidadeNegocio);
      
      if (!selectedUnidadeNegocio) {
        console.log('  - ⚠️ selectedUnidadeNegocio está vazio, limpando clientes');
        setClientes([]);
        setSelectedCliente(null);
        return;
      }

      // Limpar estado antes de iniciar nova busca
      setClientes([]);
      setSelectedCliente(null);
      setLoadingClientes(true);
      
      try {
        const url = `/api/clientes?negocio=${encodeURIComponent(selectedUnidadeNegocio)}`;
        console.log('  - 🌐 Fazendo requisição:', url);
        console.log('  - 🌐 URL completa:', window.location.origin + url);
        
        const response = await fetch(url, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          }
        });
        
        console.log('  - 📡 Response status:', response.status);
        console.log('  - 📡 Response ok:', response.ok);
        console.log('  - 📡 Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (response.ok) {
          const data = await response.json();
          console.log(`  - ✅ Clientes recebidos:`, data.length);
          if (data.length > 0) {
            console.log('  - Primeiros 3 clientes:', data.slice(0, 3).map((c: any) => ({
              id: c.id,
              codigo: c.codigo_cliente,
              nome: c.nome_cliente,
              negocio: c.negocio,
              ativo: c.ativo
            })));
          }
          setClientes(data);
        } else {
          const errorText = await response.text();
          console.error('  - ❌ Erro ao buscar clientes - status:', response.status);
          console.error('  - ❌ Corpo da resposta de erro:', errorText);
          setClientes([]);
        }
      } catch (error) {
        console.error('  - ❌ Erro ao buscar clientes (exceção):', error);
        console.error('  - ❌ Tipo do erro:', error instanceof Error ? error.name : typeof error);
        console.error('  - ❌ Mensagem do erro:', error instanceof Error ? error.message : String(error));
        console.error('  - ❌ Stack trace:', error instanceof Error ? error.stack : 'N/A');
        setClientes([]);
      } finally {
        setLoadingClientes(false);
        console.log('  - Loading finalizado');
        console.log('');
      }
    };

    fetchClientes();
  }, [selectedUnidadeNegocio]);

  // Obter lista única de produtos do inventory
  const uniqueProducts = useMemo(() => {
    const productMap = new Map<string, { id: string; name: string }>();
    inventory.forEach(item => {
      if (!productMap.has(item.product_id)) {
        productMap.set(item.product_id, {
          id: item.product_id,
          name: item.product_name,
        });
      }
    });
    return Array.from(productMap.values());
  }, [inventory]);

  // Filtrar produtos para busca
  const filteredProducts = useMemo(() => {
    if (!modalSearch) return uniqueProducts;
    const search = modalSearch.toLowerCase();
    return uniqueProducts.filter(p => 
      p.id.toLowerCase().includes(search) || 
      p.name.toLowerCase().includes(search)
    );
  }, [uniqueProducts, modalSearch]);

  // Helper function to format date from ISO to DD/MM/YYYY
  const formatDate = (dateString: string | undefined | null): string => {
    if (!dateString) return 'N/A';
    
    try {
      // Check if already in DD/MM/YYYY format
      if (dateString.includes('/')) {
        return dateString;
      }
      
      // Convert from ISO format (YYYY-MM-DD)
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'N/A';
      }
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      
      return `${day}/${month}/${year}`;
    } catch (error) {
      return 'N/A';
    }
  };

  // Helper function to format currency in Brazilian format
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Obter lotes disponíveis para o produto selecionado
  const availableLotes = useMemo(() => {
    if (!selectedProduct) return [];
    return inventory.filter(item => item.product_id === selectedProduct.id && (item.quantidade_disponivel || 0) > 0);
  }, [selectedProduct, inventory]);

  // Obter preço do produto
  const productPrice = useMemo(() => {
    if (!selectedProduct) return null;
    return priceTable.find(p => p.product_id === selectedProduct.id);
  }, [selectedProduct, priceTable]);

  // Calcular valores do item atual
  const currentItemCalc = useMemo(() => {
    if (!productPrice || !selectedLote) return null;
    
    const precoUnitario = productPrice.preco_base;
    const valorDesconto = (precoUnitario * percentualDesconto) / 100;
    const precoComDesconto = precoUnitario - valorDesconto;
    const valorTotal = precoComDesconto * quantidade;
    
    // O max_desconto_permitido pode estar em formato decimal (0.11) ou percentual (11)
    const maxDescontoFormatted = productPrice.max_desconto_permitido > 1 
      ? productPrice.max_desconto_permitido 
      : productPrice.max_desconto_permitido * 100;
    
    const foraPolitica = percentualDesconto > maxDescontoFormatted;
    
    return {
      precoUnitario,
      valorDesconto: valorDesconto * quantidade,
      valorTotal,
      foraPolitica,
      maxDescontoPermitido: maxDescontoFormatted,
    };
  }, [productPrice, selectedLote, quantidade, percentualDesconto]);

  // Calcular total do pedido
  const totalPedido = useMemo(() => {
    return items.reduce((sum, item) => sum + item.valor_total, 0);
  }, [items]);

  // Verificar se tem algum item fora da política
  const temDescontoForaPolitica = useMemo(() => {
    return items.some(item => item.fora_politica);
  }, [items]);

  const handleAddItem = () => {
    if (!selectedProduct || !selectedLote || !productPrice || !currentItemCalc) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    if (quantidade > (selectedLote.quantidade_disponivel || 0)) {
      alert(`Quantidade solicitada (${quantidade}) excede o estoque disponível (${selectedLote.quantidade_disponivel})`);
      return;
    }

    const newItem: OrderItem = {
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      lote: selectedLote.lote,
      validade: selectedLote.validade,
      quantidade,
      preco_unitario: productPrice.preco_base,
      percentual_desconto: percentualDesconto,
      valor_desconto: currentItemCalc.valorDesconto,
      valor_total: currentItemCalc.valorTotal,
      fora_politica: currentItemCalc.foraPolitica,
    };

    setItems(prev => [...prev, newItem]);
    
    // Reset modal
    setSelectedProduct(null);
    setSelectedLote(null);
    setQuantidade(1);
    setPercentualDesconto(0);
    setModalSearch('');
    setShowProductModal(false);
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfirmarPedido = () => {
    if (!selectedCliente) {
      alert('Por favor, selecione um cliente');
      return;
    }

    if (items.length === 0) {
      alert('Por favor, adicione pelo menos um item ao pedido');
      return;
    }

    if (!vendedorId || !vendedorNome) {
      alert('Erro ao identificar o vendedor');
      return;
    }

    const orderData = {
      vendedor_id: vendedorId,
      vendedor_nome: vendedorNome,
      cliente_id: selectedCliente.codigo_cliente,
      cliente_nome: selectedCliente.nome_cliente,
      data_pedido: new Date().toISOString(),
      valor_total: totalPedido,
      status: 'pendente' as const,
      tem_desconto_fora_politica: temDescontoForaPolitica,
      observacoes: observacoes || undefined,
      items,
    };

    // Navigate to confirmation page
    navigate('/vendas/pedidos/confirmar', { state: { orderData } });
  };

  if (dataLoading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 pt-20 lg:pt-6 lg:ml-64 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400">Carregando dados...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-6 pt-20 lg:pt-6 lg:ml-64">
        <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Novo Pedido</h1>
              <p className="text-slate-400 text-sm md:text-base">Crie um novo pedido de vendas</p>
            </div>
            <button
              onClick={handleConfirmarPedido}
              disabled={!selectedCliente || items.length === 0}
              className="flex items-center justify-center space-x-2 px-4 md:px-6 py-2.5 md:py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-lg transition-all shadow-lg hover:shadow-blue-500/50 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed disabled:shadow-none"
            >
              <Check className="w-4 h-4 md:w-5 md:h-5" />
              <span className="text-sm md:text-base">Confirmar Pedido</span>
            </button>
          </div>

          {/* Cliente Selection */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 md:p-6 border border-slate-700 shadow-xl">
            <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4 flex items-center space-x-2">
              <User className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />
              <span>Selecionar Cliente</span>
            </h3>
            
            {/* Unidade de Negócio */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Unidade de Negócio
              </label>
              <select
                value={selectedUnidadeNegocio}
                onChange={(e) => setSelectedUnidadeNegocio(e.target.value)}
                className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500 text-sm md:text-base"
              >
                <option value="">Selecione uma unidade de negócio...</option>
                <option value="10">Salmix B2B</option>
                <option value="36">Ruminantes</option>
                <option value="42">Ave/Sui</option>
              </select>
            </div>

            {/* Cliente */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Cliente {selectedUnidadeNegocio && `(${loadingClientes ? 'Carregando...' : `${clientes.length} disponíveis`})`}
              </label>
              <select
                value={selectedCliente?.id || ''}
                onChange={(e) => {
                  const cliente = clientes.find(c => c.id === parseInt(e.target.value));
                  setSelectedCliente(cliente || null);
                }}
                disabled={!selectedUnidadeNegocio || loadingClientes}
                className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500 text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {!selectedUnidadeNegocio 
                    ? 'Selecione uma unidade de negócio primeiro...' 
                    : loadingClientes 
                    ? 'Carregando clientes...'
                    : clientes.length === 0
                    ? 'Nenhum cliente encontrado'
                    : 'Selecione um cliente...'}
                </option>
                {clientes.map(cliente => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.codigo_cliente} - {cliente.nome_cliente} - {cliente.categoria || 'N/A'} - {cliente.cidade || 'N/A'}/{cliente.estado || 'N/A'}
                  </option>
                ))}
              </select>
            </div>
            
            {selectedCliente && (
              <div className="mt-3 md:mt-4 p-3 md:p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3 text-xs md:text-sm">
                  <div>
                    <span className="text-slate-400">Código:</span>
                    <span className="text-blue-400 ml-2 font-medium">{selectedCliente.codigo_cliente}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Negócio:</span>
                    <span className="text-blue-400 ml-2 font-medium">{selectedCliente.negocio || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Categoria:</span>
                    <span className="text-blue-400 ml-2 font-medium">{selectedCliente.categoria || 'N/A'}</span>
                  </div>
                  <div className="md:col-span-2 lg:col-span-1">
                    <span className="text-slate-400">Cidade/UF:</span>
                    <span className="text-blue-400 ml-2 font-medium">
                      {selectedCliente.cidade || 'N/A'} / {selectedCliente.estado || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Items List */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 md:p-6 border border-slate-700 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4 md:mb-6">
              <h3 className="text-base md:text-lg font-semibold text-white flex items-center space-x-2">
                <ShoppingCart className="w-4 h-4 md:w-5 md:h-5 text-green-400" />
                <span>Itens do Pedido</span>
                {items.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-green-600 text-white text-xs rounded-full">
                    {items.length}
                  </span>
                )}
              </h3>
              
              <button
                onClick={() => setShowProductModal(true)}
                className="flex items-center justify-center space-x-2 px-3 md:px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all text-sm md:text-base"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Item</span>
              </button>
            </div>

            {/* Alert if out of policy */}
            {temDescontoForaPolitica && (
              <div className="mb-4 p-3 md:p-4 bg-orange-900/20 border-2 border-orange-500 rounded-lg flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-orange-400 text-sm md:text-base">Fora da Política de Preços</p>
                  <p className="text-orange-300 text-xs md:text-sm mt-1">
                    Este pedido contém itens com desconto acima do permitido (11%)
                  </p>
                </div>
              </div>
            )}

            {/* Items Table */}
            {items.length === 0 ? (
              <div className="text-center py-8 md:py-12">
                <Package className="w-12 h-12 md:w-16 md:h-16 text-slate-600 mx-auto mb-3 md:mb-4" />
                <p className="text-slate-400 text-sm md:text-base">Nenhum item adicionado</p>
                <p className="text-slate-500 text-xs md:text-sm mt-1">Clique em "Adicionar Item" para começar</p>
              </div>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className={`p-3 md:p-4 rounded-lg border ${
                      item.fora_politica
                        ? 'bg-orange-900/10 border-orange-700/50'
                        : 'bg-slate-700/50 border-slate-600'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2 md:mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="font-medium text-white text-sm md:text-base truncate">
                            {item.product_name}
                          </p>
                          {item.fora_politica && (
                            <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs md:text-sm text-slate-400">
                          Lote: {item.lote || 'N/A'}
                        </p>
                        {item.validade && (
                          <p className="text-xs text-slate-500 flex items-center space-x-1 mt-1">
                            <Calendar className="w-3 h-3" />
                            <span>Val: {formatDate(item.validade)}</span>
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveItem(index)}
                        className="p-1.5 md:p-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-all flex-shrink-0 ml-2"
                      >
                        <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 text-xs md:text-sm">
                      <div>
                        <span className="text-slate-400">Qtd:</span>
                        <span className="text-white ml-1 font-medium">{item.quantidade}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Unit.:</span>
                        <span className="text-white ml-1 font-medium">
                          {formatCurrency(item.preco_unitario)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Desc.:</span>
                        <span className={`ml-1 font-medium ${item.fora_politica ? 'text-orange-400' : 'text-white'}`}>
                          {item.percentual_desconto.toFixed(1)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Total:</span>
                        <span className="text-green-400 ml-1 font-medium">
                          {formatCurrency(item.valor_total)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Total */}
            {items.length > 0 && (
              <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-slate-600">
                <div className="flex justify-between items-center">
                  <span className="text-base md:text-lg font-semibold text-white">Total do Pedido:</span>
                  <span className="text-xl md:text-2xl font-bold text-green-400">
                    {formatCurrency(totalPedido)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Observações */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 md:p-6 border border-slate-700 shadow-xl">
            <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4">
              Observações (Opcional)
            </h3>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Adicione observações sobre o pedido..."
              className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500 resize-none text-sm md:text-base"
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 md:p-6 flex items-center justify-between">
              <h3 className="text-lg md:text-xl font-semibold text-white">Adicionar Produto</h3>
              <button
                onClick={() => setShowProductModal(false)}
                className="p-2 hover:bg-slate-700 rounded-lg transition-all"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-4 md:p-6 space-y-4 md:space-y-6">
              {/* Product Search */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Buscar Produto
                </label>
                <input
                  type="text"
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  placeholder="Digite o código ou nome do produto..."
                  className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500 text-sm md:text-base"
                />
                
                {!selectedProduct && (
                  <div className="mt-2 max-h-48 overflow-y-auto bg-slate-700 rounded-lg border border-slate-600">
                    {filteredProducts.length === 0 ? (
                      <p className="p-3 text-sm text-slate-400">Nenhum produto encontrado</p>
                    ) : (
                      filteredProducts.map(product => (
                        <button
                          key={product.id}
                          onClick={() => {
                            setSelectedProduct(product);
                            setModalSearch('');
                          }}
                          className="w-full p-3 text-left hover:bg-slate-600 transition-all border-b border-slate-600 last:border-b-0"
                        >
                          <p className="font-medium text-white text-sm">{product.name}</p>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Selected Product */}
              {selectedProduct && (
                <div className="p-3 md:p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-white text-sm md:text-base">{selectedProduct.name}</p>
                    <Check className="w-5 h-5 text-blue-400" />
                  </div>
                </div>
              )}

              {/* Lote Selection */}
              {selectedProduct && availableLotes.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Selecionar Lote
                  </label>
                  <select
                    value={selectedLote?.id || ''}
                    onChange={(e) => {
                      const lote = availableLotes.find(l => l.id === parseInt(e.target.value));
                      setSelectedLote(lote || null);
                    }}
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500 text-sm md:text-base"
                  >
                    <option value="">Selecione um lote...</option>
                    {availableLotes.map(lote => (
                      <option key={lote.id} value={lote.id}>
                        Lote {lote.lote || 'N/A'} - Estoque: {lote.quantidade_disponivel} - Val: {formatDate(lote.validade)}
                      </option>
                    ))}
                  </select>
                  
                  {selectedLote && selectedLote.validade && (
                    <div className="mt-2 p-2 md:p-3 bg-yellow-900/20 border border-yellow-700/50 rounded-lg flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                      <p className="text-xs md:text-sm text-yellow-300">
                        Validade: <strong>{formatDate(selectedLote.validade)}</strong>
                      </p>
                    </div>
                  )}
                </div>
              )}

              {selectedProduct && availableLotes.length === 0 && (
                <div className="p-3 md:p-4 bg-red-900/20 border border-red-700/50 rounded-lg">
                  <p className="text-sm text-red-400">
                    Nenhum lote disponível em estoque para este produto
                  </p>
                </div>
              )}

              {/* Quantidade e Desconto */}
              {selectedLote && productPrice && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Quantidade
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={selectedLote.quantidade_disponivel || 1}
                        value={quantidade}
                        onChange={(e) => setQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500 text-sm md:text-base"
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        Disponível: {selectedLote.quantidade_disponivel}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center space-x-2">
                        <Percent className="w-4 h-4" />
                        <span>Desconto (%)</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={percentualDesconto}
                        onChange={(e) => setPercentualDesconto(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500 text-sm md:text-base"
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        Máx. permitido: {productPrice.max_desconto_permitido > 1 
                          ? productPrice.max_desconto_permitido.toFixed(1) 
                          : (productPrice.max_desconto_permitido * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {/* Price Summary */}
                  {currentItemCalc && (
                    <div className="p-3 md:p-4 bg-slate-700 rounded-lg space-y-2">
                      <div className="flex justify-between text-xs md:text-sm">
                        <span className="text-slate-400">Preço Unitário:</span>
                        <span className="text-white">{formatCurrency(currentItemCalc.precoUnitario)}</span>
                      </div>
                      {currentItemCalc.valorDesconto > 0 && (
                        <div className="flex justify-between text-xs md:text-sm">
                          <span className="text-slate-400">Desconto Total:</span>
                          <span className="text-yellow-400">- {formatCurrency(currentItemCalc.valorDesconto)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm md:text-base pt-2 border-t border-slate-600">
                        <span className="text-white font-medium">Total:</span>
                        <span className="text-green-400 font-bold">{formatCurrency(currentItemCalc.valorTotal)}</span>
                      </div>
                      
                      {currentItemCalc.foraPolitica && (
                        <div className="pt-2 border-t border-slate-600">
                          <div className="flex items-start space-x-2 p-2 bg-orange-900/20 border border-orange-700/50 rounded">
                            <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-semibold text-orange-400">Fora da Política de Preços</p>
                              <p className="text-xs text-orange-300">
                                Desconto acima do máximo permitido ({currentItemCalc.maxDescontoPermitido.toFixed(1)}%)
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Add Button */}
                  <button
                    onClick={handleAddItem}
                    className="w-full py-3 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white rounded-lg transition-all shadow-lg hover:shadow-green-500/50 font-medium text-sm md:text-base"
                  >
                    Adicionar ao Pedido
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
