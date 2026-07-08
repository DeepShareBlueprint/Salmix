# Lista de Arquivos para Copiar - VetSalesPro

Use este checklist para garantir que copiou todos os arquivos necessários.

## ☑️ Configurações Raiz (CRÍTICO)

- [ ] `index.html` - Página HTML principal
- [ ] `tailwind.config.js` - Configuração Tailwind CSS
- [ ] `eslint.config.js` - Configuração ESLint
- [ ] `package.json` - Dependências NPM (BLOQUEADO - mas copie)
- [ ] `package-lock.json` - Lock de dependências (BLOQUEADO - mas copie)
- [ ] `tsconfig.json` - Configuração TypeScript (BLOQUEADO - mas copie)
- [ ] `tsconfig.app.json` - Config TypeScript App (BLOQUEADO - mas copie)
- [ ] `tsconfig.node.json` - Config TypeScript Node (BLOQUEADO - mas copie)
- [ ] `tsconfig.worker.json` - Config TypeScript Worker (BLOQUEADO - mas copie)
- [ ] `vite.config.ts` - Configuração Vite (BLOQUEADO - mas copie)
- [ ] `wrangler.json` - Configuração Cloudflare (BLOQUEADO - mas copie)
- [ ] `postcss.config.js` - Configuração PostCSS (BLOQUEADO - mas copie)
- [ ] `.gitignore` - Arquivos ignorados pelo Git (BLOQUEADO - mas copie)

## ☑️ Backend - src/worker/ (MUITO IMPORTANTE)

- [ ] `src/worker/index.ts` - API principal do backend
- [ ] `src/worker/debug-kpis.ts` - Debug de KPIs
- [ ] `src/worker/generate-prd-docx.ts` - Geração de documentos PRD

## ☑️ Código Compartilhado - src/shared/

- [ ] `src/shared/types.ts` - Tipos TypeScript compartilhados

## ☑️ Frontend Principal - src/react-app/

- [ ] `src/react-app/App.tsx` - Componente raiz
- [ ] `src/react-app/main.tsx` - Entry point React
- [ ] `src/react-app/index.css` - Estilos globais
- [ ] `src/react-app/vite-env.d.ts` - Tipos Vite

## ☑️ Componentes - src/react-app/components/

- [ ] `src/react-app/components/BrazilMap.tsx`
- [ ] `src/react-app/components/GaugeChart.tsx`
- [ ] `src/react-app/components/KPICard.tsx`
- [ ] `src/react-app/components/Navbar.tsx`
- [ ] `src/react-app/components/RoleProtectedRoute.tsx`

## ☑️ Hooks - src/react-app/hooks/

- [ ] `src/react-app/hooks/useAgenda.ts`
- [ ] `src/react-app/hooks/useDashboard.ts`
- [ ] `src/react-app/hooks/useEficiencia.ts`
- [ ] `src/react-app/hooks/useForecast.ts`
- [ ] `src/react-app/hooks/usePedidos.ts`
- [ ] `src/react-app/hooks/useProdutos.ts`
- [ ] `src/react-app/hooks/useVendas.ts`

## ☑️ Páginas - src/react-app/pages/ (25 arquivos)

### Autenticação
- [ ] `src/react-app/pages/Login.tsx`
- [ ] `src/react-app/pages/AuthCallback.tsx`
- [ ] `src/react-app/pages/AccessRequest.tsx`

### Páginas Principais
- [ ] `src/react-app/pages/Home.tsx`
- [ ] `src/react-app/pages/Dashboard.tsx`

### Vendas e Pedidos
- [ ] `src/react-app/pages/Vendas.tsx`
- [ ] `src/react-app/pages/ListaPedidos.tsx`
- [ ] `src/react-app/pages/NovoPedido.tsx`
- [ ] `src/react-app/pages/EditarPedido.tsx`
- [ ] `src/react-app/pages/ConfirmarPedido.tsx`
- [ ] `src/react-app/pages/RecebePedido.tsx`

