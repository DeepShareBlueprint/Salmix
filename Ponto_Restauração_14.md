# Ponto de Restauração #14 - SalesManager
**Data:** 17 de Novembro de 2025  
**Status:** Sistema completo e funcional  
**URL Produção:** https://vetsalespro.mocha.app

---

## 📋 VISÃO GERAL DO SISTEMA

### Informações Básicas
- **Nome:** SalesManager
- **Descrição:** Sistema de Gestão de Vendas de Medicamentos Veterinários
- **Logo:** https://mocha-cdn.com/019a55e0-b253-7447-911b-2276e1caf514/Icone-SalesManager2.jpeg
- **Copyright:** © 2025 Daxtellk Systems

### Stack Tecnológico
- **Frontend:** React 18 + TypeScript + Vite
- **Routing:** React Router v7
- **Styling:** Tailwind CSS
- **Backend:** Cloudflare Workers + Hono
- **Database:** Cloudflare D1 (SQLite)
- **Authentication:** Mocha Users Service (OAuth Google)
- **Charts:** Recharts
- **Icons:** Lucide React
- **Validation:** Zod

---

## 🗄️ ESQUEMA DO BANCO DE DADOS

### 1. Tabela: usuarios
```sql
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
```
**Níveis de Acesso:**
- Administrador (acesso total)
- Gerente (acesso total)
- Operador (apenas submenu Operador)
- Representante (apenas Gestão de Vendas)

### 2. Tabela: produtos
```sql
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
```

### 3. Tabela: estoque
```sql
CREATE TABLE estoque (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo_produto TEXT NOT NULL,
  quantidade_estoque INTEGER DEFAULT 0,
  local_armazenamento TEXT,
  estoque_minimo INTEGER DEFAULT 10,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 4. Tabela: vendas
```sql
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
```

### 5. Tabela: previsao_vendas
```sql
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
```

### 6. Tabela: solicitacoes_acesso
```sql
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
```

### 7. Tabela: budget
```sql
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
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 📁 ESTRUTURA DE ARQUIVOS

### Arquivos Principais (Locked)
```
package.json                 # Dependências NPM
tsconfig.json               # Configuração TypeScript
vite.config.ts             # Configuração Vite
wrangler.json              # Configuração Cloudflare Workers
tailwind.config.js         # Configuração Tailwind CSS
postcss.config.js          # Configuração PostCSS
```

### Frontend (React)
```
src/react-app/
├── App.tsx                           # Rotas e autenticação
├── main.tsx                          # Entry point
├── index.css                         # Estilos globais
├── vite-env.d.ts                     # Definições TypeScript
├── components/
│   ├── Navbar.tsx                    # Menu lateral com níveis de acesso
│   ├── KPICard.tsx                   # Card de KPI reutilizável
│   ├── GaugeChart.tsx                # Gráfico de gauge
│   └── BrazilMap.tsx                 # Mapa do Brasil
├── pages/
│   ├── Home.tsx                      # Landing page
│   ├── Login.tsx                     # Tela de login OAuth
│   ├── AuthCallback.tsx              # Callback OAuth
│   ├── AccessRequest.tsx             # Solicitação de acesso
│   ├── Dashboard.tsx                 # Dashboard executivo
│   ├── Produtos.tsx                  # Gestão de produtos
│   ├── Vendas.tsx                    # Gestão de vendas
│   ├── EficienciaVendedor.tsx        # Eficiência por vendedor
│   ├── Forecast.tsx                  # Previsões (hidden)
│   ├── ForecastRelatorios.tsx        # Relatórios de forecast
│   ├── Budget.tsx                    # Gestão de budget
│   ├── Estoque.tsx                   # Gestão de estoque (hidden)
│   ├── Importacao.tsx                # Importação de dados
│   ├── Representantes.tsx            # Gestão de representantes (hidden)
│   ├── Usuarios.tsx                  # Gestão de usuários
│   ├── Relatorios.tsx                # Relatórios de vendas
│   └── PRD.tsx                       # Product Requirements Document
└── hooks/
    ├── useDashboard.ts               # Hook para dados do dashboard
    ├── useVendas.ts                  # Hook para vendas
    ├── useForecast.ts                # Hook para forecast
    ├── useProdutos.ts                # Hook para produtos
    └── useEficiencia.ts              # Hook para eficiência
```

### Backend (Worker)
```
src/worker/
└── index.ts                          # API Hono com todos os endpoints
```

### Shared
```
src/shared/
└── types.ts                          # Schemas Zod e TypeScript types
```

### Documentação
```
Ponto_Restauração_01.md até 14.md    # Pontos de restauração
```

---

## 🔌 ENDPOINTS DA API

