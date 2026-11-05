import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Coordinate, Direction, GameSettings, GameTheme, PinItem, SpeedLevel } from '../types/game';
import { GRID_SIZE, SPEED_CONFIGS } from '../utils/constants';
import { soundEngine } from '../utils/audio';

interface GameBoard3DProps {
  settings: GameSettings;
  theme: GameTheme;
  isPaused: boolean;
  onScoreUpdate: (score: number, pinsCount: number, level: number, currentSpeedMs: number) => void;
  onGameOver: (finalScore: number, pinsCount: number, level: number, deathReason: 'WALL' | 'TAIL') => void;
  onRestart?: () => void;
  onLevelUp?: (level: number) => void;
  bufferedDirection: Direction | null;
  onDirectionConsumed: () => void;
}

interface Debris3D {
  mesh: THREE.Mesh | THREE.Group;
  velocity: THREE.Vector3;
  rotVelocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

interface FloatingScore3D {
  sprite: THREE.Sprite;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

export const GameBoard3D: React.FC<GameBoard3DProps> = ({
  settings,
  theme,
  isPaused,
  onScoreUpdate,
  onGameOver,
  onRestart,
  onLevelUp,
  bufferedDirection,
  onDirectionConsumed,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Logical Game State
  const snakeRef = useRef<Coordinate[]>([
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ]);
  const directionRef = useRef<Direction>('RIGHT');
  const inputQueueRef = useRef<Direction[]>([]);
  const pinRef = useRef<PinItem | null>(null);

  const scoreRef = useRef<number>(0);
  const pinsCountRef = useRef<number>(0);
  const comboRef = useRef<number>(1);
  const lastPinTimeRef = useRef<number>(0);
  const levelRef = useRef<number>(1);
  const isGameOverRef = useRef<boolean>(false);

  // Timing
  const speedConfig = SPEED_CONFIGS[settings.initialSpeed];
  const intervalRef = useRef<number>(speedConfig.initialIntervalMs);
  const lastTickTimeRef = useRef<number>(0);

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  // 3D Visual Object Groups
  const snakeMeshesRef = useRef<THREE.Group[]>([]);
  const pinMeshRef = useRef<THREE.Group | null>(null);
  const pinLightRef = useRef<THREE.PointLight | null>(null);
  const debrisListRef = useRef<Debris3D[]>([]);
  const floatingScoresRef = useRef<FloatingScore3D[]>([]);
  const wallsMeshRef = useRef<THREE.Group | null>(null);
  const floorGridRef = useRef<THREE.Group | null>(null);

  // Crash Animation Camera Shake
  const cameraShakeRef = useRef<{ intensity: number; decay: number; offsetX: number; offsetY: number }>({
    intensity: 0,
    decay: 0.9,
    offsetX: 0,
    offsetY: 0,
  });

  // Touch Swipe Tracker
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  // Camera View Mode: 3D Isometric or 3D Tilted Arcade
  const [cameraView, setCameraView] = useState<'ISOMETRIC' | 'CHASE'>('ISOMETRIC');

  // World coordinates translation: Grid (0 to GRID_SIZE-1) to 3D Plane (-HALF_WIDTH to +HALF_WIDTH)
  const CELL_3D_SIZE = 1.0;
  const HALF_GRID = (GRID_SIZE * CELL_3D_SIZE) / 2;

  const gridToWorld = (gx: number, gy: number, yOffset = 0.5): THREE.Vector3 => {
    return new THREE.Vector3(
      (gx + 0.5) * CELL_3D_SIZE - HALF_GRID,
      yOffset,
      (gy + 0.5) * CELL_3D_SIZE - HALF_GRID
    );
  };

  // Safe direction queue
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

  // Keyboard navigation
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
  }, [isPaused, onRestart]);

  // Direction from external D-Pad
  useEffect(() => {
    if (bufferedDirection) {
      enqueueDirection(bufferedDirection);
      onDirectionConsumed();
    }
  }, [bufferedDirection, onDirectionConsumed]);

