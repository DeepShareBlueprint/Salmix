import Navbar from '@/react-app/components/Navbar';
import { FileText, Check, Download } from 'lucide-react';
import { useState } from 'react';

export default function PRD() {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch('/api/prd/download', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Erro ao baixar documento');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'VetSalesPro_PRD_v1.0.docx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erro ao baixar PRD:', error);
      alert('Erro ao baixar o documento. Por favor, tente novamente.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <Navbar />
      
      <div className="lg:ml-64 p-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">Product Requirements Document</h1>
                  <p className="text-slate-400">VetSales Pro - Sistema de Gestão de Vendas</p>
                </div>
              </div>
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-5 h-5" />
                <span>{isDownloading ? 'Gerando...' : 'Baixar .docx'}</span>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-8">
            {/* 1. Visão Geral do Produto */}
            <section className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl p-6 border border-slate-700 shadow-xl">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                <span className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3 text-sm">1</span>
                Visão Geral do Produto
              </h2>
              <p className="text-slate-300 leading-relaxed">
                O VetSales Pro é um sistema corporativo completo de gestão de vendas de medicamentos veterinários, 
                voltado para distribuidoras e representantes comerciais. O sistema integra controle de produtos, 
                gestão de vendas, previsões (forecast), análise de desempenho de vendedores e relatórios executivos, 
                proporcionando visão 360° do negócio e apoiando a tomada de decisão através de dados estruturados 
                e análises inteligentes.
              </p>
            </section>

            {/* 2. Objetivos do Sistema */}
            <section className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl p-6 border border-slate-700 shadow-xl">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                <span className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3 text-sm">2</span>
                Objetivos do Sistema
              </h2>
              <ul className="space-y-3 text-slate-300">
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Centralizar e integrar dados de vendas, produtos, estoque e previsões em uma única plataforma</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Automatizar a análise de desempenho de vendedores e unidades de negócio</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Fornecer previsões de vendas (forecast) e comparações com realizações</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Gerar relatórios executivos profissionais para análise estratégica</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Permitir controle granular de acesso por nível de usuário</span>
                </li>
              </ul>
            </section>

            {/* 3. Escopo Funcional */}
            <section className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl p-6 border border-slate-700 shadow-xl">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                <span className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3 text-sm">3</span>
                Escopo Funcional
              </h2>
              <p className="text-slate-300 leading-relaxed">
                O sistema cobre os módulos de Dashboard Executivo, Gestão de Vendas, Análise de Eficiência por Vendedor, 
                Sistema de Forecast (Previsões), Gestão de Produtos, Controle de Estoque, Gestão de Usuários e Importação 
                de Dados via CSV. Inclui autenticação Google OAuth, controle de acesso por níveis, relatórios profissionais 
                para impressão e exportação, e visualizações interativas com gráficos e indicadores.
              </p>
            </section>

            {/* 4. Módulos do Sistema */}
            <section className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl p-6 border border-slate-700 shadow-xl">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                <span className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3 text-sm">4</span>
                Módulos do Sistema
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <h3 className="font-semibold text-white mb-2">1. Dashboard Executivo</h3>
                  <p className="text-sm text-slate-400">KPIs, gráficos de evolução, ranking de produtos e representantes</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <h3 className="font-semibold text-white mb-2">2. Gestão de Vendas</h3>
                  <p className="text-sm text-slate-400">Listagem completa com filtros avançados e exportação CSV</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <h3 className="font-semibold text-white mb-2">3. Eficiência por Vendedor</h3>
                  <p className="text-sm text-slate-400">Análise de performance com IER, classificação e insights</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <h3 className="font-semibold text-white mb-2">4. Sistema de Forecast</h3>
                  <p className="text-sm text-slate-400">Previsões de vendas com comparativo vs realizado</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <h3 className="font-semibold text-white mb-2">5. Gestão de Produtos</h3>
                  <p className="text-sm text-slate-400">CRUD completo de produtos com filtros por negócio</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <h3 className="font-semibold text-white mb-2">6. Controle de Estoque</h3>
                  <p className="text-sm text-slate-400">Visualização de estoque com alertas de nível crítico</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <h3 className="font-semibold text-white mb-2">7. Gestão de Usuários</h3>
                  <p className="text-sm text-slate-400">Controle de acesso, níveis de permissão e solicitações</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <h3 className="font-semibold text-white mb-2">8. Importação de Dados</h3>
                  <p className="text-sm text-slate-400">Upload CSV com validação e processamento em lote</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <h3 className="font-semibold text-white mb-2">9. Relatórios Profissionais</h3>
                  <p className="text-sm text-slate-400">Relatórios de forecast mensal e curva ABC para impressão</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <h3 className="font-semibold text-white mb-2">10. Portal do Representante</h3>
                  <p className="text-sm text-slate-400">Interface simplificada para vendedores consultarem dados</p>
                </div>
              </div>
            </section>

            {/* 5. Requisitos Funcionais */}
            <section className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl p-6 border border-slate-700 shadow-xl">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                <span className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3 text-sm">5</span>
                Requisitos Funcionais
              </h2>
              <ul className="space-y-2 text-slate-300">
                <li className="flex items-start">
                  <span className="text-blue-400 font-mono mr-2">RF01:</span>
                  <span>Importar arquivos CSV de Vendas, Forecast e Estoque com validação automática</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 font-mono mr-2">RF02:</span>
                  <span>Calcular automaticamente KPIs (vendas YTD, ticket médio, acurácia de forecast)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 font-mono mr-2">RF03:</span>
                  <span>Gerar gráficos interativos de evolução de vendas e rankings</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 font-mono mr-2">RF04:</span>
                  <span>Exibir alertas visuais de estoque crítico e produtos em risco</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 font-mono mr-2">RF05:</span>
                  <span>Calcular IER (Índice de Eficiência Relativa) por vendedor automaticamente</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 font-mono mr-2">RF06:</span>
                  <span>Gerar relatórios profissionais em PDF via impressão do navegador</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 font-mono mr-2">RF07:</span>
                  <span>Exportar dados filtrados para CSV</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 font-mono mr-2">RF08:</span>
                  <span>Autenticar usuários via Google OAuth e criar registro local</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 font-mono mr-2">RF09:</span>
                  <span>Redirecionar usuários automaticamente baseado no nível de acesso</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 font-mono mr-2">RF10:</span>
                  <span>Permitir busca em tempo real em listagens de vendas e produtos</span>
                </li>
              </ul>
            </section>

            {/* 6. Requisitos Não Funcionais */}
            <section className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl p-6 border border-slate-700 shadow-xl">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                <span className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3 text-sm">6</span>
                Requisitos Não Funcionais
              </h2>
              <ul className="space-y-2 text-slate-300">
                <li className="flex items-start">
                  <span className="text-green-400 font-mono mr-2">RNF01:</span>
                  <span>Interface responsiva (mobile-first) com breakpoints otimizados</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 font-mono mr-2">RNF02:</span>
                  <span>Performance otimizada: consultas limitadas a 1000 registros</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 font-mono mr-2">RNF03:</span>
                  <span>Armazenamento em Cloudflare D1 (SQLite) com backup automático</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 font-mono mr-2">RNF04:</span>
                  <span>Hospedagem em Cloudflare Workers (serverless, escalável)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 font-mono mr-2">RNF05:</span>
                  <span>Processamento CSV em lotes de 50 registros para performance</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 font-mono mr-2">RNF06:</span>
                  <span>Visualização com Recharts para gráficos interativos</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 font-mono mr-2">RNF07:</span>
                  <span>Segurança: cookies HTTP-only, validação Zod, sanitização de dados</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 font-mono mr-2">RNF08:</span>
                  <span>Tempo de resposta: máximo 2 segundos para consultas</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 font-mono mr-2">RNF09:</span>
                  <span>Disponibilidade: 99.9% (SLA Cloudflare Workers)</span>
                </li>
              </ul>
            </section>

            {/* 7. Regras de Negócio */}
            <section className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl p-6 border border-slate-700 shadow-xl">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                <span className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3 text-sm">7</span>
                Regras de Negócio
              </h2>
              <ul className="space-y-2 text-slate-300">
                <li className="flex items-start">
                  <span className="text-yellow-400 font-mono mr-2">RB01:</span>
                  <span>Vendas e Forecast só podem ser atualizados via upload CSV</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-400 font-mono mr-2">RB02:</span>
                  <span>Produto abaixo do estoque mínimo gera alerta automático no dashboard</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-400 font-mono mr-2">RB03:</span>
                  <span>IER de vendedor abaixo de 50% gera insight de revisão necessária</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-400 font-mono mr-2">RB04:</span>
                  <span>Meta do mês é calculada como 115% do forecast do período</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-400 font-mono mr-2">RB05:</span>
                  <span>Acurácia de previsão calculada como: (YTD Vendas / YTD Forecast) * 100</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-400 font-mono mr-2">RB06:</span>
                  <span>Ticket médio calculado como: Valor Total YTD / Número de Transações</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-400 font-mono mr-2">RB07:</span>
                  <span>Importação de vendas preserva histórico, limpando apenas o mês mais recente</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-400 font-mono mr-2">RB08:</span>
                  <span>Produtos novos são criados automaticamente durante importação de vendas</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-400 font-mono mr-2">RB09:</span>
                  <span>Classificação de eficiência: Alta (IER ≥120%), Média (80-120%), Baixa (&lt;80%)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-400 font-mono mr-2">RB10:</span>
                  <span>Produtos com forecast &lt; 100 unidades são marcados como &quot;em risco&quot;</span>
                </li>
              </ul>
            </section>

            {/* 8. Perfis de Usuário e Permissões */}
            <section className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl p-6 border border-slate-700 shadow-xl">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                <span className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3 text-sm">8</span>
                Perfis de Usuário e Permissões
              </h2>
              <div className="space-y-4">
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <h3 className="font-semibold text-white mb-2">Administrador</h3>
                  <p className="text-sm text-slate-400">Acesso completo a todos os módulos, gestão de usuários, configurações do sistema</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <h3 className="font-semibold text-white mb-2">Gerente</h3>
                  <p className="text-sm text-slate-400">Acesso completo ao dashboard, vendas, forecast, produtos e relatórios executivos</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <h3 className="font-semibold text-white mb-2">Operador</h3>
                  <p className="text-sm text-slate-400">Acesso ao submenu Operador: Importação de dados e Gestão de usuários (redirecionamento automático)</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <h3 className="font-semibold text-white mb-2">Representante</h3>
                  <p className="text-sm text-slate-400">Acesso apenas ao Portal de Representantes com seus dados de vendas (redirecionamento automático)</p>
                </div>
              </div>
            </section>

            {/* 9. Fluxo Operacional */}
            <section className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl p-6 border border-slate-700 shadow-xl">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                <span className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3 text-sm">9</span>
                Fluxo Operacional
              </h2>
              <ol className="space-y-3 text-slate-300">
                <li className="flex items-start">
                  <span className="text-blue-400 font-bold mr-3">1.</span>
                  <span>Autenticação via Google OAuth e verificação de autorização</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 font-bold mr-3">2.</span>
                  <span>Upload dos arquivos base (Vendas, Forecast, Estoque) via CSV</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 font-bold mr-3">3.</span>
                  <span>Processamento e validação automática dos dados importados</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 font-bold mr-3">4.</span>
                  <span>Cálculo automático de KPIs, IERs e métricas de performance</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 font-bold mr-3">5.</span>
                  <span>Visualização no dashboard com gráficos e alertas</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 font-bold mr-3">6.</span>
                  <span>Análise de eficiência por vendedor e identificação de oportunidades</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 font-bold mr-3">7.</span>
                  <span>Comparação Forecast vs Realizado e ajuste de previsões</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 font-bold mr-3">8.</span>
                  <span>Geração de relatórios profissionais para apresentação executiva</span>
                </li>
              </ol>
            </section>

            {/* 10. Diretrizes de Design */}
            <section className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl p-6 border border-slate-700 shadow-xl">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                <span className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3 text-sm">10</span>
                Diretrizes de Design (UI/UX – Identidade Visual)
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-white mb-2">Paleta de Cores</h3>
                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-blue-500 rounded"></div>
                      <span className="text-sm text-slate-400">Azul (#3b82f6)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-green-500 rounded"></div>
                      <span className="text-sm text-slate-400">Verde (#10b981)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-yellow-500 rounded"></div>
                      <span className="text-sm text-slate-400">Amarelo (#f59e0b)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-red-500 rounded"></div>
                      <span className="text-sm text-slate-400">Vermelho (#ef4444)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-purple-500 rounded"></div>
                      <span className="text-sm text-slate-400">Roxo (#8b5cf6)</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-2">Backgrounds</h3>
                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-slate-950 rounded border border-slate-700"></div>
                      <span className="text-sm text-slate-400">Slate 950</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-slate-900 rounded border border-slate-700"></div>
                      <span className="text-sm text-slate-400">Slate 900</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-slate-800 rounded border border-slate-700"></div>
                      <span className="text-sm text-slate-400">Slate 800</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-2">Princípios de Design</h3>
                  <ul className="space-y-2 text-slate-300">
                    <li>• Estilo moderno inspirado em Linear/Notion com glassmorphism</li>
                    <li>• Fonte principal: Inter (Google Fonts)</li>
                    <li>• Cantos arredondados (rounded-lg, rounded-xl)</li>
                    <li>• Sombras sutis e glows para profundidade</li>
                    <li>• Gradientes para backgrounds e cards</li>
                    <li>• Ícones: Lucide React</li>
                    <li>• Animações suaves em hover e transições</li>
                    <li>• Mobile-first com breakpoints responsivos</li>
                    <li>• Filosofia: clareza, hierarquia visual e foco na usabilidade</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 11. Mockups Descritivos das Telas */}
            <section className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl p-6 border border-slate-700 shadow-xl">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                <span className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3 text-sm">11</span>
                Mockups Descritivos das Telas
              </h2>
              <div className="space-y-4">
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <h3 className="font-semibold text-white mb-2">Dashboard Executivo</h3>
                  <p className="text-sm text-slate-400">
                    Layout em 3 colunas com 4 KPI cards no topo (Total Vendas YTD, Vendas do Mês, Margem Média, Acurácia Forecast). 
                    Gráfico de evolução de vendas comparando ano atual vs anterior. Ranking de produtos com mini gauge charts. 
                    Mapa do Brasil interativo com vendas por estado. Top 3 representantes em cards destacados. 
                    Seção Performance & Insights com ticket médio, melhor região e meta do mês. Alertas de estoque crítico.
                  </p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <h3 className="font-semibold text-white mb-2">Eficiência por Vendedor</h3>
                  <p className="text-sm text-slate-400">
                    3 KPI cards (Mais Eficiente, Média Geral, Menos Eficiente). Gráfico de barras com eficiência por vendedor. 
                    Gráfico donut com contribuição no valor total (layout 3:2). Tabela ranking com posição, classificação por cores, 
                    nome, eficiência, IER e valores. Insights automáticos destacados.
                  </p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <h3 className="font-semibold text-white mb-2">Gestão de Vendas</h3>
                  <p className="text-sm text-slate-400">
                    Filtros hierárquicos com destaque para Unidade de Negócios. Cards de resumo YTD fixos. 
                    Busca em tempo real. Tabela responsiva com dados de vendas. Botão de exportação CSV. 
                    Paginação no frontend.
                  </p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <h3 className="font-semibold text-white mb-2">Sistema de Forecast</h3>
                  <p className="text-sm text-slate-400">
                    KPIs específicos (Meta do Mês, Previsão Total, Acurácia, Produtos em Risco, Top 5). 
                    Gráfico comparativo Forecast vs Realizado YTD por mês. Tabela de previsões com edição inline. 
                    Filtros por ano, mês e negócio. Botões para relatórios profissionais.
                  </p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <h3 className="font-semibold text-white mb-2">Relatórios de Forecast</h3>
                  <p className="text-sm text-slate-400">
                    Relatório Mensal: 4 seções (Produtos, Valores R$, Unidades, Resumo Total Geral) em layout paisagem. 
                    Curva ABC: Classificação A/B/C com estatísticas. Cabeçalho profissional em todas as páginas. 
                    Numeração automática. Otimizado para impressão/PDF.
                  </p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <h3 className="font-semibold text-white mb-2">Importação de Dados</h3>
                  <p className="text-sm text-slate-400">
                    Botões para selecionar tipo de importação (Vendas, Forecast, Estoque). 
                    Upload de arquivo CSV com drag & drop. Barra de progresso durante processamento. 
                    Relatório detalhado de sucesso/erros. Validação automática de formato.
                  </p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <h3 className="font-semibold text-white mb-2">Gestão de Usuários</h3>
                  <p className="text-sm text-slate-400">
                    Listagem de usuários com foto, nome, email, cargo e nível. Botões de ação (editar, excluir). 
                    Seção de solicitações pendentes com aprovação/rejeição. Modal de edição com seleção de nível de acesso.
                  </p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <h3 className="font-semibold text-white mb-2">Layout Geral</h3>
                  <p className="text-sm text-slate-400">
                    Navegação lateral à esquerda (sidebar) com submenus expansíveis. Cabeçalho mobile com menu hambúrguer. 
                    Conteúdo principal com margin-left: 256px. Background com gradiente slate. Todos os cards com glassmorphism.
                  </p>
                </div>
              </div>
            </section>

            {/* 12. Indicadores (KPIs) */}
            <section className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl p-6 border border-slate-700 shadow-xl">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                <span className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3 text-sm">12</span>
                Indicadores (KPIs)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <h3 className="font-semibold text-white mb-2">Total de Vendas YTD</h3>
                  <p className="text-sm text-slate-400">Valor total de vendas do ano até a data, com comparação vs ano anterior (%)</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <h3 className="font-semibold text-white mb-2">Vendas do Mês</h3>
                  <p className="text-sm text-slate-400">Valor de vendas do mês atual, comparado com mesmo mês ano anterior (%)</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <h3 className="font-semibold text-white mb-2">Ticket Médio YTD</h3>
                  <p className="text-sm text-slate-400">Fórmula: Total Vendas YTD / Número de Transações</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <h3 className="font-semibold text-white mb-2">Acurácia de Forecast</h3>
                  <p className="text-sm text-slate-400">Fórmula: (YTD Vendas / YTD Forecast) * 100</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <h3 className="font-semibold text-white mb-2">IER - Índice de Eficiência Relativa</h3>
                  <p className="text-sm text-slate-400">Fórmula: (Eficiência Individual / Eficiência Média) * 100</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <h3 className="font-semibold text-white mb-2">Eficiência do Vendedor</h3>
                  <p className="text-sm text-slate-400">Fórmula: Valor Total YTD / Número de Vendas (R$/venda)</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <h3 className="font-semibold text-white mb-2">Meta do Mês</h3>
                  <p className="text-sm text-slate-400">Fórmula: Forecast do Período * 1.15 (115%)</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <h3 className="font-semibold text-white mb-2">MAT - Moving Annual Total</h3>
                  <p className="text-sm text-slate-400">Soma móvel dos últimos 12 meses de vendas</p>
                </div>
              </div>
            </section>

            {/* 13. Tecnologias Utilizadas */}
            <section className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl p-6 border border-slate-700 shadow-xl">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                <span className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3 text-sm">13</span>
                Tecnologias Utilizadas
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-white mb-2">Frontend</h3>
                  <ul className="space-y-1 text-sm text-slate-400">
                    <li>• React 18 com TypeScript</li>
                    <li>• Tailwind CSS para estilização</li>
                    <li>• React Router v6 para navegação</li>
                    <li>• Recharts para visualização de dados</li>
                    <li>• Lucide React para ícones</li>
                    <li>• date-fns para manipulação de datas</li>
                    <li>• Vite para build e desenvolvimento</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-2">Backend</h3>
                  <ul className="space-y-1 text-sm text-slate-400">
                    <li>• Hono framework para Cloudflare Workers</li>
                    <li>• Cloudflare D1 (SQLite) como database</li>
                    <li>• Zod para validação de schemas</li>
                    <li>• CORS habilitado</li>
                    <li>• Mocha Auth Service (Google OAuth)</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-2">Infraestrutura</h3>
                  <ul className="space-y-1 text-sm text-slate-400">
                    <li>• Cloudflare Workers (serverless)</li>
                    <li>• Cloudflare D1 (database)</li>
                    <li>• Google OAuth via Mocha Users Service</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-2">Segurança</h3>
                  <ul className="space-y-1 text-sm text-slate-400">
                    <li>• Cookies HTTP-only para sessões</li>
                    <li>• Validação de dados com Zod</li>
                    <li>• Sanitização de inputs</li>
                    <li>• Middleware de autenticação</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 14. Roadmap e Próximos Passos */}
            <section className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl p-6 border border-slate-700 shadow-xl">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                <span className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3 text-sm">14</span>
                Roadmap e Próximos Passos
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-white mb-2">Curto Prazo (1-3 meses)</h3>
                  <ul className="space-y-1 text-sm text-slate-400">
                    <li>• Módulo de Estoque completo com gestão avançada</li>
                    <li>• Notificações push para alertas de estoque e metas</li>
                    <li>• Dashboard de Forecast dedicado</li>
                    <li>• Relatórios customizáveis com builder visual</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-2">Médio Prazo (3-6 meses)</h3>
                  <ul className="space-y-1 text-sm text-slate-400">
                    <li>• Análise preditiva com Machine Learning para forecast</li>
                    <li>• Mobile App / PWA para acesso móvel</li>
                    <li>• Integração com ERPs externos via API</li>
                    <li>• BI avançado com cubos OLAP</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-2">Longo Prazo (6-12 meses)</h3>
                  <ul className="space-y-1 text-sm text-slate-400">
                    <li>• API pública para integrações externas</li>
                    <li>• Multi-tenancy para múltiplas empresas</li>
                    <li>• Marketplace de produtos integrado</li>
                    <li>• Assistente virtual com IA Generativa para análises</li>
                  </ul>
                </div>
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-slate-700">
            <p className="text-center text-slate-400 text-sm">
              VetSales Pro - Product Requirements Document
              <br />
              Versão 1.0 - Novembro 2025
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
