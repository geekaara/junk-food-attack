///////////////////////////////////////////////////////////
// main.js – The main entry, tying everything together
///////////////////////////////////////////////////////////
import {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  ASSETS,
  imagesReady,
  jerseyFontLoaded,
} from "./assets.js";
import { gameState, player, keys, startGame, gameLoop } from "./gameCore.js";
import {
  loginState,
  currentUser,
  attemptLoginOrSignup,
  globalHighestScore, // <-- IMPORT
} from "./cognitoConfig.js";

// 1) SETUP CANVAS
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Wait for images to be ready, then draw menu
imagesReady.then(() => {
  drawMenu();
});

// 2) DRAW MENU
function drawMenu() {
  // Draw background (if loaded), else fill black
  if (ASSETS.background.complete) {
    ctx.drawImage(ASSETS.background, 0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
  } else {
    ctx.fillStyle = "#1e1e1e";
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
  }

  // Big red title at y=200
  const font70 = jerseyFontLoaded ? "70px JerseyFont" : "70px Arial";
  ctx.font = font70;
  ctx.fillStyle = "red";
  const titleText = "Junk Food Attack!";
  const titleMetrics = ctx.measureText(titleText);
  ctx.fillText(titleText, SCREEN_WIDTH / 2 - titleMetrics.width / 2, 200);

  // If user not logged in, show login form
  if (!currentUser) {
    drawLoginForm();
  } else {
    // If logged in, show "Hello, <username>!" + highest score
    const font40 = jerseyFontLoaded ? "40px JerseyFont" : "40px Arial";
    ctx.font = font40;
    ctx.fillStyle = "yellow";

    const helloText = `Hello, ${currentUser}!`;
    const helloMetrics = ctx.measureText(helloText);
    ctx.fillText(helloText, SCREEN_WIDTH / 2 - helloMetrics.width / 2, 300);

    // Show highest score below that
    const highText = `Highest: ${globalHighestScore}`;
    const htMetrics = ctx.measureText(highText);
    ctx.fillText(highText, SCREEN_WIDTH / 2 - htMetrics.width / 2, 360);
  }

  // Draw green "START" button
  const buttonWidth = 200;
  const buttonHeight = 60;
  const buttonX = (SCREEN_WIDTH - buttonWidth) / 2;
  const buttonY = 450;

  ctx.fillStyle = "green";
  ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);

  const font45 = jerseyFontLoaded ? "45px JerseyFont" : "45px Arial";
  ctx.font = font45;
  ctx.fillStyle = "white";
  const startText = "START";
  const stMetrics = ctx.measureText(startText);
  const stX = buttonX + (buttonWidth - stMetrics.width) / 2;
  const stY = buttonY + buttonHeight / 2 + 15;
  ctx.fillText(startText, stX, stY);
}

function drawLoginForm() {
  // Use black text & stroke for the boxes
  ctx.fillStyle = "white";
  const font30 = jerseyFontLoaded ? "30px JerseyFont" : "30px Arial";
  ctx.font = font30;

  ctx.fillStyle = "black"; // text color
  ctx.fillText("User:", 150, 300);

  ctx.strokeStyle = "black"; // stroke color
  ctx.strokeRect(250, 275, 300, 30);
  ctx.fillText(loginState.username, 260, 300);

  ctx.fillText("Pass:", 150, 350);
  ctx.strokeRect(250, 325, 300, 30);
  ctx.fillText("*".repeat(loginState.password.length), 260, 350);

  // "Login/Signup" button
  ctx.fillStyle = "green";
  ctx.fillRect(300, 400, 150, 40);
  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.fillText("Login/Signup", 325, 427);

  // If there's an error, show it in red
  if (loginState.error) {
    ctx.fillStyle = "red";
    ctx.fillText(loginState.error, 300, 480);
  }

  // Yellow outline for the selected field
  if (loginState.selectedField === "username") {
    ctx.strokeStyle = "yellow";
    ctx.strokeRect(248, 273, 304, 34);
  } else if (loginState.selectedField === "password") {
    ctx.strokeStyle = "yellow";
    ctx.strokeRect(248, 323, 304, 34);
  }
}

// 3) MOUSE EVENTS
canvas.addEventListener("mousedown", async (e) => {
  if (gameState === "MENU") {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // "START" button coords
    const buttonWidth = 200;
    const buttonHeight = 60;
    const buttonX = (SCREEN_WIDTH - buttonWidth) / 2;
    const buttonY = 450;

    // Did user click "START"?
    if (
      mouseX >= buttonX &&
      mouseX <= buttonX + buttonWidth &&
      mouseY >= buttonY &&
      mouseY <= buttonY + buttonHeight
    ) {
      // Only start if logged in
      if (currentUser) {
        startGame();
        requestAnimationFrame(() => gameLoop(ctx, jerseyFontLoaded, drawMenu));
      } else {
        console.log("Please log in first!");
      }
    }

    // If not logged in, see if user clicked in username/password boxes or "Login/Signup"
    if (!currentUser) {
      // Username box
      if (mouseX >= 250 && mouseX <= 550 && mouseY >= 275 && mouseY <= 305) {
        loginState.selectedField = "username";
      }
      // Password box
      else if (
        mouseX >= 250 &&
        mouseX <= 550 &&
        mouseY >= 325 &&
        mouseY <= 355
      ) {
        loginState.selectedField = "password";
      }
      // Login/Signup button
      else if (
        mouseX >= 300 &&
        mouseX <= 450 &&
        mouseY >= 400 &&
        mouseY <= 440
      ) {
        await attemptLoginOrSignup(drawMenu);
      }
      // Elsewhere
      else {
        loginState.selectedField = null;
      }
      drawMenu();
    }
  }
});

// 4) KEYBOARD EVENTS
window.addEventListener("keydown", (e) => {
  if (gameState === "MENU" && !currentUser && loginState.selectedField) {
    e.preventDefault();
    if (e.key === "Backspace") {
      const currentVal = loginState[loginState.selectedField];
      loginState[loginState.selectedField] = currentVal.slice(0, -1);
      drawMenu();
    } else if (e.key === "Tab") {
      loginState.selectedField =
        loginState.selectedField === "username" ? "password" : "username";
      drawMenu();
    } else if (e.key.length === 1) {
      loginState[loginState.selectedField] += e.key;
      drawMenu();
    }
    return; // stop normal behavior
  }

  // If the game is playing, handle normal movement controls
  if (e.code in keys) {
    keys[e.code] = true;
  }
});

window.addEventListener("keyup", (e) => {
  if (e.code in keys) {
    keys[e.code] = false;
  }
});

// 5) SHOOT LOGIC (runs ~60 times/sec)
setInterval(() => {
  import("./gameCore.js").then(({ gameState, player, keys }) => {
    if (gameState !== "PLAYING") return;

    // Move left/right/up/down
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

    // Shoot
    if (keys.Space) {
      shootPlayerLaser();
    }

    // Decrement laser cooldown
    if (player.laserCooldown > 0) {
      player.laserCooldown--;
    }
  });
}, 1000 / 60);

// This function defers importing the 'player' from gameCore to avoid circular refs
function shootPlayerLaser() {
  import("./gameCore.js").then(({ player }) => {
    if (player.laserCooldown === 0 && player.laserImg) {
      player.lasers.push({
        x: player.x,
        y: player.y,
        img: player.laserImg,
      });
      player.laserCooldown = 30;
    }
  });
}
