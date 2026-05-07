const gameArea = document.getElementById("gameArea");
const player1El = document.getElementById("player");
const player2El = document.getElementById("player2");
const modeOverlayEl = document.getElementById("modeOverlay");
const onePlayerBtn = document.getElementById("onePlayerBtn");
const twoPlayersBtn = document.getElementById("twoPlayersBtn");
const scoreEl = document.getElementById("score");
const score1El = document.getElementById("score1");
const score2El = document.getElementById("score2");
const levelEl = document.getElementById("level");
const timeEl = document.getElementById("time");
const p1SpeedEl = document.getElementById("p1Speed");
const p2SpeedEl = document.getElementById("p2Speed");
const p1ShieldEl = document.getElementById("p1Shield");
const p2ShieldEl = document.getElementById("p2Shield");
const restartBtn = document.getElementById("restartBtn");
const changeModeBtn = document.getElementById("changeModeBtn");

const GAME_DURATION = 60;
const MAX_TIME = 180;
const LEVEL_STEP = 80;
const BASE_PLAYER_SPEED = 5;
const BASE_OBSTACLE_SPEED = 1.5;
const BASE_FRUIT_COUNT = 4;
const SHIELD_BLOCK_COOLDOWN_MS = 900;

const player1 = { x: 40, y: 40, vx: 0, vy: 0, w: 56, h: 88 };
const player2 = { x: 120, y: 120, vx: 0, vy: 0, w: 66, h: 88 };
const player1State = { speedUntil: 0, shield: 0, hitCooldownUntil: 0 };
const player2State = { speedUntil: 0, shield: 0, hitCooldownUntil: 0 };
const keys = {};

let obstacles = [];
let fruits = [];
let score1 = 0;
let score2 = 0;
let totalScore = 0;
let level = 1;
let timeLeft = GAME_DURATION;
let gameOver = false;
let gameStarted = false;
let playerMode = 1;
let timerId = null;
let animationId = null;

