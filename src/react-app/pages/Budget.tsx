import { useState, useEffect } from 'react';
import Navbar from '@/react-app/components/Navbar';
import { TrendingUp, DollarSign, Calendar, Loader2, Filter, RefreshCw, Printer } from 'lucide-react';

interface BudgetData {
  id: number;
  negocio: string;
  vendedor: string;
  nome_vendedor: string;
  nome_negocio: string;
  regional: string;
  jan_25: number;
  fev_25: number;
  mar_25: number;
  abr_25: number;
  mai_25: number;
  jun_25: number;
  jul_25: number;
  ago_25: number;
  set_25: number;
  out_25: number;
  nov_25: number;
  dez_25: number;
  jan_26: number;
  fev_26: number;
  mar_26: number;
  abr_26: number;
  mai_26: number;
  jun_26: number;
  jul_26: number;
  ago_26: number;
  set_26: number;
  out_26: number;
  nov_26: number;
  dez_26: number;
}

export default function Budget() {
  const [budgetData, setBudgetData] = useState<BudgetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    negocio: '',
    vendedor: '',
    ano: '2025'
  });
  const [showFilters, setShowFilters] = useState(true);

  useEffect(() => {
    fetchBudgetData();
  }, []);

  const fetchBudgetData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/budget');
      if (!response.ok) throw new Error('Erro ao carregar dados de budget');
      const data = await response.json();
      setBudgetData(data);
    } catch (error) {
      console.error('Erro ao carregar budget:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      negocio: '',
      vendedor: '',
      ano: '2025'
    });
  };

  // Aplicar filtros aos dados
  const filteredData = budgetData.filter(item => {
    const matchNegocio = !filters.negocio || item.negocio === filters.negocio;
    const matchVendedor = !filters.vendedor || item.vendedor === filters.vendedor;
    return matchNegocio && matchVendedor;
  });

  // Obter valores únicos para os filtros com código e nome
  const negociosMap = new Map<string, string>();
  budgetData.forEach(item => {
    if (item.negocio && item.nome_negocio) {
      negociosMap.set(item.negocio, item.nome_negocio);
    }
  });
  const negocios = Array.from(negociosMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([codigo, nome]) => ({ codigo, nome }));

  const vendedoresMap = new Map<string, string>();
  budgetData.forEach(item => {
    // Only include vendedores from the selected negocio
    const matchNegocio = !filters.negocio || item.negocio === filters.negocio;
    if (matchNegocio && item.vendedor && item.nome_vendedor) {
      vendedoresMap.set(item.vendedor, item.nome_vendedor);
    }
  });
  const vendedores = Array.from(vendedoresMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([codigo, nome]) => ({ codigo, nome }));

  // Calcular totais por trimestre e geral
  const calculateTotals = () => {
    const totais = {
      q1: 0, q2: 0, q3: 0, q4: 0,
      jan: 0, fev: 0, mar: 0, abr: 0, mai: 0, jun: 0,
      jul: 0, ago: 0, set: 0, out: 0, nov: 0, dez: 0,
      geral: 0
    };

    const ano = filters.ano;
    const suffix = ano === '2025' ? '_25' : '_26';

    filteredData.forEach(item => {
      // Q1
      totais.jan += (item as any)[`jan${suffix}`] || 0;
      totais.fev += (item as any)[`fev${suffix}`] || 0;
      totais.mar += (item as any)[`mar${suffix}`] || 0;
      totais.q1 += ((item as any)[`jan${suffix}`] || 0) + ((item as any)[`fev${suffix}`] || 0) + ((item as any)[`mar${suffix}`] || 0);

      // Q2
      totais.abr += (item as any)[`abr${suffix}`] || 0;
      totais.mai += (item as any)[`mai${suffix}`] || 0;
      totais.jun += (item as any)[`jun${suffix}`] || 0;
      totais.q2 += ((item as any)[`abr${suffix}`] || 0) + ((item as any)[`mai${suffix}`] || 0) + ((item as any)[`jun${suffix}`] || 0);

      // Q3
      totais.jul += (item as any)[`jul${suffix}`] || 0;
      totais.ago += (item as any)[`ago${suffix}`] || 0;
      totais.set += (item as any)[`set${suffix}`] || 0;
      totais.q3 += ((item as any)[`jul${suffix}`] || 0) + ((item as any)[`ago${suffix}`] || 0) + ((item as any)[`set${suffix}`] || 0);

      // Q4
      totais.out += (item as any)[`out${suffix}`] || 0;
      totais.nov += (item as any)[`nov${suffix}`] || 0;
      totais.dez += (item as any)[`dez${suffix}`] || 0;
      totais.q4 += ((item as any)[`out${suffix}`] || 0) + ((item as any)[`nov${suffix}`] || 0) + ((item as any)[`dez${suffix}`] || 0);
    });

    totais.geral = totais.q1 + totais.q2 + totais.q3 + totais.q4;
    return totais;
  };

  const totals = calculateTotals();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 pt-20 lg:pt-6 lg:ml-64">
          <div className="max-w-7xl mx-auto flex items-center justify-center h-64">
            <div className="flex items-center space-x-3 text-white">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Carregando dados de budget...</span>
            </div>
          </div>
        </div>
      </>
    );
  }

  const ano = filters.ano;
  const suffix = ano === '2025' ? '_25' : '_26';

  return (
    <>
      <style>{`
        @media print {
          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          @page {
            size: landscape;
            margin: 1.5cm;
          }
          
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            font-family: 'Arial', 'Helvetica', sans-serif;
          }
          
          body > div:first-child {
            margin: 0 !important;
            padding: 0 !important;
          }
          
          aside, nav, button, .no-print, header, .navbar {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          .print-container {
            margin: 0 !important;
            padding: 0 !important;
            background: white;
            width: 100%;
            position: relative;
          }
          
          .print-header {
            margin: 0 0 30px 0 !important;
            padding: 0 0 20px 0 !important;
            border-bottom: 3px solid #000000;
            background: white;
            position: relative;
          }
          
          .print-title {
            font-size: 28px;
            font-weight: bold;
            color: #000000;
            margin: 0 0 8px 0 !important;
            padding: 0 !important;
            text-align: center;
            letter-spacing: 0.5px;
            background: white;
          }
          
          .print-subtitle {
            font-size: 14px;
            color: #333333;
            margin: 0 0 15px 0;
            text-align: center;
          }
          
          .print-filters {
            display: flex;
            justify-content: center;
            gap: 20px;
            font-size: 11px;
            color: #000000;
            margin-top: 10px;
          }
          
          .print-filter-item {
            padding: 4px 12px;
            background: #f5f5f5;
            border-radius: 4px;
            border: 1px solid #cccccc;
          }
          
          .print-filter-label {
            font-weight: 600;
            color: #000000;
          }
          
          .print-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9px;
            margin-top: 0;
          }
          
          .print-table thead tr:first-child th {
            background: #e0e0e0;
            color: #000000;
            font-weight: 600;
            padding: 8px 4px;
            text-align: center;
            border: 1px solid #999999;
            font-size: 9px;
            letter-spacing: 0.3px;
          }
          
          .print-table thead tr:nth-child(2) th {
            background: #e0e0e0;
            color: #000000;
            font-weight: 600;
            padding: 6px 4px;
            text-align: center;
            border: 1px solid #999999;
            font-size: 8px;
          }
          
          .print-table tbody tr {
            border-bottom: 1px solid #cccccc;
          }
          
          .print-table tbody tr:nth-child(even) {
            background: #fafafa;
          }
          
          .print-table tbody td {
            padding: 6px 4px;
            border: 1px solid #cccccc;
            color: #000000;
            text-align: center;
            font-size: 9px;
          }
          
          .print-table tbody td:nth-child(1),
          .print-table tbody td:nth-child(2),
          .print-table tbody td:nth-child(3),
          .print-table tbody td:nth-child(4) {
            text-align: left;
            font-weight: 500;
          }
          
          .print-table tfoot tr {
            background: #e0e0e0;
            color: #000000;
            font-weight: bold;
          }
          
          .print-table tfoot td {
            padding: 8px 4px;
            border: 1px solid #999999;
            text-align: center;
            font-size: 9px;
          }
          
          .print-table tfoot td:first-child {
            text-align: left;
            font-size: 10px;
            letter-spacing: 0.5px;
          }
          
          .q-total {
            background: #e0e0e0 !important;
            font-weight: 600;
            color: #000000;
          }
          
          .quarter-header-q1 {
            background: #e0e0e0 !important;
          }
          
          .quarter-header-q2 {
            background: #e0e0e0 !important;
          }
          
          .quarter-header-q3 {
            background: #e0e0e0 !important;
          }
          
          .quarter-header-q4 {
            background: #e0e0e0 !important;
          }
          
          .print-footer {
            margin-top: 20px;
            padding-top: 15px;
            border-top: 2px solid #cccccc;
            font-size: 9px;
            color: #333333;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .print-date {
            font-style: italic;
          }
          
          .print-page {
            font-weight: 600;
          }
        }
        
        @media screen {
          .print-only {
            display: none;
          }
        }
      `}</style>
      
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 pt-20 lg:pt-6 lg:ml-64 print:ml-0 print:p-0 print:bg-white">
        {/* Print Layout */}
        <div className="print-only print-container">
          <div className="print-header">
            <h1 className="print-title">Budget de Vendas</h1>
            <p className="print-subtitle">Planejamento orçamentário por vendedor e unidade de negócio</p>
            <div className="print-filters">
              <div className="print-filter-item">
                <span className="print-filter-label">Período:</span> {ano}
              </div>
              {filters.negocio && (
                <div className="print-filter-item">
                  <span className="print-filter-label">Negócio:</span> {negocios.find(n => n.codigo === filters.negocio)?.nome || filters.negocio}
                </div>
              )}
              {filters.vendedor && (
                <div className="print-filter-item">
                  <span className="print-filter-label">Vendedor:</span> {vendedores.find(v => v.codigo === filters.vendedor)?.nome || filters.vendedor}
                </div>
              )}
            </div>
          </div>

          <table className="print-table">
            <thead>
              <tr>
                <th rowSpan={2}>Negócio</th>
                <th rowSpan={2}>Vendedor</th>
                <th rowSpan={2}>Nome</th>
                <th rowSpan={2}>Regional</th>
                <th colSpan={4} className="quarter-header-q1">Q1 {ano}</th>
                <th colSpan={4} className="quarter-header-q2">Q2 {ano}</th>
                <th colSpan={4} className="quarter-header-q3">Q3 {ano}</th>
                <th colSpan={4} className="quarter-header-q4">Q4 {ano}</th>
                <th rowSpan={2}>Total</th>
              </tr>
              <tr>
                <th>Jan</th>
                <th>Fev</th>
                <th>Mar</th>
                <th className="q-total">Q1</th>
                <th>Abr</th>
                <th>Mai</th>
                <th>Jun</th>
                <th className="q-total">Q2</th>
                <th>Jul</th>
                <th>Ago</th>
                <th>Set</th>
                <th className="q-total">Q3</th>
                <th>Out</th>
                <th>Nov</th>
                <th>Dez</th>
                <th className="q-total">Q4</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item) => {
                const q1 = ((item as any)[`jan${suffix}`] || 0) + ((item as any)[`fev${suffix}`] || 0) + ((item as any)[`mar${suffix}`] || 0);
                const q2 = ((item as any)[`abr${suffix}`] || 0) + ((item as any)[`mai${suffix}`] || 0) + ((item as any)[`jun${suffix}`] || 0);
                const q3 = ((item as any)[`jul${suffix}`] || 0) + ((item as any)[`ago${suffix}`] || 0) + ((item as any)[`set${suffix}`] || 0);
                const q4 = ((item as any)[`out${suffix}`] || 0) + ((item as any)[`nov${suffix}`] || 0) + ((item as any)[`dez${suffix}`] || 0);
                const total = q1 + q2 + q3 + q4;

                return (
                  <tr key={item.id}>
                    <td>{item.negocio}</td>
                    <td>{item.vendedor}</td>
                    <td>{item.nome_vendedor || '-'}</td>
                    <td>{item.regional || '-'}</td>
                    <td>{formatCurrency((item as any)[`jan${suffix}`] || 0)}</td>
                    <td>{formatCurrency((item as any)[`fev${suffix}`] || 0)}</td>
                    <td>{formatCurrency((item as any)[`mar${suffix}`] || 0)}</td>
                    <td className="q-total">{formatCurrency(q1)}</td>
                    <td>{formatCurrency((item as any)[`abr${suffix}`] || 0)}</td>
                    <td>{formatCurrency((item as any)[`mai${suffix}`] || 0)}</td>
                    <td>{formatCurrency((item as any)[`jun${suffix}`] || 0)}</td>
                    <td className="q-total">{formatCurrency(q2)}</td>
                    <td>{formatCurrency((item as any)[`jul${suffix}`] || 0)}</td>
                    <td>{formatCurrency((item as any)[`ago${suffix}`] || 0)}</td>
                    <td>{formatCurrency((item as any)[`set${suffix}`] || 0)}</td>
                    <td className="q-total">{formatCurrency(q3)}</td>
                    <td>{formatCurrency((item as any)[`out${suffix}`] || 0)}</td>
                    <td>{formatCurrency((item as any)[`nov${suffix}`] || 0)}</td>
                    <td>{formatCurrency((item as any)[`dez${suffix}`] || 0)}</td>
                    <td className="q-total">{formatCurrency(q4)}</td>
                    <td>{formatCurrency(total)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}>TOTAL GERAL</td>
                <td>{formatCurrency(totals.jan)}</td>
                <td>{formatCurrency(totals.fev)}</td>
                <td>{formatCurrency(totals.mar)}</td>
                <td>{formatCurrency(totals.q1)}</td>
                <td>{formatCurrency(totals.abr)}</td>
                <td>{formatCurrency(totals.mai)}</td>
                <td>{formatCurrency(totals.jun)}</td>
                <td>{formatCurrency(totals.q2)}</td>
                <td>{formatCurrency(totals.jul)}</td>
                <td>{formatCurrency(totals.ago)}</td>
                <td>{formatCurrency(totals.set)}</td>
                <td>{formatCurrency(totals.q3)}</td>
                <td>{formatCurrency(totals.out)}</td>
                <td>{formatCurrency(totals.nov)}</td>
                <td>{formatCurrency(totals.dez)}</td>
                <td>{formatCurrency(totals.q4)}</td>
                <td>{formatCurrency(totals.geral)}</td>
              </tr>
            </tfoot>
          </table>

          <div className="print-footer">
            <div className="print-date">
              Gerado em: {new Date().toLocaleDateString('pt-BR', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
            <div className="print-page">Budget de Vendas - {ano}</div>
          </div>
        </div>

        {/* Screen Layout */}
        <div className="max-w-[1600px] mx-auto space-y-6 no-print">
          {/* Header - Screen only */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Budget de Vendas</h1>
              <p className="text-slate-400">Planejamento orçamentário por vendedor e unidade de negócio</p>
              {filteredData.length > 0 && (
                <p className="text-slate-500 text-sm mt-1">
                  {filteredData.length} registros encontrados
                </p>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handlePrint}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all shadow-lg shadow-green-600/50"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir</span>
              </button>
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

          {/* Filters Panel - Screen only */}
          {showFilters && (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                  <Filter className="w-5 h-5 text-blue-400" />
                  <span>Filtros</span>
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
                    Ano do Budget
                  </label>
                  <select
                    value={filters.ano}
                    onChange={(e) => setFilters(prev => ({ ...prev, ano: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500"
                  >
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                  </select>
                </div>

                {/* Negócio */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Unidade de Negócio
                  </label>
                  <select
                    value={filters.negocio}
                    onChange={(e) => setFilters(prev => ({ ...prev, negocio: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Todos</option>
                    {negocios.map(negocio => (
                      <option key={negocio.codigo} value={negocio.codigo}>
                        {negocio.codigo}, {negocio.nome}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Vendedor */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Vendedor
                  </label>
                  <select
                    value={filters.vendedor}
                    onChange={(e) => setFilters(prev => ({ ...prev, vendedor: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Todos</option>
                    {vendedores.map(vendedor => (
                      <option key={vendedor.codigo} value={vendedor.codigo}>
                        {vendedor.codigo}, {vendedor.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Summary Cards - Screen only */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700 shadow-xl">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Q1 {ano}</p>
                  <p className="text-white font-bold text-sm">{formatCurrency(totals.q1)}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700 shadow-xl">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Q2 {ano}</p>
                  <p className="text-white font-bold text-sm">{formatCurrency(totals.q2)}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700 shadow-xl">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Q3 {ano}</p>
                  <p className="text-white font-bold text-sm">{formatCurrency(totals.q3)}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700 shadow-xl">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Q4 {ano}</p>
                  <p className="text-white font-bold text-sm">{formatCurrency(totals.q4)}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-4 border border-blue-500 shadow-xl shadow-blue-500/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-blue-100 text-xs">Total {ano}</p>
                  <p className="text-white font-bold text-sm">{formatCurrency(totals.geral)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Budget Table */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-700/50">
                    <th rowSpan={2} className="px-4 py-3 text-left text-xs font-semibold text-white border-r border-slate-600">
                      Negócio
                    </th>
                    <th rowSpan={2} className="px-4 py-3 text-left text-xs font-semibold text-white border-r border-slate-600">
                      Vendedor
                    </th>
                    <th rowSpan={2} className="px-4 py-3 text-left text-xs font-semibold text-white border-r border-slate-600">
                      Nome
                    </th>
                    <th rowSpan={2} className="px-4 py-3 text-left text-xs font-semibold text-white border-r border-slate-600">
                      Regional
                    </th>
                    <th colSpan={4} className="px-4 py-2 text-center text-xs font-semibold text-blue-300 border-r border-slate-600 bg-blue-900/30">
                      Q1 {ano}
                    </th>
                    <th colSpan={4} className="px-4 py-2 text-center text-xs font-semibold text-green-300 border-r border-slate-600 bg-green-900/30">
                      Q2 {ano}
                    </th>
                    <th colSpan={4} className="px-4 py-2 text-center text-xs font-semibold text-yellow-300 border-r border-slate-600 bg-yellow-900/30">
                      Q3 {ano}
                    </th>
                    <th colSpan={4} className="px-4 py-2 text-center text-xs font-semibold text-purple-300 border-r border-slate-600 bg-purple-900/30">
                      Q4 {ano}
                    </th>
                    <th rowSpan={2} className="px-4 py-3 text-center text-xs font-semibold text-white bg-slate-600">
                      Total
                    </th>
                  </tr>
                  <tr className="bg-slate-700/30">
                    {/* Q1 */}
                    <th className="px-2 py-2 text-center text-xs font-medium text-slate-300">Jan</th>
                    <th className="px-2 py-2 text-center text-xs font-medium text-slate-300">Fev</th>
                    <th className="px-2 py-2 text-center text-xs font-medium text-slate-300">Mar</th>
                    <th className="px-2 py-2 text-center text-xs font-medium text-blue-300 border-r border-slate-600 bg-blue-900/20">Q1</th>
                    {/* Q2 */}
                    <th className="px-2 py-2 text-center text-xs font-medium text-slate-300">Abr</th>
                    <th className="px-2 py-2 text-center text-xs font-medium text-slate-300">Mai</th>
                    <th className="px-2 py-2 text-center text-xs font-medium text-slate-300">Jun</th>
                    <th className="px-2 py-2 text-center text-xs font-medium text-green-300 border-r border-slate-600 bg-green-900/20">Q2</th>
                    {/* Q3 */}
                    <th className="px-2 py-2 text-center text-xs font-medium text-slate-300">Jul</th>
                    <th className="px-2 py-2 text-center text-xs font-medium text-slate-300">Ago</th>
                    <th className="px-2 py-2 text-center text-xs font-medium text-slate-300">Set</th>
                    <th className="px-2 py-2 text-center text-xs font-medium text-yellow-300 border-r border-slate-600 bg-yellow-900/20">Q3</th>
                    {/* Q4 */}
                    <th className="px-2 py-2 text-center text-xs font-medium text-slate-300">Out</th>
                    <th className="px-2 py-2 text-center text-xs font-medium text-slate-300">Nov</th>
                    <th className="px-2 py-2 text-center text-xs font-medium text-slate-300">Dez</th>
                    <th className="px-2 py-2 text-center text-xs font-medium text-purple-300 border-r border-slate-600 bg-purple-900/20">Q4</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {filteredData.map((item) => {
                    const q1 = ((item as any)[`jan${suffix}`] || 0) + ((item as any)[`fev${suffix}`] || 0) + ((item as any)[`mar${suffix}`] || 0);
                    const q2 = ((item as any)[`abr${suffix}`] || 0) + ((item as any)[`mai${suffix}`] || 0) + ((item as any)[`jun${suffix}`] || 0);
                    const q3 = ((item as any)[`jul${suffix}`] || 0) + ((item as any)[`ago${suffix}`] || 0) + ((item as any)[`set${suffix}`] || 0);
                    const q4 = ((item as any)[`out${suffix}`] || 0) + ((item as any)[`nov${suffix}`] || 0) + ((item as any)[`dez${suffix}`] || 0);
                    const total = q1 + q2 + q3 + q4;

                    return (
                      <tr key={item.id} className="hover:bg-slate-700/30 transition-colors">
                        <td className="px-4 py-3 text-xs text-white border-r border-slate-700">{item.negocio}</td>
                        <td className="px-4 py-3 text-xs text-slate-300 border-r border-slate-700">{item.vendedor}</td>
                        <td className="px-4 py-3 text-xs text-slate-300 border-r border-slate-700">{item.nome_vendedor || '-'}</td>
                        <td className="px-4 py-3 text-xs text-slate-300 border-r border-slate-700">{item.regional || '-'}</td>
                        {/* Q1 */}
                        <td className="px-2 py-3 text-xs text-center text-slate-300">{formatCurrency((item as any)[`jan${suffix}`] || 0)}</td>
                        <td className="px-2 py-3 text-xs text-center text-slate-300">{formatCurrency((item as any)[`fev${suffix}`] || 0)}</td>
                        <td className="px-2 py-3 text-xs text-center text-slate-300">{formatCurrency((item as any)[`mar${suffix}`] || 0)}</td>
                        <td className="px-2 py-3 text-xs text-center text-blue-300 font-semibold border-r border-slate-700 bg-blue-900/10">{formatCurrency(q1)}</td>
                        {/* Q2 */}
                        <td className="px-2 py-3 text-xs text-center text-slate-300">{formatCurrency((item as any)[`abr${suffix}`] || 0)}</td>
                        <td className="px-2 py-3 text-xs text-center text-slate-300">{formatCurrency((item as any)[`mai${suffix}`] || 0)}</td>
                        <td className="px-2 py-3 text-xs text-center text-slate-300">{formatCurrency((item as any)[`jun${suffix}`] || 0)}</td>
                        <td className="px-2 py-3 text-xs text-center text-green-300 font-semibold border-r border-slate-700 bg-green-900/10">{formatCurrency(q2)}</td>
                        {/* Q3 */}
                        <td className="px-2 py-3 text-xs text-center text-slate-300">{formatCurrency((item as any)[`jul${suffix}`] || 0)}</td>
                        <td className="px-2 py-3 text-xs text-center text-slate-300">{formatCurrency((item as any)[`ago${suffix}`] || 0)}</td>
                        <td className="px-2 py-3 text-xs text-center text-slate-300">{formatCurrency((item as any)[`set${suffix}`] || 0)}</td>
                        <td className="px-2 py-3 text-xs text-center text-yellow-300 font-semibold border-r border-slate-700 bg-yellow-900/10">{formatCurrency(q3)}</td>
                        {/* Q4 */}
                        <td className="px-2 py-3 text-xs text-center text-slate-300">{formatCurrency((item as any)[`out${suffix}`] || 0)}</td>
                        <td className="px-2 py-3 text-xs text-center text-slate-300">{formatCurrency((item as any)[`nov${suffix}`] || 0)}</td>
                        <td className="px-2 py-3 text-xs text-center text-slate-300">{formatCurrency((item as any)[`dez${suffix}`] || 0)}</td>
                        <td className="px-2 py-3 text-xs text-center text-purple-300 font-semibold border-r border-slate-700 bg-purple-900/10">{formatCurrency(q4)}</td>
                        {/* Total */}
                        <td className="px-4 py-3 text-xs text-center text-white font-bold bg-slate-600">{formatCurrency(total)}</td>
                      </tr>
                    );
                  })}
                  {/* Totals Row */}
                  <tr className="bg-slate-600 font-bold">
                    <td colSpan={4} className="px-4 py-3 text-xs text-white border-r border-slate-500">TOTAL GERAL</td>
                    {/* Q1 */}
                    <td className="px-2 py-3 text-xs text-center text-white">{formatCurrency(totals.jan)}</td>
                    <td className="px-2 py-3 text-xs text-center text-white">{formatCurrency(totals.fev)}</td>
                    <td className="px-2 py-3 text-xs text-center text-white">{formatCurrency(totals.mar)}</td>
                    <td className="px-2 py-3 text-xs text-center text-blue-200 border-r border-slate-500 bg-blue-800">{formatCurrency(totals.q1)}</td>
                    {/* Q2 */}
                    <td className="px-2 py-3 text-xs text-center text-white">{formatCurrency(totals.abr)}</td>
                    <td className="px-2 py-3 text-xs text-center text-white">{formatCurrency(totals.mai)}</td>
                    <td className="px-2 py-3 text-xs text-center text-white">{formatCurrency(totals.jun)}</td>
                    <td className="px-2 py-3 text-xs text-center text-green-200 border-r border-slate-500 bg-green-800">{formatCurrency(totals.q2)}</td>
                    {/* Q3 */}
                    <td className="px-2 py-3 text-xs text-center text-white">{formatCurrency(totals.jul)}</td>
                    <td className="px-2 py-3 text-xs text-center text-white">{formatCurrency(totals.ago)}</td>
                    <td className="px-2 py-3 text-xs text-center text-white">{formatCurrency(totals.set)}</td>
                    <td className="px-2 py-3 text-xs text-center text-yellow-200 border-r border-slate-500 bg-yellow-800">{formatCurrency(totals.q3)}</td>
                    {/* Q4 */}
                    <td className="px-2 py-3 text-xs text-center text-white">{formatCurrency(totals.out)}</td>
                    <td className="px-2 py-3 text-xs text-center text-white">{formatCurrency(totals.nov)}</td>
                    <td className="px-2 py-3 text-xs text-center text-white">{formatCurrency(totals.dez)}</td>
                    <td className="px-2 py-3 text-xs text-center text-purple-200 border-r border-slate-500 bg-purple-800">{formatCurrency(totals.q4)}</td>
                    {/* Total */}
                    <td className="px-4 py-3 text-xs text-center text-white bg-slate-700">{formatCurrency(totals.geral)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Empty State */}
          {filteredData.length === 0 && (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-8 border border-slate-700 shadow-xl">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-yellow-500/20 rounded-2xl flex items-center justify-center mx-auto">
                  <Calendar className="w-8 h-8 text-yellow-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Nenhum dado de budget encontrado</h3>
                <p className="text-slate-400 max-w-2xl mx-auto">
                  Importe os dados de budget na seção de <span className="text-blue-400 font-medium">Importação</span> para visualizar o planejamento orçamentário.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
