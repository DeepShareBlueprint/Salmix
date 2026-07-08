import { useState } from 'react';
import { useProdutos } from '@/react-app/hooks/useProdutos';
import Navbar from '@/react-app/components/Navbar';
import { Search } from 'lucide-react';

export default function Produtos() {
  const { produtos, loading } = useProdutos();
  const [searchTerm, setSearchTerm] = useState('');
  const [negocioFilter, setNegocioFilter] = useState('');

  const filteredProdutos = produtos.filter(p => {
    const matchesSearch = p.nome_produto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.codigo_produto.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesNegocio = !negocioFilter || p.fabricante === negocioFilter;
    return matchesSearch && matchesNegocio;
  });

  // Get unique negocios for filter
  const negocios = Array.from(new Set(produtos.map(p => p.fabricante).filter(Boolean)));

  

  const formatCurrency = (value: number | undefined) => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 pt-20 lg:pt-6 lg:ml-64">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Gestão de Produtos</h1>
              <p className="text-slate-400">Cadastro e gerenciamento de medicamentos veterinários</p>
            </div>
            
          </div>

          {/* Search and Filter Bar */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700 shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por nome ou código do produto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-700 text-white placeholder-slate-400 rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500 transition-all"
                />
              </div>
              <div className="relative">
                <select
                  value={negocioFilter}
                  onChange={(e) => setNegocioFilter(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 text-white placeholder-slate-400 rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
                >
                  <option value="">Todos os Negócios (SBU)</option>
                  {negocios.map(negocio => (
                    <option key={negocio} value={negocio}>{negocio}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 shadow-xl overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-white">Carregando produtos...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-900 border-b border-slate-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Código</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Nome</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Negócio (SBU)</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Preço</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Categoria</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {filteredProdutos.map((produto) => (
                      <tr key={produto.id} className="hover:bg-slate-700/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-blue-400 font-mono text-sm">{produto.codigo_produto}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-white font-medium">{produto.nome_produto}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-slate-300">{produto.fabricante || '-'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-green-400 font-medium">{formatCurrency(produto.preco_unitario)}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-slate-300">{produto.categoria || '-'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            produto.status === 'Ativo'
                              ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                              : 'bg-red-500/20 text-red-400 border border-red-500/50'
                          }`}>
                            {produto.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700 shadow-xl">
            <div className="flex items-center justify-between">
              <p className="text-slate-400">
                Exibindo <span className="text-white font-medium">{filteredProdutos.length}</span> de{' '}
                <span className="text-white font-medium">{produtos.length}</span> produtos
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
