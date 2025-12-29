import React from 'react';

interface OverlayProps {
  phase: 'search' | 'detection' | 'clarity';
  progress: number;
}

const Overlay: React.FC<OverlayProps> = ({ phase, progress }) => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
      
      {/* Phase 1 Text */}
      <div 
        className={`transition-opacity duration-1000 ease-in-out ${phase === 'search' ? 'opacity-90' : 'opacity-0'}`}
      >
        <h1 className="text-[#4affc3] text-2xl md:text-3xl tracking-[0.2em] font-light animate-pulse">
          Рынок кажется спокойным…
        </h1>
      </div>

      {/* Phase 2 Text */}
      <div 
        className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${phase === 'detection' ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
      >
        <div className="bg-black/50 backdrop-blur-sm p-4 border-l-4 border-[#ff2e2e]">
          <h1 className="text-[#ff2e2e] text-3xl md:text-5xl font-bold tracking-widest uppercase shadow-[#ff2e2e] drop-shadow-[0_0_10px_rgba(255,46,46,0.8)]">
            Скрытые риски проявляются
          </h1>
        </div>
      </div>

      {/* Phase 3 Text */}
      <div 
        className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-1000 delay-500 ${phase === 'clarity' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
      >
        <h1 className="text-[#00e5ff] text-5xl md:text-7xl font-bold tracking-[0.15em] drop-shadow-[0_0_15px_rgba(0,229,255,0.6)]">
          GUARDFOLIO AI
        </h1>
        <div className="h-px w-32 bg-[#00e5ff] my-4 opacity-50"></div>
        <h2 className="text-white text-xl md:text-2xl tracking-[0.3em] uppercase opacity-80 font-light">
          Полная картина риска.
        </h2>
      </div>

      {/* Phase Indicator - Bottom Right */}
      <div className="absolute bottom-12 right-12 text-right hidden md:block">
        <div className={`text-xs tracking-widest mb-1 ${phase === 'search' ? 'text-[#4affc3]' : 'text-gray-600'}`}>01 SEARCH</div>
        <div className={`text-xs tracking-widest mb-1 ${phase === 'detection' ? 'text-[#ff2e2e]' : 'text-gray-600'}`}>02 DETECTION</div>
        <div className={`text-xs tracking-widest ${phase === 'clarity' ? 'text-[#00e5ff]' : 'text-gray-600'}`}>03 CLARITY</div>
      </div>

    </div>
  );
};

export default Overlay;