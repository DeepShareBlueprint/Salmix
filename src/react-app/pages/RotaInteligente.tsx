import { useState, useEffect } from 'react';
import Navbar from '@/react-app/components/Navbar';
import RotaMap from '@/react-app/components/RotaMap';
import { 
  MapPin, 
  Navigation, 
  Phone, 
  MessageCircle, 
  // ShoppingCart, // Mantido para uso futuro
  TrendingUp,
  Clock,
  AlertCircle,
  Loader2,
  Calendar,
  X
} from 'lucide-react';
import { useAuth } from '@getmocha/users-service/react';

interface Cliente {
  id: string;
  nome: string;
  codigo: string;
  cidade: string;
  estado: string;
  latitude: number | null;
  longitude: number | null;
  distancia?: number;
  ultimaCompra?: string;
  ticketMedio?: number;
  diasSemComprar?: number;
  prioridade: 'alta' | 'media' | 'atencao';
  sugestao: string;
  telefone?: string | null;
  email?: string | null;
  produtoMaisComprado?: string | null;
  produtoParou?: string | null;
  reducaoPedidos?: number;
  compraRegularmente?: boolean;
}

export default function RotaInteligente() {
  const { user } = useAuth();
  const [localizacaoUsuario, setLocalizacaoUsuario] = useState<{ lat: number; lng: number } | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorLocalizacao, setErrorLocalizacao] = useState<string | null>(null);
  const [showAgendaModal, setShowAgendaModal] = useState(false);
  const [clienteSelecionadoAgenda, setClienteSelecionadoAgenda] = useState<Cliente | null>(null);
  const [formAgenda, setFormAgenda] = useState({
    data: '',
    hora: '',
    tipo_atividade: 'visita',
    observacao: '',
  });

  useEffect(() => {
    // Detectar localização do usuário
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocalizacaoUsuario({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setErrorLocalizacao(null);
        },
        (error) => {
          console.error('Erro ao obter localização:', error);
          setErrorLocalizacao('Não foi possível obter sua localização. Verifique as permissões do navegador.');
        }
      );
    } else {
      setErrorLocalizacao('Seu navegador não suporta geolocalização.');
    }
  }, []);

  useEffect(() => {
    if (localizacaoUsuario) {
      carregarClientes();
    }
  }, [localizacaoUsuario]);

  const carregarClientes = async () => {
    try {
      setLoading(true);
      
      // Usar endpoint otimizado que já retorna dados processados
      const clientesResponse = await fetch('/api/rota-inteligente/clientes');
      if (!clientesResponse.ok) {
        setLoading(false);
        return;
      }
      
      const clientesData = await clientesResponse.json();
      
      // Processar clientes com cálculo de distância e priorização
      const clientesProcessados: Cliente[] = clientesData.map((cliente: any) => {
        // Calcular distância (Haversine formula)
        let distancia = 999;
        if (cliente.latitude && cliente.longitude && localizacaoUsuario) {
          const R = 6371; // Raio da Terra em km
          const dLat = (cliente.latitude - localizacaoUsuario.lat) * Math.PI / 180;
          const dLon = (cliente.longitude - localizacaoUsuario.lng) * Math.PI / 180;
          const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(localizacaoUsuario.lat * Math.PI / 180) * Math.cos(cliente.latitude * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          distancia = R * c;
        }
        
        // Determinar prioridade e sugestão
        let prioridade: 'alta' | 'media' | 'atencao' = 'media';
        let sugestao = 'Visita recomendada';
        
        const diasSemComprar = cliente.diasSemComprar || 999;
        const ticketMedio = cliente.ticketMedio || 0;
        
        if (diasSemComprar > 60) {
          prioridade = 'atencao';
          sugestao = 'Cliente que parou de comprar - requer atenção';
        } else if (ticketMedio > 5000 && distancia < 10) {
          prioridade = 'alta';
          sugestao = 'Boa oportunidade para visita hoje';
        } else if (distancia < 5) {
          prioridade = 'alta';
          sugestao = 'Visita rápida com alto potencial';
        } else if (ticketMedio > 3000) {
          prioridade = 'media';
          sugestao = 'Cliente importante na região';
        }
        
        return {
          id: cliente.id,
          nome: cliente.nome_cliente,
          codigo: cliente.codigo_cliente,
          cidade: cliente.cidade,
          estado: cliente.estado,
          latitude: cliente.latitude,
          longitude: cliente.longitude,
          distancia,
          ultimaCompra: cliente.ultimaCompra,
          ticketMedio: cliente.ticketMedio,
          diasSemComprar: cliente.diasSemComprar,
          prioridade,
          sugestao,
          telefone: cliente.telefone,
          email: cliente.email,
          produtoMaisComprado: cliente.produtoMaisComprado,
          produtoParou: cliente.produtoParou,
          reducaoPedidos: cliente.reducaoPedidos,
          compraRegularmente: cliente.compraRegularmente
        };
      });
      
      // Ordenar por compras mais recentes (diasSemComprar crescente)
      // Clientes com compras recentes aparecem primeiro
      clientesProcessados.sort((a, b) => {
        const diasA = a.diasSemComprar || 999;
        const diasB = b.diasSemComprar || 999;
        
        // Primeiro critério: dias sem comprar (menor = mais recente)
        if (diasA !== diasB) {
          return diasA - diasB;
        }
        
        // Segundo critério: proximidade (se mesma data de compra)
        const distA = a.distancia || 999;
        const distB = b.distancia || 999;
        if (distA !== distB) {
          return distA - distB;
        }
        
        // Terceiro critério: ticket médio (maior primeiro)
        const ticketA = a.ticketMedio || 0;
        const ticketB = b.ticketMedio || 0;
        return ticketB - ticketA;
      });
      
      setClientes(clientesProcessados);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDistancia = (distancia: number) => {
    if (distancia < 1) {
      return `${Math.round(distancia * 1000)}m`;
    }
    return `${distancia.toFixed(1)}km`;
  };

  const iniciarRota = (cliente: Cliente) => {
    if (!cliente.latitude || !cliente.longitude) {
      alert('⚠️ Este cliente não possui coordenadas cadastradas');
      return;
    }
    
    // Abrir Google Maps com direções
    const url = `https://www.google.com/maps/dir/?api=1&destination=${cliente.latitude},${cliente.longitude}`;
    window.open(url, '_blank');
  };

  const ligarCliente = (cliente: Cliente) => {
    if (!cliente.telefone) {
      alert('⚠️ Este cliente não possui telefone cadastrado');
      return;
    }
    
    // Formatar telefone removendo caracteres não numéricos
    const telefone = cliente.telefone.replace(/\D/g, '');
    
    // Abrir discador do telefone
    window.location.href = `tel:${telefone}`;
  };

  const enviarWhatsApp = (cliente: Cliente) => {
    if (!cliente.telefone) {
      alert('⚠️ Este cliente não possui telefone cadastrado');
      return;
    }
    
    // Formatar telefone para WhatsApp (remover caracteres não numéricos)
    const telefone = cliente.telefone.replace(/\D/g, '');
    
    // Mensagem padrão
    const mensagem = encodeURIComponent(
      `Olá! Sou vendedor da equipe de vendas. Como vai?`
    );
    
    // Abrir WhatsApp Web ou App
    const url = `https://wa.me/55${telefone}?text=${mensagem}`;
    window.open(url, '_blank');
  };

  /* Função mantida para uso futuro
  const criarPedido = (cliente: Cliente) => {
    // Navegar para criação de pedido com cliente pré-selecionado
    window.location.href = `/vendas/pedidos?cliente=${cliente.codigo}`;
  };
  */
  
  const abrirAgenda = async (cliente: Cliente) => {
    console.log('🔵 FUNÇÃO abrirAgenda CHAMADA para cliente:', cliente.nome);
    
    setClienteSelecionadoAgenda(cliente);
    // Pré-preencher com data de hoje
    const hoje = new Date().toISOString().split('T')[0];
    
    // Iniciar com briefing básico enquanto carrega IA
    const briefingParts: string[] = [];
    
    if (cliente.produtoMaisComprado) {
      briefingParts.push(`✓ Produto favorito: ${cliente.produtoMaisComprado}`);
    }
    
    if (cliente.produtoParou) {
      briefingParts.push(`⚠ Parou de comprar: ${cliente.produtoParou} - investigar motivo`);
    }
    
    if (cliente.reducaoPedidos !== undefined && cliente.reducaoPedidos > 0) {
      briefingParts.push(`📉 Redução de ${cliente.reducaoPedidos}% nos pedidos (últimos 3 meses)`);
    }
    
    if (cliente.compraRegularmente) {
      briefingParts.push(`✅ Cliente ativo e regular`);
    }
    
    const observacaoInicial = briefingParts.length > 0 
      ? `🎯 BRIEFING DA VISITA:\n\n${briefingParts.join('\n')}\n\n---\n⏳ Gerando dicas personalizadas de IA...`
      : '⏳ Gerando dicas personalizadas de IA...';
    
    console.log('📝 Observação inicial definida, abrindo modal...');
    setFormAgenda({
      data: hoje,
      hora: '',
      tipo_atividade: 'visita',
      observacao: observacaoInicial,
    });
    setShowAgendaModal(true);
    console.log('✅ Modal aberto');
    
    // Buscar dicas de IA em background
    try {
      console.log('🤖 Chamando API de IA para cliente:', cliente.nome);
      
      const response = await fetch('/api/ai/briefing-vendas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // IMPORTANTE: Incluir cookies de autenticação
        body: JSON.stringify({
          nome_cliente: cliente.nome,
          dias_ultima_compra: cliente.diasSemComprar,
          ticket_medio: cliente.ticketMedio,
          produto_mais_comprado: cliente.produtoMaisComprado,
          produto_parou: cliente.produtoParou,
          reducao_pedidos: cliente.reducaoPedidos,
          compra_regularmente: cliente.compraRegularmente
        })
      });
      
      console.log('📡 Resposta da API:', response.status);
      const data = await response.json();
      console.log('📦 Dados recebidos:', data);
      
      if (data.success && data.briefing) {
        // Atualizar observação com dicas de IA
        const observacaoComIA = briefingParts.length > 0 
          ? `🎯 BRIEFING DA VISITA:\n\n${briefingParts.join('\n')}\n\n---\n💡 DICA DO GERENTE:\n\n${data.briefing}\n\n---\nObservações adicionais:`
          : `💡 DICA DO GERENTE:\n\n${data.briefing}\n\n---\nObservações adicionais:`;
        
        setFormAgenda(prev => ({
          ...prev,
          observacao: observacaoComIA
        }));
        console.log('✅ Dicas de IA carregadas com sucesso');
      } else {
        console.warn('⚠️ Resposta sem briefing:', data);
        // Manter observação sem IA
        const observacaoSemIA = briefingParts.length > 0 
          ? `🎯 BRIEFING DA VISITA:\n\n${briefingParts.join('\n')}\n\n---\nObservações adicionais:`
          : '';
        
        setFormAgenda(prev => ({
          ...prev,
          observacao: observacaoSemIA
        }));
      }
    } catch (error) {
      console.error('❌ Erro ao buscar dicas de IA:', error);
      // Manter observação sem IA em caso de erro
      const observacaoSemIA = briefingParts.length > 0 
        ? `🎯 BRIEFING DA VISITA:\n\n${briefingParts.join('\n')}\n\n---\nObservações adicionais:`
        : '';
      
      setFormAgenda(prev => ({
        ...prev,
        observacao: observacaoSemIA
      }));
    }
  };
  
  const fecharAgendaModal = () => {
    setShowAgendaModal(false);
    setClienteSelecionadoAgenda(null);
    setFormAgenda({
      data: '',
      hora: '',
      tipo_atividade: 'visita',
      observacao: '',
    });
  };
  
  const handleSubmitAgenda = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clienteSelecionadoAgenda || !user) {
      alert('Erro ao criar compromisso. Tente novamente.');
      return;
    }
    
    try {
      const payload = {
        vendedor_id: user.id,
        cliente_id: clienteSelecionadoAgenda.codigo,
        data: formAgenda.data,
        hora: formAgenda.hora,
        tipo_atividade: formAgenda.tipo_atividade,
        observacao: formAgenda.observacao,
      };
      
      const response = await fetch('/api/agenda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (response.ok) {
        alert('Compromisso agendado com sucesso!');
        fecharAgendaModal();
      } else {
        alert('Erro ao criar compromisso. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao criar compromisso:', error);
      alert('Erro ao criar compromisso. Tente novamente.');
    }
  };

  const getPrioridadeColor = (prioridade: 'alta' | 'media' | 'atencao') => {
    switch (prioridade) {
      case 'alta': return { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/50', icon: '🟢' };
      case 'media': return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/50', icon: '🟡' };
      case 'atencao': return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/50', icon: '🔴' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <Navbar />
        <div className="lg:ml-64 p-6 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-slate-300 text-lg">Carregando rota inteligente...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <Navbar />
      <div className="lg:ml-64 p-4 lg:p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">🗺️ Rota Inteligente do Dia</h1>
          <p className="text-slate-400">Sugestões de visitas baseadas em proximidade e potencial</p>
        </div>

        {/* Erro de Localização */}
        {errorLocalizacao && (
          <div className="mb-6 bg-red-500/10 border border-red-500/50 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-300 font-medium">Erro de Localização</p>
                <p className="text-red-200 text-sm mt-1">{errorLocalizacao}</p>
              </div>
            </div>
          </div>
        )}

        {/* Mapa Interativo */}
        <div className="mb-6 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 border border-slate-700 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <MapPin className="w-5 h-5" />
              <span>Mapa da Região</span>
            </h2>
            <div className="flex items-center space-x-3 text-xs">
              <div className="flex items-center space-x-1">
                <span className="text-lg">🟢</span>
                <span className="text-slate-400">Alta</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-lg">🟡</span>
                <span className="text-slate-400">Média</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-lg">🔴</span>
                <span className="text-slate-400">Atenção</span>
              </div>
            </div>
          </div>
          <div className="aspect-video bg-slate-700 rounded-xl overflow-hidden">
            {localizacaoUsuario ? (
              <RotaMap 
                localizacaoUsuario={localizacaoUsuario}
                clientes={clientes}
                onClienteClick={(cliente) => {
                  // Scroll para o card do cliente
                  const element = document.getElementById(`cliente-${cliente.id}`);
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.classList.add('ring-2', 'ring-blue-500');
                    setTimeout(() => {
                      element.classList.remove('ring-2', 'ring-blue-500');
                    }, 2000);
                  }
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-300">Aguardando localização...</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Lista de Clientes */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white mb-4">Clientes Sugeridos Hoje</h2>
          
          {clientes.length === 0 ? (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-8 border border-slate-700 text-center">
              <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-300">Nenhum cliente disponível para visita</p>
            </div>
          ) : (
            clientes.map((cliente, index) => {
              const colors = getPrioridadeColor(cliente.prioridade);
              
              return (
                <div 
                  key={cliente.id}
                  id={`cliente-${cliente.id}`}
                  className={`bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border-2 ${colors.border} shadow-xl overflow-hidden transition-all duration-300`}
                >
                  <div className="p-4 lg:p-6">
                    {/* Header do Card */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-2xl">{colors.icon}</span>
                          <h3 className="text-lg font-bold text-white">{cliente.nome}</h3>
                        </div>
                        <p className="text-slate-400 text-sm">
                          {cliente.cidade} - {cliente.estado} • Cód: {cliente.codigo}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`${colors.bg} ${colors.text} px-3 py-1 rounded-full text-xs font-bold`}>
                          #{index + 1}
                        </div>
                      </div>
                    </div>

                    {/* Informações Principais */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                      {cliente.distancia !== undefined && cliente.distancia < 999 && (
                        <div>
                          <div className="flex items-center space-x-1 mb-1">
                            <Navigation className="w-3 h-3 text-blue-400" />
                            <span className="text-xs text-slate-400">Distância</span>
                          </div>
                          <p className="text-white font-bold">{formatDistancia(cliente.distancia)}</p>
                        </div>
                      )}
                      
                      {cliente.diasSemComprar !== undefined && cliente.diasSemComprar < 999 && (
                        <div>
                          <div className="flex items-center space-x-1 mb-1">
                            <Clock className="w-3 h-3 text-yellow-400" />
                            <span className="text-xs text-slate-400">Última Compra</span>
                          </div>
                          <p className="text-white font-bold">
                            {cliente.diasSemComprar === 0 ? 'Hoje' : `${cliente.diasSemComprar}d atrás`}
                          </p>
                        </div>
                      )}
                      
                      {cliente.ticketMedio !== undefined && cliente.ticketMedio > 0 && (
                        <div>
                          <div className="flex items-center space-x-1 mb-1">
                            <TrendingUp className="w-3 h-3 text-green-400" />
                            <span className="text-xs text-slate-400">Ticket Médio</span>
                          </div>
                          <p className="text-white font-bold">{formatCurrency(cliente.ticketMedio)}</p>
                        </div>
                      )}
                      
                      {cliente.telefone && (
                        <div>
                          <div className="flex items-center space-x-1 mb-1">
                            <Phone className="w-3 h-3 text-purple-400" />
                            <span className="text-xs text-slate-400">Telefone</span>
                          </div>
                          <p className="text-white font-bold text-sm">{cliente.telefone}</p>
                        </div>
                      )}
                    </div>

                    {/* Sugestão */}
                    <div className={`${colors.bg} rounded-lg p-3 mb-4`}>
                      <p className={`${colors.text} text-sm italic`}>💡 {cliente.sugestao}</p>
                    </div>

                    {/* Briefing Inteligente - O Que Falar com o Cliente */}
                    {(cliente.produtoMaisComprado || cliente.produtoParou || cliente.reducaoPedidos || cliente.compraRegularmente !== undefined) && (
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
                        <p className="text-yellow-400 font-semibold text-xs mb-2">💬 O QUE FALAR COM O CLIENTE:</p>
                        <div className="space-y-1 text-xs text-yellow-300/90">
                          {cliente.produtoMaisComprado && (
                            <p>• <span className="font-semibold">Produto favorito:</span> {cliente.produtoMaisComprado}</p>
                          )}
                          {cliente.produtoParou && (
                            <p>• <span className="font-semibold">Parou de comprar:</span> {cliente.produtoParou}</p>
                          )}
                          {cliente.reducaoPedidos !== undefined && cliente.reducaoPedidos > 0 && (
                            <p>• <span className="font-semibold">Redução de pedidos:</span> {cliente.reducaoPedidos}% nos últimos 3 meses</p>
                          )}
                          {cliente.compraRegularmente && (
                            <p>• <span className="font-semibold">Status:</span> Cliente ativo e regular</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Ações Rápidas */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                      <button
                        onClick={() => iniciarRota(cliente)}
                        disabled={!cliente.latitude || !cliente.longitude}
                        className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-all font-medium text-sm ${
                          cliente.latitude && cliente.longitude
                            ? 'bg-blue-600 hover:bg-blue-700 hover:scale-105 active:scale-95 text-white'
                            : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        <Navigation className="w-4 h-4" />
                        <span>Rota</span>
                      </button>
                      
                      <button
                        onClick={() => ligarCliente(cliente)}
                        disabled={!cliente.telefone}
                        className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-all font-medium text-sm ${
                          cliente.telefone
                            ? 'bg-green-600 hover:bg-green-700 hover:scale-105 active:scale-95 text-white'
                            : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        <Phone className="w-4 h-4" />
                        <span>Ligar</span>
                      </button>
                      
                      <button
                        onClick={() => enviarWhatsApp(cliente)}
                        disabled={!cliente.telefone}
                        className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-all font-medium text-sm ${
                          cliente.telefone
                            ? 'bg-emerald-600 hover:bg-emerald-700 hover:scale-105 active:scale-95 text-white'
                            : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>WhatsApp</span>
                      </button>
                      
                      {/* Botão Pedido - OCULTO mas código mantido para uso futuro
                      <button
                        onClick={() => criarPedido(cliente)}
                        className="flex items-center justify-center space-x-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 hover:scale-105 active:scale-95 text-white rounded-lg transition-all font-medium text-sm"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        <span>Pedido</span>
                      </button>
                      */}
                      
                      {/* Botão Agenda - NOVO */}
                      <button
                        onClick={() => abrirAgenda(cliente)}
                        className="flex items-center justify-center space-x-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 hover:scale-105 active:scale-95 text-white rounded-lg transition-all font-medium text-sm"
                      >
                        <Calendar className="w-4 h-4" />
                        <span>Agenda</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal de Agendamento */}
        {showAgendaModal && clienteSelecionadoAgenda && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-slate-700 shadow-2xl max-w-md w-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-700">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
                    <Calendar className="w-6 h-6" />
                    <span>Novo Compromisso</span>
                  </h2>
                  <p className="text-green-400 font-bold mt-1">{clienteSelecionadoAgenda.nome}</p>
                  {clienteSelecionadoAgenda.cidade && clienteSelecionadoAgenda.estado && (
                    <p className="text-slate-500 text-sm">
                      {clienteSelecionadoAgenda.cidade}/{clienteSelecionadoAgenda.estado}
                    </p>
                  )}
                </div>
                <button
                  onClick={fecharAgendaModal}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmitAgenda} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Data *
                  </label>
                  <input
                    type="date"
                    value={formAgenda.data}
                    onChange={(e) => setFormAgenda({ ...formAgenda, data: e.target.value })}
                    required
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Horário *
                  </label>
                  <input
                    type="time"
                    value={formAgenda.hora}
                    onChange={(e) => setFormAgenda({ ...formAgenda, hora: e.target.value })}
                    required
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Tipo de Atividade *
                  </label>
                  <select
                    value={formAgenda.tipo_atividade}
                    onChange={(e) => setFormAgenda({ ...formAgenda, tipo_atividade: e.target.value })}
                    required
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="visita">Visita</option>
                    <option value="follow-up">Follow-up</option>
                    <option value="entrega">Entrega de Material</option>
                    <option value="reuniao">Reunião</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Observação
                  </label>
                  <textarea
                    value={formAgenda.observacao}
                    onChange={(e) => setFormAgenda({ ...formAgenda, observacao: e.target.value })}
                    rows={3}
                    placeholder="Detalhes do compromisso..."
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={fecharAgendaModal}
                    className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white rounded-lg transition-all font-medium shadow-lg"
                  >
                    Agendar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
