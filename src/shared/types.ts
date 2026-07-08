export interface DashboardKPIs {
  totalVendas: number;
  totalVendasAnoAnterior: number;
  totalVendas2024: number;
  totalVendas2025: number;
  totalVendasMes: number;
  totalVendasMesAnoAnterior: number;
  totalVendasMes2024: number;
  totalVendasMes2025: number;
  totalVendasEvolucao: number;
  totalVendasMesEvolucao: number;
  margemMedia: number;
  acuraciaPrevisao: number;
  ticketMedio: number;
  mesAtualDados: number;
  anoAtualDados: number;
  mesAnoAnteriorDados: number;
  metaYTD?: number;
  metaMensal?: number;
  vendasParaMeta?: number;
  vendasMensalParaMeta?: number;
  produtosMaisVendidos: any[];
  estoqueCritico: any[];
  vendasPorMes: any[];
  vendasPorRegiao: any[];
  rankingRepresentantes: any[];
  vendasPorNegocio: any[];
  vendasMensaisPorNegocio: any[];
}

export interface Venda {
  id: number;
  data_venda: string;
  codigo_produto: string;
  nome_produto: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  representante?: string;
  regiao?: string;
  cliente?: string;
  nome_cliente?: string;
  negocio?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Produto {
  id: number;
  codigo_produto: string;
  nome_produto: string;
  categoria?: string;
  preco_unitario?: number;
  unidade_medida?: string;
  fabricante?: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface Cliente {
  id: number;
  codigo_cliente: string;
  nome_cliente: string;
  cnpj?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  categoria?: string;
  negocio?: string;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Inventory {
  id: number;
  product_id: string;
  product_name: string;
  lote?: string;
  validade?: string;
  quantidade_disponivel: number;
  unidade_medida?: string;
  armazem?: string;
  data_atualizacao?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PriceTable {
  id: number;
  product_id: string;
  product_name: string;
  preco_base: number;
  preco_minimo: number;
  max_desconto_permitido: number;
  politica_preco: string;
  created_at?: string;
  updated_at?: string;
}

export interface OrderItem {
  id?: number;
  order_id?: number;
  product_id: string;
  product_name: string;
  lote?: string;
  validade?: string;
  quantidade: number;
  preco_unitario: number;
  percentual_desconto: number;
  valor_desconto: number;
  valor_total: number;
  fora_politica: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Order {
  id?: number;
  numero_pedido?: string;
  vendedor_id: string;
  vendedor_nome: string;
  cliente_id: string;
  cliente_nome: string;
  data_pedido: string;
  valor_total: number;
  status: string;
  tem_desconto_fora_politica: boolean;
  observacoes?: string;
  condicoes_pagamento?: string;
  comprador?: string;
  telefone?: string;
  xml_enviado?: boolean;
  xml_enviado_em?: string;
  items?: OrderItem[];
  created_at?: string;
  updated_at?: string;
}

export interface Agenda {
  id: number;
  vendedor_id: string;
  cliente_id?: string;
  data: string;
  hora: string;
  hora_termino?: string;
  tipo_atividade: string;
  observacao?: string;
  mensagem_gerente?: string;
  status_visita?: string;
  motivo_cancelamento?: string;
  titulo?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AgendaWithCliente extends Agenda {
  nome_cliente?: string;
  cidade?: string;
  estado?: string;
  vendedor_nome?: string;
}