### Autenticação
- `GET /api/oauth/google/redirect_url` - URL de redirecionamento OAuth
- `POST /api/sessions` - Trocar código por sessão
- `GET /api/users/me` - Dados do usuário logado
- `GET /api/logout` - Encerrar sessão

### Dashboard
- `GET /api/dashboard/kpis` - KPIs principais com filtros
  - Query params: negocio, representante, dataInicio, dataFim

### Vendas
- `GET /api/vendas` - Listar vendas (max 1000)
- `POST /api/vendas` - Criar venda
- `GET /api/vendas/meta` - Calcular meta YTD ou mensal
  - Query params: negocio, representante, dataInicio, dataFim, tipo

### Produtos
- `GET /api/produtos` - Listar produtos
- `GET /api/produtos/:id` - Obter produto
- `POST /api/produtos` - Criar produto
- `PUT /api/produtos/:id` - Atualizar produto
- `DELETE /api/produtos/:id` - Deletar produto

### Estoque
- `GET /api/estoque` - Listar estoque
- `POST /api/estoque` - Criar item estoque
- `PUT /api/estoque/:id` - Atualizar estoque

### Budget
- `GET /api/budget` - Listar budget
  - Query params: negocio, vendedor
- `GET /api/budget/representantes` - Listar representantes
  - Query params: negocio

### Forecast
- `GET /api/forecast` - Listar previsões
- `GET /api/forecast/kpis` - KPIs de forecast
  - Query params: periodo (YYYY-MM)
- `POST /api/forecast` - Criar previsão
- `PUT /api/forecast/:id` - Atualizar previsão
- `DELETE /api/forecast/:id` - Deletar previsão

### Usuários
- `GET /api/usuarios` - Listar usuários
  - Query params: email
- `GET /api/usuarios/:id` - Obter usuário
- `POST /api/usuarios` - Criar usuário
- `PUT /api/usuarios/:id` - Atualizar usuário
- `DELETE /api/usuarios/:id` - Deletar usuário

### Solicitações de Acesso
- `GET /api/access-requests` - Listar solicitações
- `POST /api/access-requests` - Criar solicitação
- `PUT /api/access-requests/:id/approve` - Aprovar solicitação
- `PUT /api/access-requests/:id/reject` - Rejeitar solicitação

### Importação
- `POST /api/import` - Importar CSV
  - Form data: file (CSV), type (vendas|forecast|budget|estoque)
- `DELETE /api/data/clear` - Limpar dados importados

---

## 🎨 FUNCIONALIDADES PRINCIPAIS

### 1. Dashboard Executivo
**Recursos:**
- Filtros dinâmicos (Negócio, Vendedor, Data Início, Data Fim)
- 8 KPI cards principais:
  - Valor Ano Anterior YTD
  - Valor Ano Atual YTD
  - Meta YTD
  - Saldo da Meta YTD
  - Valor Mês Ano Anterior
  - Valor Mês Ano Atual
  - Meta Mensal
  - Saldo da Meta Mensal
- 4 Gráficos de rosca mini:
  - Evolução YTD (%)
  - Evolução Mensal (%)
  - % Saldo Meta YTD
  - % Saldo Meta Mensal
- Gráfico de linha: Evolução 12 meses móveis
  - Linha 2024 (azul)
  - Linha 2025 (verde)
  - Linha Meta (laranja tracejada)
- Tabela de dados com valores e variações

**Cálculos Especiais:**
- Metas seguem os mesmos filtros de negócio e representante
- YTD calculado do início do ano até o mês atual
- Variações percentuais comparando períodos correspondentes

### 2. Gestão de Vendas
- Filtros avançados (datas, vendedor, produto, cliente, negócio, valores)
- Tabela paginada com todas as vendas
- Exportação para CSV
- Criação manual de vendas

### 3. Eficiência por Vendedor
- Cálculo de IER (Índice de Eficiência Relativa)
- Comparação com média da equipe
- Rankings e estatísticas

### 4. Forecast
- Previsões mensais por produto
- Comparação previsto vs realizado
- Relatórios de acurácia

### 5. Budget
- Metas mensais por vendedor e negócio
- 12 colunas (Jan-Dez 2025)
- Importação via CSV

### 6. Importação de Dados
**Tipos suportados:**
- Vendas (CSV com colunas específicas)
- Forecast (previsões mensais)
- Budget (metas anuais)
- Estoque (quantidades e mínimos)

**Proteção de Dados:**
- Vendas: preserva histórico, limpa apenas último mês
- Produtos: nunca deletados, apenas atualizados
- Forecast/Budget/Estoque: limpeza total antes de importar

**Otimizações:**
- Parsing robusto de CSV (detecta separador)
- Batch processing (50 registros por vez)
- Cache de produtos para reduzir queries
- Validação de formatos brasileiros (datas, moedas)

