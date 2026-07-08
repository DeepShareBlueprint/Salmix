# VetSalesPro - Sistema de Gestão de Vendas

## Sobre o Sistema

VetSalesPro é um sistema completo de gestão de vendas desenvolvido especificamente para o setor veterinário. O sistema oferece funcionalidades para:

- Dashboard executivo com KPIs em tempo real
- Gestão de vendas e representantes
- Controle de pedidos e aprovações
- Forecast de vendas
- Gestão de orçamentos (Budget)
- Análise de eficiência de vendedores
- Gestão de produtos e estoque
- Relatórios analíticos
- Agenda de visitas

## Tecnologias Utilizadas

### Frontend
- **React 18** - Framework UI
- **TypeScript** - Linguagem
- **Tailwind CSS** - Estilização
- **React Router** - Navegação
- **Recharts** - Gráficos e visualizações
- **Lucide React** - Ícones
- **Vite** - Build tool

### Backend
- **Cloudflare Workers** - Serverless runtime
- **Hono** - Framework web
- **Cloudflare D1** - Banco de dados SQLite

### Autenticação
- Sistema de autenticação Mocha (integrado)

## Estrutura do Projeto

```
src/
├── react-app/           # Código React frontend
│   ├── components/      # Componentes reutilizáveis
│   ├── pages/          # Páginas da aplicação
│   ├── hooks/          # React hooks customizados
│   └── main.tsx        # Entry point
├── worker/             # Backend Cloudflare Worker
│   ├── index.ts        # API endpoints
│   └── generate-prd-docx.ts  # Geração de documentos
└── shared/             # Código compartilhado
    └── types.ts        # TypeScript types
```

## Requisitos para Instalação

- Node.js 18 ou superior
- npm ou bun
- Conta Cloudflare (para deploy)

## Instalação Local

1. Instale as dependências:
```bash
npm install
```

2. Configure as variáveis de ambiente:
Crie os seguintes secrets no Cloudflare:
- `EMAIL_PEDIDOS` - Email para receber notificações de pedidos
- `RESEND_API_KEY` - API key do serviço Resend (envio de emails)
- `MOCHA_USERS_SERVICE_API_KEY` - Chave de API para autenticação
- `MOCHA_USERS_SERVICE_API_URL` - URL do serviço de autenticação

3. Inicialize o banco de dados:
Execute o schema SQL fornecido (SCHEMA-COMPLETO.sql) no D1

4. Execute em desenvolvimento:
```bash
npm run dev
```

## Deploy para Produção

1. Configure o Cloudflare Workers:
```bash
npx wrangler login
```

2. Crie o banco D1:
```bash
npx wrangler d1 create vetsalespro-db
```

3. Execute as migrações:
```bash
npx wrangler d1 execute vetsalespro-db --file=SCHEMA-COMPLETO.sql
```

4. Deploy:
```bash
npm run deploy
```

## Funcionalidades Principais

### 1. Dashboard
- KPIs em tempo real
- Gráficos de desempenho
- Mapa do Brasil com vendas por região
- Análise de metas vs realizado

### 2. Gestão de Pedidos
- Criação de novos pedidos
- Aprovação/rejeição de pedidos
- Controle de descontos fora da política
- Envio automático de emails

### 3. Forecast
- Previsão de vendas por produto
- Visualização mensal e anual
- Importação de dados via CSV

### 4. Budget
- Definição de metas por vendedor
- Acompanhamento mensal
- Comparação com realizado

### 5. Eficiência de Vendedores
- Análise de desempenho individual
- Métricas de atingimento de metas
- Ranking de vendedores

### 6. Relatórios
- Relatórios personalizáveis
- Exportação de dados
- Análises por período

## Níveis de Acesso

O sistema possui 4 níveis de acesso:
- **Admin** - Acesso total
- **Diretor** - Acesso a relatórios e aprovações
- **Gerente** - Gestão de vendas e equipes
- **Representante** - Acesso básico a vendas

## Banco de Dados

### Tabelas Principais
- `usuarios` - Usuários do sistema
- `vendas` - Registro de vendas
- `produtos` - Catálogo de produtos
- `orders` - Pedidos
- `order_items` - Itens dos pedidos
- `budget` - Orçamentos/Metas
- `previsao_vendas` - Forecast
- `clientes` - Cadastro de clientes
- `agenda` - Agenda de visitas

Veja o schema completo em `SCHEMA-COMPLETO.sql`

## Suporte

Para dúvidas sobre o código ou funcionamento:
- Consulte a documentação inline no código
- Verifique os comentários nas funções principais
- Entre em contato com o desenvolvedor

## Notas Importantes

1. **Segurança**: Nunca exponha os secrets/API keys em código
2. **Banco de Dados**: O D1 é SQLite - verifique limitações antes de mudanças no schema
3. **Emails**: Configure corretamente o Resend para envio de emails
4. **Autenticação**: O sistema usa autenticação Mocha - mantenha as configurações

## Próximos Passos Recomendados

1. Revisar e ajustar as cores/branding conforme identidade visual
2. Configurar backup automático do banco de dados
3. Implementar logs de auditoria para ações críticas
4. Adicionar testes automatizados
5. Configurar monitoramento de erros (Sentry ou similar)

## Licença

Sistema desenvolvido para uso exclusivo do cliente.
