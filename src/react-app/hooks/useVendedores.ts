import { useEffect, useState } from 'react';
import type { Vendedor } from '@/shared/types';

export function useVendedores() {
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVendedores();
  }, []);

  const fetchVendedores = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/vendedores');
      if (!response.ok) throw new Error('Erro ao carregar vendedores');
      const data = await response.json();
      setVendedores(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  return { vendedores, loading, error, refetch: fetchVendedores };
}
