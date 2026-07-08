import { useState, useEffect } from 'react';
import type { Produto } from '@/shared/types';

export function useProdutos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProdutos();
  }, []);

  const fetchProdutos = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/produtos');
      if (!response.ok) throw new Error('Erro ao carregar produtos');
      const data = await response.json();
      setProdutos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const createProduto = async (produto: Omit<Produto, 'id'>) => {
    const response = await fetch('/api/produtos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(produto),
    });
    if (!response.ok) throw new Error('Erro ao criar produto');
    await fetchProdutos();
  };

  const updateProduto = async (id: number, produto: Partial<Produto>) => {
    const response = await fetch(`/api/produtos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(produto),
    });
    if (!response.ok) throw new Error('Erro ao atualizar produto');
    await fetchProdutos();
  };

  const deleteProduto = async (id: number) => {
    const response = await fetch(`/api/produtos/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Erro ao deletar produto');
    await fetchProdutos();
  };

  return { produtos, loading, error, createProduto, updateProduto, deleteProduto, refetch: fetchProdutos };
}
