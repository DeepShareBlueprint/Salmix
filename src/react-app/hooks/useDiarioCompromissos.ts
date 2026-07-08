import { useState, useEffect } from 'react';

export interface Compromisso {
  id?: number;
  vendedor_id: string;
  titulo: string;
  descricao?: string;
  data: string;
  data_fim?: string;
  hora: string;
  hora_termino?: string;
  tipo_atividade?: string;
  cliente_id?: string;
  observacao?: string;
  nome_cliente?: string;
  cidade?: string;
  created_at?: string;
  updated_at?: string;
}

export function useDiarioCompromissos() {
  const [compromissos, setCompromissos] = useState<Compromisso[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCompromissos = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/diario-compromissos');
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
  }, []);

  const addCompromisso = async (compromisso: Omit<Compromisso, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const response = await fetch('/api/diario-compromissos', {
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

  const updateCompromisso = async (id: number, compromisso: Partial<Compromisso>) => {
    try {
      const response = await fetch(`/api/diario-compromissos/${id}`, {
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
      const response = await fetch(`/api/diario-compromissos/${id}`, {
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
    refetch: fetchCompromissos,
  };
}
