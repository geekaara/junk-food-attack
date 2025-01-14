///////////////////////////////////////////////////////////
// 1) GLOBAL SETUP & LOAD ASSETS (IMAGES & FONT)
///////////////////////////////////////////////////////////
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const SCREEN_WIDTH = canvas.width; // 750
const SCREEN_HEIGHT = canvas.height; // 750

// Possible states: "MENU", "PLAYING", "LOST"
let gameState = "MENU";

let frameCount = 0;
let lostCount = 0; // how many frames we’ve spent in "LOST" state
const LOST_FREEZE_TIME = 5 * 60;
// 5 seconds * 60 FPS = 300 frames (the freeze before returning to the menu)

///////////////////////////////////////////////////////////
// 1a) LOAD JERSEY FONT FROM S3
///////////////////////////////////////////////////////////
const jerseyFontUrl =
  "https://junk-food-attack-assets-aa2025.s3.ap-southeast-2.amazonaws.com/assets/Jersey15-Regular.ttf";
let jerseyFontLoaded = false;

const jerseyFontFace = new FontFace("JerseyFont", `url(${jerseyFontUrl})`);
jerseyFontFace.load().then((loadedFace) => {
  document.fonts.add(loadedFace);
  console.log("JerseyFont loaded from S3");
  jerseyFontLoaded = true;
});

///////////////////////////////////////////////////////////
// 1b) LOAD IMAGES FROM S3
///////////////////////////////////////////////////////////
const S3_BASE =
  "https://junk-food-attack-assets-aa2025.s3.ap-southeast-2.amazonaws.com/assets";

const ASSETS = {
  background: new Image(),
  player: new Image(),
  burger: new Image(),
  fries: new Image(),
  soda: new Image(),
  laserRed: new Image(),
  laserGreen: new Image(),
  laserBlue: new Image(),
  laserYellow: new Image(),
};

ASSETS.background.src = `${S3_BASE}/background.png`;
ASSETS.player.src = `${S3_BASE}/player.png`;
ASSETS.burger.src = `${S3_BASE}/burger.png`;
ASSETS.fries.src = `${S3_BASE}/fries.png`;
ASSETS.soda.src = `${S3_BASE}/soda.png`;
ASSETS.laserRed.src = `${S3_BASE}/laser_red.png`;
ASSETS.laserGreen.src = `${S3_BASE}/laser_green.png`;
ASSETS.laserBlue.src = `${S3_BASE}/laser_blue.png`;
ASSETS.laserYellow.src = `${S3_BASE}/laser_yellow.png`;

// Wait for all images to load
let imagesLoaded = 0;
const totalImages = Object.keys(ASSETS).length;

Object.values(ASSETS).forEach((img) => {
  img.onload = () => {
    imagesLoaded++;
    if (imagesLoaded === totalImages) {
      console.log("All images loaded. Ready!");
      drawMenu();
    }
  };
});

///////////////////////////////////////////////////////////
// 2) GAME STATE & CLASSES
///////////////////////////////////////////////////////////
let level = 0;
let lives = 5;
let score = 0;
let waveLength = 5;
let enemySpeed = 1;

let enemies = [];

