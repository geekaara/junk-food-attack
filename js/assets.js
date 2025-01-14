export const SCREEN_WIDTH = 750;
export const SCREEN_HEIGHT = 750;

export let jerseyFontLoaded = false;

const jerseyFontUrl =
  "https://junk-food-attack-assets-aa2025.s3.ap-southeast-2.amazonaws.com/assets/Jersey15-Regular.ttf";

const jerseyFontFace = new FontFace("JerseyFont", `url(${jerseyFontUrl})`);
jerseyFontFace.load().then((loadedFace) => {
  document.fonts.add(loadedFace);
  console.log("JerseyFont loaded from S3");
  jerseyFontLoaded = true;
});

const S3_BASE =
  "https://junk-food-attack-assets-aa2025.s3.ap-southeast-2.amazonaws.com/assets";

export const ASSETS = {
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

let imagesLoaded = 0;
const totalImages = Object.keys(ASSETS).length;

export const imagesReady = new Promise((resolve) => {
  Object.values(ASSETS).forEach((img) => {
    img.onload = () => {
      imagesLoaded++;
      if (imagesLoaded === totalImages) {
        console.log("All images loaded. Ready!");
        resolve();
      }
    };
  });
});
