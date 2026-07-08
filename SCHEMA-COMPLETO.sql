-- VetSalesPro - Schema Completo do Banco de Dados
-- Database: SQLite (Cloudflare D1)
-- Gerado em: 2025-11-25

-- ============================================
-- TABELA: usuarios
-- Descrição: Armazena informações dos usuários do sistema
-- ============================================
CREATE TABLE usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mocha_user_id TEXT NOT NULL UNIQUE,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    cargo TEXT,
    nivel_acesso TEXT NOT NULL DEFAULT 'Representante',
    unidade_negocio TEXT,
    vendedor TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABELA: produtos
-- Descrição: Catálogo de produtos disponíveis
-- ============================================
CREATE TABLE produtos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo_produto TEXT NOT NULL UNIQUE,
    nome_produto TEXT NOT NULL,
    categoria TEXT,
    preco_unitario REAL,
    unidade_medida TEXT,
    fabricante TEXT,
    status TEXT DEFAULT 'Ativo',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABELA: estoque
-- Descrição: Controle de estoque dos produtos
-- ============================================
CREATE TABLE estoque (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo_produto TEXT NOT NULL,
    quantidade_estoque INTEGER DEFAULT 0,
    local_armazenamento TEXT,
    estoque_minimo INTEGER DEFAULT 10,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABELA: vendas
-- Descrição: Registro histórico de vendas realizadas
-- ============================================
CREATE TABLE vendas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data_venda DATE NOT NULL,
    codigo_produto TEXT NOT NULL,
    nome_produto TEXT NOT NULL,
    quantidade INTEGER NOT NULL,
    valor_unitario REAL NOT NULL,
    valor_total REAL NOT NULL,
    representante TEXT,
    regiao TEXT,
    cliente TEXT,
    nome_cliente TEXT,
    negocio TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABELA: previsao_vendas
-- Descrição: Previsões de vendas futuras (forecast)
-- ============================================
CREATE TABLE previsao_vendas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mes INTEGER NOT NULL,
    ano INTEGER NOT NULL,
    codigo_produto TEXT NOT NULL,
    nome_produto TEXT NOT NULL,
    quantidade_prevista INTEGER NOT NULL,
    preco_previsto REAL,
    negocio TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABELA: solicitacoes_acesso
-- Descrição: Solicitações de acesso de novos usuários
-- ============================================
CREATE TABLE solicitacoes_acesso (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    nome TEXT NOT NULL,
    cargo TEXT,
    departamento TEXT,
    justificativa TEXT NOT NULL,
    status TEXT DEFAULT 'Pendente',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABELA: budget
-- Descrição: Metas/orçamentos mensais por vendedor e negócio
-- ============================================
CREATE TABLE budget (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    negocio TEXT NOT NULL,
    vendedor TEXT NOT NULL,
    nome_vendedor TEXT,
    regional TEXT,
    jan_25 REAL DEFAULT 0,
    fev_25 REAL DEFAULT 0,
    mar_25 REAL DEFAULT 0,
    abr_25 REAL DEFAULT 0,
    mai_25 REAL DEFAULT 0,
    jun_25 REAL DEFAULT 0,
    jul_25 REAL DEFAULT 0,
    ago_25 REAL DEFAULT 0,
    set_25 REAL DEFAULT 0,
    out_25 REAL DEFAULT 0,
    nov_25 REAL DEFAULT 0,
    dez_25 REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABELA: inventory
-- Descrição: Inventário detalhado com lotes e validades
-- ============================================
CREATE TABLE inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    lote TEXT,
    validade DATE,
    quantidade_disponivel INTEGER DEFAULT 0,
    unidade_medida TEXT,
    armazem TEXT,
    data_atualizacao DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABELA: price_table
-- Descrição: Tabela de preços e políticas de desconto
-- ============================================
CREATE TABLE price_table (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id TEXT NOT NULL UNIQUE,
    product_name TEXT NOT NULL,
    preco_base REAL NOT NULL,
    preco_minimo REAL NOT NULL,
    max_desconto_permitido REAL DEFAULT 0.11,
    politica_preco TEXT DEFAULT 'padrão',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABELA: orders
-- Descrição: Cabeçalho dos pedidos de venda
-- ============================================
CREATE TABLE orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero_pedido TEXT NOT NULL UNIQUE,
    vendedor_id TEXT NOT NULL,
    vendedor_nome TEXT NOT NULL,
    cliente_id TEXT NOT NULL,
    cliente_nome TEXT NOT NULL,
    data_pedido DATETIME NOT NULL,
    valor_total REAL NOT NULL,
    status TEXT DEFAULT 'pendente',
    tem_desconto_fora_politica BOOLEAN DEFAULT 0,
    observacoes TEXT,
    condicoes_pagamento TEXT,
    comprador TEXT,
    telefone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABELA: order_items
-- Descrição: Itens/produtos de cada pedido
-- ============================================
CREATE TABLE order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    lote TEXT,
    validade DATE,
    quantidade INTEGER NOT NULL,
    preco_unitario REAL NOT NULL,
    percentual_desconto REAL DEFAULT 0,
    valor_desconto REAL DEFAULT 0,
    valor_total REAL NOT NULL,
    fora_politica BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABELA: clientes
-- Descrição: Cadastro de clientes
-- ============================================
CREATE TABLE clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo_cliente TEXT NOT NULL UNIQUE,
    nome_cliente TEXT NOT NULL,
    cnpj TEXT,
    email TEXT,
    telefone TEXT,
    endereco TEXT,
    cidade TEXT,
    estado TEXT,
    categoria TEXT,
    negocio TEXT,
    ativo BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABELA: pedido_recipients
-- Descrição: Lista de destinatários de emails de pedidos
-- ============================================
CREATE TABLE pedido_recipients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT NOT NULL,
    ativo BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABELA: agenda
-- Descrição: Agenda de visitas e atividades dos vendedores
-- ============================================
CREATE TABLE agenda (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vendedor_id TEXT NOT NULL,
    cliente_id TEXT,
    data DATE NOT NULL,
    hora TEXT NOT NULL,
    tipo_atividade TEXT NOT NULL,
    observacao TEXT,
    mensagem_gerente TEXT,
    status_visita TEXT,
    motivo_cancelamento TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABELA: menu_config
-- Descrição: Configuração de visibilidade de menus
-- ============================================
CREATE TABLE menu_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    menu_key TEXT NOT NULL UNIQUE,
    menu_label TEXT NOT NULL,
    is_visible BOOLEAN DEFAULT 1,
    parent_key TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABELA: vendedores
-- Descrição: Cadastro de vendedores e suas regionais
-- ============================================
CREATE TABLE vendedores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vendedor TEXT NOT NULL UNIQUE,
    nome_vendedor TEXT NOT NULL,
    regional TEXT,
    negocio TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ÍNDICES (Se necessário, adicionar conforme performance)
-- ============================================
-- Exemplo:
-- CREATE INDEX idx_vendas_data ON vendas(data_venda);
-- CREATE INDEX idx_orders_status ON orders(status);
-- CREATE INDEX idx_clientes_ativo ON clientes(ativo);
