import * as PIXI from "pixi.js";
import {
  Application,
  Assets,
  Sprite,
  Graphics,
  Container,
  Text,
} from "pixi.js";
import { GameState, GameSettings, PlayerAction, Bullet, Enemy } from "./types";
import heartImageUrl from "./images/heart.png";

// Game settings
const gameSettings: GameSettings = {
  screenWidth: 800, // Set a fixed width
  screenHeight: 600, // Set a fixed height
  playerSpeed: 6,
  enemyRows: 3,
  enemyCols: 7,
  enemyMoveSpeed: 0.5,
  enemyVerticalStep: 10,
  maxPlayerBullets: 100,
  bulletSpeed: 4,
  enemyShootFrequency: 0.01,
  bulletWidth: 5,
  bulletHeight: 5,
  bulletColor: 0xffffff,
  shootCooldown: 0.3, // seconds
  enemyWidth: 30,
  enemyHeight: 30,
  enemyHorizontalSpacing: 20,
  enemyVerticalSpacing: 20,
  enemyHorizontalPadding: 20,
  enemyVerticalPadding: 50,
};

const app = new Application();

// Initialize the application
await app.init({
  background: "#1099bb",
  width: gameSettings.screenWidth,
  height: gameSettings.screenHeight,
});

// Append the canvas to the game container instead of the body
const gameContainer = document.getElementById("game-container");
if (gameContainer) {
  gameContainer.appendChild(app.canvas);
} else {
  console.error("Game container not found");
}

// Load the spaceship (bunny) texture and heart texture
const [spaceshipTexture, heartTexture] = await Promise.all([
  Assets.load("https://pixijs.com/assets/bunny.png"),
  Assets.load(heartImageUrl),
]);

// Create the player sprite
const playerSprite = new Sprite(spaceshipTexture);
playerSprite.anchor.set(0.5);

// Create the initial game state
const initialGameState: GameState = {
  player: {
    x: app.screen.width / 2,
    y: app.screen.height - 50,
    width: playerSprite.width,
    height: playerSprite.height,
    sprite: playerSprite,
    lives: 3,
  },
  enemies: initializeEnemies(),
  enemyDirection: 1, // 1 for right, -1 for left
  bullets: [],
  score: 0,
  level: 1,
  gameOver: false,
  lastShootTime: 0,
};

// Add player to stage
app.stage.addChild(playerSprite);

// Handle keyboard input
const keys: { [key: string]: boolean } = {};

window.addEventListener("keydown", (e) => {
  keys[e.key] = true;
});

window.addEventListener("keyup", (e) => {
  keys[e.key] = false;
});

// Function to create a bullet
function createBullet(x: number, y: number, isPlayerBullet: boolean): Bullet {
  let sprite: Sprite;

  if (isPlayerBullet) {
    sprite = new Sprite(heartTexture);
    sprite.width = gameSettings.bulletWidth;
    sprite.height = gameSettings.bulletHeight;
  } else {
    const bulletGraphics = new Graphics();
    bulletGraphics.beginFill(gameSettings.bulletColor);
    bulletGraphics.drawRect(
      0,
      0,
      gameSettings.bulletWidth,
      gameSettings.bulletHeight
    );
    bulletGraphics.endFill();
    const bulletSprite = app.renderer.generateTexture(bulletGraphics);
    sprite = new Sprite(bulletSprite);
  }

  sprite.anchor.set(0.5);

  return {
    x,
    y,
    width: gameSettings.bulletWidth,
    height: gameSettings.bulletHeight,
    speed: isPlayerBullet
      ? gameSettings.bulletSpeed
      : -gameSettings.bulletSpeed / 2,
    isPlayerBullet,
    sprite,
  };
}

// Function to update game state
function updateGameState(state: GameState, delta: number): GameState {
  const actions: PlayerAction[] = [];
  if (keys["ArrowLeft"]) actions.push({ type: "MOVE_LEFT" });
  if (keys["ArrowRight"]) actions.push({ type: "MOVE_RIGHT" });
  if (
    keys[" "] &&
    state.lastShootTime + gameSettings.shootCooldown <
      app.ticker.lastTime / 1000 &&
    state.bullets.filter((b) => b.isPlayerBullet).length <
      gameSettings.maxPlayerBullets
  ) {
    actions.push({ type: "SHOOT" });
  }

  return actions.reduce((currentState, action) => {
    switch (action.type) {
      case "MOVE_LEFT":
        return {
          ...currentState,
          player: {
            ...currentState.player,
            x: Math.max(
              0,
              currentState.player.x - gameSettings.playerSpeed * delta
            ),
          },
        };
      case "MOVE_RIGHT":
        return {
          ...currentState,
          player: {
            ...currentState.player,
            x: Math.min(
              gameSettings.screenWidth,
              currentState.player.x + gameSettings.playerSpeed * delta
            ),
          },
        };
      case "SHOOT":
        const newBullet = createBullet(
          currentState.player.x,
          currentState.player.y - currentState.player.height / 2,
          true
        );
        return {
          ...currentState,
          bullets: [...currentState.bullets, newBullet],
          lastShootTime: app.ticker.lastTime / 1000,
        };
      default:
        return currentState;
    }
  }, state);
}

