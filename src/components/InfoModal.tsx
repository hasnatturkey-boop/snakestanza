import React from 'react';
import { X, Trophy, Smartphone, ShieldCheck, Heart, Sparkles, Zap, HelpCircle } from 'lucide-react';
import { soundEngine } from '../utils/audio';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md max-h-[90vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl text-slate-100 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold tracking-wide font-mono uppercase">
              HOW TO PLAY & INFO
            </h2>
          </div>
          <button
            onClick={() => {
              soundEngine.playButtonClick();
              onClose();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs text-slate-300">
          
          <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30">
            <div className="font-bold text-emerald-300 text-sm mb-1 font-mono uppercase flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>THE OBJECTIVE</span>
            </div>
            <p className="leading-relaxed text-slate-300">
              Guide the retro snake across the grid to collect glowing <strong>Pins</strong>. Each pin eaten increases the snake's length and boosts your score. Avoid colliding with the grid border walls or biting your own tail!
            </p>
          </div>

          <div className="space-y-2">
            <div className="font-semibold text-slate-200 font-mono uppercase tracking-wider text-[11px]">
              COLLECTIBLES & PINS
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700">
                <div className="font-bold text-rose-400 mb-0.5 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>Ruby Pin (10 pts)</span>
                </div>
                <p className="text-[11px] text-slate-400">Regular collectible that feeds the snake and advances level.</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700">
                <div className="font-bold text-amber-400 mb-0.5 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                  <span>Golden Pin (50 pts)</span>
                </div>
                <p className="text-[11px] text-slate-400">Rare limited-time bonus pin! Collect before it vanishes.</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="font-semibold text-slate-200 font-mono uppercase tracking-wider text-[11px]">
              CONTROLS
            </div>
            <ul className="space-y-1.5 text-slate-400 pl-2">
              <li>• <strong>Mobile Swipe:</strong> Swipe anywhere on the retro grid to steer.</li>
              <li>• <strong>Mobile D-Pad:</strong> Tap the ergonomic on-screen thumb buttons.</li>
              <li>• <strong>Keyboard:</strong> Arrow keys or <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-200">W</kbd><kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-200">A</kbd><kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-200">S</kbd><kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-200">D</kbd>.</li>
              <li>• <strong>Pause & Restart:</strong> Spacebar or pause button on scoreboard.</li>
            </ul>
          </div>

          <div className="space-y-2">
            <div className="font-semibold text-slate-200 font-mono uppercase tracking-wider text-[11px]">
              RETRO GRID & CRASH ANIMATIONS
            </div>
            <p className="leading-relaxed text-slate-400">
              High-performance 60fps hardware accelerated 2D canvas with dynamic screen shake, impact shockwaves, collision sparks, and dead snake eyes on wall or self collisions.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-500">
            <span>VERSION 1.0.0 (RELEASE)</span>
            <span className="text-emerald-400 font-medium">powdered by hasnat creations</span>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 shrink-0">
          <button
            onClick={() => {
              soundEngine.playButtonClick();
              onClose();
            }}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            GOT IT
          </button>
        </div>

      </div>
    </div>
  );
};
