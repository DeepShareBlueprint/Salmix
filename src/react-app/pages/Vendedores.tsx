import { useState } from 'react';
import { useVendedores } from '@/react-app/hooks/useVendedores';
import Navbar from '@/react-app/components/Navbar';
import { Search } from 'lucide-react';

export default function Vendedores() {
  const { vendedores, loading } = useVendedores();
  const [searchTerm, setSearchTerm] = useState('');
  const [negocioFilter, setNegocioFilter] = useState('');

  const filteredVendedores = vendedores.filter(v => {
    const matchesSearch = v.nome_vendedor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.vendedor.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesNegocio = !negocioFilter || v.negocio === negocioFilter;
    return matchesSearch && matchesNegocio;
  });

  const negocios = Array.from(new Set(vendedores.map(v => v.negocio).filter(Boolean)));

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 pt-20 lg:pt-6 lg:ml-64">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Vendedores</h1>
              <p className="text-slate-400">Cadastro de vendedores e representantes</p>
            </div>
          </div>

          {/* Search and Filter Bar */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 border border-slate-700 shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por nome ou código do vendedor..."
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

          {/* Vendedores Table */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 shadow-xl overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-white">Carregando vendedores...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-900 border-b border-slate-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Código</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Nome</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Negócio (SBU)</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Regional</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {filteredVendedores.map((vendedor) => (
                      <tr key={vendedor.id} className="hover:bg-slate-700/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-blue-400 font-mono text-sm">{vendedor.vendedor}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-white font-medium">{vendedor.nome_vendedor}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-slate-300">{vendedor.negocio || '-'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-slate-300">{vendedor.regional || '-'}</span>
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
                Exibindo <span className="text-white font-medium">{filteredVendedores.length}</span> de{' '}
                <span className="text-white font-medium">{vendedores.length}</span> vendedores
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
