// 既に宣言されていない場合にのみ canvas を宣言
let canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const touchLeft = document.getElementById('touch-left');
const touchRight = document.getElementById('touch-right');

// ウィンドウリサイズに応じてcanvasのサイズを調整
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

touchLeft.addEventListener('touchstart', () => {
    keysPressed['ArrowLeft'] = true;
});
touchLeft.addEventListener('touchend', () => {
    keysPressed['ArrowLeft'] = false;
});

touchRight.addEventListener('touchstart', () => {
    keysPressed['ArrowRight'] = true;
});
touchRight.addEventListener('touchend', () => {
    keysPressed['ArrowRight'] = false;
});

window.addEventListener('touchstart', (e) => {
    // ゲームが開始されていない場合は、ゲームを開始する
    if (!isGameStarted) {
        isGameStarted = true;
        gameLoop();
    }

    // プレイヤーが地面にいるときにジャンプする
    if (playerY === FLOOR_Y) {
        playerVelocityY = JUMP_SPEED;
        jumpSound.play();
    }
});


const GAME_WIDTH = 600;
const GAME_HEIGHT = 400;
const PLAYER_WIDTH = 50; // 幅を50に設定
const PLAYER_HEIGHT = 70; // 高さを70に設定
const PLAYER_SPEED = 0.6; // 2倍速
const PLAYER_MAX_SPEED = 2.4; // 2倍速
const PLAYER_FRICTION = 0.96; // 2倍速
const JUMP_SPEED = 5; // ジャンプ力を0.5倍
const GRAVITY = 0.25; // 2倍速
const SMALL_OBJECT_SIZE = 20;
const MEDIUM_OBJECT_SIZE = 40;
const LARGE_OBJECT_SIZE = 80;
const BONUS_SIZE = SMALL_OBJECT_SIZE * 5; // ボーナスの表示サイズを5倍
const GAME_SPEED = 16; // 2倍速
const OBJECT_GRAVITY = 0.05; // 2倍速
const ELASTICITY = 0.7;
const MAX_COLLISIONS = 3;
const BONUS_SCORE = 500;
const FLOOR_Y = 40; // 床面を y=40 に設定

const ObjectType = {
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
  BONUS: 'bonus',
  YOUTUBE: 'youtube',
  PRIME: 'prime',
  NETFLIX: 'netflix'
};

let playerX = GAME_WIDTH / 2 - PLAYER_WIDTH / 2;
let playerY = FLOOR_Y;
let playerVelocityX = 0;
let playerVelocityY = 0;
let playerDirection = 'right'; // プレイヤーの向き
let playerFrame = 0; // 現在のアニメーションフレーム
let playerFrameCounter = 0; // フレームカウンター

const background = new Image();
background.src = './assets/background.png';

const openImage = new Image();
openImage.src = './assets/open.png';

const gameOverImage = new Image();
gameOverImage.src = './assets/gameover.png';

const gameOverTextImage = new Image();
gameOverTextImage.src = './assets/gameover_text.png';

const playerImagesRight = [];
const playerImagesLeft = [];
const objectImages = {
  [ObjectType.YOUTUBE]: new Image(),
  [ObjectType.PRIME]: new Image(),
  [ObjectType.NETFLIX]: new Image(),
  [ObjectType.BONUS]: new Image()
};

objectImages[ObjectType.YOUTUBE].src = './assets/youtube.png';
objectImages[ObjectType.PRIME].src = './assets/prime.png';
objectImages[ObjectType.NETFLIX].src = './assets/netflix.png';
objectImages[ObjectType.BONUS].src = './assets/bonus.png';

// 画像をロードしてリストに追加
for (let i = 1; i <= 12; i++) {
  const imgRight = new Image();
  imgRight.src = `./assets/player_${i}.png`;
  playerImagesRight.push(imgRight);

  const imgLeft = new Image();
  imgLeft.src = `./assets/player_${i}.png`;
  imgLeft.onload = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = imgLeft.width;
    canvas.height = imgLeft.height;
    ctx.translate(imgLeft.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(imgLeft, 0, 0);
    imgLeft.src = canvas.toDataURL();
  };
  playerImagesLeft.push(imgLeft);
}

// 効果音の読み込み
const runSound = new Audio('./assets/run.mp3');
const jumpSound = new Audio('./assets/jump.mp3');
const landingSound = new Audio('./assets/landing.mp3');
const bonusSound = new Audio('./assets/bonus.mp3');
const explosionSound = new Audio('./assets/explosion.mp3');

let objects = [];
let score = 0;
let isGameOver = false;
let isGameStarted = false;
let keysPressed = {};

