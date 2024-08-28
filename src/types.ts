import { Sprite } from "pixi.js";

// Basic game entity interfaces
interface Entity {
  x: number;
  y: number;
  width: number;
  height: number;
  sprite: Sprite;
}

interface Player extends Entity {
  lives: number;
}

interface Enemy extends Entity {
  points: number;
}

interface Bullet extends Entity {
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
  screenWidth: number;
  screenHeight: number;
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
type PlayerAction =
  | { type: "MOVE_LEFT" }
  | { type: "MOVE_RIGHT" }
  | { type: "SHOOT" };

type GameEvent =
  | { type: "ENEMY_HIT"; enemy: Enemy }
  | { type: "PLAYER_HIT" }
  | { type: "ENEMY_REACHED_BOTTOM" }
  | { type: "LEVEL_COMPLETE" };

// Export all interfaces and types
export type { Entity, Player, Enemy, Bullet, PlayerAction, GameEvent };

export enum GameStatus {
  NOT_STARTED = "NOT_STARTED",
  PLAYING = "PLAYING",
  GAME_OVER = "GAME_OVER",
}
