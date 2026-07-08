# Ponto de Restauração 18 - Sistema Completo

**Data:** 25 de novembro de 2025 - 12:04 UTC  
**Versão:** VetSalesPro v1.18  
**Status:** Sistema operacional com cálculos de meta baseados em dados reais

## Resumo das Funcionalidades

Sistema completo de gestão de vendas para medicamentos veterinários com:

- **Dashboard Executivo**: KPIs, gráficos de evolução, análise por negócio
- **Gestão de Vendas**: Visualização por cliente/produto e produto/cliente
- **Sistema de Pedidos**: Criação, edição, confirmação e lista de pedidos
- **Forecast & Budget**: Previsões e metas orçamentárias
- **Agenda de Vendedores**: Gerenciamento de visitas e atividades
- **Importação de Dados**: CSV para vendas, forecast, budget, estoque, etc.
- **Controle de Acesso**: Administrador, Gerente, Operador e Representante
- **Email Automático**: Envio de pedidos via Resend

## Schema do Banco de Dados

```sql
-- Usuários
CREATE TABLE usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mocha_user_id TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  cargo TEXT,
  nivel_acesso TEXT NOT NULL DEFAULT 'Representante',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  unidade_negocio TEXT,
  vendedor TEXT
);

-- Produtos
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

-- Estoque
CREATE TABLE estoque (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo_produto TEXT NOT NULL,
  quantidade_estoque INTEGER DEFAULT 0,
  local_armazenamento TEXT,
  estoque_minimo INTEGER DEFAULT 10,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Vendas
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
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  nome_cliente TEXT,
  negocio TEXT
);

-- Previsão de Vendas
CREATE TABLE previsao_vendas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mes INTEGER NOT NULL,
  ano INTEGER NOT NULL,
  codigo_produto TEXT NOT NULL,
  nome_produto TEXT NOT NULL,
  quantidade_prevista INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  preco_previsto REAL,
  negocio TEXT
);

-- Solicitações de Acesso
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

-- Budget (Metas)
CREATE TABLE budget (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  negocio TEXT NOT NULL,
  vendedor TEXT NOT NULL,
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
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  nome_vendedor TEXT,
  regional TEXT
);

-- Inventário (Estoque por Lote)
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

-- Tabela de Preços
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

-- Pedidos
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
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  condicoes_pagamento TEXT,
  comprador TEXT,
  telefone TEXT
);

-- Itens do Pedido
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

-- Clientes
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
  ativo BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  categoria TEXT,
  negocio TEXT
);

-- Destinatários de Pedidos
CREATE TABLE pedido_recipients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  ativo BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Agenda
CREATE TABLE agenda (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vendedor_id TEXT NOT NULL,
  cliente_id TEXT,
  data DATE NOT NULL,
  hora TEXT NOT NULL,
  tipo_atividade TEXT NOT NULL,
  observacao TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  mensagem_gerente TEXT,
  status_visita TEXT,
  motivo_cancelamento TEXT
);

-- Configuração de Menu
CREATE TABLE menu_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  menu_key TEXT NOT NULL UNIQUE,
  menu_label TEXT NOT NULL,
  is_visible BOOLEAN DEFAULT 1,
  parent_key TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Vendedores
CREATE TABLE vendedores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vendedor TEXT NOT NULL UNIQUE,
  nome_vendedor TEXT NOT NULL,
  regional TEXT,
  negocio TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Secrets Configurados

1. **EMAIL_PEDIDOS**: Email para envio de pedidos (configurado)
2. **RESEND_API_KEY**: Chave API do Resend para envio de emails (configurado)
3. **MOCHA_USERS_SERVICE_API_KEY**: Chave para autenticação (configurado)
4. **MOCHA_USERS_SERVICE_API_URL**: URL do serviço de usuários (configurado)

## Estrutura de Arquivos

### Frontend (React + TypeScript)

**Páginas Principais:**
- `src/react-app/pages/Dashboard.tsx` - Dashboard executivo
- `src/react-app/pages/Vendas.tsx` - Gestão de vendas
- `src/react-app/pages/NovoPedido.tsx` - Criação de pedidos
- `src/react-app/pages/ListaPedidos.tsx` - Lista de pedidos
- `src/react-app/pages/ConfirmarPedido.tsx` - Confirmação de pedidos
- `src/react-app/pages/EditarPedido.tsx` - Edição de pedidos
- `src/react-app/pages/Forecast.tsx` - Previsões
- `src/react-app/pages/Budget.tsx` - Orçamento/Metas
- `src/react-app/pages/Agenda.tsx` - Agenda de vendedores
- `src/react-app/pages/Importacao.tsx` - Importação de dados
- `src/react-app/pages/Usuarios.tsx` - Gestão de usuários
- `src/react-app/pages/Produtos.tsx` - Gestão de produtos
- `src/react-app/pages/Config.tsx` - Configurações

**Componentes:**
- `src/react-app/components/Navbar.tsx` - Barra de navegação
- `src/react-app/components/RoleProtectedRoute.tsx` - Proteção de rotas
- `src/react-app/components/KPICard.tsx` - Card de KPI
- `src/react-app/components/GaugeChart.tsx` - Gráfico gauge
- `src/react-app/components/BrazilMap.tsx` - Mapa do Brasil

**Hooks:**
- `src/react-app/hooks/useDashboard.ts` - Dashboard data
- `src/react-app/hooks/useVendas.ts` - Vendas data
- `src/react-app/hooks/usePedidos.ts` - Pedidos data
- `src/react-app/hooks/useForecast.ts` - Forecast data
- `src/react-app/hooks/useEficiencia.ts` - Eficiência data
- `src/react-app/hooks/useProdutos.ts` - Produtos data
- `src/react-app/hooks/useAgenda.ts` - Agenda data

### Backend (Hono + Cloudflare Workers)

**Arquivo Principal:**
- `src/worker/index.ts` - API routes e lógica de negócio

**Utilitários:**
- `src/worker/generate-prd-docx.ts` - Geração de PRD em DOCX
- `src/worker/debug-kpis.ts` - Debug de KPIs

**Tipos Compartilhados:**
- `src/shared/types.ts` - Schemas Zod e TypeScript types

### Configuração

**Arquivos de Configuração (Locked):**
- `package.json` - Dependências do projeto
- `tsconfig.json` - Configuração TypeScript
- `tailwind.config.js` - Configuração Tailwind
- `vite.config.ts` - Configuração Vite
- `wrangler.json` - Configuração Cloudflare

## Funcionalidades Principais

### 1. Autenticação e Autorização
- Login via Google OAuth
- 4 níveis de acesso: Administrador, Gerente, Operador, Representante
- Proteção de rotas por nível de acesso
- Solicitação de acesso para novos usuários

### 2. Dashboard Executivo
- KPIs principais: Total vendas YTD, Meta, Saldo, Evolução
- Comparação com ano anterior (YTD e mensal)
- Gráficos de rosca para evolução percentual
- Gráfico de linha: evolução 12 meses móveis
- Filtros por negócio, vendedor e data
- **IMPORTANTE**: Mês de referência sempre baseado nos dados reais (mesAtualDados), nunca na data atual do sistema
- Meta calculada dinamicamente baseada na tabela budget

### 3. Gestão de Vendas
- 2 modos de visualização:
  - Cliente → Produtos (expandível)
  - Produto → Clientes (expandível)
- Valores mensais por período
- Filtros primários: negócio, vendedor, datas
- Filtros secundários: região, produto, cliente
- Busca por texto
- Cards com KPIs (igual dashboard)
- Vendedores veem apenas seus próprios dados

### 4. Sistema de Pedidos
- Criação de pedidos com seleção de:
  - Cliente
  - Produtos (com lotes e validade)
  - Quantidade
  - Desconto (com validação de política)
- Confirmação antes de envio
- Edição de pedidos pendentes
- Lista de todos os pedidos
- Geração automática de PDF
- Envio por email para destinatários configurados
- Alerta para descontos fora da política

### 5. Forecast e Budget
- Previsões de vendas por produto/mês
- Definição de metas mensais por vendedor/negócio
- Relatórios de forecast vs realizado
- Importação via CSV

### 6. Importação de Dados
- Suporte para múltiplos tipos de CSV:
  - Vendas
  - Forecast
  - Budget
  - Inventory
  - Price Table
  - Clientes
  - Vendedores
  - Estoque
- Parser robusto com detecção automática de separador
- Batch processing para performance
- Validação de dados

### 7. Agenda de Vendedores
- Criação de compromissos
- Tipos de atividade
- Associação com clientes
- Status de visita
- Mensagens do gerente
- Filtro por vendedor (para gerentes)
- Vendedores veem apenas sua própria agenda

## Regras de Negócio Importantes

### Cálculo de Meta
1. Meta YTD: soma de jan_25 até o mês atual (baseado em mesAtualDados)
2. Meta Mensal: valor do mês específico na tabela budget
3. Filtros de negócio e representante aplicados
4. **NUNCA usar mês atual do sistema - sempre usar dados reais da base**

### Período de Referência
- Sem filtros de data: usa período YTD baseado em `mesAtualDados` e `anoAtualDados`
- Com filtros de data: usa o período especificado
- Sempre compara com mesmo período do ano anterior
- Outubro (mês 10) é o limite máximo atual dos dados consolidados

### Níveis de Acesso
- **Administrador**: Acesso total
- **Gerente**: Acesso total exceto gestão de usuários
- **Operador**: Importação, usuários, recebimento de pedidos, PRD
- **Representante**: Vendas próprias, agenda própria, criação de pedidos

### Importação de Vendas
- Preserva dados históricos
- Limpa apenas o mês mais recente do arquivo importado
- Atualiza/cria produtos automaticamente
- Associa negócio aos produtos via tabela vendedores

## Assets Disponíveis

- Logo: `https://mocha-cdn.com/.../logo-sales-manager.png`
- Logo Daxtellk: `https://mocha-cdn.com/.../Daxtellk-Logomarca.png`
- Diversos screenshots e documentos de erro para referência

