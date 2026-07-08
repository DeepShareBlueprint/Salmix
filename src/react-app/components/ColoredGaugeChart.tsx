interface ColoredGaugeChartProps {
  title: string;
  percentage: number; // 0-100
  type?: 'normal' | 'saldo'; // normal: 0% ruim, 100% bom | saldo: 0% bom (realizado), 100% ruim (falta)
}

export default function ColoredGaugeChart({ title, percentage, type = 'normal' }: ColoredGaugeChartProps) {
  // Normalizar valor entre 0 e 100
  const normalizedValue = Math.max(0, Math.min(100, percentage));
  
  // Para gauge de saldo, inverter a lógica visual (100% falta = vermelho, 0% falta = verde)
  const displayValue = type === 'saldo' ? 100 - normalizedValue : normalizedValue;
  
  // Definir as faixas de cores
  const colorRanges = [
    { min: 0, max: 20, color: '#ef4444', label: 'Crítico' },      // Vermelho
    { min: 20, max: 40, color: '#f97316', label: 'Baixo' },       // Laranja
    { min: 40, max: 60, color: '#eab308', label: 'Médio' },       // Amarelo
    { min: 60, max: 80, color: '#84cc16', label: 'Bom' },         // Verde claro
    { min: 80, max: 100, color: '#10b981', label: 'Excelente' }   // Verde
  ];
  
  // Calcular cor atual baseada no valor
  const getCurrentColor = () => {
    for (const range of colorRanges) {
      if (displayValue >= range.min && displayValue <= range.max) {
        return range.color;
      }
    }
    return colorRanges[colorRanges.length - 1].color;
  };
  
  // Configurações do gauge
  const centerX = 100;
  const centerY = 100;
  const radius = 70;
  const startAngle = 180; // Começa à esquerda (180°)
  const endAngle = 0;     // Termina à direita (0°)
  const strokeWidth = 14;
  
  // Função para converter graus em radianos
  const degToRad = (deg: number) => (deg * Math.PI) / 180;
  
  // Função para calcular posição no arco
  const polarToCartesian = (angle: number, r: number = radius) => {
    const rad = degToRad(angle);
    return {
      x: centerX + r * Math.cos(rad),
      y: centerY + r * Math.sin(rad)
    };
  };
  
  // Criar paths para cada segmento de cor
  const createSegmentPath = (startPercent: number, endPercent: number) => {
    const angleRange = startAngle - endAngle; // 180 graus total
    const startDeg = startAngle - (startPercent / 100) * angleRange;
    const endDeg = startAngle - (endPercent / 100) * angleRange;
    
    const start = polarToCartesian(startDeg);
    const end = polarToCartesian(endDeg);
    
    const largeArcFlag = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
    const sweepFlag = startDeg > endDeg ? 1 : 0;
    
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${end.x} ${end.y}`;
  };
  
  // Calcular ângulo do ponteiro
  const angleRange = startAngle - endAngle;
  const needleAngle = startAngle - (displayValue / 100) * angleRange;
  const needleLength = radius - 10;
  const needleEnd = polarToCartesian(needleAngle, needleLength);
  
  return (
    <div className="flex-1 rounded-xl p-4 border border-slate-500/50 shadow-xl" 
         style={{ background: 'radial-gradient(ellipse at top left, rgba(139, 92, 246, 0.4) 0%, rgba(15, 23, 42, 0.95) 70%), linear-gradient(135deg, transparent 50%, rgba(0, 0, 0, 0.4) 100%)' }}>
      <h4 className="text-sm font-medium text-slate-200 mb-3 text-center">{title}</h4>
      
      <div className="relative" style={{ height: '140px' }}>
        <svg width="100%" height="100%" viewBox="0 0 200 145" preserveAspectRatio="xMidYMid meet">
          {/* Fundo do arco (cinza escuro) */}
          <path
            d={createSegmentPath(0, 100)}
            fill="none"
            stroke="#334155"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          
          {/* Segmentos coloridos */}
          {colorRanges.map((range, index) => (
            <path
              key={index}
              d={createSegmentPath(range.min, range.max)}
              fill="none"
              stroke={range.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              opacity={displayValue >= range.min ? 1 : 0.3}
            />
          ))}
          
          {/* Ponteiro */}
          <g>
            {/* Sombra do ponteiro */}
            <line
              x1={centerX}
              y1={centerY}
              x2={needleEnd.x + 1}
              y2={needleEnd.y + 1}
              stroke="#000000"
              strokeWidth="3"
              strokeLinecap="round"
              opacity="0.3"
            />
            
            {/* Ponteiro principal */}
            <line
              x1={centerX}
              y1={centerY}
              x2={needleEnd.x}
              y2={needleEnd.y}
              stroke="#ffffff"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            
            {/* Centro do ponteiro */}
            <circle 
              cx={centerX} 
              cy={centerY} 
              r="6" 
              fill="#1e293b"
              stroke="#ffffff"
              strokeWidth="2"
            />
            <circle 
              cx={centerX} 
              cy={centerY} 
              r="3" 
              fill="#ffffff"
            />
          </g>
          
          {/* Valor exibido */}
          <text 
            x={centerX} 
            y="135" 
            fill={getCurrentColor()}
            fontSize="22" 
            fontWeight="bold" 
            textAnchor="middle"
          >
            {normalizedValue.toFixed(1)}%
          </text>
        </svg>
      </div>
    </div>
  );
}
