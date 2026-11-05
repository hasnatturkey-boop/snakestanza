import React, { useEffect, useState } from 'react';
import { Play, Settings, Sparkles, Volume2, VolumeX, ShieldAlert, Zap, Trophy } from 'lucide-react';
import { SNAKE_STANZA_VERSES } from '../utils/constants';
import { soundEngine } from '../utils/audio';
import { GameSettings, GameStats } from '../types/game';

interface WelcomeScreenProps {
  onStartPlay: () => void;
  onOpenSettings: () => void;
  settings: GameSettings;
  stats: GameStats;
  initialRevealed?: boolean;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onStartPlay,
  onOpenSettings,
  settings,
  stats,
}) => {
  const handleStartPlay = () => {
    soundEngine.playButtonClick();
    onStartPlay();
  };

  const handleSettingsClick = () => {
    soundEngine.playButtonClick();
    onOpenSettings();
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between p-4 sm:p-8 bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* Background retro grid effect */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.15) 0%, transparent 70%),
            linear-gradient(rgba(16, 185, 129, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16, 185, 129, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 32px 32px, 32px 32px',
        }}
      />
      <div className="crt-overlay absolute inset-0 z-0" />

      {/* Top Header Bar */}
      <header className="relative z-10 flex items-center justify-between w-full max-w-4xl mx-auto pt-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-sm bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          <span className="text-xs font-mono uppercase tracking-widest text-emerald-400">
            GOOGLE PLAY EDITION
          </span>
        </div>

        {stats.highScore > 0 && (
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>BEST:</span>
            <span className="text-amber-400 font-bold tabular-nums">{stats.highScore}</span>
          </div>
        )}
      </header>

      {/* Main Center Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full my-6 text-center">
        {/* Animated Arcade Logo */}
        <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs tracking-wider uppercase">
          <Sparkles className="w-3.5 h-3.5" />
          <span>CLASSIC RETRO PIN HUNTER</span>
        </div>

        <h1 className="text-5xl sm:text-7xl md:text-8xl font-extrabold tracking-tight text-white mb-2 font-mono drop-shadow-[0_0_24px_rgba(16,185,129,0.45)]">
          S N A K E
        </h1>

        <p className="text-xs sm:text-sm font-mono text-emerald-400/90 tracking-widest uppercase mb-8">
          PRO RETRO ARCADE EXPERIENCE
        </p>

        {/* Snake Stanza Box in Capital Letters as explicitly instructed */}
        <div className="w-full bg-slate-900/80 backdrop-blur-md border border-emerald-500/30 rounded-2xl p-6 sm:p-8 mb-8 shadow-xl shadow-black/40 text-center relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 opacity-80" />
          
          <div className="text-[11px] font-mono tracking-widest text-emerald-400/80 uppercase mb-3 flex items-center justify-center gap-2">
            <span>STANZA OF THE SERPENT</span>
          </div>

          <div className="space-y-2.5 font-mono text-sm sm:text-base md:text-lg font-bold text-slate-100 tracking-wider">
            {SNAKE_STANZA_VERSES.map((verse, idx) => (
              <p 
                key={idx}
                className="transition-colors hover:text-emerald-300"
              >
                {verse}
              </p>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-center gap-4 text-xs font-mono text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> SPEED: {settings.initialSpeed}
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1.5">
              {settings.sfxEnabled ? (
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-slate-500" />
              )}
              AUDIO: {settings.sfxEnabled ? 'ON' : 'MUTED'}
            </span>
          </div>
        </div>

        {/* Action Buttons: Immediately available with zero timer */}
        <div className="w-full max-w-md grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <button
            onClick={handleStartPlay}
            onTouchEnd={(e) => {
              e.preventDefault();
              handleStartPlay();
            }}
            className="w-full py-4 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 font-bold text-lg tracking-wider uppercase transition-all shadow-[0_0_24px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>PLAY NOW</span>
          </button>

          <button
            onClick={handleSettingsClick}
            onTouchEnd={(e) => {
              e.preventDefault();
              handleSettingsClick();
            }}
            className="w-full py-4 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-slate-100 border border-slate-700 hover:border-emerald-500/50 font-bold text-base tracking-wider uppercase transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-lg"
          >
            <Settings className="w-5 h-5 text-emerald-400" />
            <span>SETTINGS</span>
          </button>
        </div>
      </main>

      {/* Bottom Footer with explicit User Requirement: "powdered by hasnat creations" at right bottom corner */}
      <footer className="relative z-10 w-full max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 font-mono pt-4 border-t border-slate-900">
        <div className="text-slate-500 flex items-center gap-2">
          <span>TOUCH · SWIPE · D-PAD · KEYS</span>
        </div>

        {/* User Required Text: "powdered by hasnat creations" strictly placed at the right bottom corner */}
        <div className="sm:text-right font-medium text-slate-400 hover:text-emerald-400 transition-colors cursor-default">
          <span className="tracking-wide">powdered by hasnat creations</span>
        </div>
      </footer>
    </div>
  );
};