### 7. Controle de Acesso
**4 Níveis:**
1. **Administrador/Gerente:** Acesso total
2. **Operador:** Apenas Importação, Usuários, PRD
3. **Representante:** Apenas Gestão de Vendas

**Fluxo de Solicitação:**
- Usuário solicita acesso via formulário público
- Operadores/Admins recebem notificação
- Aprovação cria usuário com nível definido
- Primeiro login atualiza mocha_user_id temporário

---

## 🎯 REGRAS DE NEGÓCIO

### Cálculo de Metas
1. **Meta YTD:** Soma dos meses Jan até mês atual do budget
2. **Meta Mensal:** Valor do mês atual do budget
3. **Filtros aplicados:** Meta calculada apenas para negócio/vendedor selecionado
4. **Saldo da Meta:** 
   - < 50%: vermelho
   - 51-90%: amarelo
   - > 90%: roxo

### Proteção de Dados Históricos
- Importação de vendas só sobrescreve o mês mais recente
- Meses anteriores permanecem intactos
- Produtos históricos preservados mesmo em novas importações

### Evolução Percentual
- Sempre compara com período equivalente ano anterior
- YTD: Jan-Nov 2025 vs Jan-Nov 2024
- Mensal: Nov 2025 vs Nov 2024

### Validações
- Produtos: código único obrigatório
- Vendas: data, produto, quantidade, valores obrigatórios
- Forecast: mês 1-12, ano >= 2000
- Budget: negócio e vendedor obrigatórios

---

## 🔒 SECRETS CONFIGURADOS

```
MOCHA_USERS_SERVICE_API_KEY=<configurado>
MOCHA_USERS_SERVICE_API_URL=<configurado>
```

---

## 📊 ASSETS UTILIZADOS

### Imagens
- Logo: Icone-SalesManager2.jpeg
- Diversos screenshots de erros e funcionalidades

### Dados de Teste
- Dados-Gerais.csv (arquivo de exemplo)

### Documentação
- PRDs e especificações técnicas
- Error reports para debugging

---

## 🎨 DESIGN SYSTEM

### Cores Principais
- Background: Gradient slate-950 → slate-900 → slate-950
- Primary: Blue-500 (#3b82f6)
- Success: Green-500 (#10b981)
- Warning: Yellow-500 (#f59e0b)
- Danger: Red-500 (#ef4444)
- Purple: Purple-500 (#8b5cf6)

### Tipografia
- Font Family: System fonts
- Tamanhos: xs (12px), sm (14px), base (16px), lg (18px), xl (20px)
- Weights: normal (400), medium (500), semibold (600), bold (700)

### Componentes
- Cards com gradient backgrounds
- Borders com opacity
- Shadows com cores
- Hover states suaves
- Transitions em 300ms

---

## 🔄 FLUXOS PRINCIPAIS

### Login
1. Usuário clica em "Entrar com Google"
2. Redirecionamento para OAuth Google
3. Callback processa código
4. Verifica se usuário existe na tabela local
5. Se não existe, mostra "não autorizado"
6. Se existe, carrega dados e redireciona para dashboard

### Importação de Vendas
1. Upload de CSV
2. Detecção automática de separador
3. Parse de todas as linhas
4. Identificação do mês mais recente
5. Limpeza apenas do mês mais recente
6. Criação/atualização de produtos
7. Inserção de vendas em batches
8. Relatório de sucesso/erros

### Cálculo de Dashboard
1. Aplicação de filtros (negócio, vendedor, datas)
2. Query para vendas ano atual
3. Query para vendas ano anterior (mesmo período)
4. Query para metas do budget
5. Agregação e cálculos de KPIs
6. Preparação de dados para gráficos
7. Envio para frontend

---

## 📝 MANUTENÇÃO E SUPORTE

### Logs Disponíveis
- Console.log para debugging
- Error tracking em importações
- Status de queries SQL

### Monitoramento
- Tempo de resposta de APIs
- Taxa de erro em importações
- Uso de recursos Cloudflare

### Backup
- Database D1 com backup automático Cloudflare
- Pontos de restauração versionados (01-14)
- Código versionado no Mocha

---

## 🚀 PRÓXIMAS FEATURES PLANEJADAS

1. Dashboard de vendas por região geográfica
2. Análise preditiva com ML
3. Notificações por email
4. Exportação de relatórios PDF
5. Dashboard mobile otimizado
6. Integração com ERP externo

---

## 📞 CONTATOS E CRÉDITOS

**Desenvolvimento:** Mocha AI Agent  
**Cliente:** Sistema de Gestão Veterinária  
**Suporte:** Através da plataforma Mocha  

---

**FIM DO PONTO DE RESTAURAÇÃO #14**

*Este documento serve como snapshot completo do sistema em 17/11/2025. Para restaurar, use este documento em conjunto com os arquivos de código fonte.*
