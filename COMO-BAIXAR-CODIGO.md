# Como Baixar o Código do VetSalesPro

## ❌ Acesso ao Terminal
Você **NÃO** tem acesso ao terminal/linha de comando através da interface Mocha que estou usando. Isso significa que não posso criar um ZIP automaticamente.

## ✅ Opções Disponíveis para Download

### OPÇÃO 1: Download Manual por Arquivo (Mais Trabalhoso)
Você precisará copiar cada arquivo individualmente:

1. Na interface da Mocha, procure por um ícone de "download" ou "export" ao lado de cada arquivo
2. Ou copie o conteúdo de cada arquivo e cole em arquivos locais no seu computador
3. Mantenha a mesma estrutura de pastas

**Total de arquivos:** ~60 arquivos
**Tempo estimado:** 1-2 horas

### OPÇÃO 2: Solicitar ao Suporte da Mocha (Recomendado)
1. Entre em contato com o suporte da Mocha
2. Solicite exportação completa do projeto VetSalesPro
3. Eles podem fornecer um ZIP ou acesso Git

**Email/Chat Suporte Mocha:** [verificar na plataforma]
**Informações para fornecer:**
- Nome do projeto: VetSalesPro
- URL: https://vetsalespro.mocha.app
- Motivo: Entregar código-fonte ao cliente final

### OPÇÃO 3: Integração Git (Se Disponível)
Se a Mocha oferece integração com GitHub/GitLab:

1. Procure nas configurações do projeto por "Git" ou "Version Control"
2. Conecte a um repositório GitHub novo
3. Faça push do código
4. Baixe via `git clone` no seu computador
5. Entregue ao cliente

### OPÇÃO 4: API da Mocha (Para Desenvolvedores)
Se você é desenvolvedor ou tem um desenvolvedor disponível:

1. Verifique se a Mocha tem API pública
2. Use a API para baixar todos os arquivos programaticamente
3. Isso pode automatizar o download de todos os 60 arquivos

## 📋 Lista Completa de Arquivos para Baixar

### Raiz do Projeto
- index.html
- tailwind.config.js
- eslint.config.js
- package.json (bloqueado, mas importante copiar)
- tsconfig.json (bloqueado, mas importante copiar)
- vite.config.ts (bloqueado, mas importante copiar)
- wrangler.json (bloqueado, mas importante copiar)

### Código Frontend (src/react-app/)
**Páginas (17 arquivos):**
- pages/AccessRequest.tsx
- pages/Agenda.tsx
- pages/AuthCallback.tsx
- pages/Budget.tsx
- pages/Config.tsx
- pages/ConfirmarPedido.tsx
- pages/Dashboard.tsx
- pages/EditarPedido.tsx
- pages/EficienciaVendedor.tsx
- pages/Estoque.tsx
- pages/Forecast.tsx
- pages/ForecastRelatorios.tsx
- pages/Home.tsx
- pages/Importacao.tsx
- pages/ListaPedidos.tsx
- pages/Login.tsx
- pages/NovoPedido.tsx
- pages/PRD.tsx
- pages/Produtos.tsx
- pages/RecebePedido.tsx
- pages/Relatorios.tsx
- pages/Representantes.tsx
- pages/TesteEmail.tsx
- pages/Usuarios.tsx
- pages/Vendas.tsx

**Componentes (4 arquivos):**
- components/BrazilMap.tsx
- components/GaugeChart.tsx
- components/KPICard.tsx
- components/Navbar.tsx
- components/RoleProtectedRoute.tsx

**Hooks (7 arquivos):**
- hooks/useAgenda.ts
- hooks/useDashboard.ts
- hooks/useEficiencia.ts
- hooks/useForecast.ts
- hooks/usePedidos.ts
- hooks/useProdutos.ts
- hooks/useVendas.ts

**Outros:**
- App.tsx
- main.tsx
- index.css
- vite-env.d.ts

### Código Backend (src/worker/)
- index.ts
- debug-kpis.ts
- generate-prd-docx.ts

### Código Compartilhado (src/shared/)
- types.ts

### Documentação
- README-CLIENTE.md (criado para você)
- INSTRUCOES-DOWNLOAD.md
- Vários Ponto_Restauração_XX.md (histórico de desenvolvimento)

## 🗄️ Banco de Dados

O schema do banco de dados está definido em migrações SQL. Você precisará fornecer ao cliente:

1. **Schema SQL completo** (eu posso gerar isso para você)
2. **Dados de exemplo** (se houver)

### Tabelas do Sistema:
- usuarios
- produtos
- estoque
- vendas
- previsao_vendas
- solicitacoes_acesso
- budget
- inventory
- price_table
- orders
- order_items
- clientes
- pedido_recipients
- agenda
- menu_config
- vendedores

## 🔐 Secrets/Variáveis de Ambiente

O cliente precisará configurar:
- `EMAIL_PEDIDOS` - Email para receber notificações de pedidos
- `RESEND_API_KEY` - Chave da API Resend (envio de emails)
- `MOCHA_USERS_SERVICE_API_KEY` - Autenticação Mocha
- `MOCHA_USERS_SERVICE_API_URL` - URL do serviço de usuários

## 📦 Próximos Passos

1. **Escolha uma das opções acima**
2. **Baixe/exporte todos os arquivos**
3. **Teste localmente** antes de entregar
4. **Entregue ao cliente** com a documentação

## ⚠️ Importante

- Alguns arquivos estão marcados como "bloqueados" na Mocha mas são essenciais (package.json, tsconfig.json, etc). Você precisará copiá-los.
- O sistema usa Cloudflare Workers, D1 Database, React, TypeScript
- O cliente precisará de conta Cloudflare para hospedar
- Todos os dados sensíveis (secrets) precisam ser reconfigurados pelo cliente

## 💡 Minha Recomendação

**Melhor opção:** Contatar o suporte da Mocha e solicitar exportação completa do projeto.

**Alternativa:** Se você tem conhecimento técnico, use a Opção 1 (download manual) começando pelos arquivos mais importantes:
1. Código backend (src/worker/)
2. Código frontend - páginas principais
3. Código frontend - componentes
4. Configurações

Posso te ajudar criando scripts ou mais documentação se necessário!
