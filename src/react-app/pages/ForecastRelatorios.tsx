import { useState } from 'react';
import Navbar from '@/react-app/components/Navbar';
import { useForecast } from '@/react-app/hooks/useForecast';
import { 
  FileText, 
  Filter, 
  Calendar, 
  BarChart3,
  TrendingUp,
  RefreshCw,
  Printer,
  FileDown,
  Package
} from 'lucide-react';

interface ABCForecastItem {
  produto: string;
  codigo_produto: string;
  negocio: string;
  valorForecast: number;
  participacao: number;
  participacaoAcumulada: number;
  classificacao: 'A' | 'B' | 'C';
}

export default function ForecastRelatorios() {
  const { forecastData, loading } = useForecast();
  const [filters, setFilters] = useState({
    ano: new Date().getFullYear().toString(),
    mes: '',
    negocio: '',
  });
  const [showFilters, setShowFilters] = useState(true);

  const clearFilters = () => {
    setFilters({
      ano: new Date().getFullYear().toString(),
      mes: '',
      negocio: '',
    });
  };

  // Buscar negócios únicos dos dados de forecast
  const getNegocios = () => {
    const negocios = [...new Set(forecastData.map(item => item.negocio).filter(Boolean))].sort();
    return negocios;
  };

  // Gerar Relatório Mensal do Forecast
  const gerarRelatorioMensal = () => {
    const filteredData = forecastData.filter(item => {
      const matchAno = !filters.ano || item.ano.toString() === filters.ano;
      const matchNegocio = !filters.negocio || item.negocio === filters.negocio;
      // Não filtrar por mês específico - mostrar o ano todo
      return matchAno && matchNegocio;
    });

    if (filteredData.length === 0) {
      alert('Nenhum dado encontrado para os filtros selecionados');
      return;
    }

    // Agrupar por negócio e produto, consolidando todos os meses
    const dadosPorNegocio = filteredData.reduce((acc, item) => {
      const negocio = item.negocio || 'Sem Classificação';
      const chaveNegocio = negocio;
      const chaveProduto = `${item.codigo_produto}|${item.nome_produto}`;
      
      if (!acc[chaveNegocio]) {
        acc[chaveNegocio] = {};
      }
      
      if (!acc[chaveNegocio][chaveProduto]) {
        acc[chaveNegocio][chaveProduto] = {
          codigo_produto: item.codigo_produto,
          nome_produto: item.nome_produto,
          meses: {}
        };
      }
      
      // Armazenar dados por mês (1-12)
      const mes = item.mes;
      acc[chaveNegocio][chaveProduto].meses[mes] = {
        quantidade: item.quantidade_prevista || 0,
        valor: ((item.quantidade_prevista || 0) * (item.preco_previsto || 0))
      };
      
      return acc;
    }, {} as { [negocio: string]: { [produto: string]: { codigo_produto: string; nome_produto: string; meses: any } } });

    // Criar conteúdo HTML para impressão
    const anoTexto = filters.ano || 'Todos os anos';
    const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    let htmlContent = `
      <html>
        <head>
          <title>Relatório Forecast - ${anoTexto}</title>
          <style>
            @page { 
              size: landscape; 
              margin: 1cm 0.5cm 0.5cm 0.5cm;
            }
            @media print {
              body { -webkit-print-color-adjust: exact; }
            }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              margin: 0; 
              padding: 20px 10px 10px 10px;
              background: white;
              color: #333;
              font-size: 10px;
            }
            .page-header { 
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 8px 15px;
              border-bottom: 2px solid #000;
              margin-bottom: 0;
              font-size: 11px;
              background: white;
            }
            .header-spacer {
              height: 1px;
              background: #e2e8f0;
              margin: 0 0 20px 0;
            }
            .page-header .header-left {
              display: flex;
              align-items: center;
              gap: 10px;
            }
            .page-header .logo {
              width: 24px;
              height: 24px;
              background: #374151;
              color: white;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              font-size: 11px;
              border-radius: 3px;
            }
            .page-header .title {
              font-weight: 600;
              color: #1f2937;
            }
            .page-header .date-info {
              color: #6b7280;
              font-size: 10px;
              white-space: nowrap;
              display: flex;
              align-items: center;
              gap: 15px;
            }
            .page-header .page-number {
              color: #6b7280;
              font-size: 10px;
              font-weight: 500;
            }
            .section-title {
              background: linear-gradient(135deg, #1e40af, #1d4ed8);
              color: white;
              padding: 15px 25px;
              border-radius: 8px;
              font-size: 16px;
              font-weight: bold;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
              text-align: center;
              margin-bottom: 20px;
            }
            .negocio-section { 
              margin-bottom: 40px; 
              page-break-inside: avoid;
            }
            .negocio-title { 
              background: linear-gradient(135deg, #2563eb, #1d4ed8); 
              color: white; 
              padding: 12px 20px; 
              margin-bottom: 15px; 
              font-weight: bold; 
              border-radius: 8px;
              font-size: 16px;
            }
            .negocio-title-valores {
              background: linear-gradient(135deg, #059669, #047857);
              color: white;
              padding: 12px 20px;
              margin-bottom: 15px;
              font-weight: bold;
              border-radius: 8px;
              font-size: 16px;
            }
            .negocio-title-unidades {
              background: linear-gradient(135deg, #7c3aed, #6d28d9);
              color: white;
              padding: 12px 20px;
              margin-bottom: 15px;
              font-weight: bold;
              border-radius: 8px;
              font-size: 16px;
            }
            .forecast-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
              background: white;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              font-size: 9px;
            }
            .forecast-table th {
              background: #f1f5f9;
              padding: 8px 6px;
              text-align: center;
              font-weight: 600;
              color: #334155;
              border: 1px solid #e2e8f0;
              vertical-align: middle;
              font-size: 9px;
            }
            .forecast-table td {
              padding: 6px 4px;
              border: 1px solid #f1f5f9;
              text-align: center;
              vertical-align: middle;
              font-size: 8px;
            }
            .forecast-table tr:hover {
              background: #f8fafc;
            }
            .total-row {
              background: #eff6ff !important;
              font-weight: bold;
              color: #1e40af;
            }
            .product-name {
              text-align: left !important;
              max-width: 120px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              font-size: 9px;
            }
            .currency {
              color: #059669;
              font-weight: 600;
            }
            .qty {
              color: #1e293b;
              font-weight: 500;
            }
            .month-header {
              background: #dbeafe !important;
              color: #1e40af;
              font-weight: bold;
            }
            .subtotal-section {
              background: #f8fafc;
              border-top: 2px solid #2563eb;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              color: #64748b;
              font-size: 10px;
              border-top: 1px solid #e2e8f0;
              padding-top: 15px;
            }
          </style>
        </head>
        <body>
          <div class="page-header">
            <div class="header-left">
              <div class="logo">VS</div>
              <span class="title">VetSales Pro - Relatório Forecast por Negócio</span>
            </div>
            <div class="date-info">
              <span>rel002</span>
              <span>${new Date().toLocaleString('pt-BR')}</span>
              <span class="page-number">Página 1</span>
            </div>
          </div>
          <div class="header-spacer"></div>
    `;

    let currentPageNumber = 1;

    // ==================== SEÇÃO 1: UNIDADE DE NEGÓCIO - PRODUTOS ====================
    htmlContent += `
      <div class="section-title" style="margin: 30px 0 20px 0;">
        📊 SEÇÃO 1: UNIDADE DE NEGÓCIO - PRODUTOS
      </div>
    `;

    Object.entries(dadosPorNegocio).forEach(([negocio, produtos], indexNegocio) => {
      if (indexNegocio > 0) {
        currentPageNumber++;
        htmlContent += `
          <div style="page-break-before: always;">
            <div class="page-header">
              <div class="header-left">
                <div class="logo">VS</div>
                <span class="title">VetSales Pro - Relatório Forecast por Negócio - Produtos</span>
              </div>
              <div class="date-info">
                <span>${new Date().toLocaleString('pt-BR')}</span>
                <span class="page-number">Página ${currentPageNumber}</span>
              </div>
            </div>
            <div class="header-spacer"></div>
          </div>
        `;
      }
      
      htmlContent += `
        <div class="negocio-section">
          <div class="negocio-title">
            🏢 ${negocio} - ${Object.keys(produtos).length} produtos
          </div>
          
          <table class="forecast-table">
            <thead>
              <tr>
                <th rowspan="2" style="width: 70px;">Código</th>
                <th rowspan="2" style="width: 120px;">Produto</th>
      `;

      // Cabeçalhos dos meses
      for (let mes = 1; mes <= 12; mes++) {
        htmlContent += `<th colspan="2" class="month-header">${mesesNomes[mes - 1]}</th>`;
      }
      
      htmlContent += `<th colspan="2" class="month-header">TOTAL ANUAL</th>`;
      htmlContent += `</tr><tr>`;
      
      // Sub-cabeçalhos para cada mês (Qtd / Valor)
      for (let mes = 1; mes <= 12; mes++) {
        htmlContent += `<th style="width: 35px;">Qtd</th><th style="width: 45px;">Valor</th>`;
      }
      htmlContent += `<th style="width: 45px;">Qtd</th><th style="width: 65px;">Valor</th>`;
      htmlContent += `</tr></thead><tbody>`;

      let totalNegocioQuantidade = 0;
      let totalNegocioValor = 0;
      const totaisMensaisQtd = Array(12).fill(0);
      const totaisMensaisValor = Array(12).fill(0);

      Object.entries(produtos).forEach(([_, dadosProduto]) => {
        htmlContent += `
          <tr>
            <td>${dadosProduto.codigo_produto}</td>
            <td class="product-name" title="${dadosProduto.nome_produto}">${dadosProduto.nome_produto}</td>
        `;
        
        let totalProdutoQuantidade = 0;
        let totalProdutoValor = 0;
        
        // Dados dos 12 meses
        for (let mes = 1; mes <= 12; mes++) {
          const dadosMes = dadosProduto.meses[mes] || { quantidade: 0, valor: 0 };
          totalProdutoQuantidade += dadosMes.quantidade;
          totalProdutoValor += dadosMes.valor;
          
          totaisMensaisQtd[mes - 1] += dadosMes.quantidade;
          totaisMensaisValor[mes - 1] += dadosMes.valor;
          
          htmlContent += `
            <td class="qty">${dadosMes.quantidade > 0 ? dadosMes.quantidade.toLocaleString('pt-BR') : '-'}</td>
            <td class="currency">${dadosMes.valor > 0 ? dadosMes.valor.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '-'}</td>
          `;
        }
        
        // Total do produto
        htmlContent += `
          <td class="qty"><strong>${totalProdutoQuantidade.toLocaleString('pt-BR')}</strong></td>
          <td class="currency"><strong>${totalProdutoValor.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</strong></td>
        `;
        
        htmlContent += `</tr>`;
        
        totalNegocioQuantidade += totalProdutoQuantidade;
        totalNegocioValor += totalProdutoValor;
      });

      // Linha de total do negócio
      htmlContent += `
        <tr class="total-row subtotal-section">
          <td colspan="2"><strong>TOTAL ${negocio.toUpperCase()}</strong></td>
      `;
      
      for (let mes = 0; mes < 12; mes++) {
        htmlContent += `
          <td class="qty"><strong>${totaisMensaisQtd[mes] > 0 ? totaisMensaisQtd[mes].toLocaleString('pt-BR') : '-'}</strong></td>
          <td class="currency"><strong>${totaisMensaisValor[mes] > 0 ? totaisMensaisValor[mes].toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '-'}</strong></td>
        `;
      }
      
      htmlContent += `
          <td class="qty"><strong>${totalNegocioQuantidade.toLocaleString('pt-BR')}</strong></td>
          <td class="currency"><strong>${totalNegocioValor.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</strong></td>
        </tr>
      `;

      htmlContent += `</tbody></table></div>`;
    });

    // ==================== SEÇÃO 2: UNIDADE DE NEGÓCIO - VALORES R$ ====================
    currentPageNumber++;
    htmlContent += `
      <div style="page-break-before: always;">
        <div class="page-header">
          <div class="header-left">
            <div class="logo">VS</div>
            <span class="title">VetSales Pro - Relatório Forecast por Negócio - Valores R$</span>
          </div>
          <div class="date-info">
            <span>${new Date().toLocaleString('pt-BR')}</span>
            <span class="page-number">Página ${currentPageNumber}</span>
          </div>
        </div>
        <div class="header-spacer"></div>
        
        <div class="section-title" style="margin: 20px 0;">
          💰 SEÇÃO 2: UNIDADE DE NEGÓCIO - VALORES R$
        </div>
      </div>
    `;

    Object.entries(dadosPorNegocio).forEach(([negocio, produtos], index) => {
      if (index > 0) {
        currentPageNumber++;
        htmlContent += `
          <div style="page-break-before: always;">
            <div class="page-header">
              <div class="header-left">
                <div class="logo">VS</div>
                <span class="title">VetSales Pro - Relatório Forecast por Negócio - Valores R$</span>
              </div>
              <div class="date-info">
                <span>${new Date().toLocaleString('pt-BR')}</span>
                <span class="page-number">Página ${currentPageNumber}</span>
              </div>
            </div>
            <div class="header-spacer"></div>
          </div>
        `;
      }
      
      htmlContent += `
        <div class="negocio-section">
          <div class="negocio-title-valores">
            💰 ${negocio} - Valores R$ (${Object.keys(produtos).length} produtos)
          </div>
          
          <table class="forecast-table">
            <thead>
              <tr>
                <th rowspan="2" style="width: 80px;">Código</th>
                <th rowspan="2" style="width: 140px;">Produto</th>
                <th colspan="3" class="month-header">Q1</th>
                <th class="month-header" style="background: #bfdbfe !important;">TOTAL Q1</th>
                <th colspan="3" class="month-header">Q2</th>
                <th class="month-header" style="background: #bfdbfe !important;">TOTAL Q2</th>
                <th colspan="3" class="month-header">Q3</th>
                <th class="month-header" style="background: #bfdbfe !important;">TOTAL Q3</th>
                <th colspan="3" class="month-header">Q4</th>
                <th class="month-header" style="background: #bfdbfe !important;">TOTAL Q4</th>
                <th rowspan="2" class="month-header">TOTAL VALOR</th>
              </tr>
              <tr>
                <th style="width: 50px;">Jan</th>
                <th style="width: 50px;">Fev</th>
                <th style="width: 50px;">Mar</th>
                <th style="width: 60px; background: #bfdbfe !important;">Q1</th>
                <th style="width: 50px;">Abr</th>
                <th style="width: 50px;">Mai</th>
                <th style="width: 50px;">Jun</th>
                <th style="width: 60px; background: #bfdbfe !important;">Q2</th>
                <th style="width: 50px;">Jul</th>
                <th style="width: 50px;">Ago</th>
                <th style="width: 50px;">Set</th>
                <th style="width: 60px; background: #bfdbfe !important;">Q3</th>
                <th style="width: 50px;">Out</th>
                <th style="width: 50px;">Nov</th>
                <th style="width: 50px;">Dez</th>
                <th style="width: 60px; background: #bfdbfe !important;">Q4</th>
              </tr>
            </thead>
            <tbody>
      `;
      
      let totaisNegocioValor = Array(12).fill(0);
      
      Object.entries(produtos).forEach(([_, dadosProduto]) => {
        htmlContent += `
          <tr>
            <td>${dadosProduto.codigo_produto}</td>
            <td class="product-name" title="${dadosProduto.nome_produto}">${dadosProduto.nome_produto}</td>
        `;
        
        let totalProdutoValor = 0;
        const trimestresValor = [0, 0, 0, 0];
        
        // Meses e trimestres
        for (let t = 0; t < 4; t++) {
          for (let m = 0; m < 3; m++) {
            const mesIndex = t * 3 + m;
            const mes = mesIndex + 1;
            const dadosMes = dadosProduto.meses[mes] || { quantidade: 0, valor: 0 };
            const valor = dadosMes.valor;
            
            totalProdutoValor += valor;
            totaisNegocioValor[mesIndex] += valor;
            trimestresValor[t] += valor;
            
            htmlContent += `<td class="currency">${valor > 0 ? valor.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '-'}</td>`;
          }
          
          htmlContent += `<td class="currency" style="background: #eff6ff;"><strong>${trimestresValor[t] > 0 ? trimestresValor[t].toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '-'}</strong></td>`;
        }
        
        htmlContent += `<td class="currency"><strong>${totalProdutoValor.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</strong></td>`;
        htmlContent += `</tr>`;
      });
      
      // Linha de total do negócio - Valores
      htmlContent += `<tr class="total-row"><td colspan="2"><strong>TOTAL ${negocio.toUpperCase()}</strong></td>`;
      
      const trimestresNegocioValor = [0, 0, 0, 0];
      let totalNegocioValor = 0;
      
      for (let t = 0; t < 4; t++) {
        for (let m = 0; m < 3; m++) {
          const mesIndex = t * 3 + m;
          const valor = totaisNegocioValor[mesIndex];
          totalNegocioValor += valor;
          trimestresNegocioValor[t] += valor;
          
          htmlContent += `<td class="currency"><strong>${valor > 0 ? valor.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '-'}</strong></td>`;
        }
        
        htmlContent += `<td class="currency" style="background: #dbeafe;"><strong>${trimestresNegocioValor[t] > 0 ? trimestresNegocioValor[t].toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '-'}</strong></td>`;
      }
      
      htmlContent += `<td class="currency"><strong>${totalNegocioValor.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</strong></td></tr>`;
      
      htmlContent += `</tbody></table></div>`;
    });

    // ==================== SEÇÃO 3: UNIDADE DE NEGÓCIO - UNIDADES ====================
    currentPageNumber++;
    htmlContent += `
      <div style="page-break-before: always;">
        <div class="page-header">
          <div class="header-left">
            <div class="logo">VS</div>
            <span class="title">VetSales Pro - Relatório Forecast por Negócio - Unidades</span>
          </div>
          <div class="date-info">
            <span>${new Date().toLocaleString('pt-BR')}</span>
            <span class="page-number">Página ${currentPageNumber}</span>
          </div>
        </div>
        <div class="header-spacer"></div>
        
        <div class="section-title" style="margin: 20px 0;">
          📦 SEÇÃO 3: UNIDADE DE NEGÓCIO - UNIDADES
        </div>
      </div>
    `;

    Object.entries(dadosPorNegocio).forEach(([negocio, produtos], index) => {
      if (index > 0) {
        currentPageNumber++;
        htmlContent += `
          <div style="page-break-before: always;">
            <div class="page-header">
              <div class="header-left">
                <div class="logo">VS</div>
                <span class="title">VetSales Pro - Relatório Forecast por Negócio - Unidades</span>
              </div>
              <div class="date-info">
                <span>${new Date().toLocaleString('pt-BR')}</span>
                <span class="page-number">Página ${currentPageNumber}</span>
              </div>
            </div>
            <div class="header-spacer"></div>
          </div>
        `;
      }
      
      htmlContent += `
        <div class="negocio-section">
          <div class="negocio-title-unidades">
            📦 ${negocio} - Unidades (${Object.keys(produtos).length} produtos)
          </div>
          
          <table class="forecast-table">
            <thead>
              <tr>
                <th rowspan="2" style="width: 80px;">Código</th>
                <th rowspan="2" style="width: 140px;">Produto</th>
                <th colspan="3" class="month-header">Q1</th>
                <th class="month-header" style="background: #bfdbfe !important;">TOTAL Q1</th>
                <th colspan="3" class="month-header">Q2</th>
                <th class="month-header" style="background: #bfdbfe !important;">TOTAL Q2</th>
                <th colspan="3" class="month-header">Q3</th>
                <th class="month-header" style="background: #bfdbfe !important;">TOTAL Q3</th>
                <th colspan="3" class="month-header">Q4</th>
                <th class="month-header" style="background: #bfdbfe !important;">TOTAL Q4</th>
                <th rowspan="2" class="month-header">TOTAL UNIDADES</th>
              </tr>
              <tr>
                <th style="width: 40px;">Jan</th>
                <th style="width: 40px;">Fev</th>
                <th style="width: 40px;">Mar</th>
                <th style="width: 50px; background: #bfdbfe !important;">Q1</th>
                <th style="width: 40px;">Abr</th>
                <th style="width: 40px;">Mai</th>
                <th style="width: 40px;">Jun</th>
                <th style="width: 50px; background: #bfdbfe !important;">Q2</th>
                <th style="width: 40px;">Jul</th>
                <th style="width: 40px;">Ago</th>
                <th style="width: 40px;">Set</th>
                <th style="width: 50px; background: #bfdbfe !important;">Q3</th>
                <th style="width: 40px;">Out</th>
                <th style="width: 40px;">Nov</th>
                <th style="width: 40px;">Dez</th>
                <th style="width: 50px; background: #bfdbfe !important;">Q4</th>
              </tr>
            </thead>
            <tbody>
      `;
      
      let totaisNegocioQtd = Array(12).fill(0);
      
      Object.entries(produtos).forEach(([_, dadosProduto]) => {
        htmlContent += `
          <tr>
            <td>${dadosProduto.codigo_produto}</td>
            <td class="product-name" title="${dadosProduto.nome_produto}">${dadosProduto.nome_produto}</td>
        `;
        
        let totalProdutoQtd = 0;
        const trimestresQtd = [0, 0, 0, 0];
        
        // Meses e trimestres
        for (let t = 0; t < 4; t++) {
          for (let m = 0; m < 3; m++) {
            const mesIndex = t * 3 + m;
            const mes = mesIndex + 1;
            const dadosMes = dadosProduto.meses[mes] || { quantidade: 0, valor: 0 };
            const qtd = dadosMes.quantidade;
            
            totalProdutoQtd += qtd;
            totaisNegocioQtd[mesIndex] += qtd;
            trimestresQtd[t] += qtd;
            
            htmlContent += `<td class="qty">${qtd > 0 ? qtd.toLocaleString('pt-BR') : '-'}</td>`;
          }
          
          htmlContent += `<td class="qty" style="background: #eff6ff;"><strong>${trimestresQtd[t] > 0 ? trimestresQtd[t].toLocaleString('pt-BR') : '-'}</strong></td>`;
        }
        
        htmlContent += `<td class="qty"><strong>${totalProdutoQtd.toLocaleString('pt-BR')}</strong></td>`;
        htmlContent += `</tr>`;
      });
      
      // Linha de total do negócio - Unidades
      htmlContent += `<tr class="total-row"><td colspan="2"><strong>TOTAL ${negocio.toUpperCase()}</strong></td>`;
      
      const trimestresNegocioQtd = [0, 0, 0, 0];
      let totalNegocioQtd = 0;
      
      for (let t = 0; t < 4; t++) {
        for (let m = 0; m < 3; m++) {
          const mesIndex = t * 3 + m;
          const qtd = totaisNegocioQtd[mesIndex];
          totalNegocioQtd += qtd;
          trimestresNegocioQtd[t] += qtd;
          
          htmlContent += `<td class="qty"><strong>${qtd > 0 ? qtd.toLocaleString('pt-BR') : '-'}</strong></td>`;
        }
        
        htmlContent += `<td class="qty" style="background: #dbeafe;"><strong>${trimestresNegocioQtd[t] > 0 ? trimestresNegocioQtd[t].toLocaleString('pt-BR') : '-'}</strong></td>`;
      }
      
      htmlContent += `<td class="qty"><strong>${totalNegocioQtd.toLocaleString('pt-BR')}</strong></td></tr>`;
      
      htmlContent += `</tbody></table></div>`;
    });

    // ==================== SEÇÃO 4: RESUMO TOTAL GERAL - VALORES R$ ====================
    currentPageNumber++;
    htmlContent += `
      <div style="page-break-before: always;">
        <div class="page-header">
          <div class="header-left">
            <div class="logo">VS</div>
            <span class="title">VetSales Pro - Relatório Forecast por Negócio - Resumo Geral</span>
          </div>
          <div class="date-info">
            <span>${new Date().toLocaleString('pt-BR')}</span>
            <span class="page-number">Página ${currentPageNumber}</span>
          </div>
        </div>
        <div class="header-spacer"></div>
        
        <div class="section-title" style="margin: 20px 0;">
          📊 SEÇÃO 4: RESUMO TOTAL GERAL - VALORES R$
        </div>
        
        <div class="negocio-section">
          <table class="forecast-table">
            <thead>
              <tr>
                <th rowspan="2" style="width: 180px;">Unidade de Negócio</th>
                <th colspan="3" class="month-header">Q1</th>
                <th class="month-header" style="background: #bfdbfe !important;">TOTAL Q1</th>
                <th colspan="3" class="month-header">Q2</th>
                <th class="month-header" style="background: #bfdbfe !important;">TOTAL Q2</th>
                <th colspan="3" class="month-header">Q3</th>
                <th class="month-header" style="background: #bfdbfe !important;">TOTAL Q3</th>
                <th colspan="3" class="month-header">Q4</th>
                <th class="month-header" style="background: #bfdbfe !important;">TOTAL Q4</th>
                <th rowspan="2" class="month-header">TOTAL GERAL</th>
                <th rowspan="2" class="month-header">PARTICIPAÇÃO %</th>
              </tr>
              <tr>
                <th style="width: 50px;">Jan</th>
                <th style="width: 50px;">Fev</th>
                <th style="width: 50px;">Mar</th>
                <th style="width: 60px; background: #bfdbfe !important;">Q1</th>
                <th style="width: 50px;">Abr</th>
                <th style="width: 50px;">Mai</th>
                <th style="width: 50px;">Jun</th>
                <th style="width: 60px; background: #bfdbfe !important;">Q2</th>
                <th style="width: 50px;">Jul</th>
                <th style="width: 50px;">Ago</th>
                <th style="width: 50px;">Set</th>
                <th style="width: 60px; background: #bfdbfe !important;">Q3</th>
                <th style="width: 50px;">Out</th>
                <th style="width: 50px;">Nov</th>
                <th style="width: 50px;">Dez</th>
                <th style="width: 60px; background: #bfdbfe !important;">Q4</th>
              </tr>
            </thead>
            <tbody>
    `;
    
    // Calcular totais gerais para todos os negócios
    const totaisGeraisMensais = Array(12).fill(0);
    let totalGeralCompleto = 0;
    
    // Para cada negócio, calcular seus totais mensais
    const resumoPorNegocio: any[] = [];
    Object.entries(dadosPorNegocio).forEach(([negocio, produtos]) => {
      const totaisMensaisNegocio = Array(12).fill(0);
      
      // Calcular valores mensais do negócio
      Object.values(produtos).forEach((dadosProduto: any) => {
        for (let mes = 1; mes <= 12; mes++) {
          const dadosMes = dadosProduto.meses[mes] || { quantidade: 0, valor: 0 };
          totaisMensaisNegocio[mes - 1] += dadosMes.valor;
        }
      });
      
      // Calcular total do negócio
      const totalNegocio = totaisMensaisNegocio.reduce((sum, val) => sum + val, 0);
      
      // Adicionar ao resumo
      resumoPorNegocio.push({
        negocio,
        totaisMensais: totaisMensaisNegocio,
        total: totalNegocio
      });
      
      // Acumular nos totais gerais
      totaisMensaisNegocio.forEach((val, idx) => {
        totaisGeraisMensais[idx] += val;
      });
      totalGeralCompleto += totalNegocio;
    });
    
    // Ordenar negócios por total (decrescente)
    resumoPorNegocio.sort((a, b) => b.total - a.total);
    
    // Renderizar cada negócio
    resumoPorNegocio.forEach((item) => {
      const participacao = totalGeralCompleto > 0 ? (item.total / totalGeralCompleto) * 100 : 0;
      const trimestres = [0, 0, 0, 0];
      
      htmlContent += `
        <tr>
          <td style="text-align: left; font-weight: 600;"><strong>${item.negocio}</strong></td>
      `;
      
      // Renderizar meses e calcular trimestres
      for (let t = 0; t < 4; t++) {
        for (let m = 0; m < 3; m++) {
          const mesIndex = t * 3 + m;
          const valor = item.totaisMensais[mesIndex];
          trimestres[t] += valor;
          
          htmlContent += `<td class="currency">${valor > 0 ? valor.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '-'}</td>`;
        }
        
        htmlContent += `<td class="currency" style="background: #eff6ff;"><strong>${trimestres[t] > 0 ? trimestres[t].toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '-'}</strong></td>`;
      }
      
      htmlContent += `
          <td class="currency"><strong>${item.total.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</strong></td>
          <td><strong>${participacao.toFixed(1)}%</strong></td>
        </tr>
      `;
    });
    
    // Linha de TOTAL GERAL
    const trimestresGerais = [0, 0, 0, 0];
    htmlContent += `
      <tr class="total-row" style="background: #dbeafe !important; border-top: 3px solid #1e40af;">
        <td style="text-align: left;"><strong>TOTAL GERAL</strong></td>
    `;
    
    for (let t = 0; t < 4; t++) {
      for (let m = 0; m < 3; m++) {
        const mesIndex = t * 3 + m;
        const valor = totaisGeraisMensais[mesIndex];
        trimestresGerais[t] += valor;
        
        htmlContent += `<td class="currency"><strong>${valor > 0 ? valor.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '-'}</strong></td>`;
      }
      
      htmlContent += `<td class="currency" style="background: #bfdbfe;"><strong>${trimestresGerais[t] > 0 ? trimestresGerais[t].toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '-'}</strong></td>`;
    }
    
    htmlContent += `
        <td class="currency" style="font-size: 11px;"><strong>${totalGeralCompleto.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</strong></td>
        <td style="font-size: 11px;"><strong>100%</strong></td>
      </tr>
    `;
    
    htmlContent += `
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Footer
    htmlContent += `
      <div class="footer">
        <p>VetSales Pro - Relatório Forecast por Negócio</p>
        <p>Relatório estruturado em 4 seções: Produtos | Valores R$ | Unidades | Resumo Geral</p>
        <p>Relatório gerado automaticamente em ${new Date().toLocaleString('pt-BR')}</p>
      </div>
    </body>
    </html>
    `;

    // Abrir em nova janela para impressão
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Aguardar carregamento e abrir diálogo de impressão
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 500);
      };
    }
  };

  // Gerar Curva ABC do Forecast
  const gerarCurvaABC = () => {
    const filteredData = forecastData.filter(item => {
      const matchAno = !filters.ano || item.ano.toString() === filters.ano;
      const matchMes = !filters.mes || item.mes.toString() === filters.mes;
      const matchNegocio = !filters.negocio || item.negocio === filters.negocio;
      return matchAno && matchMes && matchNegocio;
    });

    if (filteredData.length === 0) {
      alert('Nenhum dado encontrado para os filtros selecionados');
      return;
    }

    // Agrupar produtos por negócio primeiro
    const dadosPorNegocio = filteredData.reduce((acc, item) => {
      const negocio = item.negocio || 'Sem Classificação';
      if (!acc[negocio]) {
        acc[negocio] = [];
      }
      acc[negocio].push(item);
      return acc;
    }, {} as { [key: string]: any[] });

    // Função para calcular curva ABC para um conjunto de dados
    const calcularCurvaABC = (dados: any[]) => {
      // Agrupar produtos e calcular valor total do forecast
      const produtoMap = new Map<string, { 
        codigo_produto: string; 
        nome_produto: string; 
        negocio: string; 
        valorForecast: number; 
      }>();
      
      dados.forEach(item => {
        const key = `${item.codigo_produto}_${item.nome_produto}`;
        const valorItem = (item.quantidade_prevista || 0) * (item.preco_previsto || 0);
        
        if (produtoMap.has(key)) {
          const existing = produtoMap.get(key)!;
          existing.valorForecast += valorItem;
        } else {
          produtoMap.set(key, {
            codigo_produto: item.codigo_produto,
            nome_produto: item.nome_produto,
            negocio: item.negocio || 'Sem Classificação',
            valorForecast: valorItem
          });
        }
      });

      // Converter para array e ordenar por valor
      const produtos = Array.from(produtoMap.values()).sort((a, b) => b.valorForecast - a.valorForecast);
      const valorTotal = produtos.reduce((sum, p) => sum + p.valorForecast, 0);
      
      // Calcular curva ABC
      let acumulado = 0;
      const curvaABC: ABCForecastItem[] = produtos.map(produto => {
        const participacao = valorTotal > 0 ? (produto.valorForecast / valorTotal) * 100 : 0;
        acumulado += participacao;
        
        let classificacao: 'A' | 'B' | 'C' = 'C';
        if (acumulado <= 80) classificacao = 'A';
        else if (acumulado <= 95) classificacao = 'B';

        return {
          produto: produto.nome_produto,
          codigo_produto: produto.codigo_produto,
          negocio: produto.negocio,
          valorForecast: produto.valorForecast,
          participacao,
          participacaoAcumulada: acumulado,
          classificacao
        };
      });

      return { curvaABC, valorTotal };
    };

    // Calcular curva ABC geral
    const { curvaABC: curvaGeralABC, valorTotal: valorTotalGeral } = calcularCurvaABC(filteredData);
    
    // Calcular estatísticas gerais
    const statsGeralA = curvaGeralABC.filter(item => item.classificacao === 'A');
    const statsGeralB = curvaGeralABC.filter(item => item.classificacao === 'B');
    const statsGeralC = curvaGeralABC.filter(item => item.classificacao === 'C');
    
    const valueGeralA = statsGeralA.reduce((sum, item) => sum + item.valorForecast, 0);
    const valueGeralB = statsGeralB.reduce((sum, item) => sum + item.valorForecast, 0);
    const valueGeralC = statsGeralC.reduce((sum, item) => sum + item.valorForecast, 0);

    // Gerar relatório HTML
    const mesNome = filters.mes ? new Date(2024, parseInt(filters.mes) - 1).toLocaleString('pt-BR', { month: 'long' }) : 'Todos os meses';
    const anoTexto = filters.ano || 'Todos os anos';
    
    let htmlContent = `
      <html>
        <head>
          <title>Curva ABC Forecast - ${mesNome} ${anoTexto}</title>
          <style>
            @page { 
              size: landscape; 
              margin: 1cm 0.5cm 0.5cm 0.5cm;
            }
            @media print {
              body { -webkit-print-color-adjust: exact; }
              .page-header {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                height: 40px;
              }
            }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              margin: 0; 
              padding: 90px 20px 20px 20px;
              background: white;
              color: #333;
              font-size: 12px;
            }
            .page-header { 
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 8px 15px;
              border-bottom: 2px solid #000;
              margin-bottom: 30px;
              font-size: 11px;
              background: white;
            }
            .page-header .header-left {
              display: flex;
              align-items: center;
              gap: 10px;
            }
            .page-header .logo {
              width: 24px;
              height: 24px;
              background: #374151;
              color: white;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              font-size: 11px;
              border-radius: 3px;
            }
            .page-header .title {
              font-weight: 600;
              color: #1f2937;
            }
            .page-header .date-info {
              color: #6b7280;
              font-size: 10px;
              white-space: nowrap;
            }
            .negocio-section { 
              margin-bottom: 40px; 
              page-break-inside: avoid;
            }
            .negocio-title { 
              background: linear-gradient(135deg, #dc2626, #b91c1c); 
              color: white; 
              padding: 12px 20px; 
              margin-bottom: 20px; 
              font-weight: bold; 
              border-radius: 8px;
              font-size: 16px;
            }
            .stats-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 15px;
              margin-bottom: 20px;
            }
            .stat-card {
              border-radius: 8px;
              padding: 15px;
              text-align: center;
              color: white;
              font-weight: bold;
              font-size: 11px;
            }
            .stat-card.a { background: linear-gradient(135deg, #16a34a, #15803d); }
            .stat-card.b { background: linear-gradient(135deg, #ea580c, #dc2626); }
            .stat-card.c { background: linear-gradient(135deg, #dc2626, #b91c1c); }
            .stat-card h4 { margin: 0 0 8px 0; font-size: 14px; }
            .stat-card p { margin: 3px 0; }
            .abc-table {
              width: 100%;
              border-collapse: collapse;
              background: white;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              margin-bottom: 20px;
            }
            .abc-table th {
              background: #f8fafc;
              padding: 6px 4px;
              text-align: center;
              font-weight: 600;
              color: #334155;
              border-bottom: 2px solid #e2e8f0;
              font-size: 9px;
            }
            .abc-table td {
              padding: 4px 3px;
              border-bottom: 1px solid #f1f5f9;
              font-size: 8px;
              text-align: center;
            }
            .abc-table tr:hover {
              background: #f8fafc;
            }
            .class-a { background: #dcfce7 !important; color: #166534; }
            .class-b { background: #fef3c7 !important; color: #92400e; }
            .class-c { background: #fee2e2 !important; color: #991b1b; }
            .currency { color: #059669; font-weight: 600; }
            .summary-section {
              background: #f8fafc;
              border-radius: 8px;
              padding: 20px;
              margin-top: 30px;
              page-break-before: always;
            }
            .summary-title {
              color: #1e40af;
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 15px;
              text-align: center;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              color: #64748b;
              font-size: 11px;
              border-top: 1px solid #e2e8f0;
              padding-top: 15px;
              position: relative;
            }
            .page-number {
              position: absolute;
              bottom: 0;
              right: 0;
              font-size: 10px;
              color: #64748b;
            }
            @media print {
              @page {
                @bottom-right {
                  content: counter(page) " de " counter(pages);
                  font-size: 10px;
                  color: #64748b;
                }
              }
            }
          </style>
        </head>
        <body>
          <div class="page-header">
            <div class="header-left">
              <div class="logo">VS</div>
              <span class="title">VetSales Pro - Curva ABC Forecast por Negócio</span>
            </div>
            <div class="date-info">
              <span>rel003</span>
              <span>${new Date().toLocaleString('pt-BR')}</span>
              <span class="page-number">Página 1</span>
            </div>
          </div>
    `;

    // Gerar curva ABC para cada negócio
    Object.entries(dadosPorNegocio).forEach(([negocio, dadosNegocio]) => {
      const { curvaABC: curvaABCNegocio, valorTotal: valorTotalNegocio } = calcularCurvaABC(dadosNegocio);
      
      // Calcular estatísticas do negócio
      const statsA = curvaABCNegocio.filter(item => item.classificacao === 'A');
      const statsB = curvaABCNegocio.filter(item => item.classificacao === 'B');
      const statsC = curvaABCNegocio.filter(item => item.classificacao === 'C');
      
      const valueA = statsA.reduce((sum, item) => sum + item.valorForecast, 0);
      const valueB = statsB.reduce((sum, item) => sum + item.valorForecast, 0);
      const valueC = statsC.reduce((sum, item) => sum + item.valorForecast, 0);

      htmlContent += `
        <div class="negocio-section">
          <div class="negocio-title">
            🏢 ${negocio} - ${curvaABCNegocio.length} produtos
          </div>
          
          <div class="stats-grid">
            <div class="stat-card a">
              <h4>Classe A</h4>
              <p>${statsA.length} produtos (${curvaABCNegocio.length > 0 ? ((statsA.length / curvaABCNegocio.length) * 100).toFixed(1) : '0'}%)</p>
              <p>R$ ${valueA.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <p>${valorTotalNegocio > 0 ? ((valueA / valorTotalNegocio) * 100).toFixed(1) : '0'}% do valor</p>
            </div>
            <div class="stat-card b">
              <h4>Classe B</h4>
              <p>${statsB.length} produtos (${curvaABCNegocio.length > 0 ? ((statsB.length / curvaABCNegocio.length) * 100).toFixed(1) : '0'}%)</p>
              <p>R$ ${valueB.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <p>${valorTotalNegocio > 0 ? ((valueB / valorTotalNegocio) * 100).toFixed(1) : '0'}% do valor</p>
            </div>
            <div class="stat-card c">
              <h4>Classe C</h4>
              <p>${statsC.length} produtos (${curvaABCNegocio.length > 0 ? ((statsC.length / curvaABCNegocio.length) * 100).toFixed(1) : '0'}%)</p>
              <p>R$ ${valueC.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <p>${valorTotalNegocio > 0 ? ((valueC / valorTotalNegocio) * 100).toFixed(1) : '0'}% do valor</p>
            </div>
          </div>
          
          <table class="abc-table">
            <thead>
              <tr>
                <th>Classificação</th>
                <th>Código</th>
                <th>Produto</th>
                <th>Valor Forecast</th>
                <th>Participação %</th>
                <th>Acumulado %</th>
              </tr>
            </thead>
            <tbody>
      `;

      curvaABCNegocio.forEach(item => {
        const classStyle = item.classificacao === 'A' ? 'class-a' : item.classificacao === 'B' ? 'class-b' : 'class-c';
        
        htmlContent += `
          <tr class="${classStyle}">
            <td><strong>${item.classificacao}</strong></td>
            <td>${item.codigo_produto}</td>
            <td>${item.produto}</td>
            <td class="currency">R$ ${item.valorForecast.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
            <td>${item.participacao.toFixed(2)}%</td>
            <td>${item.participacaoAcumulada.toFixed(2)}%</td>
          </tr>
        `;
      });

      htmlContent += `
            </tbody>
          </table>
        </div>
      `;
    });

    // Resumo geral
    htmlContent += `
      <div class="summary-section">
        <div class="summary-title">📈 Resumo Geral - Curva ABC Consolidada</div>
        
        <div class="stats-grid">
          <div class="stat-card a">
            <h4>Classe A - Geral</h4>
            <p>${statsGeralA.length} produtos (${curvaGeralABC.length > 0 ? ((statsGeralA.length / curvaGeralABC.length) * 100).toFixed(1) : '0'}%)</p>
            <p>R$ ${valueGeralA.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            <p>${valorTotalGeral > 0 ? ((valueGeralA / valorTotalGeral) * 100).toFixed(1) : '0'}% do valor total</p>
          </div>
          <div class="stat-card b">
            <h4>Classe B - Geral</h4>
            <p>${statsGeralB.length} produtos (${curvaGeralABC.length > 0 ? ((statsGeralB.length / curvaGeralABC.length) * 100).toFixed(1) : '0'}%)</p>
            <p>R$ ${valueGeralB.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            <p>${valorTotalGeral > 0 ? ((valueGeralB / valorTotalGeral) * 100).toFixed(1) : '0'}% do valor total</p>
          </div>
          <div class="stat-card c">
            <h4>Classe C - Geral</h4>
            <p>${statsGeralC.length} produtos (${curvaGeralABC.length > 0 ? ((statsGeralC.length / curvaGeralABC.length) * 100).toFixed(1) : '0'}%)</p>
            <p>R$ ${valueGeralC.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            <p>${valorTotalGeral > 0 ? ((valueGeralC / valorTotalGeral) * 100).toFixed(1) : '0'}% do valor total</p>
          </div>
        </div>
        
        <table class="abc-table">
          <thead>
            <tr>
              <th>Negócio</th>
              <th>Total Produtos</th>
              <th>Valor Total Forecast</th>
              <th>Produtos Classe A</th>
              <th>Produtos Classe B</th>
              <th>Produtos Classe C</th>
              <th>Participação no Total</th>
            </tr>
          </thead>
          <tbody>
    `;

    // Tabela resumo por negócio
    Object.entries(dadosPorNegocio).forEach(([negocio, dadosNegocio]) => {
      const { curvaABC: curvaABCNegocio, valorTotal: valorTotalNegocio } = calcularCurvaABC(dadosNegocio);
      
      const statsA = curvaABCNegocio.filter(item => item.classificacao === 'A');
      const statsB = curvaABCNegocio.filter(item => item.classificacao === 'B');
      const statsC = curvaABCNegocio.filter(item => item.classificacao === 'C');
      
      const participacaoTotal = valorTotalGeral > 0 ? ((valorTotalNegocio / valorTotalGeral) * 100) : 0;

      htmlContent += `
        <tr>
          <td><strong>${negocio}</strong></td>
          <td>${curvaABCNegocio.length}</td>
          <td class="currency">R$ ${valorTotalNegocio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
          <td>${statsA.length}</td>
          <td>${statsB.length}</td>
          <td>${statsC.length}</td>
          <td><strong>${participacaoTotal.toFixed(1)}%</strong></td>
        </tr>
      `;
    });

    htmlContent += `
          </tbody>
        </table>
      </div>
      
      <div class="footer">
        <p>🏢 VetSales Pro - Curva ABC do Forecast por Negócio</p>
        <p>Relatório gerado automaticamente em ${new Date().toLocaleString('pt-BR')}</p>
      </div>
    </body>
    </html>
    `;

    // Abrir em nova janela para impressão
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Aguardar carregamento e abrir diálogo de impressão
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 500);
      };
    }
  };

  const negocios = getNegocios();

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 pt-20 lg:pt-6 lg:ml-64">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white">Relatórios de Forecast</h1>
              </div>
              <p className="text-slate-400">Relatórios detalhados de previsões de vendas</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                  showFilters 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/50' 
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span>Filtros</span>
              </button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                  <Filter className="w-5 h-5 text-blue-400" />
                  <span>Filtros de Relatório</span>
                </h3>
                <button
                  onClick={clearFilters}
                  className="flex items-center space-x-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Limpar</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Ano */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Ano
                  </label>
                  <select
                    value={filters.ano}
                    onChange={(e) => setFilters(prev => ({ ...prev, ano: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Todos os anos</option>
                    {Array.from({ length: 5 }, (_, i) => {
                      const year = new Date().getFullYear() - 2 + i;
                      return (
                        <option key={year} value={year.toString()}>
                          {year}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Mês */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Mês
                  </label>
                  <select
                    value={filters.mes}
                    onChange={(e) => setFilters(prev => ({ ...prev, mes: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Todos os meses</option>
                    {Array.from({ length: 12 }, (_, i) => {
                      const mes = i + 1;
                      const mesesNomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                                         'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
                      return (
                        <option key={mes} value={mes.toString()}>
                          {mesesNomes[i]}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Business Unit */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <BarChart3 className="w-4 h-4 inline mr-1" />
                    Unidade de Negócio
                  </label>
                  <select
                    value={filters.negocio}
                    onChange={(e) => setFilters(prev => ({ ...prev, negocio: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Todas as Unidades</option>
                    {negocios.map(negocio => (
                      <option key={negocio} value={negocio}>{negocio}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Report Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Relatório Mensal */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-8 border border-slate-700 shadow-xl hover:shadow-lg hover:border-blue-500/50 transition-all">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center">
                  <Printer className="w-8 h-8 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Relatório Mensal do Forecast</h3>
                  <p className="text-slate-400">Relatório detalhado em formato paisagem</p>
                </div>
              </div>
              
              <div className="space-y-4 mb-6">
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-2">Características:</h4>
                  <ul className="text-slate-300 text-sm space-y-1">
                    <li>• Layout em modo paisagem para impressão</li>
                    <li>• Dados organizados lado a lado</li>
                    <li>• Quebra automática por negócio</li>
                    <li>• Resumo executivo por categoria</li>
                    <li>• Totalizadores gerais</li>
                  </ul>
                </div>
              </div>
              
              <button
                onClick={gerarRelatorioMensal}
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 text-white rounded-lg transition-all shadow-lg hover:shadow-blue-500/50 disabled:cursor-not-allowed"
              >
                <FileDown className="w-5 h-5" />
                <span>{loading ? 'Carregando...' : 'Gerar Relatório'}</span>
              </button>
            </div>

            {/* Curva ABC */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-8 border border-slate-700 shadow-xl hover:shadow-lg hover:border-green-500/50 transition-all">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center">
                  <TrendingUp className="w-8 h-8 text-green-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Curva ABC do Forecast</h3>
                  <p className="text-slate-400">Análise de classificação por valor previsto</p>
                </div>
              </div>
              
              <div className="space-y-4 mb-6">
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-2">Características:</h4>
                  <ul className="text-slate-300 text-sm space-y-1">
                    <li>• Classificação A, B, C por valor de forecast</li>
                    <li>• Estatísticas por categoria</li>
                    <li>• Participação percentual e acumulada</li>
                    <li>• Identificação de produtos estratégicos</li>
                    <li>• Formato otimizado para análise</li>
                  </ul>
                </div>
              </div>
              
              <button
                onClick={gerarCurvaABC}
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-500 disabled:bg-slate-600 text-white rounded-lg transition-all shadow-lg hover:shadow-green-500/50 disabled:cursor-not-allowed"
              >
                <BarChart3 className="w-5 h-5" />
                <span>{loading ? 'Carregando...' : 'Gerar Curva ABC'}</span>
              </button>
            </div>
          </div>

          {/* Status Info */}
          {!loading && forecastData.length === 0 && (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-8 border border-slate-700 shadow-xl">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-yellow-500/20 rounded-2xl flex items-center justify-center mx-auto">
                  <Package className="w-8 h-8 text-yellow-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Dados de Forecast Necessários</h3>
                <p className="text-slate-400 max-w-2xl mx-auto">
                  Para gerar os relatórios, primeiro importe os dados de forecast na seção de 
                  <span className="text-blue-400 font-medium"> Importação</span>. 
                  Os relatórios serão gerados automaticamente com base nos dados disponíveis.
                </p>
              </div>
            </div>
          )}

          {/* Data Summary */}
          {!loading && forecastData.length > 0 && (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700 shadow-xl">
              <div className="flex items-center justify-between text-slate-400">
                <div className="flex items-center space-x-4">
                  <p>
                    <span className="text-white font-medium">{forecastData.length}</span> previsões cadastradas
                  </p>
                  <p>
                    <span className="text-white font-medium">{negocios.length}</span> negócios
                  </p>
                </div>
                <div className="text-sm">
                  Use os filtros para personalizar os relatórios
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
