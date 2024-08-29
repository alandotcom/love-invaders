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
import redInvaderImageUrl from "./images/red-invader.png";
import sprayCanImageUrl from "./images/spray-can.png";
import loveLovoUrl from "./images/love-red.png";
import heartImageUrl from "./images/heart.png";
import backgroundImageUrl from "./images/background.png";

// Define virtual resolution
const VIRTUAL_WIDTH = 800;
const VIRTUAL_HEIGHT = 600;

// Game settings
const gameSettings: GameSettings = {
  playerSpeed: 6,
  enemyRows: 3,
  enemyCols: 7,
  enemyMoveSpeed: 0.5,
  enemyVerticalStep: 10,
  maxPlayerBullets: 100,
  bulletSpeed: 4,
  enemyShootFrequency: 0.003,
  playerBulletWidth: 50,
  playerBulletHeight: 45,
  enemyBulletWidth: 4,
  enemyBulletHeight: 4,
  bulletColor: 0xffffff,
  shootCooldown: 0.4, // seconds
  enemyWidth: 50,
  enemyHeight: 40,
  enemyHorizontalSpacing: 20,
  enemyVerticalSpacing: 20,
  enemyHorizontalPadding: 20,
  enemyVerticalPadding: 50,
};

// Function to get container dimensions and calculate scale
function getContainerScale() {
  const gameContainer = document.getElementById("game-container");
  if (!gameContainer) {
    console.error("Game container not found");
    return { width: VIRTUAL_WIDTH, height: VIRTUAL_HEIGHT, scale: 1 };
  }
  const containerWidth = gameContainer.clientWidth;
  const containerHeight = gameContainer.clientHeight;
  const scaleX = containerWidth / VIRTUAL_WIDTH;
  const scaleY = containerHeight / VIRTUAL_HEIGHT;
  const scale = Math.min(scaleX, scaleY);
  return { width: containerWidth, height: containerHeight, scale };
}

