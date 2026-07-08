import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/react-app/components/Navbar';
import { ShoppingCart, Search, Calendar, User, AlertTriangle, FileText, Download, Edit, Mail, CheckSquare, Square } from 'lucide-react';
import type { Order } from '@/shared/types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ListaPedidos() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<number>>(new Set());
  const [sendingXML, setSendingXML] = useState(false);

  // Helper function to format currency in Brazilian format
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders');
      if (!response.ok) throw new Error('Erro ao buscar pedidos');
      const data = await response.json();
      setOrders(data);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    const search = searchTerm.toLowerCase();
    return (
      order.numero_pedido?.toLowerCase().includes(search) ||
      order.cliente_nome.toLowerCase().includes(search) ||
      order.vendedor_nome.toLowerCase().includes(search)
    );
  });

  const toggleOrderSelection = (orderId: number | undefined, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!orderId) return;
    const newSelected = new Set(selectedOrderIds);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrderIds(newSelected);
  };

  const handleSendXML = async () => {
    if (selectedOrderIds.size === 0) {
      alert('Selecione pelo menos um pedido para gerar XML');
      return;
    }

    setSendingXML(true);
    try {
      const response = await fetch('/api/orders/send-xml', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderIds: Array.from(selectedOrderIds)
        })
      });

      const result = await response.json();

      if (result.success) {
        alert(`XML enviado com sucesso para ${result.recipients.join(', ')}`);
        setSelectedOrderIds(new Set());
        fetchOrders(); // Recarregar pedidos para atualizar status
      } else {
        alert('Erro ao enviar XML: ' + result.message);
      }
    } catch (error) {
      console.error('Erro ao enviar XML:', error);
      alert('Erro ao enviar XML');
    } finally {
      setSendingXML(false);
    }
  };

  const downloadOrderPDF = async (order: Order) => {
    // Buscar informações do vendedor (usuário)
    let vendedorInfo: any = { vendedor: order.vendedor_id, nome: order.vendedor_nome };
    try {
      // Buscar todos os usuários e filtrar pelo vendedor_id
      const usuariosResponse = await fetch('/api/usuarios');
      if (usuariosResponse.ok) {
        const usuarios = await usuariosResponse.json();
        const usuario = usuarios.find((u: any) => u.vendedor === order.vendedor_id || u.email === order.vendedor_id);
        if (usuario) {
          vendedorInfo = {
            vendedor: usuario.vendedor || order.vendedor_id,
            nome: usuario.nome || order.vendedor_nome
          };
        }
      }
    } catch (error) {
      console.error('Erro ao buscar informações do vendedor:', error);
    }
    
    // Buscar informações do cliente
    let clienteInfo: any = { 
      codigo: order.cliente_id, 
      nome: order.cliente_nome 
    };
    try {
      const clientesResponse = await fetch('/api/clientes');
      if (clientesResponse.ok) {
        const clientes = await clientesResponse.json();
        const cliente = clientes.find((c: any) => c.codigo_cliente === order.cliente_id);
        if (cliente) {
          clienteInfo = {
            codigo: cliente.codigo_cliente,
            nome: cliente.nome_cliente,
            cnpj: cliente.cnpj,
            endereco: cliente.endereco,
            cidade: cliente.cidade,
            estado: cliente.estado
          };
        }
      }
    } catch (error) {
      console.error('Erro ao buscar informações do cliente:', error);
    }
    
    const doc = new jsPDF();
    
    // Add "rel001" in top left corner
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('rel001', 14, 10);
    doc.setTextColor(0, 0, 0);
    
    // Header with centered title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('PEDIDO DE VENDA', 105, 20, { align: 'center' });
    
    // Add logo on the right side
    try {
      const logoUrl = '/daxtellk-logomarca.png';
      doc.addImage(logoUrl, 'PNG', 150, 10, 45, 15);
    } catch (error) {
      console.error('Erro ao adicionar logo ao PDF:', error);
    }
    
    let currentY = 30;
    
    // 1. Pedido
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Pedido: ${order.numero_pedido}`, 14, currentY);
    currentY += 5;
    
    // 2. Data
    doc.text(`Data: ${new Date(order.data_pedido).toLocaleDateString('pt-BR')} às ${new Date(order.data_pedido).toLocaleTimeString('pt-BR')}`, 14, currentY);
    currentY += 8;
    
    // 3. VENDEDOR (título)
    doc.setFont('helvetica', 'bold');
    doc.text('VENDEDOR', 14, currentY);
    currentY += 5;
    
    // 4. Código; Nome
    doc.setFont('helvetica', 'normal');
    doc.text(`Código: ${vendedorInfo.vendedor}`, 14, currentY);
    doc.text(`Nome: ${vendedorInfo.nome}`, 60, currentY);
    currentY += 8;
    
    // 5. CLIENTE (título)
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENTE', 14, currentY);
    currentY += 5;
    
    // 6. Código; Nome; CNPJ
    doc.setFont('helvetica', 'normal');
    doc.text(`Código: ${clienteInfo.codigo}`, 14, currentY);
    doc.text(`Nome: ${clienteInfo.nome}`, 60, currentY);
    currentY += 5;
    
    if (clienteInfo.cnpj) {
      doc.text(`CNPJ: ${clienteInfo.cnpj}`, 14, currentY);
      currentY += 5;
    }
    
    // 7. Endereço; cidade; estado
    if (clienteInfo.endereco || clienteInfo.cidade || clienteInfo.estado) {
      const enderecoPartes = [];
      if (clienteInfo.endereco) enderecoPartes.push(clienteInfo.endereco);
      if (clienteInfo.cidade) enderecoPartes.push(clienteInfo.cidade);
      if (clienteInfo.estado) enderecoPartes.push(clienteInfo.estado);
      
      if (enderecoPartes.length > 0) {
        doc.text(`Endereço: ${enderecoPartes.join(', ')}`, 14, currentY);
        currentY += 5;
      }
    }
    
    // 8. Comprador
    if (order.comprador) {
      doc.text(`Comprador: ${order.comprador}`, 14, currentY);
      currentY += 5;
    }
    
    // 9. Telefone
    if (order.telefone) {
      doc.text(`Telefone: ${order.telefone}`, 14, currentY);
      currentY += 5;
    }
    
    // 10. Condições
    doc.text(`Condições: ${order.condicoes_pagamento || 'Não especificado'}`, 14, currentY);
    currentY += 8;
    
    // Helper function to format date
    const formatDate = (dateStr: string | undefined): string => {
      if (!dateStr) return 'N/A';
      
      try {
        // Try parsing as ISO date first
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('pt-BR');
        }
        
        // If ISO fails, try parsing DD/MMM/YY format
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          const day = parts[0];
          const monthStr = parts[1].toLowerCase();
          const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
          
          const monthMap: { [key: string]: string } = {
            'jan': '01', 'fev': '02', 'mar': '03', 'abr': '04',
            'mai': '05', 'jun': '06', 'jul': '07', 'ago': '08',
            'set': '09', 'out': '10', 'nov': '11', 'dez': '12'
          };
          
          const month = monthMap[monthStr];
          if (month) {
            const formattedDate = new Date(`${year}-${month}-${day}`);
            if (!isNaN(formattedDate.getTime())) {
              return formattedDate.toLocaleDateString('pt-BR');
            }
          }
        }
        
        return dateStr;
      } catch {
        return dateStr;
      }
    };
    
    // Items table
    const tableData = order.items?.map(item => [
      item.product_id,
      item.product_name,
      item.lote || 'N/A',
      formatDate(item.validade),
      item.quantidade.toString(),
      formatCurrency(item.preco_unitario),
      `${item.percentual_desconto.toFixed(1)}%`,
      formatCurrency(item.valor_total)
    ]) || [];
    
    autoTable(doc, {
      startY: currentY,
      head: [['Cód.', 'Produto', 'Lote', 'Validade', 'Qtd', 'Preço Unit.', 'Desc.', 'Total']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 138], fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 55 },
        2: { cellWidth: 20 },
        3: { cellWidth: 22 },
        4: { cellWidth: 15 },
        5: { cellWidth: 22 },
        6: { cellWidth: 15 },
        7: { cellWidth: 25 }
      }
    });
    
    // Total
    const finalY = (doc as any).lastAutoTable.finalY || 85;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL: ${formatCurrency(order.valor_total)}`, 140, finalY + 10);
    
    // Observações
    if (order.observacoes) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Observações:', 14, finalY + 20);
      doc.setFont('helvetica', 'normal');
      const splitText = doc.splitTextToSize(order.observacoes, 180);
      doc.text(splitText, 14, finalY + 25);
    }
    
    // Alert if out of policy
    if (order.tem_desconto_fora_politica) {
      doc.setTextColor(255, 140, 0);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('⚠ PEDIDO CONTÉM DESCONTOS FORA DA POLÍTICA', 105, finalY + 35, { align: 'center' });
      doc.setTextColor(0, 0, 0);
    }
    
    // Save
    doc.save(`pedido_${order.numero_pedido}.pdf`);
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 pt-20 lg:pt-6 lg:ml-64 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400">Carregando pedidos...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-6 pt-20 lg:pt-6 lg:ml-64">
        <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Pedidos de Vendas</h1>
              <p className="text-slate-400 text-sm md:text-base">Histórico completo de pedidos</p>
            </div>
            
            {/* Botão para enviar XMLs selecionados */}
            {selectedOrderIds.size > 0 && (
              <button
                onClick={handleSendXML}
                disabled={sendingXML}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Mail className="w-5 h-5" />
                <span>
                  {sendingXML ? 'Enviando...' : `Enviar XML (${selectedOrderIds.size})`}
                </span>
              </button>
            )}
          </div>

          {/* Search */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 md:p-6 border border-slate-700 shadow-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por número, cliente ou vendedor..."
                className="w-full pl-10 pr-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Orders List */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 md:p-6 border border-slate-700 shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
              <ShoppingCart className="w-5 h-5 text-blue-400" />
              <span>Pedidos Recentes</span>
              {filteredOrders.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                  {filteredOrders.length}
                </span>
              )}
            </h3>

            {filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Nenhum pedido encontrado</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-4 bg-slate-700/50 border border-slate-600 rounded-lg hover:border-blue-500 transition-all cursor-pointer relative"
                    onClick={() => setSelectedOrder(order)}
                  >
                    {/* Checkbox de seleção */}
                    {order.id && (
                      <div
                        className="absolute top-4 left-4 z-10"
                        onClick={(e) => toggleOrderSelection(order.id, e)}
                      >
                        {selectedOrderIds.has(order.id) ? (
                          <CheckSquare className="w-6 h-6 text-blue-500 cursor-pointer hover:text-blue-400" />
                        ) : (
                          <Square className="w-6 h-6 text-slate-400 cursor-pointer hover:text-slate-300" />
                        )}
                      </div>
                    )}

                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3 ml-10">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-semibold text-white">
                            Pedido #{order.numero_pedido}
                          </h4>
                          {order.tem_desconto_fora_politica && (
                            <AlertTriangle className="w-4 h-4 text-orange-400" />
                          )}
                        </div>
                        <p className="text-sm text-slate-400">{order.cliente_nome}</p>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-sm text-slate-400">Vendedor</p>
                          <p className="text-sm text-white font-medium">{order.vendedor_nome}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-400">Total</p>
                          <p className="text-lg text-green-400 font-bold">
                            {formatCurrency(order.valor_total)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 ml-10">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(order.data_pedido).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <FileText className="w-3 h-3" />
                        <span>{order.items?.length || 0} itens</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          order.status === 'enviado' ? 'bg-green-900/30 text-green-400' :
                          order.status === 'processado' ? 'bg-blue-900/30 text-blue-400' :
                          order.status === 'cancelado' ? 'bg-red-900/30 text-red-400' :
                          'bg-yellow-900/30 text-yellow-400'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                      {order.xml_enviado && (
                        <div className="flex items-center space-x-1">
                          <span className="px-2 py-0.5 rounded-full text-xs bg-purple-900/30 text-purple-400">
                            XML enviado
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-white flex items-center space-x-2">
                  <span>Pedido #{selectedOrder.numero_pedido}</span>
                  {selectedOrder.tem_desconto_fora_politica && (
                    <AlertTriangle className="w-5 h-5 text-orange-400" />
                  )}
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  {new Date(selectedOrder.data_pedido).toLocaleDateString('pt-BR')} às{' '}
                  {new Date(selectedOrder.data_pedido).toLocaleTimeString('pt-BR')}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => navigate(`/vendas/pedidos/editar/${selectedOrder.id}`)}
                  className="p-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-all"
                  title="Editar Pedido"
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    downloadOrderPDF(selectedOrder);
                  }}
                  className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all"
                  title="Download PDF"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-all text-slate-400"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-700 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <User className="w-4 h-4 text-blue-400" />
                    <span className="text-sm text-slate-400">Cliente</span>
                  </div>
                  <p className="font-medium text-white">{selectedOrder.cliente_nome}</p>
                  <p className="text-sm text-slate-400">Cód: {selectedOrder.cliente_id}</p>
                </div>

                <div className="p-4 bg-slate-700 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <User className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-slate-400">Vendedor</span>
                  </div>
                  <p className="font-medium text-white">{selectedOrder.vendedor_nome}</p>
                  <p className="text-sm text-slate-400">Cód: {selectedOrder.vendedor_id}</p>
                </div>

                <div className="p-4 bg-slate-700 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Calendar className="w-4 h-4 text-purple-400" />
                    <span className="text-sm text-slate-400">Condições de Pagamento</span>
                  </div>
                  <p className="font-medium text-white">{selectedOrder.condicoes_pagamento || 'Não especificado'}</p>
                </div>
              </div>

              {/* Alerts */}
              {selectedOrder.tem_desconto_fora_politica && (
                <div className="p-4 bg-orange-900/20 border-2 border-orange-500 rounded-lg flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-orange-400">Fora da Política de Preços</p>
                    <p className="text-orange-300 text-sm mt-1">
                      Este pedido contém itens com desconto acima do permitido
                    </p>
                  </div>
                </div>
              )}

              {/* Items */}
              <div>
                <h4 className="font-semibold text-white mb-3">Itens do Pedido</h4>
                <div className="space-y-3">
                  {selectedOrder.items?.map((item, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${
                        item.fora_politica
                          ? 'bg-orange-900/10 border-orange-700/50'
                          : 'bg-slate-700/50 border-slate-600'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <p className="font-medium text-white">{item.product_name}</p>
                            {item.fora_politica && (
                              <AlertTriangle className="w-4 h-4 text-orange-400" />
                            )}
                          </div>
                          <p className="text-sm text-slate-400">
                            Cód: {item.product_id} | Lote: {item.lote || 'N/A'}
                          </p>
                          {item.validade && (
                            <p className="text-xs text-slate-500 mt-1">
                              Val: {new Date(item.validade).toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
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
              </div>

              {/* Observações */}
              {selectedOrder.observacoes && (
                <div className="p-4 bg-slate-700 rounded-lg">
                  <h4 className="font-semibold text-white mb-2">Observações</h4>
                  <p className="text-sm text-slate-300">{selectedOrder.observacoes}</p>
                </div>
              )}

              {/* Total */}
              <div className="pt-4 border-t border-slate-600">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-white">Total do Pedido:</span>
                  <span className="text-2xl font-bold text-green-400">
                    {formatCurrency(selectedOrder.valor_total)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