  // Spawns Pin
  const spawnPin = () => {
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

    const isGolden = Math.random() < 0.16;
    pinRef.current = {
      x: pos.x,
      y: pos.y,
      type: isGolden ? 'GOLDEN' : 'STANDARD',
      points: isGolden ? 50 : 10,
      spawnTime: Date.now(),
      expiresAt: isGolden ? Date.now() + 8500 : undefined,
    };
  };

  // Add 3D floating text sprite
  const addFloatingScore = (worldPos: THREE.Vector3, text: string, color: string) => {
    if (!sceneRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.font = 'bold 54px JetBrains Mono, monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 10;
    ctx.fillText(text, 128, 70);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(worldPos);
    sprite.position.y += 0.8;
    sprite.scale.set(3, 1.5, 1);

    sceneRef.current.add(sprite);
    floatingScoresRef.current.push({
      sprite,
      velocity: new THREE.Vector3(0, 1.8, 0),
      life: 0,
      maxLife: 45,
    });
  };

  // Trigger 3D Particle Debris Shatter on crash
  const triggerCrashShatter = (crashPos: THREE.Vector3, reason: 'WALL' | 'TAIL') => {
    if (!sceneRef.current) return;

    // Trigger Camera Shake
    cameraShakeRef.current.intensity = reason === 'WALL' ? 0.8 : 0.6;

    // Explode each snake segment into 3D tumbling voxel cubes
    const snakeMeshGroups = [...snakeMeshesRef.current];
    snakeMeshGroups.forEach((segGroup, idx) => {
      // Detach and transform into tumbling debris
      const pos = segGroup.position.clone();
      sceneRef.current?.remove(segGroup);

      // Create 2 to 3 fragment voxels per segment
      for (let f = 0; f < 3; f++) {
        const fragGeo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
        const fragMat = new THREE.MeshStandardMaterial({
          color: idx === 0 ? 0xff3344 : (reason === 'WALL' ? 0xef4444 : 0xf59e0b),
          roughness: 0.3,
          metalness: 0.7,
          emissive: 0xff0000,
          emissiveIntensity: 0.4,
        });
        const frag = new THREE.Mesh(fragGeo, fragMat);
        frag.position.copy(pos).add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.4,
          (Math.random() - 0.5) * 0.4,
          (Math.random() - 0.5) * 0.4
        ));

        // Blast outward from collision epicenter
        const dir = frag.position.clone().sub(crashPos).normalize();
        if (dir.lengthSq() < 0.01) dir.set(Math.random() - 0.5, 1, Math.random() - 0.5).normalize();

        const speed = 2.5 + Math.random() * 5.0;
        const velocity = new THREE.Vector3(
          dir.x * speed + (Math.random() - 0.5) * 2,
          Math.abs(dir.y) * speed + 3.0 + Math.random() * 3.5, // Launch up into 3D space
          dir.z * speed + (Math.random() - 0.5) * 2
        );

        const rotVelocity = new THREE.Vector3(
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 15
        );

        sceneRef.current?.add(frag);
        debrisListRef.current.push({
          mesh: frag,
          velocity,
          rotVelocity,
          life: 0,
          maxLife: 70,
        });
      }
    });

    // Clear snake meshes reference since they exploded
    snakeMeshesRef.current = [];

    // Add bright crash blast flash light
    const blastLight = new THREE.PointLight(0xff2222, 10, 15);
    blastLight.position.copy(crashPos).add(new THREE.Vector3(0, 1.5, 0));
    sceneRef.current.add(blastLight);
    setTimeout(() => {
      sceneRef.current?.remove(blastLight);
    }, 250);
  };

