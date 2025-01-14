import { ASSETS, SCREEN_WIDTH, SCREEN_HEIGHT } from "./assets.js";

// The high-level game state: "MENU", "PLAYING", or "LOST"
export let gameState = "MENU";

// Frame counters, freeze timers, etc.
export let frameCount = 0;
let lostCount = 0;
const LOST_FREEZE_TIME = 5 * 60; // how many frames to freeze after losing

// Basic game variables
export let level = 0;
export let lives = 5;
export let score = 0;
let waveLength = 5;
let enemySpeed = 1;

// The player object
export const player = {
  x: 300,
  y: 630,
  width: 50,
  height: 50,
  health: 100,
  maxHealth: 100,
  speed: 5,
  lasers: [],
  laserCooldown: 0,
  laserImg: ASSETS.laserYellow,
};

// The array of enemies
export let enemies = [];

// Keypress tracking
export const keys = {
  ArrowLeft: false,
  ArrowRight: false,
  ArrowUp: false,
  ArrowDown: false,
  Space: false,
};

// Enemy class
export class Enemy {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.health = 100;
    this.width = 50;
    this.height = 50;
    this.lasers = [];
    this.laserCooldown = 0;

    switch (color) {
      case "red":
        this.shipImg = ASSETS.burger;
        this.laserImg = ASSETS.laserRed;
        break;
      case "green":
        this.shipImg = ASSETS.fries;
        this.laserImg = ASSETS.laserGreen;
        break;
      case "blue":
        this.shipImg = ASSETS.soda;
        this.laserImg = ASSETS.laserBlue;
        break;
    }
  }

  move() {
    this.y += enemySpeed;
  }

  draw(ctx) {
    // Draw the enemy ship
    ctx.drawImage(this.shipImg, this.x, this.y, this.width, this.height);
    // Draw any lasers this enemy has fired
    this.lasers.forEach((l) => {
      ctx.drawImage(l.img, l.x, l.y);
    });
  }

  shoot() {
    // Only shoot if the enemy is actually on-screen
    if (
      this.y + this.height > 0 &&
      this.y < SCREEN_HEIGHT &&
      this.laserCooldown === 0 &&
      this.laserImg
    ) {
      this.lasers.push({
        x: this.x - 20,
        y: this.y,
        img: this.laserImg,
      });
      this.laserCooldown = 30;
    }
  }
}

/**
 * startGame() – Resets all stats and spawns a new wave.
 */
export function startGame() {
  gameState = "PLAYING";
  level = 0;
  lives = 5;
  score = 0;
  waveLength = 5;
  enemySpeed = 1;

  // Reset player
  player.x = 300;
  player.y = 630;
  player.health = 100;
  player.lasers = [];
  player.laserCooldown = 0;

  // Clear enemies
  enemies = [];
  lostCount = 0;
  frameCount = 0;

  newWave();
}

/**
 * newWave() – Increases difficulty and spawns a new batch of enemies.
 */
function newWave() {
  level++;
  waveLength += 5;
  for (let i = 0; i < waveLength; i++) {
    let x = Math.random() * (SCREEN_WIDTH - 50);
    let y = Math.random() * -1500 - 100;
    const colorType = ["red", "blue", "green"][Math.floor(Math.random() * 3)];
    const enemy = new Enemy(x, y, colorType);
    enemies.push(enemy);
  }
}

/**
 * gameLoop() – Called every frame to draw/update the game.
 * @param {CanvasRenderingContext2D} ctx  - The canvas 2D context
 * @param {boolean} jerseyFontLoaded      - Whether the custom font is loaded
 * @param {Function} drawMenu            - Function to draw the main menu (used if we go back)
 */
