import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface BrazilMapProps {
  vendasPorRegiao: Array<{
    regiao: string;
    total: number;
  }>;
}

// Coordenadas aproximadas dos centros dos estados brasileiros
const coordenadasEstados: Record<string, [number, number]> = {
  'AC': [-8.77, -70.55], // Acre
  'AL': [-9.71, -35.73], // Alagoas
  'AP': [1.41, -51.77], // Amapá
  'AM': [-3.07, -61.66], // Amazonas
  'BA': [-12.96, -38.51], // Bahia
  'CE': [-3.71, -38.54], // Ceará
  'DF': [-15.83, -47.86], // Distrito Federal
  'ES': [-19.19, -40.34], // Espírito Santo
  'GO': [-16.64, -49.31], // Goiás
  'MA': [-2.55, -44.30], // Maranhão
  'MT': [-12.64, -55.42], // Mato Grosso
  'MS': [-20.51, -54.54], // Mato Grosso do Sul
  'MG': [-18.10, -44.38], // Minas Gerais
  'PA': [-5.53, -52.29], // Pará
  'PB': [-7.06, -35.55], // Paraíba
  'PR': [-24.89, -51.55], // Paraná
  'PE': [-8.28, -35.07], // Pernambuco
  'PI': [-8.28, -43.68], // Piauí
  'RJ': [-22.84, -43.15], // Rio de Janeiro
  'RN': [-5.22, -36.52], // Rio Grande do Norte
  'RS': [-30.01, -51.22], // Rio Grande do Sul
  'RO': [-11.22, -62.80], // Rondônia
  'RR': [1.99, -61.33], // Roraima
  'SC': [-27.33, -49.44], // Santa Catarina
  'SP': [-23.55, -46.64], // São Paulo
  'SE': [-10.90, -37.07], // Sergipe
  'TO': [-10.25, -48.25], // Tocantins
  
  // Regiões comuns
  'SUL': [-27.5, -50.0],
  'SUDESTE': [-20.0, -43.0],
  'CENTRO-OESTE': [-15.0, -55.0],
  'NORDESTE': [-9.0, -40.0],
  'NORTE': [-5.0, -60.0],
  'SAO PAULO': [-23.55, -46.64],
  'RIO DE JANEIRO': [-22.84, -43.15],
  'MINAS GERAIS': [-18.10, -44.38],
  'PARANA': [-24.89, -51.55],
  'RIO GRANDE DO SUL': [-30.01, -51.22],
  'SANTA CATARINA': [-27.33, -49.44],
  'BAHIA': [-12.96, -38.51],
  'CEARA': [-3.71, -38.54],
  'PERNAMBUCO': [-8.28, -35.07],
  'GOIAS': [-16.64, -49.31],
  'MARANHAO': [-2.55, -44.30],
  'PARA': [-5.53, -52.29],
  'AMAZONAS': [-3.07, -61.66],
  'MATO GROSSO': [-12.64, -55.42],
  'RONDONIA': [-11.22, -62.80],
  'PIAUI': [-8.28, -43.68],
  'TOCANTINS': [-10.25, -48.25],
  'ALAGOAS': [-9.71, -35.73],
  'SERGIPE': [-10.90, -37.07],
  'PARAIBA': [-7.06, -35.55],
  'RIO GRANDE DO NORTE': [-5.22, -36.52],
  'ESPIRITO SANTO': [-19.19, -40.34],
  'MATO GROSSO DO SUL': [-20.51, -54.54],
  'ACRE': [-8.77, -70.55],
  'RORAIMA': [1.99, -61.33],
  'AMAPA': [1.41, -51.77]
};

