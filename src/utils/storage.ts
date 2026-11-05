import { GameSettings, GameStats } from '../types/game';
import { DEFAULT_SETTINGS, DEFAULT_STATS } from './constants';

const SETTINGS_KEY = 'snake_pro_settings_v1';
const STATS_KEY = 'snake_pro_stats_v1';

export const storage = {
  getSettings(): GameSettings {
    try {
      const data = localStorage.getItem(SETTINGS_KEY);
      if (data) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
      }
    } catch (e) {
      console.warn('Could not read settings from localStorage:', e);
    }
    return DEFAULT_SETTINGS;
  },

  saveSettings(settings: GameSettings) {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn('Could not save settings to localStorage:', e);
    }
  },

  getStats(): GameStats {
    try {
      const data = localStorage.getItem(STATS_KEY);
      if (data) {
        return { ...DEFAULT_STATS, ...JSON.parse(data) };
      }
    } catch (e) {
      console.warn('Could not read stats from localStorage:', e);
    }
    return DEFAULT_STATS;
  },

  saveStats(stats: GameStats) {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch (e) {
      console.warn('Could not save stats to localStorage:', e);
    }
  },

  updateScore(score: number, pinsEaten: number, level: number, snakeLength: number): { isNewHighScore: boolean; updatedStats: GameStats } {
    const currentStats = this.getStats();
    const isNewHighScore = score > currentStats.highScore;
    
    const updatedStats: GameStats = {
      highScore: Math.max(currentStats.highScore, score),
      totalGames: currentStats.totalGames + 1,
      totalPinsEaten: currentStats.totalPinsEaten + pinsEaten,
      highestLevel: Math.max(currentStats.highestLevel, level),
      longestSnake: Math.max(currentStats.longestSnake, snakeLength),
      lastPlayedDate: new Date().toISOString(),
    };

    this.saveStats(updatedStats);
    return { isNewHighScore, updatedStats };
  },

  resetHighScore(): GameStats {
    const current = this.getStats();
    const updated: GameStats = { ...current, highScore: 0 };
    this.saveStats(updated);
    return updated;
  }
};
