import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { SimulationMetrics } from '../types';

interface MetricsChartProps {
  data: SimulationMetrics[];
}

const MetricsChart: React.FC<MetricsChartProps> = ({ data }) => {
  // We only want to show the last N points
  const displayData = data.slice(-50);

  return (
    <div className="h-40 w-full bg-slate-900/50 rounded-lg p-2 border border-slate-700">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={displayData}>
          <XAxis dataKey="tick" hide />
          <YAxis domain={[0, 1]} hide />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '4px', fontSize: '12px' }}
            itemStyle={{ padding: 0 }}
          />
          <ReferenceLine y={0.5} stroke="#334155" strokeDasharray="3 3" />
          <Line 
            type="monotone" 
            dataKey="flux" 
            stroke="#f472b6" 
            strokeWidth={2} 
            dot={false} 
            animationDuration={300}
            name="Flux (Chaos)"
          />
          <Line 
            type="monotone" 
            dataKey="entropy" 
            stroke="#38bdf8" 
            strokeWidth={2} 
            dot={false} 
            animationDuration={300}
            name="Entropy (Info)"
          />
          <Line 
            type="monotone" 
            dataKey="coherence" 
            stroke="#4ade80" 
            strokeWidth={2} 
            dot={false} 
            animationDuration={300}
            name="Coherence"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MetricsChart;