// Function to update bullet positions
function updateBullets(state: GameState, delta: number): GameState {
  const updatedBullets = state.bullets
    .map((bullet) => ({
      ...bullet,
      y: bullet.y - bullet.speed * delta,
    }))
    .filter((bullet) => bullet.y > 0);

  return {
    ...state,
    bullets: updatedBullets,
  };
}

// Function to create an enemy
function createEnemy(x: number, y: number): Enemy {
  const enemyGraphics = new Graphics();
  enemyGraphics.beginFill(0xff0000);
  enemyGraphics.drawRect(
    0,
    0,
    gameSettings.enemyWidth,
    gameSettings.enemyHeight
  );
  enemyGraphics.endFill();

  const enemySprite = app.renderer.generateTexture(enemyGraphics);
  const sprite = new Sprite(enemySprite);
  sprite.anchor.set(0.5);

  return {
    x,
    y,
    width: gameSettings.enemyWidth,
    height: gameSettings.enemyHeight,
    sprite,
    points: 10,
  };
}

// Function to initialize enemy grid
function initializeEnemies(): Enemy[] {
  const enemies: Enemy[] = [];
  const startX = gameSettings.enemyHorizontalPadding;
  const startY = gameSettings.enemyVerticalPadding;
  const availableWidth =
    gameSettings.screenWidth - 2 * gameSettings.enemyHorizontalPadding;
  const totalEnemyWidth =
    gameSettings.enemyCols * gameSettings.enemyWidth +
    (gameSettings.enemyCols - 1) * gameSettings.enemyHorizontalSpacing;
  const leftPadding = (availableWidth - totalEnemyWidth) / 2;

  for (let row = 0; row < gameSettings.enemyRows; row++) {
    for (let col = 0; col < gameSettings.enemyCols; col++) {
      const x =
        startX +
        leftPadding +
        col * (gameSettings.enemyWidth + gameSettings.enemyHorizontalSpacing);
      const y =
        startY +
        row * (gameSettings.enemyHeight + gameSettings.enemyVerticalSpacing);
      enemies.push(createEnemy(x, y));
    }
  }

  return enemies;
}

// Function to update enemy positions
function updateEnemies(state: GameState, delta: number): GameState {
  let enemyDirection = state.enemyDirection;
  let shouldMoveDown = false;

  // Calculate the base speed and adjust it based on the number of remaining enemies
  const baseSpeed = gameSettings.enemyMoveSpeed;
  const speedIncreaseFactor =
    1 +
    (gameSettings.enemyRows * gameSettings.enemyCols - state.enemies.length) /
      (gameSettings.enemyRows * gameSettings.enemyCols);
  let enemySpeed = baseSpeed * speedIncreaseFactor;

  // Adjust speed based on the number of columns to maintain consistent movement
  enemySpeed *= gameSettings.enemyCols / 7; // Assuming 7 was the original number of columns

  // Check if any enemy has reached the edge
  const leftmostEnemy = state.enemies.reduce((min, enemy) =>
    enemy.x < min.x ? enemy : min
  );
  const rightmostEnemy = state.enemies.reduce((max, enemy) =>
    enemy.x > max.x ? enemy : max
  );

  if (
    leftmostEnemy.x <= gameSettings.enemyHorizontalPadding ||
    rightmostEnemy.x + rightmostEnemy.width >=
      gameSettings.screenWidth - gameSettings.enemyHorizontalPadding
  ) {
    enemyDirection *= -1; // Change direction
    shouldMoveDown = true; // Move down only when reaching an edge
  }

  const updatedEnemies = state.enemies.map((enemy) => {
    let newX = enemy.x + enemySpeed * enemyDirection * delta;

    // Enemy shooting
    if (Math.random() < gameSettings.enemyShootFrequency * delta) {
      state.bullets.push(
        createBullet(enemy.x, enemy.y + enemy.height / 2, false)
      );
    }

    return {
      ...enemy,
      x: newX,
      y: shouldMoveDown ? enemy.y + gameSettings.enemyVerticalStep : enemy.y,
    };
  });

  return {
    ...state,
    enemies: updatedEnemies,
    enemyDirection: enemyDirection,
  };
}

// Renderer class to manage mutable state
class Renderer {
  private playerSprite: Sprite;
  private bulletContainer: Container;
  private enemyContainer: Container;

