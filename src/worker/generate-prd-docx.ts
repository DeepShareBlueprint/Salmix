import { Document, Packer, Paragraph, HeadingLevel, AlignmentType } from 'docx';

export async function generatePRDDocument(): Promise<ArrayBuffer> {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        // Título Principal
        new Paragraph({
          text: "Product Requirements Document",
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        }),
        new Paragraph({
          text: "VetSales Pro - Sistema de Gestão de Vendas",
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        }),

        // 1. Visão Geral do Produto
        new Paragraph({
          text: "1. Visão Geral do Produto",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        }),
        new Paragraph({
          text: "O VetSales Pro é um sistema corporativo completo de gestão de vendas de medicamentos veterinários, voltado para distribuidoras e representantes comerciais. O sistema integra controle de produtos, gestão de vendas, previsões (forecast), análise de desempenho de vendedores e relatórios executivos, proporcionando visão 360° do negócio e apoiando a tomada de decisão através de dados estruturados e análises inteligentes.",
          spacing: { after: 200 }
        }),

        // 2. Objetivos do Sistema
        new Paragraph({
          text: "2. Objetivos do Sistema",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        }),
        new Paragraph({
          text: "• Centralizar e integrar dados de vendas, produtos, estoque e previsões em uma única plataforma",
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "• Automatizar a análise de desempenho de vendedores e unidades de negócio",
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "• Fornecer previsões de vendas (forecast) e comparações com realizações",
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "• Gerar relatórios executivos profissionais para análise estratégica",
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "• Permitir controle granular de acesso por nível de usuário",
          spacing: { after: 200 }
        }),

        // 3. Escopo Funcional
        new Paragraph({
          text: "3. Escopo Funcional",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        }),
        new Paragraph({
          text: "O sistema cobre os módulos de Dashboard Executivo, Gestão de Vendas, Análise de Eficiência por Vendedor, Sistema de Forecast (Previsões), Gestão de Produtos, Controle de Estoque, Gestão de Usuários e Importação de Dados via CSV. Inclui autenticação Google OAuth, controle de acesso por níveis, relatórios profissionais para impressão e exportação, e visualizações interativas com gráficos e indicadores.",
          spacing: { after: 200 }
        }),

        // 4. Módulos do Sistema
        new Paragraph({
          text: "4. Módulos do Sistema",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        }),
        new Paragraph({
          text: "1. Dashboard Executivo",
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "KPIs, gráficos de evolução, ranking de produtos e representantes",
          spacing: { after: 200 }
        }),
        new Paragraph({
          text: "2. Gestão de Vendas",
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "Listagem completa com filtros avançados e exportação CSV",
          spacing: { after: 200 }
        }),
        new Paragraph({
          text: "3. Eficiência por Vendedor",
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "Análise de performance com IER, classificação e insights",
          spacing: { after: 200 }
        }),
        new Paragraph({
          text: "4. Sistema de Forecast",
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "Previsões de vendas com comparativo vs realizado",
          spacing: { after: 200 }
        }),
        new Paragraph({
          text: "5. Gestão de Produtos",
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "CRUD completo de produtos com filtros por negócio",
          spacing: { after: 200 }
        }),
        new Paragraph({
          text: "6. Controle de Estoque",
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "Visualização de estoque com alertas de nível crítico",
          spacing: { after: 200 }
        }),
        new Paragraph({
          text: "7. Gestão de Usuários",
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "Controle de acesso, níveis de permissão e solicitações",
          spacing: { after: 200 }
        }),
        new Paragraph({
          text: "8. Importação de Dados",
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "Upload CSV com validação e processamento em lote",
          spacing: { after: 200 }
        }),
        new Paragraph({
          text: "9. Relatórios Profissionais",
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "Relatórios de forecast mensal e curva ABC para impressão",
          spacing: { after: 200 }
        }),
        new Paragraph({
          text: "10. Portal do Representante",
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "Interface simplificada para vendedores consultarem dados",
          spacing: { after: 200 }
        }),

        // 5. Requisitos Funcionais
        new Paragraph({
          text: "5. Requisitos Funcionais",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        }),
        new Paragraph({
          text: "RF01: Importar arquivos CSV de Vendas, Forecast e Estoque com validação automática",
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "RF02: Calcular automaticamente KPIs (vendas YTD, ticket médio, acurácia de forecast)",
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "RF03: Gerar gráficos interativos de evolução de vendas e rankings",
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "RF04: Exibir alertas visuais de estoque crítico e produtos em risco",
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "RF05: Calcular IER (Índice de Eficiência Relativa) por vendedor automaticamente",
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "RF06: Gerar relatórios profissionais em PDF via impressão do navegador",
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "RF07: Exportar dados filtrados para CSV",
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "RF08: Autenticar usuários via Google OAuth e criar registro local",
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "RF09: Redirecionar usuários automaticamente baseado no nível de acesso",
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "RF10: Permitir busca em tempo real em listagens de vendas e produtos",
          spacing: { after: 200 }
        }),

        // 6. Requisitos Não Funcionais
        new Paragraph({
          text: "6. Requisitos Não Funcionais",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        }),
        new Paragraph({
          text: "RNF01: Interface responsiva (mobile-first) com breakpoints otimizados",
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "RNF02: Performance otimizada: consultas limitadas a 1000 registros",
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "RNF03: Armazenamento em Cloudflare D1 (SQLite) com backup automático",
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "RNF04: Hospedagem em Cloudflare Workers (serverless, escalável)",
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "RNF05: Processamento CSV em lotes de 50 registros para performance",
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "RNF06: Visualização com Recharts para gráficos interativos",
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "RNF07: Segurança: cookies HTTP-only, validação Zod, sanitização de dados",
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "RNF08: Tempo de resposta: máximo 2 segundos para consultas",
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "RNF09: Disponibilidade: 99.9% (SLA Cloudflare Workers)",
          spacing: { after: 200 }
        }),

        // 7. Regras de Negócio
        new Paragraph({
          text: "7. Regras de Negócio",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        }),
        new Paragraph({
          text: "RB01: Vendas e Forecast só podem ser atualizados via upload CSV",
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "RB02: Produto abaixo do estoque mínimo gera alerta automático no dashboard",
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "RB03: IER de vendedor abaixo de 50% gera insight de revisão necessária",
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "RB04: Meta do mês é calculada como 115% do forecast do período",
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "RB05: Acurácia de previsão calculada como: (YTD Vendas / YTD Forecast) * 100",
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "RB06: Ticket médio calculado como: Valor Total YTD / Número de Transações",
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "RB07: Importação de vendas preserva histórico, limpando apenas o mês mais recente",
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "RB08: Produtos novos são criados automaticamente durante importação de vendas",
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "RB09: Classificação de eficiência: Alta (IER ≥120%), Média (80-120%), Baixa (<80%)",
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "RB10: Produtos com forecast < 100 unidades são marcados como 'em risco'",
          spacing: { after: 200 }
        }),

        // 8. Perfis de Usuário e Permissões
        new Paragraph({
          text: "8. Perfis de Usuário e Permissões",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        }),
        new Paragraph({
          text: "Administrador",
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "Acesso completo a todos os módulos, gestão de usuários, configurações do sistema",
          spacing: { after: 200 }
        }),
        new Paragraph({
          text: "Gerente",
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "Acesso completo ao dashboard, vendas, forecast, produtos e relatórios executivos",
          spacing: { after: 200 }
        }),
        new Paragraph({
          text: "Operador",
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "Acesso ao submenu Operador: Importação de dados e Gestão de usuários (redirecionamento automático)",
          spacing: { after: 200 }
        }),
        new Paragraph({
          text: "Representante",
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "Acesso apenas ao Portal de Representantes com seus dados de vendas (redirecionamento automático)",
          spacing: { after: 200 }
        }),

        // 9. Fluxo Operacional
        new Paragraph({
          text: "9. Fluxo Operacional",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        }),
        new Paragraph({
          text: "1. Autenticação via Google OAuth e verificação de autorização",
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "2. Upload dos arquivos base (Vendas, Forecast, Estoque) via CSV",
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "3. Processamento e validação automática dos dados importados",
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "4. Cálculo automático de KPIs, IERs e métricas de performance",
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "5. Visualização no dashboard com gráficos e alertas",
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "6. Análise de eficiência por vendedor e identificação de oportunidades",
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "7. Comparação Forecast vs Realizado e ajuste de previsões",
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "8. Geração de relatórios profissionais para apresentação executiva",
          spacing: { after: 200 }
        }),

        // 10. Diretrizes de Design
        new Paragraph({
          text: "10. Diretrizes de Design (UI/UX – Identidade Visual)",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        }),
        new Paragraph({
          text: "Paleta de Cores:",
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "• Azul (#3b82f6), Verde (#10b981), Amarelo (#f59e0b), Vermelho (#ef4444), Roxo (#8b5cf6)",
          spacing: { after: 200 }
        }),
        new Paragraph({
          text: "Backgrounds:",
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "• Slate 950, Slate 900, Slate 800",
          spacing: { after: 200 }
        }),
        new Paragraph({
          text: "Princípios de Design:",
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "• Estilo moderno inspirado em Linear/Notion com glassmorphism",
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "• Fonte principal: Inter (Google Fonts)",
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "• Cantos arredondados (rounded-lg, rounded-xl)",
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "• Sombras sutis e glows para profundidade",
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "• Gradientes para backgrounds e cards",
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "• Ícones: Lucide React",
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "• Animações suaves em hover e transições",
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "• Mobile-first com breakpoints responsivos",
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "• Filosofia: clareza, hierarquia visual e foco na usabilidade",
          spacing: { after: 200 }
        }),

        // 11. Tecnologias Utilizadas
        new Paragraph({
          text: "11. Tecnologias Utilizadas",
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        }),
        new Paragraph({
          text: "Frontend:",
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "• React 18 com TypeScript",
          spacing: { after: 50 }
        }),
        new Paragraph({
          text: "• Tailwind CSS para estilização",
          spacing: { after: 50 }
        }),
        new Paragraph({
          text: "• React Router v6 para navegação",
          spacing: { after: 50 }
        }),
        new Paragraph({
          text: "• Recharts para visualização de dados",
          spacing: { after: 50 }
        }),
        new Paragraph({
          text: "• Lucide React para ícones",
          spacing: { after: 50 }
        }),
        new Paragraph({
          text: "• date-fns para manipulação de datas",
          spacing: { after: 50 }
        }),
        new Paragraph({
          text: "• Vite para build e desenvolvimento",
          spacing: { after: 200 }
        }),
        new Paragraph({
          text: "Backend:",
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "• Hono framework para Cloudflare Workers",
          spacing: { after: 50 }
        }),
        new Paragraph({
          text: "• Cloudflare D1 (SQLite) como database",
          spacing: { after: 50 }
        }),
        new Paragraph({
          text: "• Zod para validação de schemas",
          spacing: { after: 50 }
        }),
        new Paragraph({
          text: "• CORS habilitado",
          spacing: { after: 50 }
        }),
        new Paragraph({
          text: "• Mocha Auth Service (Google OAuth)",
          spacing: { after: 200 }
        }),
        new Paragraph({
          text: "Infraestrutura:",
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "• Cloudflare Workers (serverless)",
          spacing: { after: 50 }
        }),
        new Paragraph({
          text: "• Cloudflare D1 (database)",
          spacing: { after: 50 }
        }),
        new Paragraph({
          text: "• Google OAuth via Mocha Users Service",
          spacing: { after: 200 }
        }),

        // Footer
        new Paragraph({
          text: "",
          spacing: { before: 400 }
        }),
        new Paragraph({
          text: "VetSales Pro - Product Requirements Document",
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 }
        }),
        new Paragraph({
          text: "Versão 1.0 - Novembro 2025",
          alignment: AlignmentType.CENTER
        }),
      ],
    }],
  });

  return await Packer.toBuffer(doc);
}
