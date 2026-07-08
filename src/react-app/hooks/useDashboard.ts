import { useState, useEffect } from 'react';
import type { DashboardKPIs } from '@/shared/types';
import { obterCodigoNegocio } from '@/shared/negocio-mapping';

interface DashboardFilters {
  negocio?: string;
  representante?: string;
  dataInicio?: string;
  dataFim?: string;
}

export function useDashboard(filters?: DashboardFilters, userProfile?: {nivel_acesso: string; unidade_negocio?: string | null; vendedor?: string | null}) {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        fetchKPIs(filters);
      }
    }, 200); // Reduzido debounce para resposta mais rápida
    
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [filters?.negocio, filters?.representante, filters?.dataInicio, filters?.dataFim, userProfile?.nivel_acesso]);

  const fetchKPIs = async (currentFilters?: DashboardFilters) => {
    try {
      setLoading(true);
      
      // Construir query string com filtros
      const params = new URLSearchParams();
      
      // Converter nome de negócio para código antes de enviar
      if (currentFilters?.negocio) {
        const codigoNegocio = obterCodigoNegocio(currentFilters.negocio);
        if (codigoNegocio) {
          params.append('negocio', codigoNegocio);
        }
      }
      
      if (currentFilters?.representante) params.append('representante', currentFilters.representante);
      if (currentFilters?.dataInicio) params.append('dataInicio', currentFilters.dataInicio);
      if (currentFilters?.dataFim) params.append('dataFim', currentFilters.dataFim);
      
      // Filtro especial para Coord Tec Rum BR: apenas Ruminantes
      if (userProfile?.nivel_acesso === 'Coord Tec Rum BR') {
        params.append('nivel_acesso', 'Coord Tec Rum BR');
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
      
      const url = `/api/dashboard/kpis${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error('Erro ao carregar KPIs');
      const data = await response.json();
      setKpis(data);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Tempo limite excedido ao carregar KPIs');
      } else {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      }
    } finally {
      setLoading(false);
    }
  };

  return { kpis, loading, error, refetch: () => fetchKPIs(filters) };
}
