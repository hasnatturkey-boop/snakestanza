import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Play, Settings, RotateCcw, Volume2, VolumeX, Smartphone, Monitor, 
  HelpCircle, Trophy, Sparkles, ChevronLeft 
} from 'lucide-react';
import { Direction, GameScreen, GameSettings, GameStats, SpeedLevel, ThemeId } from './types/game';
import { DEFAULT_SETTINGS, DEFAULT_STATS, SPEED_CONFIGS, THEMES } from './utils/constants';
import { storage } from './utils/storage';
import { soundEngine } from './utils/audio';
import { WelcomeScreen } from './components/WelcomeScreen';
import { GameBoard } from './components/GameBoard';
import { GameHud } from './components/GameHud';
import { TouchControls } from './components/TouchControls';
import { SettingsModal } from './components/SettingsModal';
import { PauseModal, GameOverModal } from './components/GameModals';
import { InfoModal } from './components/InfoModal';

export default function App() {
  // Navigation Screen State: Starts on 'WELCOME'
  const [screen, setScreen] = useState<GameScreen>('WELCOME');
  
  // Game Play State
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [deathReason, setDeathReason] = useState<'WALL' | 'TAIL' | ''>('');
  
  // Live Scoring & Level
  const [score, setScore] = useState<number>(0);
  const [pinsCount, setPinsCount] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);
  const [currentSpeedMs, setCurrentSpeedMs] = useState<number>(125);
  const [isNewHighScore, setIsNewHighScore] = useState<boolean>(false);

  // Settings & Persistent Stats
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [stats, setStats] = useState<GameStats>(DEFAULT_STATS);
  const [bufferedDirection, setBufferedDirection] = useState<Direction | null>(null);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isInfoOpen, setIsInfoOpen] = useState<boolean>(false);

  // Device Preview Frame (for testing Google Play mobile dimensions)
  const [simulateMobileFrame, setSimulateMobileFrame] = useState<boolean>(false);

  // Game session counter to ensure a clean, instantaneous restart
  const [gameSessionId, setGameSessionId] = useState<number>(1);

  // Remembers if player has already entered the menu once, so returning opens ready-to-play buttons immediately
  const [hasVisitedMenuOnce, setHasVisitedMenuOnce] = useState<boolean>(false);

  // Load persisted settings & stats on mount
  useEffect(() => {
    const savedSettings = storage.getSettings();
    const savedStats = storage.getStats();
    setSettings(savedSettings);
    setStats(savedStats);
    soundEngine.updateConfig(savedSettings);

    // Apply dark mode class to HTML element based on theme
    const theme = THEMES[savedSettings.theme] || THEMES.OLED_NEON;
    if (theme.isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Update theme when settings change
  const currentTheme = THEMES[settings.theme] || THEMES.OLED_NEON;
  useEffect(() => {
    if (currentTheme.isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [currentTheme]);

  // Handle Start / Play from Welcome Screen
  const handleStartPlay = () => {
    soundEngine.init();
    if (settings.bgmEnabled) {
      soundEngine.startBgm();
    }
    setIsPaused(false);
    setIsGameOver(false);
    setDeathReason('');
    setScore(0);
    setPinsCount(0);
    setLevel(1);
    setIsNewHighScore(false);
    setBufferedDirection(null);
    setCurrentSpeedMs(SPEED_CONFIGS[settings.initialSpeed].initialIntervalMs);
    setGameSessionId((prev) => prev + 1);
    setHasVisitedMenuOnce(true);
    setScreen('PLAYING');
  };

  // Handle Score Updates from Canvas Game Engine
  const handleScoreUpdate = useCallback((newScore: number, newPins: number, newLevel: number, speedMs: number) => {
    setScore(newScore);
    setPinsCount(newPins);
    setLevel(newLevel);
    setCurrentSpeedMs(speedMs);

    if (newScore > stats.highScore) {
      setIsNewHighScore(true);
    }
  }, [stats.highScore]);

  // Handle Game Over
  const handleGameOver = useCallback((finalScore: number, finalPins: number, finalLevel: number, reason: 'WALL' | 'TAIL') => {
    const { isNewHighScore: achievedHighScore, updatedStats } = storage.updateScore(
      finalScore,
      finalPins,
      finalLevel,
      finalPins + 3
    );

    soundEngine.stopBgm();
    setStats(updatedStats);
    setIsNewHighScore(achievedHighScore);
    setDeathReason(reason);
    setIsGameOver(true);
  }, []);

  // Instant Restart Game Handler
  const handleRestartGame = () => {
    soundEngine.playButtonClick();
    soundEngine.init();
    if (settings.bgmEnabled) {
      soundEngine.startBgm();
    }
    setIsGameOver(false);
    setIsPaused(false);
    setDeathReason('');
    setScore(0);
    setPinsCount(0);
    setLevel(1);
    setIsNewHighScore(false);
    setBufferedDirection(null);
    setCurrentSpeedMs(SPEED_CONFIGS[settings.initialSpeed].initialIntervalMs);
    setGameSessionId((prev) => prev + 1);
    setScreen('PLAYING');
  };

  // Synchronize Background Music with Game State (Pause/Resume/GameOver/Menu)
  useEffect(() => {
    if (!settings.bgmEnabled) {
      soundEngine.pauseBgm();
      return;
    }

    if (screen === 'PLAYING') {
      if (isGameOver) {
        soundEngine.stopBgm();
      } else if (isPaused) {
        soundEngine.pauseBgm();
      } else {
        soundEngine.resumeBgm();
      }
    } else {
      soundEngine.stopBgm();
    }
  }, [screen, isPaused, isGameOver, settings.bgmEnabled]);

  // Settings snapshot ref to detect if any preferences changed while settings modal was open
  const settingsSnapshotRef = useRef<string>('');

  // Open settings handler: pauses the game behind if currently playing
  const handleOpenSettings = () => {
    soundEngine.playButtonClick();
    if (screen === 'PLAYING' && !isGameOver) {
      setIsPaused(true);
    }
    settingsSnapshotRef.current = JSON.stringify(settings);
    setIsSettingsOpen(true);
  };

  // Close settings handler:
  // - When settings changed: restart the game with new settings from start
  // - When settings did not change: display resume button to continue from where left off
  const handleCloseSettings = () => {
    soundEngine.playButtonClick();
    setIsSettingsOpen(false);

    if (screen === 'PLAYING' && !isGameOver) {
      const hasChanged = JSON.stringify(settings) !== settingsSnapshotRef.current;
      if (hasChanged) {
        handleRestartGame();
      } else {
        // Kept paused so the player sees the Resume button to continue right where they left off
        setIsPaused(true);
      }
    }
  };

  // Pause toggle
  const handleTogglePause = () => {
    setIsPaused((prev) => {
      const next = !prev;
      soundEngine.playPauseToggle(next);
      return next;
    });
  };

  // Update Settings
  const handleUpdateSettings = (newSettings: GameSettings) => {
    setSettings(newSettings);
    storage.saveSettings(newSettings);
    soundEngine.updateConfig(newSettings);
  };

  // Reset Stats
  const handleResetStats = () => {
    const reset = storage.resetHighScore();
    setStats(reset);
    setIsNewHighScore(false);
  };

  // Sound Quick Toggle
  const handleToggleSfx = () => {
    const nextSfx = !settings.sfxEnabled;
    const updated = { ...settings, sfxEnabled: nextSfx };
    handleUpdateSettings(updated);
  };

  return (
    <div 
      className="min-h-screen w-full flex flex-col items-center justify-between transition-colors duration-300 font-sans select-none overflow-x-hidden"
      style={{ backgroundColor: currentTheme.background, color: currentTheme.textColor }}
    >
      {/* If Welcome screen is active, render full-featured Welcome Screen */}
      {screen === 'WELCOME' ? (
        <WelcomeScreen
          onStartPlay={handleStartPlay}
          onOpenSettings={handleOpenSettings}
          settings={settings}
          stats={stats}
          initialRevealed={hasVisitedMenuOnce}
        />
      ) : (
        /* In-Game / Play Workspace */
        <div className="w-full flex-1 flex flex-col items-center justify-between py-2 sm:py-4 px-2 sm:px-4 max-w-xl mx-auto">
          
          {/* Universal Top Bar */}
          <div className="w-full flex items-center justify-between pb-2 text-xs font-mono">
            <button
              onClick={() => {
                soundEngine.playButtonClick();
                setScreen('WELCOME');
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>MAIN MENU</span>
            </button>

            <div className="flex items-center gap-2">
              {/* Google Play Mobile Frame Preview Toggle (for desktop testers) */}
              <button
                onClick={() => setSimulateMobileFrame(!simulateMobileFrame)}
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
                title="Toggle Mobile Play Store frame preview"
              >
                {simulateMobileFrame ? <Monitor className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
                <span>{simulateMobileFrame ? 'FULL VIEW' : 'MOBILE PREVIEW'}</span>
              </button>

              {/* Info Button */}
              <button
                onClick={() => {
                  soundEngine.playButtonClick();
                  setIsInfoOpen(true);
                }}
                className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
                title="How to play"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Optional Mobile Frame Wrapper */}
          <div className={`w-full flex-1 flex flex-col justify-between transition-all ${
            simulateMobileFrame 
              ? 'max-w-[400px] border-[10px] border-slate-800 rounded-[44px] p-3 shadow-2xl bg-slate-950 my-2'
              : 'w-full'
          }`}>
            
            {/* Live Scoreboard HUD */}
            <div className="w-full mb-2">
              <GameHud
                score={score}
                highScore={stats.highScore}
                pinsCount={pinsCount}
                level={level}
                currentSpeedMs={currentSpeedMs}
                speedLevel={settings.initialSpeed}
                isPaused={isPaused}
                onTogglePause={handleTogglePause}
                onOpenSettings={handleOpenSettings}
                sfxEnabled={settings.sfxEnabled}
                onToggleSfx={handleToggleSfx}
                theme={currentTheme}
              />
            </div>

            {/* Retro Grid Game Board */}
            <div className="w-full flex-1 flex items-center justify-center my-1">
              <GameBoard
                key={gameSessionId}
                settings={settings}
                theme={currentTheme}
                isPaused={isPaused}
                onScoreUpdate={handleScoreUpdate}
                onGameOver={handleGameOver}
                onRestart={handleRestartGame}
                onTogglePause={handleTogglePause}
                bufferedDirection={bufferedDirection}
                onDirectionConsumed={() => setBufferedDirection(null)}
              />
            </div>

            {/* Tactile On-Screen D-Pad for Mobile Devices */}
            {settings.showDpadOnMobile && (
              <div className="w-full mt-2">
                <TouchControls
                  onDirectionChange={(dir) => setBufferedDirection(dir)}
                  isPaused={isPaused}
                  onTogglePause={handleTogglePause}
                  accentColor={currentTheme.accentColor}
                />
              </div>
            )}

            {/* Mobile / Screen Footer Attribution */}
            <footer className="w-full flex items-center justify-between text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-900/60 mt-1">
              <span className="hidden sm:inline">SWIPE OR KEYS TO PLAY</span>
              <span className="sm:hidden">SWIPE TO STEER</span>
              <span className="text-slate-400 font-medium">powdered by hasnat creations</span>
            </footer>

          </div>

        </div>
      )}

      {/* In-Game Pause Overlay Modal */}
      <PauseModal
        isOpen={isPaused && !isGameOver && screen === 'PLAYING' && !isSettingsOpen}
        score={score}
        highScore={stats.highScore}
        pinsCount={pinsCount}
        onResume={() => {
          soundEngine.playPauseToggle(false);
          setIsPaused(false);
        }}
        onRestart={handleRestartGame}
        onOpenSettings={handleOpenSettings}
        onExitToMenu={() => {
          setIsPaused(false);
          setHasVisitedMenuOnce(true);
          setScreen('WELCOME');
        }}
        settings={settings}
        onToggleSfx={handleToggleSfx}
        theme={currentTheme}
      />

      {/* Game Over Overlay Modal */}
      <GameOverModal
        isOpen={isGameOver}
        score={score}
        highScore={stats.highScore}
        isNewHighScore={isNewHighScore}
        pinsCount={pinsCount}
        level={level}
        deathReason={deathReason}
        onRestart={handleRestartGame}
        onExitToMenu={() => {
          setIsGameOver(false);
          setHasVisitedMenuOnce(true);
          setScreen('WELCOME');
        }}
        onOpenSettings={handleOpenSettings}
        theme={currentTheme}
      />

      {/* Settings Modal (Stacked above Game Over & Pause with z-[70]) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={handleCloseSettings}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        stats={stats}
        onResetStats={handleResetStats}
      />

      {/* Info / Rules Modal */}
      <InfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
      />
    </div>
  );
}
