import Navbar from '@/react-app/components/Navbar';
import { Database } from 'lucide-react';

export default function Estoque() {
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 pt-20 lg:pt-6 lg:ml-64">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Gestão de Estoque</h1>
              <p className="text-slate-400">Controle de inventário e alertas de reposição</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-12 border border-slate-700 shadow-xl text-center">
            <Database className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Módulo de Estoque</h3>
            <p className="text-slate-400">Funcionalidade em desenvolvimento</p>
          </div>
        </div>
      </div>
    </>
  );
}
