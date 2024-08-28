import * as PIXI from "pixi.js";
import {
  Application,
  Assets,
  Sprite,
  Graphics,
  Container,
  Text,
} from "pixi.js";
import {
  GameState,
  GameSettings,
  PlayerAction,
  Bullet,
  Enemy,
  GameStatus,
} from "./types";
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
  playerBulletWidth: 28,
  playerBulletHeight: 40,
  enemyBulletWidth: 4,
  enemyBulletHeight: 4,
  bulletColor: 0xffffff,
  shootCooldown: 0.4, // seconds
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
  gameStatus: GameStatus.NOT_STARTED,
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
  let width: number;
  let height: number;

  if (isPlayerBullet) {
    sprite = new Sprite(heartTexture);
    width = gameSettings.playerBulletWidth;
    height = gameSettings.playerBulletHeight;
    sprite.width = width;
    sprite.height = height;
  } else {
    const bulletGraphics = new Graphics();
    bulletGraphics.beginFill(gameSettings.bulletColor);
    width = gameSettings.enemyBulletWidth;
    height = gameSettings.enemyBulletHeight;
    bulletGraphics.drawRect(0, 0, width, height);
    bulletGraphics.endFill();
    const bulletSprite = app.renderer.generateTexture(bulletGraphics);
    sprite = new Sprite(bulletSprite);
  }

  sprite.anchor.set(0.5);

  return {
    x,
    y,
    width,
    height,
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
              currentState.player.x - gameSettings.playerSpeed * delta,
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
              currentState.player.x + gameSettings.playerSpeed * delta,
            ),
          },
        };
      case "SHOOT":
        const newBullet = createBullet(
          currentState.player.x,
          currentState.player.y - currentState.player.height / 2,
          true,
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
    gameSettings.enemyHeight,
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
    enemy.x < min.x ? enemy : min,
  );
  const rightmostEnemy = state.enemies.reduce((max, enemy) =>
    enemy.x > max.x ? enemy : max,
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
        createBullet(enemy.x, enemy.y + enemy.height / 2, false),
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

// Near the top of the file, add these declarations
const gameOverContainer = new PIXI.Container();
let gameOverBox: PIXI.Graphics;
let gameOverText: PIXI.Text;

// Add this function to set up the game over screen
function setupGameOverScreen() {
  gameOverBox = new PIXI.Graphics();
  gameOverBox.fill(0x000000, 0); // Transparent fill
  gameOverBox.drawRect(0, 0, 300, 150);
  gameOverBox.endFill();
  gameOverBox.position.set(
    gameSettings.screenWidth / 2 - 150,
    gameSettings.screenHeight / 2 - 75,
  );

  gameOverText = new PIXI.Text("Game Over\n\nPress R to restart", {
    fontFamily: "Courier",
    fontSize: 24,
    fill: new PIXI.Color("black"),
    align: "center",
    fontWeight: "bold",
    letterSpacing: 2,
    lineHeight: 28,
  });
  gameOverText.anchor.set(0.5);
  gameOverText.position.set(150, 75);
  gameOverText.resolution = 0.5; // This makes the text more pixelated

  gameOverBox.addChild(gameOverText);
  gameOverContainer.addChild(gameOverBox);
}

// Call this function after initializing the app
setupGameOverScreen();

// Update the game loop to show/hide the game over container
app.ticker.add((ticker) => {
  if (currentGameState.gameStatus === "NOT_STARTED") {
    if (!app.stage.children.includes(startGameButton)) {
      app.stage.addChild(startGameButton);
    }
    if (keys[" "]) {
      startGame();
    }
  } else if (currentGameState.gameStatus === "PLAYING") {
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
        (enemy) => enemy.y + enemy.height >= gameSettings.screenHeight,
      ) ||
      newGameState.player.lives <= 0
    ) {
      newGameState.gameStatus = GameStatus.GAME_OVER;
    }

    renderer.render(newGameState);
    currentGameState = newGameState;

    // Update score display
    scoreText.text = `Score: ${currentGameState.score}`;
  } else {
    if (!app.stage.children.includes(gameOverContainer)) {
      app.stage.addChild(gameOverContainer);
    }
    if (keys["r"]) {
      restartGame();
    }
  }
});

// Update the restartGame function
function restartGame() {
  currentGameState = {
    ...initialGameState,
    enemies: initializeEnemies(),
    gameStatus: GameStatus.PLAYING,
  };
  updateLivesDisplay(currentGameState.player.lives);
  app.stage.removeChild(gameOverContainer);
}

// Game loop
let currentGameState = initialGameState;

// Create a text object for the score
const scoreText = new Text("Score: 0", {
  fontFamily: "Arial",
  fontSize: 24,
  fill: 0xffffff,
});
scoreText.x = gameSettings.screenWidth - 10;
scoreText.y = 10;
scoreText.anchor.set(1, 0);
app.stage.addChild(scoreText);

// Create functions for drawing UI elements
function createButton(
  text: string,
  width: number,
  height: number,
): PIXI.Container {
  const button = new PIXI.Container();
  const background = new PIXI.Graphics();
  background.beginFill(0x0000ff);
  background.drawRect(0, 0, width, height);
  background.endFill();
  button.addChild(background);

  const buttonText = new PIXI.Text(text, {
    fontFamily: "Arial",
    fontSize: 24,
    fill: 0xffffff,
    align: "center",
  });
  buttonText.x = width / 2;
  buttonText.y = height / 2;
  buttonText.anchor.set(0.5);
  button.addChild(buttonText);

  button.interactive = true;

  return button;
}

// Create start game and restart game buttons
const startGameButton = createButton("Start Game", 200, 50);
startGameButton.x = gameSettings.screenWidth / 2 - 100;
startGameButton.y = gameSettings.screenHeight / 2 - 25;

// Function to start the game
function startGame() {
  currentGameState.gameStatus = GameStatus.PLAYING;
  app.stage.removeChild(startGameButton);
}

// Add event listeners for buttons
startGameButton.on("pointerdown", startGame);

function checkCollisions(state: GameState): GameState {
  const newBullets: Bullet[] = [];

  for (const bullet of state.bullets) {
    let bulletCollided = false;

    if (bullet.isPlayerBullet) {
      // Check player bullets with enemies
      state.enemies = state.enemies.filter((enemy) => {
        if (checkCollision(bullet, enemy)) {
          state.score += enemy.points;
          bulletCollided = true;
          return false;
        }
        return true;
      });
    } else {
      // Check enemy bullets with player
      if (checkCollision(bullet, state.player)) {
        state.player.lives--;
        updateLivesDisplay(state.player.lives);
        if (state.player.lives <= 0) {
          state.gameOver = true;
        }
        bulletCollided = true;
      }
    }

    // Keep the bullet if it hasn't collided
    if (!bulletCollided) {
      newBullets.push(bullet);
    }
  }

  // Update the bullets in the state
  state.bullets = newBullets;

  return state;
}

// ... rest of the existing code ...

function checkCollision(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
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
