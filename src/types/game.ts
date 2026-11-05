export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface Coordinate {
  x: number;
  y: number;
}

export type GameScreen = 'WELCOME' | 'MENU' | 'PLAYING' | 'SETTINGS' | 'STATS';

export type GameStatus = 'IDLE' | 'COUNTDOWN' | 'RUNNING' | 'PAUSED' | 'GAMEOVER';

export type SpeedLevel = 'SLOW' | 'NORMAL' | 'FAST' | 'INSANE';

export interface SpeedConfig {
  id: SpeedLevel;
  label: string;
  sublabel: string;
  initialIntervalMs: number;
  minIntervalMs: number;
  speedStepMs: number;
}

export type ThemeId = 'OLED_NEON' | 'RETRO_NOKIA' | 'CYBERPUNK' | 'AMBER_80S' | 'MINIMAL_LIGHT';

export interface GameTheme {
  id: ThemeId;
  name: string;
  description: string;
  background: string;
  boardBg: string;
  gridLineColor: string;
  snakeHead: string;
  snakeBody: string;
  snakeEye: string;
  pinColor: string;
  pinGlow: string;
  goldenPinColor: string;
  accentColor: string;
  textColor: string;
  isDark: boolean;
}

export interface PinItem {
  x: number;
  y: number;
  type: 'STANDARD' | 'GOLDEN';
  points: number;
  spawnTime: number;
  expiresAt?: number;
}

export interface GameSettings {
  initialSpeed: SpeedLevel;
  dynamicSpeedUp: boolean;
  sfxEnabled: boolean;
  bgmEnabled: boolean;
  sfxVolume: number; // 0.0 to 1.0
  bgmVolume: number; // 0.0 to 1.0
  hapticEnabled: boolean;
  theme: ThemeId;
  showDpadOnMobile: boolean;
  showGridLines: boolean;
  wallCollision: boolean; // true = die on wall collision
}

export interface GameStats {
  highScore: number;
  totalGames: number;
  totalPinsEaten: number;
  highestLevel: number;
  longestSnake: number;
  lastPlayedDate: string;
}

export interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  life: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}