## Endpoints da API

### Auth
- `GET /api/oauth/google/redirect_url`
- `POST /api/sessions`
- `GET /api/users/me`
- `GET /api/logout`

### Dashboard
- `GET /api/dashboard/kpis?negocio=&representante=&dataInicio=&dataFim=`

### Vendas
- `GET /api/vendas?[filtros]`
- `POST /api/vendas`
- `GET /api/vendas/meta?tipo=ytd|mensal&negocio=&representante=&dataInicio=&dataFim=`

### Pedidos
- `GET /api/orders`
- `POST /api/orders`
- `PUT /api/orders/:id`

### Outros
- `GET /api/forecast`
- `POST /api/forecast`
- `GET /api/budget`
- `POST /api/budget/representantes?negocio=`
- `GET /api/clientes`
- `GET /api/inventory`
- `GET /api/price-table`
- `GET /api/agenda`
- `POST /api/agenda`
- `POST /api/import`
- `GET /api/usuarios`
- `POST /api/usuarios`

## Tecnologias Utilizadas

**Frontend:**
- React 18
- TypeScript
- React Router v7
- Tailwind CSS
- Recharts (gráficos)
- Lucide React (ícones)
- Zod (validação)
- Mocha Users Service (auth)

**Backend:**
- Hono (framework)
- Cloudflare Workers
- Cloudflare D1 (SQLite)
- Resend (email)
- jsPDF (geração de PDF)

**Build & Deploy:**
- Vite
- Wrangler
- NPM

## Notas Importantes

1. **Mês de Referência**: SEMPRE usar `kpis.mesAtualDados` e `kpis.anoAtualDados`, NUNCA a data atual do sistema
2. **Meta**: Calculada dinamicamente da tabela budget, com limite em outubro para dados consolidados
3. **Filtros de Vendedores**: Representantes têm filtros fixos (não podem alterar negócio/vendedor)
4. **Importação**: Usa batch processing para performance com grandes volumes
5. **Email**: Requer RESEND_API_KEY configurado para envio de pedidos
6. **PDF**: Gerado no backend usando jsPDF com formatação brasileira

## Próximos Passos Planejados

- Implementar detecção automática do último mês com vendas na base
- Expandir relatórios de eficiência de vendedores
- Adicionar mais gráficos analíticos
- Melhorar performance de queries grandes
- Adicionar cache para KPIs

---

**Data de Criação do Ponto:** 2025-11-25 12:04 UTC  
**Criado por:** Sistema Mocha AI  
**Status:** Operacional e Testado
