import { useState, useEffect } from 'react';
import type { Venda } from '@/shared/types';

export interface VendasFilters {
  dataInicio?: string;
  dataFim?: string;
  representante?: string;
  regiao?: string;
  produto?: string;
  cliente?: string;
  valorMinimo?: number;
  valorMaximo?: number;
  negocio?: string;
}

export function useVendas() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [representantesBudget, setRepresentantesBudget] = useState<Array<{vendedor: string; nome_vendedor: string; regional: string}>>([]);
  const [clientes, setClientes] = useState<Array<{codigo_cliente: string; nome_cliente: string}>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVendas();
    fetchRepresentantesBudget();
    fetchClientesOptions();
  }, []);

  const fetchRepresentantesBudget = async (negocio?: string) => {
    try {
      const url = negocio 
        ? `/api/budget/representantes?negocio=${encodeURIComponent(negocio)}`
        : '/api/budget/representantes';
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setRepresentantesBudget(data);
      }
    } catch (err) {
      console.error('Erro ao carregar representantes:', err);
    }
  };

  const fetchClientesOptions = async (negocio?: string) => {
    try {
      // Limpar estado de clientes antes de buscar novos dados
      setClientes([]);
      
      const url = negocio 
        ? `/api/clientes?negocio=${encodeURIComponent(negocio)}`
        : '/api/clientes';
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setClientes(data);
      }
    } catch (err) {
      console.error('Erro ao carregar clientes:', err);
      setClientes([]);
    }
  };

  const fetchVendas = async (filters?: VendasFilters, userProfile?: {nivel_acesso: string}) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      // Enviar TODOS os filtros para o backend, incluindo secundários
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, value.toString());
          }
        });
      }
      
      // Filtro especial para Coord Tec Rum BR: bloquear vendedor 3633
      if (userProfile?.nivel_acesso === 'Coord Tec Rum BR') {
        params.append('nivel_acesso', 'Coord Tec Rum BR');
        params.append('vendedor_bloqueado', '3633');
      }
      
      // Adicionar timestamp para evitar cache
      params.append('_t', Date.now().toString());
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
      
      const response = await fetch(`/api/vendas?${params.toString()}`, {
        signal: controller.signal,
        cache: 'no-store'
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error('Erro ao carregar vendas');
      const data = await response.json();
      setVendas(data);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Tempo limite excedido ao carregar vendas');
      } else {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      }
    } finally {
      setLoading(false);
    }
  };

  const createVenda = async (venda: Omit<Venda, 'id'>) => {
    const response = await fetch('/api/vendas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(venda),
    });
    if (!response.ok) throw new Error('Erro ao criar venda');
    await fetchVendas();
  };

  const updateVenda = async (id: number, venda: Partial<Venda>) => {
    const response = await fetch(`/api/vendas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(venda),
    });
    if (!response.ok) throw new Error('Erro ao atualizar venda');
    await fetchVendas();
  };

  const deleteVenda = async (id: number) => {
    const response = await fetch(`/api/vendas/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Erro ao deletar venda');
    await fetchVendas();
  };

  const getFilterOptions = (currentFilters?: VendasFilters) => {
    // Filtrar vendas baseado no negócio selecionado
    let vendasFiltradas = vendas;
    if (currentFilters?.negocio) {
      vendasFiltradas = vendas.filter(v => v.negocio === currentFilters.negocio);
    }
    
    // Para representantes, usar apenas a tabela vendedores (via representantesBudget)
    // que já está filtrada por negócio no backend
    const todosRepresentantes = representantesBudget;
    
    const regioes = [...new Set(vendasFiltradas.map(v => v.regiao).filter(Boolean))].sort();
    const produtos = [...new Set(vendasFiltradas.map(v => v.nome_produto).filter(Boolean))].sort();
    
    // Retornar clientes diretamente da lista carregada (já filtrada por negócio no backend)
    const clientesNomes = clientes.map(c => c.nome_cliente).filter(Boolean).sort();
    
    const negocios = [...new Set(vendas.map(v => v.negocio).filter(Boolean))].sort();
    
    return { 
      representantes: todosRepresentantes, 
      regioes, 
      produtos, 
      clientes: clientesNomes, 
      negocios 
    };
  };

  return { 
    vendas, 
    loading, 
    error, 
    createVenda, 
    updateVenda, 
    deleteVenda, 
    fetchVendas,
    fetchClientesOptions,
    fetchRepresentantesBudget,
    getFilterOptions,
    refetch: fetchVendas,
    clientes: clientes // Expor array de clientes para debug
  };
}
