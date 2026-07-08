import { useState, useEffect } from 'react';
import type { Order, Cliente, Inventory, PriceTable } from '@/shared/types';

export function usePedidos() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [priceTable, setPriceTable] = useState<PriceTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders');
      if (!response.ok) throw new Error('Erro ao buscar pedidos');
      const data = await response.json();
      setOrders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  };

  const fetchClientes = async () => {
    try {
      const response = await fetch('/api/clientes');
      if (!response.ok) throw new Error('Erro ao buscar clientes');
      const data = await response.json();
      setClientes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  };

  const fetchInventory = async () => {
    try {
      const response = await fetch('/api/inventory');
      if (!response.ok) throw new Error('Erro ao buscar estoque');
      const data = await response.json();
      setInventory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  };

  const fetchPriceTable = async () => {
    try {
      const response = await fetch('/api/price-table');
      if (!response.ok) throw new Error('Erro ao buscar tabela de preços');
      const data = await response.json();
      setPriceTable(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchOrders(),
        fetchClientes(),
        fetchInventory(),
        fetchPriceTable(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  

  const getProductInventory = (productId: string) => {
    return inventory.filter(item => item.product_id === productId);
  };

  const getProductPrice = (productId: string) => {
    return priceTable.find(item => item.product_id === productId);
  };

  return {
    orders,
    clientes,
    inventory,
    priceTable,
    loading,
    error,
    getProductInventory,
    getProductPrice,
    refetch: fetchAll,
  };
}