export default function BrazilMap({ vendasPorRegiao }: BrazilMapProps) {
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    // Fix for default markers in Leaflet with Vite
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0
    }).format(value);
  };

  // Normalizar nomes de regiões para buscar coordenadas
  const normalizarRegiao = (regiao: string): string => {
    return regiao
      .toUpperCase()
      .replace(/[ÁÀÃÂÄ]/g, 'A')
      .replace(/[ÉÈÊË]/g, 'E')
      .replace(/[ÍÌÎÏ]/g, 'I')
      .replace(/[ÓÒÕÔÖ]/g, 'O')
      .replace(/[ÚÙÛÜ]/g, 'U')
      .replace(/Ç/g, 'C')
      .trim();
  };

  // Encontrar coordenadas para uma região
  const encontrarCoordenadas = (regiao: string): [number, number] | null => {
    const regiaoNorm = normalizarRegiao(regiao);
    
    // Tentar busca exata primeiro
    if (coordenadasEstados[regiaoNorm]) {
      return coordenadasEstados[regiaoNorm];
    }
    
    // Tentar busca parcial
    const chaves = Object.keys(coordenadasEstados);
    const chaveEncontrada = chaves.find(chave => 
      chave.includes(regiaoNorm) || regiaoNorm.includes(chave)
    );
    
    if (chaveEncontrada) {
      return coordenadasEstados[chaveEncontrada];
    }
    
    return null;
  };

  // Calcular raio do círculo baseado no valor de vendas
  const calcularRaio = (valor: number, maxValor: number): number => {
    const minRaio = 8;
    const maxRaio = 25;
    const porcentagem = valor / maxValor;
    return minRaio + (porcentagem * (maxRaio - minRaio));
  };

  // Determinar cor baseada no valor
  const determinarCor = (valor: number, maxValor: number): string => {
    const porcentagem = valor / maxValor;
    if (porcentagem >= 0.8) return '#059669'; // Verde escuro
    if (porcentagem >= 0.6) return '#10b981'; // Verde
    if (porcentagem >= 0.4) return '#f59e0b'; // Amarelo
    if (porcentagem >= 0.2) return '#f97316'; // Laranja
    return '#ef4444'; // Vermelho
  };

  const maxValor = Math.max(...vendasPorRegiao.map(r => r.total));

  // Filtrar regiões que têm coordenadas conhecidas
  const regioesMapeaveis = vendasPorRegiao
    .map(regiao => ({
      ...regiao,
      coordenadas: encontrarCoordenadas(regiao.regiao)
    }))
    .filter(r => r.coordenadas !== null);

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 shadow-xl overflow-hidden">
      <div className="p-4 border-b border-slate-700">
        <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <span>Visualização Geográfica - Brasil</span>
        </h3>
        <p className="text-slate-400 text-sm mt-1">Vendas YTD {new Date().getFullYear()} por representante</p>
      </div>
      
      <div className="h-80 relative">
        {regioesMapeaveis.length > 0 ? (
          <MapContainer
            center={[-14.235, -51.925]} // Centro do Brasil
            zoom={4}
            style={{ height: '100%', width: '100%' }}
            className="z-0"
            ref={mapRef}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {regioesMapeaveis.map((regiao, index) => (
              <CircleMarker
                key={index}
                center={regiao.coordenadas!}
                radius={calcularRaio(regiao.total, maxValor)}
                fillColor={determinarCor(regiao.total, maxValor)}
                color="#ffffff"
                weight={2}
                opacity={0.9}
                fillOpacity={0.7}
              >
                <Popup>
                  <div className="text-center">
                    <h4 className="font-bold text-slate-800 mb-1">Rep: {regiao.regiao}</h4>
                    <p className="text-emerald-600 font-bold text-lg">
                      {formatCurrency(regiao.total)}
                    </p>
                    <p className="text-slate-600 text-sm">
                      {((regiao.total / maxValor) * 100).toFixed(1)}% do total
                    </p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400">
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto mb-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <p>Nenhum dado geográfico disponível</p>
              <p className="text-sm">Regiões não mapeadas</p>
            </div>
          </div>
        )}
      </div>
      
      <div className="p-4 border-t border-slate-700 bg-slate-800/50">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <span className="text-slate-300">Legenda:</span>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-emerald-600 rounded-full"></div>
              <span className="text-slate-400 text-xs">Alto</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="text-slate-400 text-xs">Médio</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-slate-400 text-xs">Baixo</span>
            </div>
          </div>
          <div className="text-slate-400 text-xs">
            {regioesMapeaveis.length} de {vendasPorRegiao.length} regiões mapeadas
          </div>
        </div>
      </div>
    </div>
  );
}