  // Helper to create a multi-part 3D Snake Segment (Head or Body)
  const createSnakeHeadMesh = (): THREE.Group => {
    const headGroup = new THREE.Group();

    // 1. Primary Wedge Body
    const headGeo = new THREE.BoxGeometry(0.85, 0.7, 0.95);
    const headMat = new THREE.MeshStandardMaterial({
      color: theme.snakeHead,
      roughness: 0.25,
      metalness: 0.6,
      emissive: theme.snakeHead,
      emissiveIntensity: 0.2,
    });
    const mainHead = new THREE.Mesh(headGeo, headMat);
    mainHead.castShadow = true;
    mainHead.receiveShadow = true;
    mainHead.position.y = 0.35;
    headGroup.add(mainHead);

    // 2. Chrome Nose Bevel
    const noseGeo = new THREE.CylinderGeometry(0.35, 0.42, 0.3, 16);
    const noseMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.1,
      metalness: 0.9,
    });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 0.35, 0.46);
    headGroup.add(nose);

    // 3. Expressive 3D Eyes
    const eyeGeo = new THREE.SphereGeometry(0.14, 16, 16);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1 });
    const pupilGeo = new THREE.SphereGeometry(0.07, 12, 12);
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 });

    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.3, 0.56, 0.25);
    const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
    leftPupil.position.set(-0.3, 0.58, 0.36);
    headGroup.add(leftEye, leftPupil);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.3, 0.56, 0.25);
    const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
    rightPupil.position.set(0.3, 0.58, 0.36);
    headGroup.add(rightEye, rightPupil);

    // 4. Forward Head Light Beam
    const headLight = new THREE.PointLight(theme.snakeHead, 2.5, 4.5);
    headLight.position.set(0, 0.5, 0.8);
    headGroup.add(headLight);

    return headGroup;
  };

  const createSnakeBodyMesh = (idx: number): THREE.Group => {
    const bodyGroup = new THREE.Group();

    // Rounded rectangular body segment
    const bodyGeo = new THREE.BoxGeometry(0.8, 0.62, 0.8);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: theme.snakeBody,
      roughness: 0.35,
      metalness: 0.45,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    body.receiveShadow = true;
    body.position.y = 0.31;
    bodyGroup.add(body);

    // Glowing spine strip
    const spineGeo = new THREE.BoxGeometry(0.2, 0.08, 0.65);
    const spineMat = new THREE.MeshStandardMaterial({
      color: theme.accentColor,
      emissive: theme.accentColor,
      emissiveIntensity: 0.7,
      roughness: 0.2,
    });
    const spine = new THREE.Mesh(spineGeo, spineMat);
    spine.position.y = 0.64;
    bodyGroup.add(spine);

    return bodyGroup;
  };

  // Helper to create a 3D Gemstone Pin Collectible
  const createPin3DMesh = (isGolden: boolean): THREE.Group => {
    const pinGroup = new THREE.Group();

    // 1. Faceted Pin Gem Head
    const gemGeo = isGolden ? new THREE.OctahedronGeometry(0.42, 0) : new THREE.DodecahedronGeometry(0.38, 0);
    const gemMat = new THREE.MeshPhysicalMaterial({
      color: isGolden ? 0xfbbf24 : theme.pinColor,
      roughness: 0.1,
      metalness: 0.2,
      transmission: 0.5,
      thickness: 1.2,
      emissive: isGolden ? 0xf59e0b : theme.pinColor,
      emissiveIntensity: 0.6,
      clearcoat: 1.0,
    });
    const gem = new THREE.Mesh(gemGeo, gemMat);
    gem.position.y = 0.75;
    gem.castShadow = true;
    pinGroup.add(gem);

    // 2. Gleaming Tapered Pin Needle
    const stemGeo = new THREE.ConeGeometry(0.08, 0.75, 12);
    const stemMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.95,
      roughness: 0.1,
    });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.rotation.x = Math.PI;
    stem.position.y = 0.375;
    pinGroup.add(stem);

    // 3. Hovering Aura Ring
    const ringGeo = new THREE.TorusGeometry(0.48, 0.035, 12, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: isGolden ? 0xfef08a : theme.pinColor,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.75;
    pinGroup.add(ring);

    return pinGroup;
  };

  // Game Logic Tick
  const updateGameTick = () => {
    if (isGameOverRef.current || isPaused) return;

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

    // 1. Wall Collision
    if (nextX < 0 || nextX >= GRID_SIZE || nextY < 0 || nextY >= GRID_SIZE) {
      isGameOverRef.current = true;
      const crashPos = gridToWorld(
        Math.max(0, Math.min(GRID_SIZE - 1, nextX)),
        Math.max(0, Math.min(GRID_SIZE - 1, nextY)),
        0.5
      );
      triggerCrashShatter(crashPos, 'WALL');
      soundEngine.playGameOver();
      setTimeout(() => {
        onGameOver(scoreRef.current, pinsCountRef.current, levelRef.current, 'WALL');
      }, 550);
      return;
    }

    // 2. Tail Collision
    const tailCollision = snakeRef.current.some(
      (segment) => segment.x === nextX && segment.y === nextY
    );

    if (tailCollision) {
      isGameOverRef.current = true;
      const crashPos = gridToWorld(nextX, nextY, 0.5);
      triggerCrashShatter(crashPos, 'TAIL');
      soundEngine.playGameOver();
      setTimeout(() => {
        onGameOver(scoreRef.current, pinsCountRef.current, levelRef.current, 'TAIL');
      }, 550);
      return;
    }

    // Move Snake
    const newHead: Coordinate = { x: nextX, y: nextY };
    const newSnake = [newHead, ...snakeRef.current];

    // 3. Pin Collection
    const pin = pinRef.current;
    if (pin && pin.x === nextX && pin.y === nextY) {
      const isGolden = pin.type === 'GOLDEN';
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

      soundEngine.playPinCollect(isGolden, comboRef.current);

      const label = comboRef.current > 1 ? `+${earnedPoints} (x${comboRef.current})` : `+${earnedPoints}`;
      addFloatingScore(gridToWorld(nextX, nextY), label, isGolden ? '#facc15' : theme.pinColor);

      if (settings.dynamicSpeedUp) {
        intervalRef.current = Math.max(
          speedConfig.minIntervalMs,
          intervalRef.current - speedConfig.speedStepMs
        );
      }

      const newLevel = Math.floor(pinsCountRef.current / 5) + 1;
      if (newLevel > levelRef.current) {
        levelRef.current = newLevel;
        soundEngine.playLevelUp();
        addFloatingScore(new THREE.Vector3(0, 3, 0), `LEVEL ${newLevel}!`, '#facc15');
        if (onLevelUp) onLevelUp(newLevel);
      }

      onScoreUpdate(scoreRef.current, pinsCountRef.current, levelRef.current, intervalRef.current);
      spawnPin();
    } else {
      newSnake.pop();
    }

    snakeRef.current = newSnake;

    // Check golden pin expiration
    if (pinRef.current && pinRef.current.expiresAt && Date.now() > pinRef.current.expiresAt) {
      spawnPin();
    }
  };

  // Initialize Three.js Scene, Camera, Renderer, Lighting & 3D Arena
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(theme.background);
    scene.fog = new THREE.FogExp2(theme.background, 0.022);

    // Camera
    const width = mount.clientWidth || 540;
    const height = mount.clientHeight || 540;
    const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 100);
    cameraRef.current = camera;
    camera.position.set(0, 20.5, 20.5);
    camera.lookAt(0, -0.5, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    mount.replaceChildren(renderer.domElement);

    // Studio Environment map
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Studio Lighting
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(12, 24, 14);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 60;
    const d = 16;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x111827, 1.2);
    scene.add(hemiLight);

    // 3D Arena Base Platform
    const arenaGroup = new THREE.Group();
    const baseGeo = new THREE.BoxGeometry(GRID_SIZE * CELL_3D_SIZE + 0.4, 0.8, GRID_SIZE * CELL_3D_SIZE + 0.4);
    const baseMat = new THREE.MeshStandardMaterial({
      color: theme.boardBg,
      roughness: 0.5,
      metalness: 0.3,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = -0.4;
    baseMesh.receiveShadow = true;
    arenaGroup.add(baseMesh);

    // Grid Floor Tiles with subtle checker contrast
    const floorGroup = new THREE.Group();
    floorGridRef.current = floorGroup;
    const tileGeo = new THREE.PlaneGeometry(CELL_3D_SIZE * 0.96, CELL_3D_SIZE * 0.96);

    const tileMatDark = new THREE.MeshStandardMaterial({
      color: theme.boardBg,
      roughness: 0.4,
      metalness: 0.2,
    });
    const tileMatLight = new THREE.MeshStandardMaterial({
      color: new THREE.Color(theme.boardBg).addScalar(0.04),
      roughness: 0.4,
      metalness: 0.2,
    });

    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        const isAlt = (x + y) % 2 === 0;
        const tile = new THREE.Mesh(tileGeo, isAlt ? tileMatLight : tileMatDark);
        tile.rotation.x = -Math.PI / 2;
        const pos = gridToWorld(x, y, 0.01);
        tile.position.set(pos.x, 0.01, pos.z);
        tile.receiveShadow = true;
        floorGroup.add(tile);
      }
    }
    arenaGroup.add(floorGroup);

    // Raised 3D Perimeter Walls with Glowing Curbs
    const wallsGroup = new THREE.Group();
    wallsMeshRef.current = wallsGroup;
    const wallHeight = 0.55;
    const wallThickness = 0.35;
    const arenaSpan = GRID_SIZE * CELL_3D_SIZE;

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.2,
      metalness: 0.8,
    });
    const curbMat = new THREE.MeshStandardMaterial({
      color: theme.accentColor,
      emissive: theme.accentColor,
      emissiveIntensity: 0.6,
      roughness: 0.1,
    });

    // North Wall
    const nWallGeo = new THREE.BoxGeometry(arenaSpan + wallThickness * 2, wallHeight, wallThickness);
    const nWall = new THREE.Mesh(nWallGeo, wallMat);
    nWall.position.set(0, wallHeight / 2, -HALF_GRID - wallThickness / 2);
    nWall.castShadow = true;
    nWall.receiveShadow = true;
    wallsGroup.add(nWall);

    // South Wall
    const sWall = nWall.clone();
    sWall.position.set(0, wallHeight / 2, HALF_GRID + wallThickness / 2);
    wallsGroup.add(sWall);

    // West Wall
    const wWallGeo = new THREE.BoxGeometry(wallThickness, wallHeight, arenaSpan);
    const wWall = new THREE.Mesh(wWallGeo, wallMat);
    wWall.position.set(-HALF_GRID - wallThickness / 2, wallHeight / 2, 0);
    wWall.castShadow = true;
    wWall.receiveShadow = true;
    wallsGroup.add(wWall);

    // East Wall
    const eWall = wWall.clone();
    eWall.position.set(HALF_GRID + wallThickness / 2, wallHeight / 2, 0);
    wallsGroup.add(eWall);

    // Glowing Curb line around inside
    const curbNorthGeo = new THREE.BoxGeometry(arenaSpan, 0.12, 0.08);
    const curbNorth = new THREE.Mesh(curbNorthGeo, curbMat);
    curbNorth.position.set(0, 0.06, -HALF_GRID);
    wallsGroup.add(curbNorth);

    const curbSouth = curbNorth.clone();
    curbSouth.position.set(0, 0.06, HALF_GRID);
    wallsGroup.add(curbSouth);

    const curbWestGeo = new THREE.BoxGeometry(0.08, 0.12, arenaSpan);
    const curbWest = new THREE.Mesh(curbWestGeo, curbMat);
    curbWest.position.set(-HALF_GRID, 0.06, 0);
    wallsGroup.add(curbWest);

    const curbEast = curbWest.clone();
    curbEast.position.set(HALF_GRID, 0.06, 0);
    wallsGroup.add(curbEast);

    arenaGroup.add(wallsGroup);
    scene.add(arenaGroup);

    // Point Light for Pin
    const pinPointLight = new THREE.PointLight(theme.pinColor, 3.5, 6);
    scene.add(pinPointLight);
    pinLightRef.current = pinPointLight;

    // Reset initial logical state
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
    debrisListRef.current = [];
    floatingScoresRef.current = [];
    intervalRef.current = speedConfig.initialIntervalMs;

    spawnPin();
    onScoreUpdate(0, 0, 1, intervalRef.current);

    if (settings.bgmEnabled) {
      soundEngine.startBgm();
    }

    // Resize Handler
    const handleResize = () => {
      if (!mount || !rendererRef.current || !cameraRef.current) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // 60FPS Three.js Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const renderLoop = () => {
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Handle Game Logic Step Timing
      const now = performance.now();
      if (!lastTickTimeRef.current) lastTickTimeRef.current = now;
      if (now - lastTickTimeRef.current >= intervalRef.current && !isPaused && !isGameOverRef.current) {
        updateGameTick();
        lastTickTimeRef.current = now;
      }

      // Update 3D Snake Meshes
      if (!isGameOverRef.current) {
        const snake = snakeRef.current;
        const currentMeshes = snakeMeshesRef.current;

        // Ensure mesh count matches segment count
        while (currentMeshes.length < snake.length) {
          const idx = currentMeshes.length;
          const meshGroup = idx === 0 ? createSnakeHeadMesh() : createSnakeBodyMesh(idx);
          scene.add(meshGroup);
          currentMeshes.push(meshGroup);
        }
        while (currentMeshes.length > snake.length) {
          const removed = currentMeshes.pop();
          if (removed) scene.remove(removed);
        }

        // Position and orient 3D segments smoothly
        snake.forEach((seg, idx) => {
          const meshGroup = currentMeshes[idx];
          if (!meshGroup) return;

          const targetWorld = gridToWorld(seg.x, seg.y, 0);
          meshGroup.position.lerp(targetWorld, 0.45);

          // Head Orientation
          if (idx === 0) {
            let targetRotY = 0;
            switch (directionRef.current) {
              case 'RIGHT':
                targetRotY = -Math.PI / 2;
                break;
              case 'LEFT':
                targetRotY = Math.PI / 2;
                break;
              case 'UP':
                targetRotY = Math.PI;
                break;
              case 'DOWN':
                targetRotY = 0;
                break;
            }
            meshGroup.rotation.y = THREE.MathUtils.damp(meshGroup.rotation.y, targetRotY, 14, delta);
          } else {
            // Subtle undulating breathing scale
            const pulse = 1 + Math.sin(time * 8 + idx * 0.4) * 0.04;
            meshGroup.scale.set(pulse, pulse, pulse);
          }
        });
      }

      // Update 3D Pin Collectible
      const currentPin = pinRef.current;
      if (currentPin) {
        if (!pinMeshRef.current) {
          const isGolden = currentPin.type === 'GOLDEN';
          const newPinMesh = createPin3DMesh(isGolden);
          scene.add(newPinMesh);
          pinMeshRef.current = newPinMesh;
        }

        const pinMesh = pinMeshRef.current;
        const targetPinPos = gridToWorld(currentPin.x, currentPin.y, 0);
        pinMesh.position.x = targetPinPos.x;
        pinMesh.position.z = targetPinPos.z;

        // Floating hover bobbing and rotation
        pinMesh.position.y = 0.15 + Math.sin(time * 4) * 0.18;
        pinMesh.rotation.y = time * 2.5;

        // Align pin light
        if (pinLightRef.current) {
          pinLightRef.current.position.copy(pinMesh.position);
          pinLightRef.current.position.y += 0.8;
          pinLightRef.current.color.set(currentPin.type === 'GOLDEN' ? 0xfbbf24 : theme.pinColor);
        }
      } else if (pinMeshRef.current) {
        scene.remove(pinMeshRef.current);
        pinMeshRef.current = null;
      }

      // Update Debris Physics (Tumbling voxel explosion)
      const remainingDebris: Debris3D[] = [];
      debrisListRef.current.forEach((d) => {
        d.life += 1;
        // Gravity
        d.velocity.y -= 9.8 * delta;
        d.mesh.position.addScaledVector(d.velocity, delta);

        // Rotation
        d.mesh.rotation.x += d.rotVelocity.x * delta;
        d.mesh.rotation.y += d.rotVelocity.y * delta;
        d.mesh.rotation.z += d.rotVelocity.z * delta;

        // Floor Bounce
        if (d.mesh.position.y < 0.15) {
          d.mesh.position.y = 0.15;
          d.velocity.y = -d.velocity.y * 0.55;
          d.velocity.x *= 0.8;
          d.velocity.z *= 0.8;
        }

        if (d.life < d.maxLife) {
          remainingDebris.push(d);
        } else {
          scene.remove(d.mesh);
        }
      });
      debrisListRef.current = remainingDebris;

      // Update Floating Score Sprites
      const remainingScores: FloatingScore3D[] = [];
      floatingScoresRef.current.forEach((fs) => {
        fs.life += 1;
        fs.sprite.position.addScaledVector(fs.velocity, delta);
        const alpha = 1 - fs.life / fs.maxLife;
        (fs.sprite.material as THREE.SpriteMaterial).opacity = alpha;

        if (fs.life < fs.maxLife) {
          remainingScores.push(fs);
        } else {
          scene.remove(fs.sprite);
        }
      });
      floatingScoresRef.current = remainingScores;

      // Camera Shake Computation
      const shake = cameraShakeRef.current;
      if (shake.intensity > 0.01) {
        shake.offsetX = (Math.random() - 0.5) * shake.intensity * 2.2;
        shake.offsetY = (Math.random() - 0.5) * shake.intensity * 2.2;
        shake.intensity *= 0.92;
      } else {
        shake.offsetX = 0;
        shake.offsetY = 0;
        shake.intensity = 0;
      }

      // Camera Positioning (Dynamic Isometric vs Chase)
      if (cameraRef.current) {
        const cam = cameraRef.current;
        if (cameraView === 'ISOMETRIC') {
          const baseX = 0 + shake.offsetX;
          const baseY = 21.0 + shake.offsetY;
          const baseZ = 21.5 + shake.offsetX * 0.5;
          cam.position.lerp(new THREE.Vector3(baseX, baseY, baseZ), 0.1);
          cam.lookAt(0, -0.5, 0);
        } else {
          // Chase Mode behind snake head
          const headPos = snakeRef.current[0] ? gridToWorld(snakeRef.current[0].x, snakeRef.current[0].y, 0) : new THREE.Vector3();
          const targetCam = headPos.clone().add(new THREE.Vector3(0, 14, 15)).add(new THREE.Vector3(shake.offsetX, shake.offsetY, 0));
          cam.position.lerp(targetCam, 0.08);
          cam.lookAt(headPos.x, 0.5, headPos.z);
        }
      }

      // Render Scene
      renderer.render(scene, camera);
      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      soundEngine.stopBgm();
      renderer.dispose();
      mount.replaceChildren();
    };
  }, [theme, speedConfig.initialIntervalMs]);

  // Touch Swipe on 3D Canvas
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      touchStartPos.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.cancelable) e.preventDefault();
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
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
    const threshold = 22;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > threshold) {
        soundEngine.playTurnTick();
        soundEngine.triggerHaptic('light');
        enqueueDirection(dx > 0 ? 'RIGHT' : 'LEFT');
      }
    } else {
      if (Math.abs(dy) > threshold) {
        soundEngine.playTurnTick();
        soundEngine.triggerHaptic('light');
        enqueueDirection(dy > 0 ? 'DOWN' : 'UP');
      }
    }

    touchStartPos.current = null;
  };

  const handleContainerClick = () => {
    if (isGameOverRef.current && onRestart) {
      soundEngine.playButtonClick();
      onRestart();
    }
  };

  return (
    <div className="relative w-full aspect-square max-w-[490px] sm:max-w-[530px] mx-auto rounded-3xl overflow-hidden border-2 border-slate-800 shadow-2xl bg-slate-950 touch-none select-none">
      
      {/* 3D WebGL Canvas Container */}
      <div
        ref={mountRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleContainerClick}
        className="w-full h-full block cursor-pointer"
      />

      {/* 3D Perspective Toggle Button */}
      <div className="absolute top-3 right-3 z-10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            soundEngine.playButtonClick();
            setCameraView(cameraView === 'ISOMETRIC' ? 'CHASE' : 'ISOMETRIC');
          }}
          className="px-2.5 py-1 rounded-lg bg-slate-900/85 hover:bg-slate-800 text-[11px] font-mono text-emerald-400 border border-emerald-500/30 backdrop-blur-md shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
          title="Toggle 3D Camera Perspective"
        >
          <span>3D CAM:</span>
          <span className="font-bold text-white">{cameraView}</span>
        </button>
      </div>

    </div>
  );
};
