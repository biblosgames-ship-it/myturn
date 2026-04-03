import React from 'react';

interface AnalyticChartProps {
  title: string;
  data: number[];
  color: string;
  labels: string[];
  prefix?: string;
}

export const AnalyticChart: React.FC<AnalyticChartProps> = ({ title, data, color, labels, prefix = '' }) => {
  const maxVal = Math.max(...data, 1);
  const height = 120;
  const width = 300;
  const padding = 20;
  const chartHeight = height - padding * 2;
  const points = data.map((v, i) => {
    const x = data.length > 1 ? (i / (data.length - 1)) * (width - padding * 2) + padding : width / 2;
    const y = height - (v / maxVal) * chartHeight - padding;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="card" style={{ padding: '1.25rem', flex: 1, minWidth: '280px' }}>
      <h5 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '1rem' }}>{title}</h5>
      <div style={{ position: 'relative', width: '100%', height: `${height}px` }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%' }}>
          {/* Grid lines */}
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--border)" strokeWidth="1" />
          <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="var(--border)" strokeWidth="1" />
          
          {/* Area */}
          <path
            d={`M ${padding},${height - padding} ${points} L ${data.length > 1 ? width - padding : padding},${height - padding} Z`}
            fill={color}
            fillOpacity="0.1"
            stroke="none"
          />
          
          {/* Line */}
          <polyline
            points={points}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Dots */}
          {data.map((v, i) => {
            const x = data.length > 1 ? (i / (data.length - 1)) * (width - padding * 2) + padding : width / 2;
            const y = height - (v / maxVal) * chartHeight - padding;
            return (
              <circle key={i} cx={x} cy={y} r="4" fill="white" stroke={color} strokeWidth="2" />
            );
          })}
        </svg>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
        {labels.map((l, i) => (
          <span key={i} style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700 }}>{i % 2 === 0 ? l : ''}</span>
        ))}
      </div>
    </div>
  );
};