function createObject() {
  const side = Math.floor(Math.random() * 3);
  const type = Math.random() < 0.05 ? ObjectType.BONUS :
               Math.random() < 0.33 ? ObjectType.YOUTUBE :
               Math.random() < 0.5 ? ObjectType.PRIME : ObjectType.NETFLIX;
  let x, y, vx, vy;
  let size = type === ObjectType.BONUS ? BONUS_SIZE : LARGE_OBJECT_SIZE;

  switch(side) {
    case 0: // 上から
      x = Math.random() * (GAME_WIDTH - size);
      y = GAME_HEIGHT;
      vx = (Math.random() - 0.5) * 2;
      vy = -2.5; // 2倍速
      break;
    case 1: // 左から
      x = 0;
      y = Math.random() * (GAME_HEIGHT - size);
      vx = 2.5; // 2倍速
      vy = (Math.random() - 0.5) * 2;
      break;
    case 2: // 右から
      x = GAME_WIDTH - size;
      y = Math.random() * (GAME_HEIGHT - size);
      vx = -2.5; // 2倍速
      vy = (Math.random() - 0.5) * 2;
      break;
  }

  return { x, y, vx, vy, type, size, collisions: 0 };
}

function checkCollision(obj) {
  return (
    obj.y <= playerY + PLAYER_HEIGHT &&
    obj.y + obj.size >= playerY &&
    obj.x < playerX + PLAYER_WIDTH &&
    obj.x + obj.size > playerX
  );
}

function breakObject(obj) {
  if (obj.size === LARGE_OBJECT_SIZE) {
    return [
      { ...obj, size: MEDIUM_OBJECT_SIZE, vx: obj.vx * 1.1, vy: obj.vy * 1.1, collisions: 0 },
      { ...obj, size: MEDIUM_OBJECT_SIZE, x: obj.x + MEDIUM_OBJECT_SIZE, vx: -obj.vx * 1.1, vy: obj.vy * 1.1, collisions: 0 }
    ];
  } else if (obj.size === MEDIUM_OBJECT_SIZE) {
    return [
      { ...obj, size: SMALL_OBJECT_SIZE, vx: obj.vx * 1.2, vy: obj.vy * 1.2, collisions: 0 },
      { ...obj, size: SMALL_OBJECT_SIZE, x: obj.x + SMALL_OBJECT_SIZE, vx: -obj.vx * 1.2, vy: obj.vy * 1.2, collisions: 0 }
    ];
  }
  return [obj];
}

function updateObjectPosition(obj) {
  let { x, y, vx, vy, type, size, collisions } = obj;

  vy += OBJECT_GRAVITY;
  x += vx;
  y -= vy;

  let shouldBreak = false;
  let hasCollided = false;

  if (x < 0 || x > GAME_WIDTH - size) {
    vx *= -ELASTICITY;
    x = x < 0 ? 0 : GAME_WIDTH - size;
    shouldBreak = true;
    hasCollided = true;
  }
  if (y < FLOOR_Y) {
    vy *= -ELASTICITY;
    y = FLOOR_Y;
    shouldBreak = true;
    hasCollided = true;
  }

  for (let other of objects) {
    if (other === obj) continue;

    if (x < other.x + other.size && x + size > other.x &&
        y < other.y + other.size && y + size > other.y) {
      const tempVx = vx;
      vx = other.vx;
      other.vx = tempVx;

      const tempVy = vy;
      vy = other.vy;
      other.vy = tempVy;

      shouldBreak = true;
      hasCollided = true;
      break;
    }
  }

  if (hasCollided) {
    collisions++;
  }

  if (type !== ObjectType.BONUS && size === SMALL_OBJECT_SIZE && collisions >= MAX_COLLISIONS) {
    return [];
  }

  if (shouldBreak && (size === MEDIUM_OBJECT_SIZE || size === LARGE_OBJECT_SIZE)) {
    return breakObject({ x, y, vx, vy, type, size });
  }

  return [{ x, y, vx, vy, type, size, collisions }];
}