### Gestão
- [ ] `src/react-app/pages/Produtos.tsx`
- [ ] `src/react-app/pages/Estoque.tsx`
- [ ] `src/react-app/pages/Forecast.tsx`
- [ ] `src/react-app/pages/ForecastRelatorios.tsx`
- [ ] `src/react-app/pages/Budget.tsx`
- [ ] `src/react-app/pages/Agenda.tsx`
- [ ] `src/react-app/pages/EficienciaVendedor.tsx`

### Cadastros
- [ ] `src/react-app/pages/Usuarios.tsx`
- [ ] `src/react-app/pages/Representantes.tsx`

### Relatórios e Ferramentas
- [ ] `src/react-app/pages/Relatorios.tsx`
- [ ] `src/react-app/pages/Importacao.tsx`
- [ ] `src/react-app/pages/Config.tsx`
- [ ] `src/react-app/pages/PRD.tsx`
- [ ] `src/react-app/pages/TesteEmail.tsx`

## ☑️ Documentação para o Cliente

- [ ] `README-CLIENTE.md` - Documentação completa
- [ ] `COMO-BAIXAR-CODIGO.md` - Este guia
- [ ] `SCHEMA-COMPLETO.sql` - Schema do banco de dados
- [ ] `LISTA-ARQUIVOS-PARA-COPIAR.md` - Este checklist

## ☑️ Arquivos Opcionais (Histórico)

Estes são pontos de restauração do desenvolvimento. Não são necessários para o cliente:

- [ ] `Ponto_Restauração_01.md` até `Ponto_Restauração_18.md` (OPCIONAL)
- [ ] Arquivos de debug: `debug-meta-calculation.md`, `test-kpi-calculation.md` (OPCIONAL)
- [ ] Arquivos temporários: `check_2024_data.html`, `temp_data_check.html`, `temp_query.sql` (OPCIONAL)

## 📊 Progresso

**Total de arquivos essenciais:** ~55 arquivos
**Total de arquivos opcionais:** ~25 arquivos

---

## 🚀 Depois de Copiar Tudo

1. ✅ Organize os arquivos na mesma estrutura de pastas
2. ✅ Adicione o arquivo `SCHEMA-COMPLETO.sql`
3. ✅ Adicione o arquivo `README-CLIENTE.md`
4. ✅ Crie um arquivo `.env` vazio com as variáveis necessárias
5. ✅ Teste a instalação local antes de entregar

## 📝 Estrutura Final de Pastas

```
vetsalespro/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── wrangler.json
├── tailwind.config.js
├── eslint.config.js
├── README-CLIENTE.md
├── SCHEMA-COMPLETO.sql
├── .env (criar vazio)
│
├── src/
│   ├── worker/
│   │   ├── index.ts
│   │   ├── debug-kpis.ts
│   │   └── generate-prd-docx.ts
│   │
│   ├── shared/
│   │   └── types.ts
│   │
│   └── react-app/
│       ├── App.tsx
│       ├── main.tsx
│       ├── index.css
│       │
│       ├── components/
│       │   ├── BrazilMap.tsx
│       │   ├── GaugeChart.tsx
│       │   ├── KPICard.tsx
│       │   ├── Navbar.tsx
│       │   └── RoleProtectedRoute.tsx
│       │
│       ├── hooks/
│       │   ├── useAgenda.ts
│       │   ├── useDashboard.ts
│       │   ├── useEficiencia.ts
│       │   ├── useForecast.ts
│       │   ├── usePedidos.ts
│       │   ├── useProdutos.ts
│       │   └── useVendas.ts
│       │
│       └── pages/
│           ├── Login.tsx
│           ├── AuthCallback.tsx
│           ├── Home.tsx
│           ├── Dashboard.tsx
│           ├── Vendas.tsx
│           ├── [... todos os outros 20 páginas]
│           └── TesteEmail.tsx
```

## ⚠️ IMPORTANTE

Arquivos marcados como BLOQUEADO precisam ser copiados mesmo assim. Eles são essenciais para o funcionamento do sistema!