(async () => {
  // Initialize the application with virtual dimensions and white background
  const app = new Application();

  await app.init({
    background: new PIXI.Color("black"),
    width: VIRTUAL_WIDTH,
    height: VIRTUAL_HEIGHT,
  });

  // Append canvas to game container and set up scaling
  const gameContainer = document.getElementById("game-container");
  if (gameContainer) {
    gameContainer.appendChild(app.canvas);

    // Set up initial scale
    const { scale } = getContainerScale();
    app.stage.scale.set(scale);
  }

  // Load the spaceship (bunny) texture and heart texture
  const [
    spaceshipTexture,
    playerBulletTexture,
    redInvader,
    heartTexture,
    backgroundTexture,
  ] = await Promise.all([
    Assets.load(sprayCanImageUrl),
    Assets.load(loveLovoUrl),
    Assets.load(redInvaderImageUrl),
    Assets.load(heartImageUrl),
    Assets.load(backgroundImageUrl),
  ]);

  // Create the background sprite
  const backgroundSprite = new Sprite(backgroundTexture);
  backgroundSprite.width = VIRTUAL_WIDTH;
  backgroundSprite.height = VIRTUAL_HEIGHT;

  // Add the background sprite to the stage (ensure it's added first)
  app.stage.addChildAt(backgroundSprite, 0);

  // Create the player sprite
  const playerSprite = new Sprite(spaceshipTexture);
  playerSprite.width = 40;
  playerSprite.height = 60;
  playerSprite.rotation = 50;
  playerSprite.anchor.set(0.5);

  // Update the initialGameState
  const initialGameState: GameState = {
    player: {
      x: VIRTUAL_WIDTH / 2,
      y: VIRTUAL_HEIGHT - 50, // Position the player near the bottom
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
      sprite = new Sprite(playerBulletTexture);
      width = gameSettings.playerBulletWidth;
      height = gameSettings.playerBulletHeight;
      sprite.width = width;
      sprite.height = height;
    } else {
      width = gameSettings.enemyBulletWidth;
      height = gameSettings.enemyBulletHeight;
      const bulletGraphics = new Graphics()
        .rect(0, 0, width, height)
        .fill(gameSettings.bulletColor);
      const bulletTexture = app.renderer.generateTexture(bulletGraphics);
      sprite = new Sprite(bulletTexture);
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
    if (keys["ArrowLeft"]) actions.push(PlayerAction.MoveLeft);
    if (keys["ArrowRight"]) actions.push(PlayerAction.MoveRight);
    if (
      keys[" "] &&
      state.lastShootTime + gameSettings.shootCooldown <
        app.ticker.lastTime / 1000 &&
      state.bullets.filter((b) => b.isPlayerBullet).length <
        gameSettings.maxPlayerBullets
    ) {
      actions.push(PlayerAction.Shoot);
    }

    return actions.reduce((currentState, action) => {
      switch (action) {
        case PlayerAction.MoveLeft:
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
        case PlayerAction.MoveRight:
          return {
            ...currentState,
            player: {
              ...currentState.player,
              x: Math.min(
                VIRTUAL_WIDTH,
                currentState.player.x + gameSettings.playerSpeed * delta
              ),
            },
          };
        case PlayerAction.Shoot:
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
    const sprite = new Sprite(redInvader);
    sprite.anchor.set(0.5);
    sprite.width = gameSettings.enemyWidth;
    sprite.height = gameSettings.enemyHeight;

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
      VIRTUAL_WIDTH - 2 * gameSettings.enemyHorizontalPadding;
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
        VIRTUAL_WIDTH - gameSettings.enemyHorizontalPadding
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
    private backgroundSprite: Sprite;

    constructor() {
      this.playerSprite = playerSprite;
      this.playerSprite.x = initialGameState.player.x;
      this.playerSprite.y = initialGameState.player.y;
      this.bulletContainer = new Container();
      this.enemyContainer = new Container();
      this.backgroundSprite = backgroundSprite;

      // Ensure the background is added first
      app.stage.addChildAt(this.backgroundSprite, 0);
      app.stage.addChild(
        this.playerSprite,
        this.bulletContainer,
        this.enemyContainer
      );
    }

    render(state: GameState) {
      // Update player sprite position
      if (state.gameStatus === GameStatus.PLAYING) {
        this.playerSprite.x = state.player.x;
        this.playerSprite.y = state.player.y;
      }
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
  const renderer = new Renderer();

  // Near the top of the file, add these declarations
  const gameOverContainer = new PIXI.Container();
  let gameOverBox: PIXI.Graphics;
  let gameOverText: PIXI.Text;

  // Add this function to set up the game over screen
  function setupGameOverScreen() {
    gameOverBox = new PIXI.Graphics();
    gameOverBox.fill({ color: 0x000000, alpha: 0 }); // Transparent fill
    gameOverBox.rect(0, 0, 300, 150);
    gameOverBox.position.set(VIRTUAL_WIDTH / 2 - 150, VIRTUAL_HEIGHT / 2 - 75);

    gameOverText = new PIXI.Text({
      text: "Game Over\n\nPress R to restart",
      style: {
        fontFamily: "Courier",
        fontSize: 24,
        fill: new PIXI.Color("white"),
        align: "center",
        fontWeight: "bold",
        letterSpacing: 2,
        lineHeight: 28,
      },
    });
    gameOverText.anchor.set(0.5);
    gameOverText.position.set(150, 75);
    gameOverText.resolution = 0.5; // This makes the text more pixelated

    gameOverBox.addChild(gameOverText);
    gameOverContainer.addChild(gameOverBox);
  }

  // Call this function after initializing the app
  setupGameOverScreen();

  // Add these declarations near the top of the file
  const pauseOverlayContainer = new PIXI.Container();
  let pauseOverlayBox: PIXI.Graphics;
  let pauseOverlayText: PIXI.Text;

  // Add this function to set up the pause overlay
  function setupPauseOverlay() {
    pauseOverlayBox = new PIXI.Graphics();
    pauseOverlayBox.fill({ color: 0x000000, alpha: 0.5 });
    pauseOverlayBox.rect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    pauseOverlayText = new PIXI.Text({
      text: "PAUSED\n\nPress P or SPACE to resume",
      style: {
        fontFamily: "Courier",
        fontSize: 32,
        fill: new PIXI.Color("white"),
        align: "center",
        fontWeight: "bold",
        letterSpacing: 2,
        lineHeight: 36,
      },
    });
    pauseOverlayText.anchor.set(0.5);
    pauseOverlayText.position.set(VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2);

    pauseOverlayContainer.addChild(pauseOverlayBox, pauseOverlayText);
    pauseOverlayContainer.visible = false;
    app.stage.addChild(pauseOverlayContainer);
  }

  // Call this function after initializing the app
  setupPauseOverlay();

  // Update the game loop to show/hide the game over container
  app.ticker.add((ticker) => {
    if (currentGameState.gameStatus === GameStatus.NOT_STARTED) {
      if (!app.stage.children.includes(startGameButton)) {
        app.stage.addChild(startGameButton);
      }
      if (keys[" "]) {
        startGame();
      }
    } else if (currentGameState.gameStatus === GameStatus.PLAYING) {
      if (keys["p"]) {
        currentGameState.gameStatus = GameStatus.PAUSED;
        pauseOverlayContainer.visible = true;
        keys["p"] = false; // Reset the key state to prevent rapid toggling
      } else {
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
            (enemy) => enemy.y + enemy.height >= VIRTUAL_HEIGHT
          ) ||
          newGameState.player.lives <= 0
        ) {
          newGameState.gameStatus = GameStatus.GAME_OVER;
        }

        renderer.render(newGameState);
        currentGameState = newGameState;

        // Update score display
        scoreText.text = `Score: ${currentGameState.score}`;
      }
    } else if (currentGameState.gameStatus === GameStatus.PAUSED) {
      if (keys["p"] || keys[" "]) {
        currentGameState.gameStatus = GameStatus.PLAYING;
        pauseOverlayContainer.visible = false;
        keys["p"] = false; // Reset the key states to prevent rapid toggling
        keys[" "] = false;
      }
    } else if (currentGameState.gameStatus === GameStatus.GAME_OVER) {
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
  const scoreText = new Text({
    text: "Score: 0",
    style: {
      fontFamily: "Arial",
      fontSize: 24,
      fill: 0xffffff,
    },
  });
  scoreText.x = VIRTUAL_WIDTH - 10;
  scoreText.y = 10;
  scoreText.anchor.set(1, 0);
  app.stage.addChild(scoreText);

  // Create functions for drawing UI elements
  function createButton(
    text: string,
    width: number,
    height: number
  ): PIXI.Container {
    const button = new PIXI.Container();
    const background = new PIXI.Graphics()
      .roundRect(0, 0, width, height, 10)
      .fill(new PIXI.Color("gray"));
    button.addChild(background);

    const buttonText = new PIXI.Text({
      text,
      style: {
        fontFamily: "Arial",
        fontSize: 24,
        fill: 0xffffff,
        align: "center",
      },
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
  startGameButton.x = VIRTUAL_WIDTH / 2 - 100;
  startGameButton.y = VIRTUAL_HEIGHT / 2 - 25;

  // Function to start the game
  function startGame() {
    currentGameState.gameStatus = GameStatus.PLAYING;
    if (app.stage.children.includes(startGameButton)) {
      app.stage.removeChild(startGameButton);
    }
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

  // Resize function
  function resizeGame() {
    const { width, height, scale } = getContainerScale();

    // Scale the stage
    app.stage.scale.set(scale);

    // Center the stage in the container
    app.stage.position.set(
      (width - VIRTUAL_WIDTH * scale) / 2,
      (height - VIRTUAL_HEIGHT * scale) / 2
    );

    // Update renderer size
    app.renderer.resize(width, height);
  }

  // Add event listener for window resize
  window.addEventListener("resize", resizeGame);

  // Call resizeGame initially to set up the game
  resizeGame();

  // Function to export game state
  function exportGameState(): string {
    // Create a copy of the game state without non-serializable properties
    const exportableState = {
      ...currentGameState,
      player: {
        ...currentGameState.player,
        sprite: null, // Remove sprite reference
      },
      enemies: currentGameState.enemies.map((enemy) => ({
        ...enemy,
        sprite: null, // Remove sprite reference
      })),
      bullets: currentGameState.bullets.map((bullet) => ({
        ...bullet,
        sprite: null, // Remove sprite reference
      })),
    };

    // Convert to JSON and then to base64
    return btoa(JSON.stringify(exportableState));
  }

  // Function to load game state
  function loadGameState(encodedState: string): void {
    try {
      // Decode base64 and parse JSON
      const decodedState = JSON.parse(atob(encodedState)) as GameState;

      // Recreate sprites and other non-serializable properties
      decodedState.player.sprite = playerSprite;
      decodedState.enemies = decodedState.enemies.map((enemy) => ({
        ...enemy,
        sprite: createEnemy(enemy.x, enemy.y).sprite,
      }));
      decodedState.bullets = decodedState.bullets.map((bullet) => ({
        ...bullet,
        sprite: createBullet(bullet.x, bullet.y, bullet.isPlayerBullet).sprite,
      }));

      // Update the current game state
      currentGameState = decodedState;

      // Ensure the game is in the correct state
      if (currentGameState.gameStatus === GameStatus.NOT_STARTED) {
        currentGameState.gameStatus = GameStatus.PLAYING;
      }

      // Remove the start button if it's still on the stage
      if (app.stage.children.includes(startGameButton)) {
        app.stage.removeChild(startGameButton);
      }

      // Update the renderer
      renderer.render(currentGameState);

      // Update score display
      scoreText.text = `Score: ${currentGameState.score}`;

      // Update lives display
      updateLivesDisplay(currentGameState.player.lives);

      // Ensure game over container is not visible
      if (app.stage.children.includes(gameOverContainer)) {
        app.stage.removeChild(gameOverContainer);
      }

      // Ensure pause overlay is not visible
      pauseOverlayContainer.visible = false;

      console.log("Game state loaded successfully");
    } catch (error) {
      console.error("Error loading game state:", error);
    }
  }

  // Make functions accessible globally
  window.Invaders = {
    exportGameState,
    loadGameState,
  };
})();

declare global {
  interface Window {
    Invaders: {
      exportGameState: () => string;
      loadGameState: (x: string) => void;
    };
  }
}