const player = {
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

const keys = {
  ArrowLeft: false,
  ArrowRight: false,
  ArrowUp: false,
  ArrowDown: false,
  Space: false,
};

// Enemy class
class Enemy {
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

  draw() {
    ctx.drawImage(this.shipImg, this.x, this.y, this.width, this.height);
    // Draw this enemy’s lasers
    this.lasers.forEach((l) => {
      ctx.drawImage(l.img, l.x, l.y);
    });
  }

  shoot() {
    // Only shoot if fully on-screen (top edge visible or close to it)
    // i.e. if the enemy is beyond the top edge and not off the bottom
    if (
      this.y + this.height > 0 && // Visible from above
      this.y < SCREEN_HEIGHT && // not off bottom
      this.laserCooldown === 0 &&
      this.laserImg
    ) {
      // place laser slightly to the left to mimic python offset
      this.lasers.push({
        x: this.x - 20,
        y: this.y,
        img: this.laserImg,
      });
      this.laserCooldown = 30;
    }
  }
}

///////////////////////////////////////////////////////////
// 3) MAIN MENU
///////////////////////////////////////////////////////////
function drawMenu() {
  // Draw background or fallback
  if (ASSETS.background.complete) {
    ctx.drawImage(ASSETS.background, 0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
  } else {
    ctx.fillStyle = "#1e1e1e";
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
  }

  // Title in red, size 70px
  if (jerseyFontLoaded) {
    ctx.font = "70px JerseyFont";
  } else {
    ctx.font = "70px Arial";
  }
  ctx.fillStyle = "red";
  const titleText = "Junk Food Attack!";
  const titleMetrics = ctx.measureText(titleText);
  ctx.fillText(titleText, SCREEN_WIDTH / 2 - titleMetrics.width / 2, 300);

  // Draw "Start" button
  const buttonWidth = 200;
  const buttonHeight = 60;
  const buttonX = (SCREEN_WIDTH - buttonWidth) / 2;
  const buttonY = 450;

  ctx.fillStyle = "green";
  ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

  if (jerseyFontLoaded) {
    ctx.font = "45px JerseyFont";
  } else {
    ctx.font = "45px Arial";
  }
  ctx.fillStyle = "white";
  const startText = "START";
  const stMetrics = ctx.measureText(startText);
  const stX = buttonX + (buttonWidth - stMetrics.width) / 2;
  const stY = buttonY + buttonHeight / 2 + 15;
  ctx.fillText(startText, stX, stY);
}

canvas.addEventListener("mousedown", (e) => {
  if (gameState === "MENU") {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    // Button coords
    const buttonWidth = 200;
    const buttonHeight = 60;
    const buttonX = (SCREEN_WIDTH - buttonWidth) / 2;
    const buttonY = 450;
    if (
      mouseX >= buttonX &&
      mouseX <= buttonX + buttonWidth &&
      mouseY >= buttonY &&
      mouseY <= buttonY + buttonHeight
    ) {
      // clicked start
      startGame();
    }
  }
});

///////////////////////////////////////////////////////////
// 4) START & MAIN GAME LOOP
///////////////////////////////////////////////////////////
function startGame() {
  // Reset everything
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
  enemies = [];
  lostCount = 0;

  newWave();
  requestAnimationFrame(gameLoop);
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

function gameLoop() {
  // only run if playing or lost
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

  // 3) Move & draw enemies (only if PLAYING, or we want them to freeze?)
  if (gameState === "PLAYING") {
    enemies.forEach((enemy) => {
      enemy.move();
      // random shooting if on-screen
      if (enemy.laserCooldown > 0) {
        enemy.laserCooldown--;
      }
      // small chance to shoot
      if (Math.random() < 0.008) {
        enemy.shoot();
      }
    });
  }
  enemies.forEach((enemy) => {
    enemy.draw();
  });

  // remove offscreen enemies => reduce lives
  if (gameState === "PLAYING") {
    enemies = enemies.filter((enemy) => {
      if (enemy.y > SCREEN_HEIGHT) {
        lives--;
        return false;
      }
      return true;
    });
  }

  // 4) Move lasers
  if (gameState === "PLAYING") {
    moveLasers();
  }

  // 5) Draw player
  drawPlayer();

  // 6) Check if lost
  if (gameState === "PLAYING") {
    if (lives <= 0 || player.health <= 0) {
      gameState = "LOST";
      lostCount = 0; // start freeze timer
    }
  }

  // 7) Next wave if no enemies
  if (gameState === "PLAYING" && enemies.length === 0) {
    newWave();
  }

  // 8) If lost, freeze everything for 5 seconds, then return to MENU
  if (gameState === "LOST") {
    lostCount++;
    // Draw "You Lost!!" in red 60px
    if (jerseyFontLoaded) {
      ctx.font = "60px JerseyFont";
    } else {
      ctx.font = "60px Arial";
    }
    ctx.fillStyle = "red";
    const lostLabel = "You Lost!!";
    const lw = ctx.measureText(lostLabel).width;
    ctx.fillText(lostLabel, SCREEN_WIDTH / 2 - lw / 2, 350);

    // Draw final score
    const finalText = `Final Score: ${score}`;
    const fw = ctx.measureText(finalText).width;
    ctx.fillText(finalText, SCREEN_WIDTH / 2 - fw / 2, 420);

    // If time is up, reset to menu
    if (lostCount >= LOST_FREEZE_TIME) {
      gameState = "MENU";
      drawMenu();
      return;
    }
  }

  // Continue animating if we’re playing or lost
  if (gameState === "PLAYING" || gameState === "LOST") {
    requestAnimationFrame(gameLoop);
  }
}

// Move lasers for both player & enemies
function moveLasers() {
  // player’s lasers
  player.lasers = player.lasers.filter((laser) => {
    laser.y -= 5; // move up
    // off-screen
    if (laser.y < -40) return false;
    // collision with enemies
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

  // enemy lasers
  enemies.forEach((enemy) => {
    enemy.lasers = enemy.lasers.filter((l) => {
      l.y += 5; // move down
      if (l.y > SCREEN_HEIGHT + 40) {
        return false;
      }
      // collision with player
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

// Draw player + their lasers + health bar
function drawPlayer() {
  ctx.drawImage(ASSETS.player, player.x, player.y, player.width, player.height);

  // draw player lasers
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

// AABB collision detection
function isColliding(a, b, aW, aH, bW, bH) {
  return a.x < b.x + bW && a.x + aW > b.x && a.y < b.y + bH && a.y + aH > b.y;
}

///////////////////////////////////////////////////////////
// 5) CONTROLS (MOVE + SHOOT)
///////////////////////////////////////////////////////////
window.addEventListener("keydown", (e) => {
  if (e.code in keys) {
    keys[e.code] = true;
  }
});
window.addEventListener("keyup", (e) => {
  if (e.code in keys) {
    keys[e.code] = false;
  }
});

// Move player & handle space shooting ~60 times/sec
setInterval(() => {
  if (gameState !== "PLAYING") return;

  if (keys.ArrowLeft && player.x > 0) {
    player.x -= player.speed;
  }
  if (keys.ArrowRight && player.x + player.width < SCREEN_WIDTH) {
    player.x += player.speed;
  }
  if (keys.ArrowUp && player.y > 0) {
    player.y -= player.speed;
  }
  if (keys.ArrowDown && player.y + player.height < SCREEN_HEIGHT) {
    player.y += player.speed;
  }

  // shoot
  if (keys.Space) {
    shootPlayerLaser();
  }

  // reduce laser cooldown
  if (player.laserCooldown > 0) {
    player.laserCooldown--;
  }
}, 1000 / 60);

function shootPlayerLaser() {
  if (player.laserCooldown === 0 && player.laserImg) {
    player.lasers.push({
      x: player.x,
      y: player.y,
      img: player.laserImg,
    });
    // 30-frame cooldown, like Python’s COOLDOWN=30
    player.laserCooldown = 30;
  }
}
