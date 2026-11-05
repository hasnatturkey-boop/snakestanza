import React from 'react';
import { Play, RotateCcw, Home, Settings, Trophy, Sparkles, Volume2, VolumeX, AlertTriangle } from 'lucide-react';
import { GameSettings, GameStats, GameTheme } from '../types/game';
import { soundEngine } from '../utils/audio';

interface PauseModalProps {
  isOpen: boolean;
  score: number;
  highScore: number;
  pinsCount: number;
  onResume: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
  onExitToMenu: () => void;
  settings: GameSettings;
  onToggleSfx: () => void;
  theme: GameTheme;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  isOpen,
  score,
  highScore,
  pinsCount,
  onResume,
  onRestart,
  onOpenSettings,
  onExitToMenu,
  settings,
  onToggleSfx,
  theme,
}) => {
  // Allow keyboard shortcuts to resume or restart
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        soundEngine.playButtonClick();
        onResume();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onResume]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl text-slate-100 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500" />

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-mono uppercase tracking-widest mb-3">
          <span>PAUSED</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-white mb-2">
          GAME HALTED
        </h2>

        <p className="text-xs text-slate-400 font-mono mb-6">
          Take a breath, snake master.
        </p>

        {/* Scoreboard Snapshot */}
        <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-950/70 border border-slate-800 mb-6">
          <div>
            <div className="text-[10px] font-mono text-slate-400 uppercase">CURRENT SCORE</div>
            <div className="text-2xl font-bold font-mono text-white tabular-nums">{score}</div>
          </div>
          <div>
            <div className="text-[10px] font-mono text-amber-400 uppercase flex items-center justify-center gap-1">
              <Trophy className="w-3 h-3" /> BEST
            </div>
            <div className="text-2xl font-bold font-mono text-amber-400 tabular-nums">{highScore}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              soundEngine.playButtonClick();
              onResume();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              soundEngine.playButtonClick();
              onResume();
            }}
            className="w-full py-3.5 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(16,185,129,0.35)] flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>RESUME GAME</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              soundEngine.playButtonClick();
              onRestart();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              soundEngine.playButtonClick();
              onRestart();
            }}
            className="w-full py-3 px-6 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-semibold text-xs tracking-wider uppercase transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RESTART GAME</span>
          </button>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                soundEngine.playButtonClick();
                onOpenSettings();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                soundEngine.playButtonClick();
                onOpenSettings();
              }}
              className="py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700/60 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Settings</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                soundEngine.playButtonClick();
                onExitToMenu();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                soundEngine.playButtonClick();
                onExitToMenu();
              }}
              className="py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700/60 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Menu</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface GameOverModalProps {
  isOpen: boolean;
  score: number;
  highScore: number;
  isNewHighScore: boolean;
  pinsCount: number;
  level: number;
  deathReason: 'WALL' | 'TAIL' | '';
  onRestart: () => void;
  onExitToMenu: () => void;
  onOpenSettings: () => void;
  theme: GameTheme;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  score,
  highScore,
  isNewHighScore,
  pinsCount,
  level,
  deathReason,
  onRestart,
  onExitToMenu,
  onOpenSettings,
  theme,
}) => {
  // Allow immediate restart via Enter or Space key
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        soundEngine.playButtonClick();
        onRestart();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onRestart]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl text-slate-100 text-center relative overflow-hidden">
        {/* Top Accent Strip */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-rose-400 to-rose-600" />

        {isNewHighScore ? (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono uppercase tracking-widest mb-2 animate-bounce">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>NEW HIGH SCORE!</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-mono uppercase tracking-widest mb-2">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>CRASH DETECTED</span>
          </div>
        )}

        <h2 className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-white mb-1">
          GAME OVER
        </h2>

        <p className="text-xs text-rose-300 font-mono mb-6">
          {deathReason === 'WALL' ? 'Collided with the grid wall!' : 'You bit your own tail!'}
        </p>

        {/* Score Summary Box */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 mb-6 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <span className="text-xs font-mono text-slate-400">FINAL SCORE:</span>
            <span className="text-3xl font-extrabold font-mono text-white tabular-nums">{score}</span>
          </div>

          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">BEST HIGH SCORE:</span>
            <span className="font-bold text-amber-400 tabular-nums">{highScore}</span>
          </div>

          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">PINS COLLECTED:</span>
            <span className="font-bold text-emerald-400 tabular-nums">{pinsCount}</span>
          </div>

          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">LEVEL REACHED:</span>
            <span className="font-bold text-slate-200">LVL {level}</span>
          </div>
        </div>

        {/* Main Restart Button */}
        <div className="space-y-2.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              soundEngine.playButtonClick();
              onRestart();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              soundEngine.playButtonClick();
              onRestart();
            }}
            className="w-full py-4 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 font-bold text-base tracking-wider uppercase transition-all shadow-[0_0_24px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            <span>PLAY AGAIN</span>
          </button>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                soundEngine.playButtonClick();
                onOpenSettings();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                soundEngine.playButtonClick();
                onOpenSettings();
              }}
              className="py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-650 text-slate-200 text-xs font-semibold border border-slate-700/80 flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-[0.98]"
            >
              <Settings className="w-4 h-4 text-emerald-400" />
              <span>Speed & Sound</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                soundEngine.playButtonClick();
                onExitToMenu();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                soundEngine.playButtonClick();
                onExitToMenu();
              }}
              className="py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-650 text-slate-200 text-xs font-semibold border border-slate-700/80 flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-[0.98]"
            >
              <Home className="w-4 h-4 text-cyan-400" />
              <span>Main Menu</span>
            </button>
          </div>
        </div>

        {/* Footer Attribution */}
        <div className="mt-5 text-[11px] font-mono text-slate-500 text-right">
          powdered by hasnat creations
        </div>
      </div>
    </div>
  );
};
