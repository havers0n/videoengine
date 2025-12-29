
import React from 'react';
import { TimelineState, CausalityEventType } from '../types';
import { EVENT_TIMELINE, TIMELINE_DURATION } from '../constants';

interface TimelineDisplayProps {
  state: TimelineState | null;
}

const TimelineDisplay: React.FC<TimelineDisplayProps> = ({ state }) => {
  if (!state) return null;

  const { currentTime, activeEvent, progress } = state;

  const getEventColor = (type: CausalityEventType) => {
    switch (type) {
      case CausalityEventType.SHOCK: return 'text-red-400 border-red-400';
      case CausalityEventType.REBALANCING: return 'text-purple-400 border-purple-400';
      case CausalityEventType.STABILIZATION: return 'text-cyan-400 border-cyan-400';
      default: return 'text-slate-400 border-slate-400';
    }
  };

  return (
    <div className="fixed bottom-10 left-10 right-10 z-10 p-6 rounded-2xl bg-slate-900/40 backdrop-blur-md border border-slate-700/50 shadow-2xl pointer-events-none">
      <div className="flex justify-between items-end mb-4">
        <div>
          <span className="text-xs uppercase tracking-widest text-slate-500 font-bold block mb-1">Active Causality Phase</span>
          <h2 className={`text-2xl font-bold uppercase tracking-tight ${getEventColor(activeEvent.type)}`}>
            {activeEvent.type}
          </h2>
        </div>
        <div className="text-right">
          <span className="mono text-sm text-slate-400">
            {currentTime.toFixed(2)}s / {TIMELINE_DURATION}s
          </span>
        </div>
      </div>

      <div className="relative h-1 w-full bg-slate-800 rounded-full overflow-hidden mb-6">
        <div 
          className="absolute h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-100 ease-linear"
          style={{ width: `${(currentTime / TIMELINE_DURATION) * 100}%` }}
        />
        {/* Event Markers */}
        {EVENT_TIMELINE.map((event, idx) => (
          <div 
            key={idx}
            className="absolute h-full w-0.5 bg-slate-600"
            style={{ left: `${(event.startTime / TIMELINE_DURATION) * 100}%` }}
          />
        ))}
      </div>

      <div className="grid grid-cols-4 gap-4">
        {EVENT_TIMELINE.map((event, idx) => {
          const isActive = activeEvent.type === event.type;
          return (
            <div 
              key={idx} 
              className={`p-3 rounded-lg border transition-all duration-300 ${
                isActive ? `bg-slate-800/50 ${getEventColor(event.type)}` : 'bg-transparent border-transparent opacity-30'
              }`}
            >
              <span className="text-[10px] uppercase font-bold block mb-1">{event.type}</span>
              <p className="text-[11px] leading-tight text-slate-300">
                {event.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TimelineDisplay;