export function gameLoop(ctx, jerseyFontLoaded, drawMenu) {
  // Only run if in PLAYING or LOST states
  if (gameState !== "PLAYING" && gameState !== "LOST") {
    return;
  }

  frameCount++;

  // 1) Draw background
  if (ASSETS.background.complete) {
    ctx.drawImage(ASSETS.background, 0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
  } else {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
  }

  // 2) Draw UI text in red, 50px
  if (jerseyFontLoaded) {
    ctx.font = "50px JerseyFont";
  } else {
    ctx.font = "50px Arial";
  }
  ctx.fillStyle = "red";
  ctx.fillText(`Lives: ${lives}`, 10, 50);

  const levelText = `Level: ${level}`;
  const ltWidth = ctx.measureText(levelText).width;
  ctx.fillText(levelText, SCREEN_WIDTH - ltWidth - 10, 50);

  const scoreText = `Score: ${score}`;
  const stWidth = ctx.measureText(scoreText).width;
  ctx.fillText(scoreText, SCREEN_WIDTH / 2 - stWidth / 2, 50);

  // 3) Move & draw enemies
  if (gameState === "PLAYING") {
    enemies.forEach((enemy) => {
      enemy.move();
      if (enemy.laserCooldown > 0) {
        enemy.laserCooldown--;
      }
      if (Math.random() < 0.008) {
        enemy.shoot();
      }
    });
  }
  enemies.forEach((enemy) => {
    enemy.draw(ctx);
  });

  // 4) Remove offscreen enemies -> reduce lives
  if (gameState === "PLAYING") {
    enemies = enemies.filter((enemy) => {
      if (enemy.y > SCREEN_HEIGHT) {
        lives--;
        return false;
      }
      return true;
    });
  }

  // 5) Move lasers
  if (gameState === "PLAYING") {
    moveLasers();
  }

  // 6) Draw player
  drawPlayer(ctx);

  // 7) Check if lost
  if (gameState === "PLAYING") {
    if (lives <= 0 || player.health <= 0) {
      gameState = "LOST";
      lostCount = 0;
    }
  }

  // 8) Next wave if no enemies left
  if (gameState === "PLAYING" && enemies.length === 0) {
    newWave();
  }

  // If LOST, freeze for 5 sec, then return to menu
  if (gameState === "LOST") {
    lostCount++;
    // "You Lost!!"
    if (jerseyFontLoaded) {
      ctx.font = "60px JerseyFont";
    } else {
      ctx.font = "60px Arial";
    }
    ctx.fillStyle = "red";
    const lostLabel = "You Lost!!";
    const lw = ctx.measureText(lostLabel).width;
    ctx.fillText(lostLabel, SCREEN_WIDTH / 2 - lw / 2, 350);

    // Final score
    const finalText = `Final Score: ${score}`;
    const fw = ctx.measureText(finalText).width;
    ctx.fillText(finalText, SCREEN_WIDTH / 2 - fw / 2, 420);

    if (lostCount >= LOST_FREEZE_TIME) {
      gameState = "MENU";
      drawMenu();
      return;
    }
  }

  // Continue the loop if still PLAYING or LOST
  if (gameState === "PLAYING" || gameState === "LOST") {
    requestAnimationFrame(() => gameLoop(ctx, jerseyFontLoaded, drawMenu));
  }
}

/**
 * moveLasers() – Moves player & enemy lasers, checks collisions.
 */
function moveLasers() {
  // Player's lasers
  player.lasers = player.lasers.filter((laser) => {
    laser.y -= 5; // move up
    if (laser.y < -40) {
      return false;
    }
    // Check collision with enemies
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      const laserW = laser.img.width;
      const laserH = laser.img.height;
      if (isColliding(laser, e, laserW, laserH, e.width, e.height)) {
        enemies.splice(i, 1);
        score++;
        return false;
      }
    }
    return true;
  });

  // Enemy lasers
  enemies.forEach((enemy) => {
    enemy.lasers = enemy.lasers.filter((l) => {
      l.y += 5; // move down
      if (l.y > SCREEN_HEIGHT + 40) {
        return false;
      }

      const laserW = l.img.width;
      const laserH = l.img.height;
      if (isColliding(l, player, laserW, laserH, player.width, player.height)) {
        player.health -= 10;
        return false;
      }
      return true;
    });
  });
}

/**
 * drawPlayer() – Draws the player sprite, lasers, and health bar.
 */
function drawPlayer(ctx) {
  ctx.drawImage(ASSETS.player, player.x, player.y, player.width, player.height);

  // player's lasers
  player.lasers.forEach((l) => {
    ctx.drawImage(l.img, l.x, l.y);
  });

  // health bar
  const barWidth = player.width;
  const greenWidth = (barWidth * player.health) / player.maxHealth;
  ctx.fillStyle = "red";
  ctx.fillRect(player.x, player.y + player.height + 10, barWidth, 10);
  ctx.fillStyle = "lime";
  ctx.fillRect(player.x, player.y + player.height + 10, greenWidth, 10);
}

/**
 * isColliding(a, b, aW, aH, bW, bH) – AABB collision detection
 */
function isColliding(a, b, aW, aH, bW, bH) {
  return a.x < b.x + bW && a.x + aW > b.x && a.y < b.y + bH && a.y + aH > b.y;
}
