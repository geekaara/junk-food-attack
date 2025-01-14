///////////////////////////////////////////////////////////
// gameCore.js – Real-time highest updates
///////////////////////////////////////////////////////////
import { ASSETS, SCREEN_WIDTH, SCREEN_HEIGHT } from "./assets.js";
import {
  globalHighestScore,
  updateHighScoreIfNeeded,
} from "./cognitoConfig.js";

export let gameState = "MENU";

export let frameCount = 0;
let lostCount = 0;
const LOST_FREEZE_TIME = 5 * 60;

export let level = 0;
export let lives = 5;
export let score = 0;
let waveLength = 5;
let enemySpeed = 1;

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

export let enemies = [];

export const keys = {
  ArrowLeft: false,
  ArrowRight: false,
  ArrowUp: false,
  ArrowDown: false,
  Space: false,
};

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
    ctx.drawImage(this.shipImg, this.x, this.y, this.width, this.height);
    this.lasers.forEach((l) => {
      ctx.drawImage(l.img, l.x, l.y);
    });
  }

  shoot() {
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

export function startGame() {
  gameState = "PLAYING";
  level = 0;
  lives = 5;
  score = 0;
  waveLength = 5;
  enemySpeed = 1;

  player.x = 300;
  player.y = 630;
  player.health = 100;
  player.lasers = [];
  player.laserCooldown = 0;

  enemies = [];
  lostCount = 0;
  frameCount = 0;

  newWave();
}

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

export function gameLoop(ctx, jerseyFontLoaded, drawMenu) {
  if (gameState !== "PLAYING" && gameState !== "LOST") {
    return;
  }

  frameCount++;

  if (ASSETS.background.complete) {
    ctx.drawImage(ASSETS.background, 0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
  } else {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
  }

  const mainFont = jerseyFontLoaded ? "50px JerseyFont" : "50px Arial";
  ctx.font = mainFont;
  ctx.fillStyle = "red";

  ctx.fillText(`Lives: ${lives}`, 10, 50);

  const levelText = `Level: ${level}`;
  const ltWidth = ctx.measureText(levelText).width;
  ctx.fillText(levelText, SCREEN_WIDTH - ltWidth - 10, 50);

  const scoreText = `Score: ${score}`;
  const stWidth = ctx.measureText(scoreText).width;
  ctx.fillText(scoreText, SCREEN_WIDTH / 2 - stWidth / 2, 50);

  // Show "Highest: X" below the current score
  const highText = `Highest: ${globalHighestScore}`;
  const htWidth = ctx.measureText(highText).width;
  ctx.fillText(highText, SCREEN_WIDTH / 2 - htWidth / 2, 110);

  if (gameState === "PLAYING") {
    enemies.forEach((enemy) => {
      enemy.move();
      if (enemy.laserCooldown > 0) enemy.laserCooldown--;
      if (Math.random() < 0.008) enemy.shoot();
    });
  }
  enemies.forEach((enemy) => enemy.draw(ctx));

  if (gameState === "PLAYING") {
    enemies = enemies.filter((enemy) => {
      if (enemy.y > SCREEN_HEIGHT) {
        lives--;
        return false;
      }
      return true;
    });
  }

  if (gameState === "PLAYING") {
    moveLasers();
  }

  drawPlayer(ctx);

  if (gameState === "PLAYING") {
    if (lives <= 0 || player.health <= 0) {
      gameState = "LOST";
      lostCount = 0;

      // Final update to store the new record in Dynamo if it's higher
      if (score > globalHighestScore) {
        updateHighScoreIfNeeded(score);
      }
    }
  }

  if (gameState === "PLAYING" && enemies.length === 0) {
    newWave();
  }

  if (gameState === "LOST") {
    lostCount++;
    const lostFont = jerseyFontLoaded ? "60px JerseyFont" : "60px Arial";
    ctx.font = lostFont;
    ctx.fillStyle = "red";

    const lostLabel = "You Lost!!";
    const lw = ctx.measureText(lostLabel).width;
    ctx.fillText(lostLabel, SCREEN_WIDTH / 2 - lw / 2, 350);

    const finalText = `Final Score: ${score}`;
    const fw = ctx.measureText(finalText).width;
    ctx.fillText(finalText, SCREEN_WIDTH / 2 - fw / 2, 420);

    if (lostCount >= LOST_FREEZE_TIME) {
      gameState = "MENU";
      drawMenu();
      return;
    }
  }

  if (gameState === "PLAYING" || gameState === "LOST") {
    requestAnimationFrame(() => gameLoop(ctx, jerseyFontLoaded, drawMenu));
  }
}

function moveLasers() {
  // Player's lasers
  player.lasers = player.lasers.filter((laser) => {
    laser.y -= 5;
    if (laser.y < -40) return false;

    // If laser hits an enemy => increment score
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      const laserW = laser.img.width;
      const laserH = laser.img.height;
      if (isColliding(laser, e, laserW, laserH, e.width, e.height)) {
        enemies.splice(i, 1);
        score++;

        // *** Real-time highest update: if (score>globalHighestScore), update it
        if (score > globalHighestScore) {
          // Just update the local variable for immediate on-screen display
          // We'll do the final DynamoDB update when the game ends
          updateHighScoreIfNeeded(score);
        }
        return false; // remove this laser
      }
    }
    return true;
  });

  // Enemy lasers
  enemies.forEach((enemy) => {
    enemy.lasers = enemy.lasers.filter((l) => {
      l.y += 5;
      if (l.y > SCREEN_HEIGHT + 40) return false;

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

function drawPlayer(ctx) {
  ctx.drawImage(ASSETS.player, player.x, player.y, player.width, player.height);
  player.lasers.forEach((l) => ctx.drawImage(l.img, l.x, l.y));

  const barWidth = player.width;
  const greenWidth = (barWidth * player.health) / player.maxHealth;
  ctx.fillStyle = "red";
  ctx.fillRect(player.x, player.y + player.height + 10, barWidth, 10);
  ctx.fillStyle = "lime";
  ctx.fillRect(player.x, player.y + player.height + 10, greenWidth, 10);
}

function isColliding(a, b, aW, aH, bW, bH) {
  return a.x < b.x + bW && a.x + aW > b.x && a.y < b.y + bH && a.y + aH > b.y;
}