function triggerAreaFx(className) {
  gameArea.classList.remove(className);
  void gameArea.offsetWidth;
  gameArea.classList.add(className);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hasSpeedBoost(playerState) {
  return Date.now() < playerState.speedUntil;
}

function getPlayerSpeed(playerState) {
  const base = BASE_PLAYER_SPEED + (level - 1) * 0.35;
  return hasSpeedBoost(playerState) ? base * 1.6 : base;
}

function updatePlayerVelocity() {
  const speed1 = getPlayerSpeed(player1State);
  const speed2 = getPlayerSpeed(player2State);

  player1.vx = 0;
  player1.vy = 0;
  player2.vx = 0;
  player2.vy = 0;

  if (keys.a) player1.vx = -speed1;
  if (keys.d) player1.vx = speed1;
  if (keys.w) player1.vy = -speed1;
  if (keys.s) player1.vy = speed1;

  if (keys.ArrowLeft) player2.vx = -speed2;
  if (keys.ArrowRight) player2.vx = speed2;
  if (keys.ArrowUp) player2.vy = -speed2;
  if (keys.ArrowDown) player2.vy = speed2;
}

function renderPlayers() {
  player1El.style.left = `${player1.x}px`;
  player1El.style.top = `${player1.y}px`;
  if (playerMode === 2) {
    player2El.style.left = `${player2.x}px`;
    player2El.style.top = `${player2.y}px`;
  }
  player1El.classList.toggle("speed-active", hasSpeedBoost(player1State));
  player2El.classList.toggle("speed-active", playerMode === 2 && hasSpeedBoost(player2State));
  player1El.classList.toggle("shield-active", player1State.shield > 0);
  player2El.classList.toggle("shield-active", playerMode === 2 && player2State.shield > 0);
}

function chooseFruitType() {
  const random = Math.random();
  if (random < 0.5) return { type: "common", points: 10, size: 28 };
  if (random < 0.7) return { type: "rare", points: 25, size: 24 };
  if (random < 0.82) return { type: "speed", points: 12, size: 24, ability: "speed" };
  if (random < 0.92) return { type: "time", points: 8, size: 24, ability: "time" };
  return { type: "shield", points: 8, size: 24, ability: "shield" };
}

function createFruit() {
  const fruitInfo = chooseFruitType();
  const areaRect = gameArea.getBoundingClientRect();
  const maxX = areaRect.width - fruitInfo.size;
  const maxY = areaRect.height - fruitInfo.size;

  const fruitX = Math.floor(Math.random() * maxX);
  const fruitY = Math.floor(Math.random() * maxY);

  const fruitEl = document.createElement("div");
  fruitEl.className = `fruit${fruitInfo.type === "common" ? "" : ` ${fruitInfo.type}`}`;
  fruitEl.style.left = `${fruitX}px`;
  fruitEl.style.top = `${fruitY}px`;
  gameArea.appendChild(fruitEl);

  fruits.push({
    el: fruitEl,
    x: fruitX,
    y: fruitY,
    points: fruitInfo.points,
    size: fruitInfo.size,
    ability: fruitInfo.ability || null
  });
}

function clearFruits() {
  fruits.forEach((item) => item.el.remove());
  fruits = [];
}

function ensureFruitCount() {
  const targetCount = Math.min(BASE_FRUIT_COUNT + Math.floor(level / 2), 9);
  while (fruits.length < targetCount) createFruit();
}

function hasCollision(playerObj, target) {
  return (
    playerObj.x < target.x + target.size &&
    playerObj.x + playerObj.w > target.x &&
    playerObj.y < target.y + target.size &&
    playerObj.y + playerObj.h > target.y
  );
}

function refreshScoreHud() {
  score1El.textContent = score1;
  score2El.textContent = score2;
  scoreEl.textContent = totalScore;
  score2El.parentElement.classList.toggle("hidden", playerMode === 1);
}

function renderPowerHud() {
  const p1Active = hasSpeedBoost(player1State);
  const p2Active = hasSpeedBoost(player2State);
  p1SpeedEl.textContent = p1Active ? "ON" : "OFF";
  p2SpeedEl.textContent = p2Active ? "ON" : "OFF";
  p1SpeedEl.className = p1Active ? "status-on" : "status-off";
  p2SpeedEl.className = p2Active ? "status-on" : "status-off";
  p1ShieldEl.textContent = player1State.shield;
  p2ShieldEl.textContent = player2State.shield;
  p2SpeedEl.parentElement.classList.toggle("hidden", playerMode === 1);
  p2ShieldEl.parentElement.classList.toggle("hidden", playerMode === 1);
}

function setupObstacles() {
  obstacles.forEach((item) => item.el.remove());
  obstacles = [];

  const areaRect = gameArea.getBoundingClientRect();
  const obstacleCount = Math.min(1 + Math.floor(level / 2), 6);

  for (let i = 0; i < obstacleCount; i += 1) {
    const obstacle = document.createElement("div");
    obstacle.className = "obstacle";

    const x = Math.random() * (areaRect.width - 34);
    const y = Math.random() * (areaRect.height - 34);
    obstacle.style.left = `${x}px`;
    obstacle.style.top = `${y}px`;
    gameArea.appendChild(obstacle);

    const directionX = Math.random() > 0.5 ? 1 : -1;
    const directionY = Math.random() > 0.5 ? 1 : -1;
    const speedFactor = BASE_OBSTACLE_SPEED + level * 0.22;

    obstacles.push({
      el: obstacle,
      x,
      y,
      size: 34,
      vx: directionX * speedFactor,
      vy: directionY * speedFactor
    });
  }
}

function updateObstacles(maxX, maxY) {
  obstacles.forEach((item) => {
    item.x += item.vx;
    item.y += item.vy;

    if (item.x <= 0 || item.x >= maxX - item.size) item.vx *= -1;
    if (item.y <= 0 || item.y >= maxY - item.size) item.vy *= -1;

    item.x = clamp(item.x, 0, maxX - item.size);
    item.y = clamp(item.y, 0, maxY - item.size);
    item.el.style.left = `${item.x}px`;
    item.el.style.top = `${item.y}px`;
  });
}

function collidedWithObstacle(playerObj) {
  return obstacles.some((item) => (
    playerObj.x < item.x + item.size &&
    playerObj.x + playerObj.w > item.x &&
    playerObj.y < item.y + item.size &&
    playerObj.y + playerObj.h > item.y
  ));
}

function applyAbility(playerNumber, ability) {
  const targetState = playerNumber === 1 ? player1State : player2State;

  if (ability === "speed") {
    targetState.speedUntil = Date.now() + 5000;
    updatePlayerVelocity();
    return;
  }

  if (ability === "time") {
    timeLeft = clamp(timeLeft + 7, 0, MAX_TIME);
    timeEl.textContent = timeLeft;
    return;
  }

  if (ability === "shield") {
    targetState.shield += 1;
    renderPowerHud();
  }
}

function updateScore(playerNumber, value) {
  if (playerNumber === 1) score1 += value;
  if (playerNumber === 2) score2 += value;

  totalScore = score1 + score2;
  refreshScoreHud();

  const newLevel = Math.floor(totalScore / LEVEL_STEP) + 1;
  if (newLevel !== level) {
    level = newLevel;
    levelEl.textContent = level;
    setupObstacles();
    updatePlayerVelocity();
    ensureFruitCount();
  }
}

function onObstacleCollision(playerState) {
  if (Date.now() < playerState.hitCooldownUntil) {
    return false;
  }

  if (playerState.shield > 0) {
    playerState.shield -= 1;
    playerState.hitCooldownUntil = Date.now() + SHIELD_BLOCK_COOLDOWN_MS;
    renderPowerHud();
    triggerAreaFx("hit-fx");
    return false;
  }
  return true;
}

function showEndMessage() {
  const message = document.createElement("div");
  message.className = "message";
  message.id = "endMessage";
  message.innerHTML = `Fim de jogo!<br>Total: <span class="highlight">${totalScore}</span> pontos`;
  gameArea.appendChild(message);
}

function clearEndMessage() {
  const existingMessage = document.getElementById("endMessage");
  if (existingMessage) existingMessage.remove();
}

function gameLoop() {
  if (gameOver) return;

  const areaRect = gameArea.getBoundingClientRect();
  const maxX1 = areaRect.width - player1.w;
  const maxY1 = areaRect.height - player1.h;
  const maxX2 = areaRect.width - player2.w;
  const maxY2 = areaRect.height - player2.h;

  updatePlayerVelocity();
  player1.x = clamp(player1.x + player1.vx, 0, maxX1);
  player1.y = clamp(player1.y + player1.vy, 0, maxY1);
  if (playerMode === 2) {
    player2.x = clamp(player2.x + player2.vx, 0, maxX2);
    player2.y = clamp(player2.y + player2.vy, 0, maxY2);
  }

  renderPlayers();
  updateObstacles(areaRect.width, areaRect.height);

  for (let i = fruits.length - 1; i >= 0; i -= 1) {
    const target = fruits[i];
    const p1Hit = hasCollision(player1, target);
    const p2Hit = playerMode === 2 ? hasCollision(player2, target) : false;
    if (!p1Hit && !p2Hit) continue;

    const scorer = p1Hit ? 1 : 2;
    updateScore(scorer, target.points);
    if (target.ability) applyAbility(scorer, target.ability);
    triggerAreaFx("collect-fx");
    target.el.remove();
    fruits.splice(i, 1);
  }

  ensureFruitCount();
  renderPowerHud();

  if (collidedWithObstacle(player1) && onObstacleCollision(player1State)) {
    endGame();
    return;
  }
  if (playerMode === 2 && collidedWithObstacle(player2) && onObstacleCollision(player2State)) {
    endGame();
    return;
  }

  animationId = requestAnimationFrame(gameLoop);
}

function startTimer() {
  timerId = setInterval(() => {
    timeLeft -= 1;
    timeEl.textContent = timeLeft;
    if (timeLeft <= 0) endGame();
  }, 1000);
}

function endGame() {
  gameOver = true;
  clearInterval(timerId);
  cancelAnimationFrame(animationId);
  showEndMessage();
}

function resetGame() {
  if (!gameStarted) return;
  clearInterval(timerId);
  cancelAnimationFrame(animationId);

  gameOver = false;
  score1 = 0;
  score2 = 0;
  totalScore = 0;
  level = 1;
  timeLeft = GAME_DURATION;
  player1.x = 40;
  player1.y = 40;
  player1.vx = 0;
  player1.vy = 0;
  player2.x = 120;
  player2.y = 120;
  player2.vx = 0;
  player2.vy = 0;
  player1State.speedUntil = 0;
  player2State.speedUntil = 0;
  player1State.shield = 0;
  player2State.shield = 0;
  player1State.hitCooldownUntil = 0;
  player2State.hitCooldownUntil = 0;

  refreshScoreHud();
  levelEl.textContent = level;
  timeEl.textContent = timeLeft;
  renderPowerHud();
  clearEndMessage();
  clearFruits();
  setupObstacles();
  ensureFruitCount();
  renderPlayers();
  player2El.classList.toggle("hidden", playerMode === 1);
  startTimer();
  gameLoop();
}

function startGameWithMode(mode) {
  playerMode = mode;
  gameStarted = true;
  modeOverlayEl.classList.add("hidden");
  resetGame();
}

function backToModeSelection() {
  clearInterval(timerId);
  cancelAnimationFrame(animationId);
  gameStarted = false;
  gameOver = true;
  keys.w = false;
  keys.a = false;
  keys.s = false;
  keys.d = false;
  keys.ArrowUp = false;
  keys.ArrowDown = false;
  keys.ArrowLeft = false;
  keys.ArrowRight = false;
  clearEndMessage();
  modeOverlayEl.classList.remove("hidden");
}

window.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    if (gameStarted) resetGame();
    return;
  }
  if (!gameStarted) return;
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  const validKeys = playerMode === 2
    ? ["w", "a", "s", "d", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]
    : ["w", "a", "s", "d"];
  if (!validKeys.includes(key)) return;
  if (key.startsWith("Arrow")) event.preventDefault();
  keys[key] = true;
  updatePlayerVelocity();
});

window.addEventListener("keyup", (event) => {
  if (!gameStarted) return;
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  const validKeys = playerMode === 2
    ? ["w", "a", "s", "d", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]
    : ["w", "a", "s", "d"];
  if (!validKeys.includes(key)) return;
  keys[key] = false;
  updatePlayerVelocity();
});

restartBtn.addEventListener("click", resetGame);
changeModeBtn.addEventListener("click", backToModeSelection);
onePlayerBtn.addEventListener("click", () => startGameWithMode(1));
twoPlayersBtn.addEventListener("click", () => startGameWithMode(2));

renderPowerHud();
refreshScoreHud();
player2El.classList.add("hidden");
