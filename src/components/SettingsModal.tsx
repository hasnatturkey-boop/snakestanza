import React from 'react';
import { 
  X, Volume2, VolumeX, Music, Smartphone, Zap, Palette, 
  RotateCcw, Sliders, Shield, Check
} from 'lucide-react';
import { GameSettings, GameStats, SpeedLevel, ThemeId } from '../types/game';
import { SPEED_CONFIGS, THEMES } from '../utils/constants';
import { soundEngine } from '../utils/audio';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  onUpdateSettings: (newSettings: GameSettings) => void;
  stats: GameStats;
  onResetStats: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  stats,
  onResetStats,
}) => {
  if (!isOpen) return null;

  const handleSpeedChange = (speed: SpeedLevel) => {
    soundEngine.playButtonClick();
    onUpdateSettings({ ...settings, initialSpeed: speed });
  };

  const handleToggleSfx = () => {
    const next = !settings.sfxEnabled;
    soundEngine.playButtonClick();
    const updated = { ...settings, sfxEnabled: next };
    onUpdateSettings(updated);
    soundEngine.updateConfig(updated);
  };

  const handleToggleBgm = () => {
    const next = !settings.bgmEnabled;
    soundEngine.playButtonClick();
    const updated = { ...settings, bgmEnabled: next };
    onUpdateSettings(updated);
    soundEngine.updateConfig(updated);
    if (next) {
      soundEngine.startBgm();
    } else {
      soundEngine.pauseBgm();
    }
  };

  const handleSfxVolume = (vol: number) => {
    const updated = { ...settings, sfxVolume: vol };
    onUpdateSettings(updated);
    soundEngine.updateConfig(updated);
  };

  const handleBgmVolume = (vol: number) => {
    const updated = { ...settings, bgmVolume: vol };
    onUpdateSettings(updated);
    soundEngine.updateConfig(updated);
  };

  const handleToggleHaptics = () => {
    const next = !settings.hapticEnabled;
    soundEngine.playButtonClick();
    const updated = { ...settings, hapticEnabled: next };
    onUpdateSettings(updated);
    soundEngine.updateConfig(updated);
  };

  const handleToggleDynamicSpeed = () => {
    soundEngine.playButtonClick();
    onUpdateSettings({ ...settings, dynamicSpeedUp: !settings.dynamicSpeedUp });
  };

  const handleThemeChange = (themeId: ThemeId) => {
    soundEngine.playButtonClick();
    onUpdateSettings({ ...settings, theme: themeId });
  };

  const handleToggleDpad = () => {
    soundEngine.playButtonClick();
    onUpdateSettings({ ...settings, showDpadOnMobile: !settings.showDpadOnMobile });
  };

  const handleToggleGrid = () => {
    soundEngine.playButtonClick();
    onUpdateSettings({ ...settings, showGridLines: !settings.showGridLines });
  };

  const handleResetScores = () => {
    if (window.confirm('Reset all saved high scores and stats?')) {
      soundEngine.playButtonClick();
      onResetStats();
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl text-slate-100 overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base sm:text-lg font-bold tracking-wide uppercase font-mono">
              GAME PREFERENCES
            </h2>
          </div>
          <button
            onClick={() => {
              soundEngine.playButtonClick();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-sm">
          
          {/* Section 1: Game Speed */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-200 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Base Game Speed</span>
              </label>
              <span className="text-xs font-mono text-emerald-400">
                {SPEED_CONFIGS[settings.initialSpeed].label}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(SPEED_CONFIGS) as SpeedLevel[]).map((spd) => {
                const conf = SPEED_CONFIGS[spd];
                const isSelected = settings.initialSpeed === spd;
                return (
                  <button
                    key={spd}
                    onClick={() => handleSpeedChange(spd)}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-mono font-medium transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      isSelected
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                        : 'bg-slate-800/70 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                    }`}
                  >
                    <span className="font-bold text-xs uppercase">{conf.label}</span>
                    <span className="text-[10px] opacity-75">{conf.initialIntervalMs}ms</span>
                  </button>
                );
              })}
            </div>

            {/* Dynamic speed-up toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <div>
                <p className="font-medium text-xs text-slate-200">Progressive Speed Increase</p>
                <p className="text-[11px] text-slate-400">Speeds up as you collect more pins</p>
              </div>
              <button
                onClick={handleToggleDynamicSpeed}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  settings.dynamicSpeedUp ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    settings.dynamicSpeedUp ? 'left-5.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          </section>

          {/* Section 2: Sound Preferences */}
          <section className="space-y-3 pt-2 border-t border-slate-800">
            <h3 className="font-semibold text-slate-200 flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-emerald-400" />
              <span>Sound & Audio Preferences</span>
            </h3>

            {/* SFX Toggle & Slider */}
            <div className="space-y-2 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-200">
                  {settings.sfxEnabled ? (
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-slate-500" />
                  )}
                  <span>Sound Effects (Chimes & Ticks)</span>
                </div>
                <button
                  onClick={handleToggleSfx}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    settings.sfxEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                      settings.sfxEnabled ? 'left-5.5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>

              {settings.sfxEnabled && (
                <div className="flex items-center gap-3 pt-1">
                  <span className="text-[11px] text-slate-400 w-12">Volume:</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.sfxVolume}
                    onChange={(e) => handleSfxVolume(parseFloat(e.target.value))}
                    className="flex-1 accent-emerald-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                  />
                  <span className="text-[11px] font-mono text-slate-400 w-8 text-right">
                    {Math.round(settings.sfxVolume * 100)}%
                  </span>
                </div>
              )}
            </div>

            {/* BGM Toggle & Slider */}
            <div className="space-y-2 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-200">
                  <Music className="w-4 h-4 text-indigo-400" />
                  <span>8-Bit Arcade Background Music</span>
                </div>
                <button
                  onClick={handleToggleBgm}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    settings.bgmEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                      settings.bgmEnabled ? 'left-5.5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>

              {settings.bgmEnabled && (
                <div className="flex items-center gap-3 pt-1">
                  <span className="text-[11px] text-slate-400 w-12">Volume:</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.bgmVolume}
                    onChange={(e) => handleBgmVolume(parseFloat(e.target.value))}
                    className="flex-1 accent-emerald-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                  />
                  <span className="text-[11px] font-mono text-slate-400 w-8 text-right">
                    {Math.round(settings.bgmVolume * 100)}%
                  </span>
                </div>
              )}
            </div>

            {/* Haptic Vibration */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <div>
                <p className="font-medium text-xs text-slate-200">Haptic Vibration</p>
                <p className="text-[11px] text-slate-400">Tactile pulse on pin collection & collisions</p>
              </div>
              <button
                onClick={handleToggleHaptics}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  settings.hapticEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    settings.hapticEnabled ? 'left-5.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          </section>

          {/* Section 3: Visual Themes */}
          <section className="space-y-3 pt-2 border-t border-slate-800">
            <label className="font-semibold text-slate-200 flex items-center gap-2">
              <Palette className="w-4 h-4 text-pink-400" />
              <span>Retro Theme</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(Object.keys(THEMES) as ThemeId[]).map((tId) => {
                const theme = THEMES[tId];
                const isSelected = settings.theme === tId;
                return (
                  <button
                    key={tId}
                    onClick={() => handleThemeChange(tId)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-slate-800 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                        : 'bg-slate-800/50 border-slate-700/80 hover:border-slate-600'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-xs text-slate-200 flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full border border-black/30"
                          style={{ backgroundColor: theme.snakeHead }}
                        />
                        <span>{theme.name}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                        {theme.description}
                      </p>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Section 4: Controls & Grid Display */}
          <section className="space-y-3 pt-2 border-t border-slate-800">
            <h3 className="font-semibold text-slate-200 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-cyan-400" />
              <span>Controls & Grid Display</span>
            </h3>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <div>
                <p className="font-medium text-xs text-slate-200">On-Screen Retro D-Pad</p>
                <p className="text-[11px] text-slate-400">Tactile directional buttons for mobile thumbs</p>
              </div>
              <button
                onClick={handleToggleDpad}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  settings.showDpadOnMobile ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    settings.showDpadOnMobile ? 'left-5.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <div>
                <p className="font-medium text-xs text-slate-200">Retro Grid Lines</p>
                <p className="text-[11px] text-slate-400">Display subtle grid boundaries</p>
              </div>
              <button
                onClick={handleToggleGrid}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  settings.showGridLines ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    settings.showGridLines ? 'left-5.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          </section>

          {/* Section 5: Stats & High Score Reset */}
          <section className="pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-400">
                <span>Best High Score: </span>
                <span className="font-bold text-amber-400 font-mono">{stats.highScore}</span>
                <span className="mx-2">·</span>
                <span>Pins Eaten: </span>
                <span className="font-bold text-emerald-400 font-mono">{stats.totalPinsEaten}</span>
              </div>
              <button
                onClick={handleResetScores}
                className="text-xs text-rose-400 hover:text-rose-300 underline underline-offset-2 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Score</span>
              </button>
            </div>
          </section>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 shrink-0 flex items-center justify-end">
          <button
            onClick={() => {
              soundEngine.playButtonClick();
              onClose();
            }}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            DONE & SAVE
          </button>
        </div>

      </div>
    </div>
  );
};
