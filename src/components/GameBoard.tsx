import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Coordinate, Direction, FloatingText, GameSettings, GameTheme, Particle, PinItem, SpeedLevel } from '../types/game';
import { GRID_SIZE, SPEED_CONFIGS } from '../utils/constants';
import { soundEngine } from '../utils/audio';

interface GameBoardProps {
  settings: GameSettings;
  theme: GameTheme;
  isPaused: boolean;
  onScoreUpdate: (score: number, pinsCount: number, level: number, currentSpeedMs: number) => void;
  onGameOver: (finalScore: number, pinsCount: number, level: number, deathReason: 'WALL' | 'TAIL') => void;
  onRestart?: () => void;
  onTogglePause?: () => void;
  onLevelUp?: (level: number) => void;
  bufferedDirection: Direction | null;
  onDirectionConsumed: () => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  settings,
  theme,
  isPaused,
  onScoreUpdate,
  onGameOver,
  onRestart,
  onTogglePause,
  onLevelUp,
  bufferedDirection,
  onDirectionConsumed,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Core Game State Refs to maintain ultra-low latency without React re-render lag
  const snakeRef = useRef<Coordinate[]>([
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ]);
  const directionRef = useRef<Direction>('RIGHT');
  const inputQueueRef = useRef<Direction[]>([]);
  const pinRef = useRef<PinItem | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);

  const scoreRef = useRef<number>(0);
  const pinsCountRef = useRef<number>(0);
  const comboRef = useRef<number>(1);
  const lastPinTimeRef = useRef<number>(0);
  const levelRef = useRef<number>(1);
  const isGameOverRef = useRef<boolean>(false);

  // Crash Animation: Screen Shake & Shockwave Rings
  const shakeRef = useRef<{ intensity: number; decay: number; x: number; y: number }>({
    intensity: 0,
    decay: 0.88,
    x: 0,
    y: 0,
  });
  const shockwavesRef = useRef<{
    x: number;
    y: number;
    radius: number;
    maxRadius: number;
    color: string;
    alpha: number;
    lineWidth: number;
  }[]>([]);

  // Speed and loop timing
  const speedConfig = SPEED_CONFIGS[settings.initialSpeed];
  const intervalRef = useRef<number>(speedConfig.initialIntervalMs);
  const lastTickTimeRef = useRef<number>(0);
  const reqAnimRef = useRef<number | null>(null);

  // Touch gesture tracker
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  // Spawns a pin at a random unoccupied cell
  const spawnPin = useCallback(() => {
    const occupied = new Set<string>();
    snakeRef.current.forEach((seg) => occupied.add(`${seg.x},${seg.y}`));

    const available: Coordinate[] = [];
    for (let x = 1; x < GRID_SIZE - 1; x++) {
      for (let y = 1; y < GRID_SIZE - 1; y++) {
        if (!occupied.has(`${x},${y}`)) {
          available.push({ x, y });
        }
      }
    }

    if (available.length === 0) return;

    const randomIndex = Math.floor(Math.random() * available.length);
    const pos = available[randomIndex];

    // 15% chance to spawn a bonus Golden Pin
    const isGolden = Math.random() < 0.15;
    pinRef.current = {
      x: pos.x,
      y: pos.y,
      type: isGolden ? 'GOLDEN' : 'STANDARD',
      points: isGolden ? 50 : 10,
      spawnTime: Date.now(),
      expiresAt: isGolden ? Date.now() + 8000 : undefined, // Golden pin expires in 8s
    };
  }, []);

  // Initialize Game on Mount
  useEffect(() => {
    // Reset snake in the center
    snakeRef.current = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ];
    directionRef.current = 'RIGHT';
    inputQueueRef.current = [];
    scoreRef.current = 0;
    pinsCountRef.current = 0;
    comboRef.current = 1;
    levelRef.current = 1;
    isGameOverRef.current = false;
    particlesRef.current = [];
    floatingTextsRef.current = [];
    intervalRef.current = speedConfig.initialIntervalMs;

    spawnPin();
    onScoreUpdate(0, 0, 1, intervalRef.current);

    if (settings.bgmEnabled) {
      soundEngine.startBgm();
    }

    return () => {
      if (reqAnimRef.current) cancelAnimationFrame(reqAnimRef.current);
      soundEngine.stopBgm();
    };
  }, [settings.initialSpeed, spawnPin]);

  // Handle external direction command (from mobile D-Pad or UI button)
  useEffect(() => {
    if (bufferedDirection) {
      enqueueDirection(bufferedDirection);
      onDirectionConsumed();
    }
  }, [bufferedDirection, onDirectionConsumed]);

  // Queue safe direction to prevent instant 180-degree self collision
  const enqueueDirection = (newDir: Direction) => {
    if (isGameOverRef.current || isPaused) return;

    const lastPlannedDir = inputQueueRef.current.length > 0
      ? inputQueueRef.current[inputQueueRef.current.length - 1]
      : directionRef.current;

    const opposites: Record<Direction, Direction> = {
      UP: 'DOWN',
      DOWN: 'UP',
      LEFT: 'RIGHT',
      RIGHT: 'LEFT',
    };

    if (newDir !== lastPlannedDir && newDir !== opposites[lastPlannedDir]) {
      if (inputQueueRef.current.length < 3) {
        inputQueueRef.current.push(newDir);
      }
    }
  };

  // Keyboard navigation listener (Arrow keys + WASD + Space/Enter restart)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Enter'].includes(e.key)) {
        e.preventDefault();
      }

      if (isGameOverRef.current) {
        if (e.key === ' ' || e.key === 'Enter' || e.key === 'r' || e.key === 'R') {
          soundEngine.playButtonClick();
          onRestart?.();
        }
        return;
      }

      // Space, P, or Escape pauses the active game
      if (e.key === ' ' || e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        onTogglePause?.();
        return;
      }

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          enqueueDirection('UP');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          enqueueDirection('DOWN');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          enqueueDirection('LEFT');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          enqueueDirection('RIGHT');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPaused, onRestart, onTogglePause]);

  // Spawn visual particles
  const addParticles = (x: number, y: number, color: string, count = 12) => {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 1.5 + Math.random() * 3.5;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: 2 + Math.random() * 3,
        life: 0,
        maxLife: 20 + Math.random() * 15,
      });
    }
  };

  // Add floating text (e.g. "+10", "+50!")
  const addFloatingText = (x: number, y: number, text: string, color: string) => {
    floatingTextsRef.current.push({
      id: Math.random(),
      x,
      y,
      text,
      color,
      alpha: 1,
      life: 0,
    });
  };

  // Spawn visual shockwave ring
  const addShockwave = (x: number, y: number, color = '#ef4444', maxRadius = 80) => {
    shockwavesRef.current.push({
      x,
      y,
      radius: 4,
      maxRadius,
      color,
      alpha: 1.0,
      lineWidth: 3.5,
    });
  };

  // Game Logic Tick
  const updateGameTick = () => {
    if (isGameOverRef.current || isPaused) return;

    // Apply next queued direction
    if (inputQueueRef.current.length > 0) {
      directionRef.current = inputQueueRef.current.shift()!;
    }

    const currentHead = snakeRef.current[0];
    let nextX = currentHead.x;
    let nextY = currentHead.y;

    switch (directionRef.current) {
      case 'UP':
        nextY -= 1;
        break;
      case 'DOWN':
        nextY += 1;
        break;
      case 'LEFT':
        nextX -= 1;
        break;
      case 'RIGHT':
        nextX += 1;
        break;
    }

    // 1. Check Wall Collision with dynamic screen shake & impact shockwave
    if (nextX < 0 || nextX >= GRID_SIZE || nextY < 0 || nextY >= GRID_SIZE) {
      isGameOverRef.current = true;
      const clampedX = Math.max(0, Math.min(GRID_SIZE - 1, nextX));
      const clampedY = Math.max(0, Math.min(GRID_SIZE - 1, nextY));

      // Screen shake
      shakeRef.current.intensity = 18;

      // Shockwave ring and spark debris
      addShockwave(clampedX, clampedY, '#ef4444', 95);
      addParticles(clampedX, clampedY, '#ef4444', 36);
      addFloatingText(clampedX, clampedY, 'WALL CRASH!', '#f43f5e');

      soundEngine.playGameOver();

      setTimeout(() => {
        onGameOver(scoreRef.current, pinsCountRef.current, levelRef.current, 'WALL');
      }, 450);
      return;
    }

    // 2. Check Tail Collision with concentric energy ripples
    const tailCollision = snakeRef.current.some(
      (segment) => segment.x === nextX && segment.y === nextY
    );

    if (tailCollision) {
      isGameOverRef.current = true;

      // Screen shake
      shakeRef.current.intensity = 14;

      // Shockwave ring and spark debris
      addShockwave(nextX, nextY, '#f59e0b', 80);
      addParticles(nextX, nextY, '#f59e0b', 36);
      addFloatingText(nextX, nextY, 'TAIL BITE!', '#f59e0b');

      soundEngine.playGameOver();

      setTimeout(() => {
        onGameOver(scoreRef.current, pinsCountRef.current, levelRef.current, 'TAIL');
      }, 450);
      return;
    }

    // Move Snake
    const newHead: Coordinate = { x: nextX, y: nextY };
    const newSnake = [newHead, ...snakeRef.current];

    // 3. Check Pin Collection
    const pin = pinRef.current;
    let eaten = false;

    if (pin && pin.x === nextX && pin.y === nextY) {
      eaten = true;
      const isGolden = pin.type === 'GOLDEN';

      // Combo scoring if eaten rapidly
      const now = Date.now();
      if (now - lastPinTimeRef.current < 4000) {
        comboRef.current = Math.min(comboRef.current + 1, 5);
      } else {
        comboRef.current = 1;
      }
      lastPinTimeRef.current = now;

      const earnedPoints = pin.points * comboRef.current;
      scoreRef.current += earnedPoints;
      pinsCountRef.current += 1;

      // Audio & Haptics
      soundEngine.playPinCollect(isGolden, comboRef.current);

      // Effects
      const textLabel = comboRef.current > 1 
        ? `+${earnedPoints} (x${comboRef.current})`
        : `+${earnedPoints}`;
      addFloatingText(nextX, nextY, textLabel, isGolden ? theme.goldenPinColor : theme.pinColor);
      addParticles(nextX, nextY, isGolden ? theme.goldenPinColor : theme.pinColor, isGolden ? 20 : 12);

      // Dynamic Speed Progression
      if (settings.dynamicSpeedUp) {
        intervalRef.current = Math.max(
          speedConfig.minIntervalMs,
          intervalRef.current - speedConfig.speedStepMs
        );
      }

      // Level up every 5 pins collected
      const newLevel = Math.floor(pinsCountRef.current / 5) + 1;
      if (newLevel > levelRef.current) {
        levelRef.current = newLevel;
        soundEngine.playLevelUp();
        addFloatingText(GRID_SIZE / 2, GRID_SIZE / 2, `LEVEL ${newLevel}!`, '#facc15');
        if (onLevelUp) onLevelUp(newLevel);
      }

      // Notify score update
      onScoreUpdate(scoreRef.current, pinsCountRef.current, levelRef.current, intervalRef.current);

      // Spawn next pin
      spawnPin();
    } else {
      // Normal move: remove tail
      newSnake.pop();
    }

    snakeRef.current = newSnake;

    // Check golden pin expiration
    if (pinRef.current && pinRef.current.expiresAt && Date.now() > pinRef.current.expiresAt) {
      spawnPin();
    }
  };

  // High-performance 60fps Render Loop using Canvas
  useEffect(() => {
    let animId: number;

    const render = (timestamp: number) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animId = requestAnimationFrame(render);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Handle Fixed Timestep for Game Logic
      if (!lastTickTimeRef.current) lastTickTimeRef.current = timestamp;
      const elapsed = timestamp - lastTickTimeRef.current;

      if (elapsed >= intervalRef.current && !isPaused && !isGameOverRef.current) {
        updateGameTick();
        lastTickTimeRef.current = timestamp;
      }

      // Render Frame Dimensions
      const width = canvas.width;
      const height = canvas.height;
      const cellSize = width / GRID_SIZE;

      // Screen Shake update on crash
      const shake = shakeRef.current;
      if (shake.intensity > 0.08) {
        shake.x = (Math.random() - 0.5) * shake.intensity;
        shake.y = (Math.random() - 0.5) * shake.intensity;
        shake.intensity *= shake.decay;
      } else {
        shake.x = 0;
        shake.y = 0;
        shake.intensity = 0;
      }

      ctx.save();
      ctx.translate(shake.x, shake.y);

      // Clear Canvas with Board Background
      ctx.fillStyle = theme.boardBg;
      ctx.fillRect(-24, -24, width + 48, height + 48);

      // Draw Retro Grid Lines if enabled
      if (settings.showGridLines) {
        ctx.strokeStyle = theme.gridLineColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i <= GRID_SIZE; i++) {
          const pos = Math.floor(i * cellSize) + 0.5;
          ctx.moveTo(pos, 0);
          ctx.lineTo(pos, height);
          ctx.moveTo(0, pos);
          ctx.lineTo(width, pos);
        }
        ctx.stroke();
      }

      // Draw Expanding Shockwaves
      const activeShockwaves: typeof shockwavesRef.current = [];
      shockwavesRef.current.forEach((sw) => {
        sw.radius += 4;
        sw.alpha = Math.max(0, 1 - sw.radius / sw.maxRadius);

        if (sw.alpha > 0) {
          ctx.save();
          ctx.globalAlpha = sw.alpha;
          ctx.strokeStyle = sw.color;
          ctx.lineWidth = sw.lineWidth;
          ctx.shadowColor = sw.color;
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(sw.x * cellSize + cellSize / 2, sw.y * cellSize + cellSize / 2, sw.radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
          activeShockwaves.push(sw);
        }
      });
      shockwavesRef.current = activeShockwaves;

      // Draw Pin (Collectible Item)
      const pin = pinRef.current;
      if (pin) {
        const pinPx = pin.x * cellSize + cellSize / 2;
        const pinPy = pin.y * cellSize + cellSize / 2;
        const radius = cellSize * 0.36;
        const isGolden = pin.type === 'GOLDEN';
        const color = isGolden ? theme.goldenPinColor : theme.pinColor;

        // Glowing aura
        ctx.save();
        ctx.shadowColor = isGolden ? 'rgba(251, 191, 36, 0.9)' : theme.pinGlow;
        ctx.shadowBlur = isGolden ? 18 : 12;

        // Pin Head (Circular retro jewel / pinhead)
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(pinPx, pinPy - 2, radius, 0, Math.PI * 2);
        ctx.fill();

        // Pin Core highlight
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(pinPx - radius * 0.3, pinPy - 2 - radius * 0.3, radius * 0.35, 0, Math.PI * 2);
        ctx.fill();

        // Pin Needle stem
        ctx.strokeStyle = isGolden ? '#fef08a' : '#fda4af';
        ctx.lineWidth = Math.max(2, cellSize * 0.12);
        ctx.beginPath();
        ctx.moveTo(pinPx, pinPy);
        ctx.lineTo(pinPx, pinPy + cellSize * 0.42);
        ctx.stroke();

        ctx.restore();
      }

      // Draw Snake Body & Head
      const snake = snakeRef.current;
      const snakeLength = snake.length;

      for (let i = snakeLength - 1; i >= 0; i--) {
        const seg = snake[i];
        const isHead = i === 0;
        const px = seg.x * cellSize;
        const py = seg.y * cellSize;
        const padding = cellSize * 0.08;
        const segSize = cellSize - padding * 2;
        const segRadius = isHead ? cellSize * 0.45 : cellSize * 0.3;

        ctx.save();

        if (isHead) {
          // Head Glow
          ctx.shadowColor = theme.snakeHead;
          ctx.shadowBlur = 10;
          ctx.fillStyle = theme.snakeHead;
        } else {
          // Body gradient / color
          ctx.fillStyle = theme.snakeBody;
        }

        // Draw rounded rectangle for segment
        ctx.beginPath();
        ctx.roundRect(px + padding, py + padding, segSize, segSize, segRadius);
        ctx.fill();

        // Draw Expressive Snake Eyes on Head
        if (isHead) {
          ctx.shadowBlur = 0;
          const eyeRadius = cellSize * 0.12;
          const pupilRadius = cellSize * 0.06;
          const eyeOffset = cellSize * 0.26;

          let eye1X = px + cellSize / 2 - eyeOffset;
          let eye1Y = py + cellSize / 2 - eyeOffset;
          let eye2X = px + cellSize / 2 + eyeOffset;
          let eye2Y = py + cellSize / 2 - eyeOffset;

          const dir = directionRef.current;
          if (dir === 'RIGHT') {
            eye1X = px + cellSize * 0.65;
            eye1Y = py + cellSize * 0.28;
            eye2X = px + cellSize * 0.65;
            eye2Y = py + cellSize * 0.72;
          } else if (dir === 'LEFT') {
            eye1X = px + cellSize * 0.35;
            eye1Y = py + cellSize * 0.28;
            eye2X = px + cellSize * 0.35;
            eye2Y = py + cellSize * 0.72;
          } else if (dir === 'DOWN') {
            eye1X = px + cellSize * 0.28;
            eye1Y = py + cellSize * 0.65;
            eye2X = px + cellSize * 0.72;
            eye2Y = py + cellSize * 0.65;
          } else { // UP
            eye1X = px + cellSize * 0.28;
            eye1Y = py + cellSize * 0.35;
            eye2X = px + cellSize * 0.72;
            eye2Y = py + cellSize * 0.35;
          }

          if (isGameOverRef.current) {
            // Dead X eyes on collision
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = Math.max(2, cellSize * 0.08);
            const cross = eyeRadius * 0.9;
            ctx.beginPath();
            ctx.moveTo(eye1X - cross, eye1Y - cross);
            ctx.lineTo(eye1X + cross, eye1Y + cross);
            ctx.moveTo(eye1X + cross, eye1Y - cross);
            ctx.lineTo(eye1X - cross, eye1Y + cross);
            ctx.moveTo(eye2X - cross, eye2Y - cross);
            ctx.lineTo(eye2X + cross, eye2Y + cross);
            ctx.moveTo(eye2X + cross, eye2Y - cross);
            ctx.lineTo(eye2X - cross, eye2Y + cross);
            ctx.stroke();
          } else {
            // Eye whites
            ctx.fillStyle = theme.snakeEye;
            ctx.beginPath();
            ctx.arc(eye1X, eye1Y, eyeRadius, 0, Math.PI * 2);
            ctx.arc(eye2X, eye2Y, eyeRadius, 0, Math.PI * 2);
            ctx.fill();

            // Pupils
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(eye1X, eye1Y, pupilRadius, 0, Math.PI * 2);
            ctx.arc(eye2X, eye2Y, pupilRadius, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        ctx.restore();
      }

      // Draw Particles
      const activeParticles: Particle[] = [];
      particlesRef.current.forEach((p) => {
        p.x += p.vx * (cellSize / 20);
        p.y += p.vy * (cellSize / 20);
        p.life += 1;

        if (p.life < p.maxLife) {
          const alpha = 1 - p.life / p.maxLife;
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(
            p.x * cellSize + cellSize / 2,
            p.y * cellSize + cellSize / 2,
            p.size,
            0,
            Math.PI * 2
          );
          ctx.fill();
          ctx.restore();
          activeParticles.push(p);
        }
      });
      particlesRef.current = activeParticles;

      // Draw Floating Texts
      const activeTexts: FloatingText[] = [];
      floatingTextsRef.current.forEach((ft) => {
        ft.life += 1;
        ft.y -= 0.035;
        ft.alpha = Math.max(0, 1 - ft.life / 35);

        if (ft.alpha > 0) {
          ctx.save();
          ctx.font = `bold ${Math.floor(cellSize * 0.85)}px JetBrains Mono, monospace`;
          ctx.fillStyle = ft.color;
          ctx.globalAlpha = ft.alpha;
          ctx.textAlign = 'center';
          ctx.shadowColor = 'rgba(0,0,0,0.8)';
          ctx.shadowBlur = 6;
          ctx.fillText(
            ft.text,
            ft.x * cellSize + cellSize / 2,
            ft.y * cellSize + cellSize / 2
          );
          ctx.restore();
          activeTexts.push(ft);
        }
      });
      floatingTextsRef.current = activeTexts;

      // Restore Canvas Transform after Screen Shake
      ctx.restore();

      // Loop
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    reqAnimRef.current = animId;

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [theme, settings.showGridLines, isPaused]);

  // Handle Touch Swipes Directly on Canvas for low latency
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      touchStartPos.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    // Prevent screen scroll while swiping inside the game grid
    if (e.cancelable) {
      e.preventDefault();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (isGameOverRef.current) {
      if (onRestart) {
        soundEngine.playButtonClick();
        onRestart();
      }
      touchStartPos.current = null;
      return;
    }

    if (!touchStartPos.current) return;
    const touchEnd = e.changedTouches[0];
    const dx = touchEnd.clientX - touchStartPos.current.x;
    const dy = touchEnd.clientY - touchStartPos.current.y;
    const threshold = 24; // 24px swipe threshold

    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal swipe
      if (Math.abs(dx) > threshold) {
        soundEngine.playTurnTick();
        soundEngine.triggerHaptic('light');
        enqueueDirection(dx > 0 ? 'RIGHT' : 'LEFT');
      }
    } else {
      // Vertical swipe
      if (Math.abs(dy) > threshold) {
        soundEngine.playTurnTick();
        soundEngine.triggerHaptic('light');
        enqueueDirection(dy > 0 ? 'DOWN' : 'UP');
      }
    }

    touchStartPos.current = null;
  };

  const handleCanvasClick = () => {
    if (isGameOverRef.current && onRestart) {
      soundEngine.playButtonClick();
      onRestart();
    }
  };

  return (
    <div className="relative w-full aspect-square max-w-[480px] sm:max-w-[520px] mx-auto rounded-3xl overflow-hidden border-2 border-slate-800 shadow-2xl bg-slate-950 touch-none">
      <canvas
        ref={canvasRef}
        width={560}
        height={560}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleCanvasClick}
        className="w-full h-full block cursor-pointer"
        style={{
          imageRendering: 'pixelated',
          background: theme.boardBg,
        }}
      />
    </div>
  );
};
