import { useState, useEffect } from 'react';
import type { Agenda, AgendaWithCliente } from '@/shared/types';

export function useAgenda(vendedorFiltro?: string) {
  const [compromissos, setCompromissos] = useState<AgendaWithCliente[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCompromissos = async () => {
    try {
      const url = vendedorFiltro 
        ? `/api/agenda?vendedor_id=${encodeURIComponent(vendedorFiltro)}`
        : '/api/agenda';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setCompromissos(data);
      }
    } catch (error) {
      console.error('Erro ao buscar compromissos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompromissos();
  }, [vendedorFiltro]);

  const addCompromisso = async (compromisso: Omit<Agenda, 'id'>) => {
    try {
      const response = await fetch('/api/agenda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(compromisso),
      });

      if (response.ok) {
        await fetchCompromissos();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro ao adicionar compromisso:', error);
      return false;
    }
  };

  const updateCompromisso = async (id: number, compromisso: Omit<Agenda, 'id'>) => {
    try {
      const response = await fetch(`/api/agenda/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(compromisso),
      });

      if (response.ok) {
        await fetchCompromissos();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro ao atualizar compromisso:', error);
      return false;
    }
  };

  const deleteCompromisso = async (id: number) => {
    try {
      const response = await fetch(`/api/agenda/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchCompromissos();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro ao deletar compromisso:', error);
      return false;
    }
  };

  return {
    compromissos,
    loading,
    addCompromisso,
    updateCompromisso,
    deleteCompromisso,
    refresh: fetchCompromissos,
  };
}