function gameLoop() {
  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  // 背景画像を描画
  ctx.drawImage(background, 0, 0, GAME_WIDTH, GAME_HEIGHT);

  // スコアを表示
  ctx.font = '20px PixelMplus12';
  ctx.fillStyle = 'white';
  ctx.fillText(`Score: ${score}`, 10, 30);

  if (!isGameOver) {
    if (keysPressed['ArrowLeft'] || keysPressed['ArrowRight']) {
      if (!runSound.isPlaying) {
        runSound.play();
        runSound.isPlaying = true;
      }
    } else {
      runSound.isPlaying = false;
      runSound.pause();
      runSound.currentTime = 0;
    }

    if (keysPressed['ArrowLeft']) {
      playerVelocityX -= PLAYER_SPEED;
      playerDirection = 'left';
    }
    if (keysPressed['ArrowRight']) {
      playerVelocityX += PLAYER_SPEED;
      playerDirection = 'right';
    }

    playerVelocityX *= PLAYER_FRICTION;
    playerVelocityY -= GRAVITY;
    playerX = Math.max(0, Math.min(playerX + playerVelocityX, GAME_WIDTH - PLAYER_WIDTH));
    playerY = Math.max(FLOOR_Y, playerY + playerVelocityY);

    if (keysPressed['ArrowLeft'] || keysPressed['ArrowRight']) {
      playerFrameCounter++;
      if (playerFrameCounter % 5 === 0) { // 2倍速
        playerFrame = (playerFrame + 1) % 12;
      }
    }

    let playerImage;
    if (playerDirection === 'right') {
      playerImage = playerImagesRight[playerFrame];
    } else {
      playerImage = playerImagesLeft[playerFrame];
    }
    ctx.drawImage(playerImage, playerX, GAME_HEIGHT - playerY - PLAYER_HEIGHT, PLAYER_WIDTH, PLAYER_HEIGHT);
  }

  let newObjects = [];
  let bonusCollected = false;

  objects.forEach(obj => {
    const updatedObjs = updateObjectPosition(obj);
    newObjects.push(...updatedObjs);
  });

  newObjects = newObjects.filter(obj => obj.y >= FLOOR_Y && obj.y <= GAME_HEIGHT);

  const collidedObjects = newObjects.filter(checkCollision);
  const playerHit = collidedObjects.some(obj => obj.type !== ObjectType.BONUS);
  bonusCollected = collidedObjects.some(obj => obj.type === ObjectType.BONUS);

  if (playerHit) {
    isGameOver = true;
    explosionSound.play();
  }

  if (bonusCollected) {
    score += BONUS_SCORE;
    bonusSound.play();
    newObjects = newObjects.filter(obj => obj.type !== ObjectType.BONUS);
  }

  if (Math.random() < 0.04 && !isGameOver) { // 2倍速
    newObjects.push(createObject());
  }

  objects = newObjects;
  if (!isGameOver) {
    score++;
  }

  objects.forEach(obj => {
    const displaySize = obj.size;
    ctx.drawImage(objectImages[obj.type], obj.x, GAME_HEIGHT - obj.y - displaySize, displaySize, displaySize);
  });

  if (isGameOver) {
    const gameOverWidth = 150;
    const gameOverHeight = 150;
    const gameOverX = playerX - (gameOverWidth - PLAYER_WIDTH) / 2;
    const gameOverY = GAME_HEIGHT - playerY - gameOverHeight;
    ctx.drawImage(gameOverImage, gameOverX, gameOverY, gameOverWidth, gameOverHeight);

    // ゲームオーバーテキストを中央に描画
    const textX = (GAME_WIDTH - gameOverTextImage.width) / 2;
    const textY = (GAME_HEIGHT - gameOverTextImage.height) / 2;
    ctx.drawImage(gameOverTextImage, textX, textY);
  } else {
    requestAnimationFrame(gameLoop);
  }
}

function showOpenImage() {
  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  ctx.drawImage(openImage, 0, 0, GAME_WIDTH, GAME_HEIGHT);
}

document.addEventListener('keydown', (e) => {
  keysPressed[e.key] = true;
  if ((e.key === 'ArrowUp' || e.key === ' ') && playerY === FLOOR_Y) { // スペースボタンでもジャンプ
    playerVelocityY = JUMP_SPEED;
    jumpSound.play();
  }
  if (e.key === ' ' && !isGameStarted) { // スペースキーでゲーム開始
    isGameStarted = true;
    gameLoop();
  }
});

document.addEventListener('keyup', (e) => {
  keysPressed[e.key] = false;
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    runSound.pause();
    runSound.currentTime = 0;
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'r' || e.key === 'R') {
    restartGame();
  }
});

function restartGame() {
  playerX = GAME_WIDTH / 2 - PLAYER_WIDTH / 2;
  playerY = FLOOR_Y;
  playerVelocityX = 0;
  playerVelocityY = 0;
  playerFrame = 0;
  playerFrameCounter = 0;
  objects = [];
  score = 0;
  isGameOver = false;
  isGameStarted = false;
  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  showOpenImage(); // ゲーム開始時にopen.pngを表示
}

// Show the open image when the page loads
window.onload = () => {
  showOpenImage();
};
