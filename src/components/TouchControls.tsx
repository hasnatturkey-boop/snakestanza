import React from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { Direction } from '../types/game';
import { soundEngine } from '../utils/audio';

interface TouchControlsProps {
  onDirectionChange: (direction: Direction) => void;
  isPaused: boolean;
  onTogglePause: () => void;
  accentColor?: string;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  onDirectionChange,
  isPaused,
  onTogglePause,
  accentColor = '#10b981',
}) => {
  const handlePress = (e: React.TouchEvent | React.MouseEvent, dir: Direction) => {
    e.preventDefault();
    soundEngine.playTurnTick();
    soundEngine.triggerHaptic('light');
    onDirectionChange(dir);
  };

  const handlePause = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    soundEngine.playPause(!isPaused);
    onTogglePause();
  };

  return (
    <div className="w-full max-w-xs mx-auto py-2 select-none touch-none">
      {/* Ergonomic Cross D-Pad */}
      <div className="relative w-48 h-48 mx-auto grid grid-cols-3 grid-rows-3 gap-1.5 p-2 bg-slate-900/70 border border-slate-800 rounded-3xl shadow-xl">
        
        {/* Top: UP */}
        <div className="col-start-2 row-start-1 flex items-center justify-center">
          <button
            onTouchStart={(e) => handlePress(e, 'UP')}
            onMouseDown={(e) => handlePress(e, 'UP')}
            className="w-14 h-14 rounded-2xl bg-slate-800 active:bg-emerald-500/30 hover:bg-slate-700 border border-slate-700/80 active:border-emerald-400 text-slate-200 active:text-emerald-300 flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer"
            aria-label="Move Up"
          >
            <ChevronUp className="w-7 h-7" />
          </button>
        </div>

        {/* Left: LEFT */}
        <div className="col-start-1 row-start-2 flex items-center justify-center">
          <button
            onTouchStart={(e) => handlePress(e, 'LEFT')}
            onMouseDown={(e) => handlePress(e, 'LEFT')}
            className="w-14 h-14 rounded-2xl bg-slate-800 active:bg-emerald-500/30 hover:bg-slate-700 border border-slate-700/80 active:border-emerald-400 text-slate-200 active:text-emerald-300 flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer"
            aria-label="Move Left"
          >
            <ChevronLeft className="w-7 h-7" />
          </button>
        </div>

        {/* Center: Pause / Resume Button */}
        <div className="col-start-2 row-start-2 flex items-center justify-center">
          <button
            onTouchStart={handlePause}
            onMouseDown={handlePause}
            className={`w-11 h-11 rounded-full border transition-all flex items-center justify-center shadow-inner cursor-pointer ${
              isPaused
                ? 'bg-amber-500 border-amber-300 text-slate-950 animate-pulse'
                : 'bg-slate-950/80 border-slate-700 text-slate-400 hover:text-white'
            }`}
            aria-label="Pause or Resume"
          >
            {isPaused ? <Play className="w-4 h-4 fill-current ml-0.5" /> : <Pause className="w-4 h-4" />}
          </button>
        </div>

        {/* Right: RIGHT */}
        <div className="col-start-3 row-start-2 flex items-center justify-center">
          <button
            onTouchStart={(e) => handlePress(e, 'RIGHT')}
            onMouseDown={(e) => handlePress(e, 'RIGHT')}
            className="w-14 h-14 rounded-2xl bg-slate-800 active:bg-emerald-500/30 hover:bg-slate-700 border border-slate-700/80 active:border-emerald-400 text-slate-200 active:text-emerald-300 flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer"
            aria-label="Move Right"
          >
            <ChevronRight className="w-7 h-7" />
          </button>
        </div>

        {/* Bottom: DOWN */}
        <div className="col-start-2 row-start-3 flex items-center justify-center">
          <button
            onTouchStart={(e) => handlePress(e, 'DOWN')}
            onMouseDown={(e) => handlePress(e, 'DOWN')}
            className="w-14 h-14 rounded-2xl bg-slate-800 active:bg-emerald-500/30 hover:bg-slate-700 border border-slate-700/80 active:border-emerald-400 text-slate-200 active:text-emerald-300 flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer"
            aria-label="Move Down"
          >
            <ChevronDown className="w-7 h-7" />
          </button>
        </div>

      </div>
    </div>
  );
};
