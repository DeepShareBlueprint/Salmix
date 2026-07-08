import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '@/react-app/components/Navbar';
import { ShoppingCart, User, Calendar, AlertTriangle, Send, Package, CreditCard } from 'lucide-react';
import type { Order } from '@/shared/types';

export default function ConfirmarPedido() {
  const location = useLocation();
  const navigate = useNavigate();
  const orderData = location.state?.orderData as Order | null;

  const [condicoesPagamento, setCondicoesPagamento] = useState<string>('À vista');
  const [outraCondicao, setOutraCondicao] = useState<string>('');
  const [comprador, setComprador] = useState<string>('');
  const [telefone, setTelefone] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Helper function to format currency in Brazilian format
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Helper function to format date from ISO to DD/MM/YYYY
  const formatDate = (dateString: string | undefined | null): string => {
    if (!dateString) return 'N/A';
    
    try {
      if (dateString.includes('/')) {
        return dateString;
      }
      
      const date = new Date(dateString);
      
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

  if (!orderData) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 pt-20 lg:pt-6 lg:ml-64 flex items-center justify-center">
          <div className="text-center">
            <Package className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 mb-4">Nenhum pedido para confirmar</p>
            <button
              onClick={() => navigate('/vendas/pedidos')}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all"
            >
              Voltar para Novo Pedido
            </button>
          </div>
        </div>
      </>
    );
  }

  const handleFinalizarPedido = async () => {
    const condicoesFinal = condicoesPagamento === 'Outra' ? outraCondicao : condicoesPagamento;
    
    if (condicoesPagamento === 'Outra' && !outraCondicao.trim()) {
      alert('Por favor, especifique as condições de pagamento');
      return;
    }

    if (!comprador.trim()) {
      alert('Por favor, preencha o nome do comprador');
      return;
    }

    if (!telefone.trim()) {
      alert('Por favor, preencha o telefone do comprador');
      return;
    }

    setSubmitting(true);

    try {
      const orderToSubmit = {
        ...orderData,
        condicoes_pagamento: condicoesFinal,
        comprador: comprador.trim(),
        telefone: telefone.trim(),
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderToSubmit),
      });

      if (!response.ok) {
        throw new Error('Erro ao criar pedido');
      }

      alert('Pedido criado com sucesso! Um email foi enviado com os detalhes.');
      navigate('/vendas/pedidos/lista');
      
    } catch (error) {
      alert('Erro ao criar pedido: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-6 pt-20 lg:pt-6 lg:ml-64">
        <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Confirmar Pedido</h1>
              <p className="text-slate-400 text-sm md:text-base">Revise os dados e escolha as condições de pagamento</p>
            </div>
            <button
              onClick={handleFinalizarPedido}
              disabled={submitting}
              className="flex items-center justify-center space-x-2 px-4 md:px-6 py-2.5 md:py-3 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white rounded-lg transition-all shadow-lg hover:shadow-green-500/50 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm md:text-base">Enviando...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="text-sm md:text-base">Finalizar Pedido</span>
                </>
              )}
            </button>
          </div>

          {/* Cliente e Vendedor Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 md:p-6 border border-slate-700 shadow-xl">
              <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4 flex items-center space-x-2">
                <User className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />
                <span>Cliente</span>
              </h3>
              <div className="space-y-2 text-sm md:text-base">
                <p className="text-white font-medium">{orderData.cliente_nome}</p>
                <p className="text-slate-400">Cód: {orderData.cliente_id}</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 md:p-6 border border-slate-700 shadow-xl">
              <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4 flex items-center space-x-2">
                <User className="w-4 h-4 md:w-5 md:h-5 text-green-400" />
                <span>Vendedor</span>
              </h3>
              <div className="space-y-2 text-sm md:text-base">
                <p className="text-white font-medium">{orderData.vendedor_nome}</p>
                <p className="text-slate-400">Cód: {orderData.vendedor_id}</p>
              </div>
            </div>
          </div>

          {/* Comprador e Telefone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 md:p-6 border border-slate-700 shadow-xl">
              <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4 flex items-center space-x-2">
                <User className="w-4 h-4 md:w-5 md:h-5 text-purple-400" />
                <span>Comprador</span>
              </h3>
              <input
                type="text"
                value={comprador}
                onChange={(e) => setComprador(e.target.value)}
                placeholder="Nome do comprador..."
                className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-purple-500 text-sm md:text-base"
              />
            </div>

            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 md:p-6 border border-slate-700 shadow-xl">
              <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4 flex items-center space-x-2">
                <User className="w-4 h-4 md:w-5 md:h-5 text-purple-400" />
                <span>Telefone</span>
              </h3>
              <input
                type="tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="Telefone do comprador..."
                className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-purple-500 text-sm md:text-base"
              />
            </div>
          </div>

          {/* Condições de Pagamento */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 md:p-6 border border-slate-700 shadow-xl">
            <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4 flex items-center space-x-2">
              <CreditCard className="w-4 h-4 md:w-5 md:h-5 text-purple-400" />
              <span>Condições de Pagamento</span>
            </h3>

            <div className="space-y-3">
              {['À vista', '30', '30/60', '30/60/90', '30/60/90/120', 'Outra'].map((option) => (
                <label
                  key={option}
                  className="flex items-center space-x-3 p-3 bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-600 transition-all"
                >
                  <input
                    type="radio"
                    name="condicoes_pagamento"
                    value={option}
                    checked={condicoesPagamento === option}
                    onChange={(e) => setCondicoesPagamento(e.target.value)}
                    className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-white text-sm md:text-base">{option}</span>
                </label>
              ))}

              {condicoesPagamento === 'Outra' && (
                <input
                  type="text"
                  value={outraCondicao}
                  onChange={(e) => setOutraCondicao(e.target.value)}
                  placeholder="Digite as condições de pagamento..."
                  className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-purple-500 text-sm md:text-base"
                />
              )}
            </div>
          </div>

          {/* Alert if out of policy */}
          {orderData.tem_desconto_fora_politica && (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 md:p-6 border border-slate-700 shadow-xl">
              <div className="p-3 md:p-4 bg-orange-900/20 border-2 border-orange-500 rounded-lg flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-orange-400 text-sm md:text-base">Fora da Política de Preços</p>
                  <p className="text-orange-300 text-xs md:text-sm mt-1">
                    Este pedido contém itens com desconto acima do permitido (11%)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Items List */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 md:p-6 border border-slate-700 shadow-xl">
            <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4 flex items-center space-x-2">
              <ShoppingCart className="w-4 h-4 md:w-5 md:h-5 text-green-400" />
              <span>Itens do Pedido</span>
              <span className="ml-2 px-2 py-0.5 bg-green-600 text-white text-xs rounded-full">
                {orderData.items?.length || 0}
              </span>
            </h3>

            <div className="space-y-3 md:space-y-4">
              {orderData.items?.map((item, index) => (
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

            {/* Total */}
            <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-slate-600">
              <div className="flex justify-between items-center">
                <span className="text-base md:text-lg font-semibold text-white">Total do Pedido:</span>
                <span className="text-xl md:text-2xl font-bold text-green-400">
                  {formatCurrency(orderData.valor_total)}
                </span>
              </div>
            </div>
          </div>

          {/* Observações */}
          {orderData.observacoes && (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 md:p-6 border border-slate-700 shadow-xl">
              <h3 className="text-base md:text-lg font-semibold text-white mb-3">Observações</h3>
              <p className="text-sm md:text-base text-slate-300">{orderData.observacoes}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