  constructor(playerSprite: Sprite) {
    this.playerSprite = playerSprite;
    this.bulletContainer = new Container();
    this.enemyContainer = new Container();
    app.stage.addChild(this.bulletContainer, this.enemyContainer);
  }

  render(state: GameState) {
    // Update player sprite position
    this.playerSprite.x = state.player.x;
    this.playerSprite.y = state.player.y;
    this.playerSprite.width = state.player.width;
    this.playerSprite.height = state.player.height;
    this.playerSprite.visible = state.player.lives > 0;

    // Update bullets
    this.bulletContainer.removeChildren();
    state.bullets.forEach((bullet) => {
      bullet.sprite.x = bullet.x;
      bullet.sprite.y = bullet.y;
      this.bulletContainer.addChild(bullet.sprite);
    });

    // Update enemies
    this.enemyContainer.removeChildren();
    state.enemies.forEach((enemy) => {
      enemy.sprite.x = enemy.x;
      enemy.sprite.y = enemy.y;
      this.enemyContainer.addChild(enemy.sprite);
    });
  }
}

// Initialize the renderer
const renderer = new Renderer(playerSprite);

// Create a variable to store the game over text
let gameOverText: PIXI.Text | null = null;

// Function to restart the game
function restartGame() {
  currentGameState = { ...initialGameState, enemies: initializeEnemies() };
  updateLivesDisplay(currentGameState.player.lives);
  if (gameOverText) {
    app.stage.removeChild(gameOverText);
    gameOverText = null;
  }
}

// Game loop
let currentGameState = initialGameState;

app.ticker.add((ticker) => {
  if (!currentGameState.gameOver) {
    let newGameState = updateGameState(currentGameState, ticker.deltaTime);
    newGameState = updateBullets(newGameState, ticker.deltaTime);
    newGameState = updateEnemies(newGameState, ticker.deltaTime);
    newGameState = checkCollisions(newGameState);

    if (newGameState.enemies.length === 0) {
      newGameState.level++;
      newGameState.enemies = initializeEnemies();
    }

    if (
      newGameState.enemies.some(
        (enemy) => enemy.y + enemy.height >= gameSettings.screenHeight
      ) ||
      newGameState.player.lives <= 0
    ) {
      newGameState.gameOver = true;
    }

    renderer.render(newGameState);
    currentGameState = newGameState;
  } else {
    // Display game over message
    if (!gameOverText) {
      gameOverText = new PIXI.Text(
        `Game Over\nScore: ${currentGameState.score}\nPress R to Restart`,
        {
          fontFamily: "Arial",
          fontSize: 24,
          fill: 0xffffff,
          align: "center",
        }
      );
      gameOverText.x = gameSettings.screenWidth / 2;
      gameOverText.y = gameSettings.screenHeight / 2;
      gameOverText.anchor.set(0.5);
      app.stage.addChild(gameOverText);
    }

    if (keys["r"] || keys["R"]) {
      // Restart the game
      restartGame();
    }
  }
});

function checkCollisions(state: GameState): GameState {
  const playerBullets = state.bullets.filter((b) => b.isPlayerBullet);
  const enemyBullets = state.bullets.filter((b) => !b.isPlayerBullet);

  // Check player bullets with enemies
  playerBullets.forEach((bullet) => {
    state.enemies = state.enemies.filter((enemy) => {
      if (checkCollision(bullet, enemy)) {
        state.score += enemy.points;
        return false;
      }
      return true;
    });
  });

  // Check enemy bullets with player
  enemyBullets.forEach((bullet) => {
    if (checkCollision(bullet, state.player)) {
      state.player.lives--;
      updateLivesDisplay(state.player.lives);
      if (state.player.lives <= 0) {
        state.gameOver = true;
      }
    }
  });

  // Remove collided bullets
  state.bullets = state.bullets.filter(
    (bullet) =>
      !(
        playerBullets.includes(bullet) &&
        state.enemies.some((enemy) => checkCollision(bullet, enemy))
      ) &&
      !(enemyBullets.includes(bullet) && checkCollision(bullet, state.player))
  );

  return state;
}

function checkCollision(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

// Create a container for lives display
const livesContainer = new PIXI.Container();
app.stage.addChild(livesContainer);

// Function to update lives display
function updateLivesDisplay(lives: number) {
  livesContainer.removeChildren();
  for (let i = 0; i < lives; i++) {
    const lifeSprite = new PIXI.Sprite(heartTexture);
    lifeSprite.width = 20;
    lifeSprite.height = 20;
    lifeSprite.x = 10 + i * 25;
    lifeSprite.y = 10;
    livesContainer.addChild(lifeSprite);
  }
}

// Initialize lives display
updateLivesDisplay(initialGameState.player.lives);
