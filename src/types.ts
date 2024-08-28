import { Sprite } from "pixi.js";

// Basic game entity interfaces
export interface Entity {
  x: number;
  y: number;
  width: number;
  height: number;
  sprite: Sprite;
}

export interface Player extends Entity {
  lives: number;
}

export interface Enemy extends Entity {
  points: number;
}

export interface Bullet extends Entity {
  speed: number;
  isPlayerBullet: boolean;
}

// Game state and settings interfaces
export interface GameState {
  player: Player;
  enemies: Enemy[];
  bullets: Bullet[];
  score: number;
  level: number;
  gameOver: boolean;
  enemyDirection: number;
  lastShootTime: number;
  gameStatus: GameStatus;
}

export interface GameSettings {
  playerSpeed: number;
  enemyRows: number;
  enemyCols: number;
  enemyMoveSpeed: number;
  enemyVerticalStep: number;
  maxPlayerBullets: number;
  bulletSpeed: number;
  enemyShootFrequency: number;

  bulletColor: number; // Add this line
  shootCooldown: number;
  enemyWidth: number;
  enemyHeight: number;
  enemyHorizontalSpacing: number;
  enemyVerticalSpacing: number;
  enemyHorizontalPadding: number;
  enemyVerticalPadding: number;
  playerBulletWidth: number;
  playerBulletHeight: number;
  enemyBulletWidth: number;
  enemyBulletHeight: number;
}

// Action and event types
export enum PlayerAction {
  MoveLeft = "MOVE_LEFT",
  MoveRight = "MOVE_RIGHT",
  Shoot = "SHOOT",
}

export enum GameStatus {
  NOT_STARTED = "NOT_STARTED",
  PLAYING = "PLAYING",
  GAME_OVER = "GAME_OVER",
  PAUSED = "PAUSED",
}
