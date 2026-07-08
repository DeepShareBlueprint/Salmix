import { useState } from 'react';
import { CheckCircle, XCircle, Mail, Loader2 } from 'lucide-react';

export default function TesteEmail() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; recipients?: string[] } | null>(null);

  const handleTestEmail = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        message: 'Erro ao enviar e-mail de teste: ' + String(error),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Teste de Envio de E-mail</h1>
          </div>

          <p className="text-slate-600 mb-8">
            Clique no botão abaixo para enviar um e-mail de teste. O e-mail será enviado para todos os
            destinatários ativos cadastrados no sistema, sem criar nenhum pedido real no banco de dados.
          </p>

          <button
            onClick={handleTestEmail}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-6 rounded-xl font-semibold
                     hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl
                     disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Enviando e-mail de teste...
              </>
            ) : (
              <>
                <Mail className="w-5 h-5" />
                Enviar E-mail de Teste
              </>
            )}
          </button>

          {result && (
            <div
              className={`mt-6 p-4 rounded-xl flex items-start gap-3 ${
                result.success
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              {result.success ? (
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p
                  className={`font-semibold ${
                    result.success ? 'text-green-800' : 'text-red-800'
                  }`}
                >
                  {result.success ? 'Sucesso!' : 'Erro'}
                </p>
                <p
                  className={`text-sm mt-1 ${
                    result.success ? 'text-green-700' : 'text-red-700'
                  }`}
                >
                  {result.message}
                </p>
                {result.recipients && result.recipients.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-semibold text-green-800 mb-1">
                      Destinatários:
                    </p>
                    <ul className="text-sm text-green-700 space-y-1">
                      {result.recipients.map((email, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                          {email}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <p className="text-sm font-semibold text-blue-800 mb-2">Informações do E-mail de Teste:</p>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Assunto: Novo Pedido #TESTE-[timestamp]</li>
              <li>• Anexo: PDF com pedido de demonstração</li>
              <li>• Contém 3 produtos de exemplo</li>
              <li>• Inclui alerta de desconto fora da política</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
