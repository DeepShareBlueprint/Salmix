import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';
import { LucideIcon } from 'lucide-react';



interface GaugeChartProps {
  title: string;
  value: number; // Valor atual (0-100)
  target?: number; // Meta (0-100), opcional
  icon: LucideIcon;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'orange';
  size?: 'sm' | 'md' | 'lg';
  unit?: string; // Ex: '%', 'K', 'M', etc.
  subtitle?: string;
  showTarget?: boolean;
  minimal?: boolean; // Nova propriedade para exibição minimalista
}

export default function GaugeChart({
  title,
  value,
  target,
  icon: Icon,
  color = 'blue',
  size = 'md',
  unit = '%',
  subtitle,
  showTarget = false,
  minimal = false
}: GaugeChartProps) {
  // Garantir que o valor esteja entre 0 e 100
  const normalizedValue = Math.min(Math.max(value, 0), 100);
  const normalizedTarget = target ? Math.min(Math.max(target, 0), 100) : undefined;
  
  // Cores baseadas no tema
  const colorMap = {
    blue: { primary: '#3b82f6', secondary: '#1e40af', bg: '#1e3a8a' },
    green: { primary: '#10b981', secondary: '#059669', bg: '#064e3b' },
    yellow: { primary: '#f59e0b', secondary: '#d97706', bg: '#92400e' },
    red: { primary: '#ef4444', secondary: '#dc2626', bg: '#991b1b' },
    purple: { primary: '#8b5cf6', secondary: '#7c3aed', bg: '#5b21b6' },
    orange: { primary: '#f97316', secondary: '#ea580c', bg: '#c2410c' }
  };

  const colors = colorMap[color];
  
  // Tamanhos
  const sizeMap = {
    sm: { height: 80, radius: 28 },
    md: { height: 160, radius: 60 },
    lg: { height: 200, radius: 75 }
  };
  
  const dimensions = sizeMap[size];
  
  // Dados para o gráfico radial
  const data = [
    {
      name: 'background',
      value: 100,
      fill: '#334155'
    },
    {
      name: 'progress',
      value: normalizedValue,
      fill: colors.primary
    }
  ] as any[];

  // Se há meta, adicionar uma linha indicadora
  if (showTarget && normalizedTarget) {
    data.push({
      name: 'target',
      value: normalizedTarget,
      fill: '#fbbf24'
    } as any);
  }

  // Determinar cor baseada na performance
  const getPerformanceColor = () => {
    if (normalizedValue >= 90) return 'text-emerald-400';
    if (normalizedValue >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  // Determinar status baseado na performance
  const getPerformanceStatus = () => {
    if (normalizedValue >= 90) return 'Excelente';
    if (normalizedValue >= 70) return 'Bom';
    if (normalizedValue >= 50) return 'Regular';
    return 'Crítico';
  };

  // Renderização minimalista - apenas o gráfico
  if (minimal) {
    return (
      <div className="relative flex items-center justify-center">
        <ResponsiveContainer width="100%" height={dimensions.height}>
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius={dimensions.radius - 15}
            outerRadius={dimensions.radius}
            startAngle={180}
            endAngle={0}
            data={data}
          >
            {/* Background track */}
            <RadialBar
              dataKey="value"
              cornerRadius={8}
              fill="#334155"
              background={{ fill: '#1e293b' }}
            />
            
            {/* Progress bar */}
            <RadialBar
              dataKey="value"
              cornerRadius={8}
              fill={colors.primary}
              background={false}
              {...{ data: [data[1]] } as any}
            />
            
            {/* Target indicator if enabled */}
            {showTarget && normalizedTarget && (
              <RadialBar
                dataKey="value"
                cornerRadius={2}
                fill="#fbbf24"
                background={false}
                {...{ data: [{ value: normalizedTarget, fill: '#fbbf24' }] } as any}
              />
            )}
          </RadialBarChart>
        </ResponsiveContainer>

        {/* Center Content - apenas o valor */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={`text-center ${size === 'sm' ? 'mt-2' : 'mt-4'}`}>
            <p className={`${size === 'sm' ? 'text-lg' : 'text-3xl'} font-bold ${getPerformanceColor()}`}>
              {normalizedValue.toFixed(0)}{unit}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] ${
      size === 'sm' ? 'p-2' : 'p-6'
    }`}>
      {/* Header - Only show for medium and large sizes */}
      {size !== 'sm' && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div 
              className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg`}
              style={{
                background: `linear-gradient(135deg, ${colors.primary}dd, ${colors.secondary}aa)`
              }}
            >
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{title}</h3>
              {subtitle && <p className="text-slate-400 text-sm">{subtitle}</p>}
            </div>
          </div>
          
          {/* Status Badge */}
          <div className={`px-3 py-1 rounded-full text-xs font-bold ${
            normalizedValue >= 90 ? 'bg-emerald-500/20 text-emerald-400' :
            normalizedValue >= 70 ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-red-500/20 text-red-400'
          }`}>
            {getPerformanceStatus()}
          </div>
        </div>
      )}

      {/* Gauge Chart Container */}
      <div className="relative flex items-center justify-center">
        <ResponsiveContainer width="100%" height={dimensions.height}>
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius={dimensions.radius - 15}
            outerRadius={dimensions.radius}
            startAngle={180}
            endAngle={0}
            data={data}
          >
            {/* Background track */}
            <RadialBar
              dataKey="value"
              cornerRadius={8}
              fill="#334155"
              background={{ fill: '#1e293b' }}
            />
            
            {/* Progress bar */}
            <RadialBar
              dataKey="value"
              cornerRadius={8}
              fill={colors.primary}
              background={false}
              {...{ data: [data[1]] } as any}
            />
            
            {/* Target indicator if enabled */}
            {showTarget && normalizedTarget && (
              <RadialBar
                dataKey="value"
                cornerRadius={2}
                fill="#fbbf24"
                background={false}
                {...{ data: [{ value: normalizedTarget, fill: '#fbbf24' }] } as any}
              />
            )}
          </RadialBarChart>
        </ResponsiveContainer>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={`text-center ${size === 'sm' ? 'mt-2' : 'mt-4'}`}>
            <p className={`${size === 'sm' ? 'text-lg' : 'text-3xl'} font-bold ${getPerformanceColor()}`}>
              {normalizedValue.toFixed(0)}{unit}
            </p>
            {showTarget && target && size !== 'sm' && (
              <p className="text-slate-400 text-sm mt-1">
                Meta: {target.toFixed(0)}{unit}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Footer Info - Only for medium and large sizes */}
      {size !== 'sm' && (
        <div className="mt-4 pt-4 border-t border-slate-700/50">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400">Performance</span>
            <div className="flex items-center space-x-2">
              {showTarget && target && (
                <>
                  <span className="text-slate-400">Meta:</span>
                  <span className="text-yellow-400 font-medium">{target.toFixed(0)}{unit}</span>
                </>
              )}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-slate-700/50 rounded-full h-2 mt-3">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ${
                normalizedValue >= 90 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' :
                normalizedValue >= 70 ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' :
                'bg-gradient-to-r from-red-500 to-red-400'
              }`}
              style={{ width: `${normalizedValue}%` }}
            >
              <div className="h-full bg-white/20 rounded-full"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
