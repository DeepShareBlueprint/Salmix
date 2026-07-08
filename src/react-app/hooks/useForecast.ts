import { useState, useEffect } from 'react';

interface ForecastData {
  id: number;
  mes: number;
  ano: number;
  codigo_produto: string;
  nome_produto: string;
  quantidade_prevista: number;
  preco_previsto?: number;
  negocio?: string;
  created_at: string;
  updated_at: string;
}

interface ForecastKPIs {
  metaDoMes: number;
  previsaoAtual: number;
  acuraciaMedia: number;
  produtosEmRisco: number;
  topProdutosForecast: Array<{
    produto: string;
    forecast: number;
    confidence: number;
  }>;
  forecastVsRealizado: Array<{
    mes: string;
    forecast: number;
    realizado: number;
  }>;
}

export function useForecast() {
  const [forecastData, setForecastData] = useState<ForecastData[]>([]);
  const [forecastKPIs, setForecastKPIs] = useState<ForecastKPIs | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchForecastData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/forecast');
      if (!response.ok) {
        throw new Error('Erro ao buscar dados de forecast');
      }
      const data = await response.json();
      setForecastData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const fetchForecastKPIs = async (periodo: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/forecast/kpis?periodo=${periodo}`);
      if (!response.ok) {
        throw new Error('Erro ao buscar KPIs de forecast');
      }
      const data = await response.json();
      setForecastKPIs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const createForecast = async (forecast: Omit<ForecastData, 'id' | 'created_at' | 'updated_at'>) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/forecast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(forecast),
      });
      
      if (!response.ok) {
        throw new Error('Erro ao criar forecast');
      }
      
      await fetchForecastData(); // Refresh data
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecastData();
  }, []);

  return {
    forecastData,
    forecastKPIs,
    loading,
    error,
    fetchForecastData,
    fetchForecastKPIs,
    createForecast,
  };
}
