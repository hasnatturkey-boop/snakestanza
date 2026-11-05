import React from 'react';
import { Pause, Play, Trophy, Sparkles, Volume2, VolumeX, Settings, Zap } from 'lucide-react';
import { GameTheme, SpeedLevel } from '../types/game';
import { soundEngine } from '../utils/audio';

interface GameHudProps {
  score: number;
  highScore: number;
  pinsCount: number;
  level: number;
  currentSpeedMs: number;
  speedLevel: SpeedLevel;
  isPaused: boolean;
  onTogglePause: () => void;
  onOpenSettings: () => void;
  sfxEnabled: boolean;
  onToggleSfx: () => void;
  theme: GameTheme;
}

export const GameHud: React.FC<GameHudProps> = ({
  score,
  highScore,
  pinsCount,
  level,
  currentSpeedMs,
  speedLevel,
  isPaused,
  onTogglePause,
  onOpenSettings,
  sfxEnabled,
  onToggleSfx,
  theme,
}) => {
  return (
    <header className="w-full flex flex-col gap-2 p-3 sm:p-4 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-800 text-slate-100 shadow-xl select-none">
      {/* Top Row: Score & High Score */}
      <div className="flex items-center justify-between gap-3">
        {/* Current Score */}
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <div className="text-[10px] sm:text-xs font-mono uppercase tracking-wider text-slate-400">
              SCORE
            </div>
            <div className="text-xl sm:text-2xl md:text-3xl font-extrabold font-mono tracking-tight text-white tabular-nums">
              {score}
            </div>
          </div>
        </div>

        {/* Center: Live Level & Speed */}
        <div className="hidden xs:flex flex-col items-center">
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400 flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>LVL {level}</span>
          </div>
          <div className="text-xs font-mono text-emerald-400 font-bold">
            {speedLevel} ({currentSpeedMs}ms)
          </div>
        </div>

        {/* High Score & Quick Controls */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] sm:text-xs font-mono uppercase tracking-wider text-amber-400/90 flex items-center justify-end gap-1">
              <Trophy className="w-3 h-3 text-amber-400" />
              <span>BEST</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-amber-400 tabular-nums">
              {Math.max(score, highScore)}
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
            {/* Audio Toggle */}
            <button
              onClick={() => {
                soundEngine.playButtonClick();
                onToggleSfx();
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title={sfxEnabled ? 'Mute Sound' : 'Enable Sound'}
              aria-label="Toggle Sound"
            >
              {sfxEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {/* Pause Button */}
            <button
              onClick={() => {
                soundEngine.playPause(!isPaused);
                onTogglePause();
              }}
              className={`p-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
                isPaused
                  ? 'bg-amber-500 text-slate-950 animate-pulse'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white'
              }`}
              title={isPaused ? 'Resume Game' : 'Pause Game'}
              aria-label="Pause or Resume"
            >
              {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4" />}
            </button>

            {/* Settings Button */}
            <button
              onClick={() => {
                soundEngine.playButtonClick();
                onOpenSettings();
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Settings"
              aria-label="Open Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Sub-Bar: Pins count & mobile level status */}
      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-800/80">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.pinColor }} />
          <span>PINS COLLECTED:</span>
          <span className="text-white font-bold">{pinsCount}</span>
        </div>

        <div className="xs:hidden flex items-center gap-1.5 text-emerald-400">
          <Zap className="w-3 h-3 text-amber-400" />
          <span>LVL {level}</span>
          <span>·</span>
          <span>{speedLevel}</span>
        </div>

        <div className="hidden sm:block text-slate-500">
          ARROWS / WASD / SWIPE
        </div>
      </div>
    </header>
  );
};
