import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Cliente {
  id: string;
  nome: string;
  codigo: string;
  cidade: string;
  estado: string;
  latitude: number | null;
  longitude: number | null;
  distancia?: number;
  prioridade: 'alta' | 'media' | 'atencao';
}

interface RotaMapProps {
  localizacaoUsuario: { lat: number; lng: number } | null;
  clientes: Cliente[];
  onClienteClick?: (cliente: Cliente) => void;
}

export default function RotaMap({ localizacaoUsuario, clientes, onClienteClick }: RotaMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Inicializar mapa apenas uma vez
  useEffect(() => {
    if (!mapContainerRef.current || !localizacaoUsuario || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView(
      [localizacaoUsuario.lat, localizacaoUsuario.lng],
      12
    );

    // Adicionar camada de mapa (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    // Criar layer group para marcadores
    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;

    mapRef.current = map;

    // Cleanup apenas quando o componente for desmontado
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markersLayerRef.current = null;
    };
  }, []); // Executar apenas uma vez

  // Atualizar marcadores quando localizacaoUsuario ou clientes mudarem
  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current || !localizacaoUsuario) return;

    const map = mapRef.current;
    const markersLayer = markersLayerRef.current;

    // Limpar marcadores anteriores
    markersLayer.clearLayers();

    // Criar ícone personalizado para o vendedor (azul)
    const vendedorIcon = L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          width: 40px;
          height: 40px;
          background: #3b82f6;
          border: 3px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    // Adicionar marcador do vendedor
    L.marker([localizacaoUsuario.lat, localizacaoUsuario.lng], { icon: vendedorIcon })
      .bindPopup('<div style="font-weight: bold; color: #3b82f6;">📍 Você está aqui</div>')
      .addTo(markersLayer);

    // Função para criar ícone de cliente baseado na prioridade
    const criarIconeCliente = (prioridade: 'alta' | 'media' | 'atencao') => {
      const cores = {
        alta: '#10b981',
        media: '#f59e0b',
        atencao: '#ef4444'
      };

      const emoji = {
        alta: '🟢',
        media: '🟡',
        atencao: '🔴'
      };

      return L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="
            width: 32px;
            height: 32px;
            background: ${cores[prioridade]};
            border: 2px solid white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            cursor: pointer;
          ">
            ${emoji[prioridade]}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });
    };

    // Adicionar marcadores dos clientes
    const bounds: L.LatLngTuple[] = [[localizacaoUsuario.lat, localizacaoUsuario.lng]];

    clientes.forEach(cliente => {
      if (cliente.latitude && cliente.longitude) {
        const marker = L.marker(
          [cliente.latitude, cliente.longitude],
          { icon: criarIconeCliente(cliente.prioridade) }
        );

        // Popup do cliente
        const popupContent = `
          <div style="min-width: 200px;">
            <div style="font-weight: bold; font-size: 14px; margin-bottom: 4px;">${cliente.nome}</div>
            <div style="font-size: 12px; color: #666; margin-bottom: 8px;">${cliente.cidade} - ${cliente.estado}</div>
            ${cliente.distancia && cliente.distancia < 999 ? `
              <div style="font-size: 12px; margin-bottom: 4px;">
                📍 ${cliente.distancia < 1 ? `${Math.round(cliente.distancia * 1000)}m` : `${cliente.distancia.toFixed(1)}km`}
              </div>
            ` : ''}
          </div>
        `;

        marker.bindPopup(popupContent);

        // Adicionar evento de clique
        if (onClienteClick) {
          marker.on('click', () => onClienteClick(cliente));
        }

        marker.addTo(markersLayer);
        bounds.push([cliente.latitude, cliente.longitude]);
      }
    });

    // Ajustar zoom para mostrar todos os marcadores
    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [localizacaoUsuario, clientes]); // onClienteClick removido das dependências para evitar re-renders

  return (
    <div 
      ref={mapContainerRef} 
      className="w-full h-full rounded-xl overflow-hidden"
      style={{ minHeight: '400px' }}
    />
  );
}
