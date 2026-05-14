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
const gameWrapperEl = document.querySelector(".game-wrapper");

const config = {
  difficulty: "normal",
  mapSize: "medium",
  gameMode: "normal",
  mapTheme: "field",
  uiTheme: "light",
  skinP1: "player1",
  skinP2: "player2",
};

const SKIN_MAP = {
  "player1": "url('./assets/player1.png')",
  "player2": "url('./assets/player2.png')",
  "goku": "url('./assets/goku.png')",
  "run-l": "url('./assets/run-l.png')",
  "run-m": "url('./assets/run-m.png')",
  "goku-ssj": "url('./assets/goku-ssj.svg')",
  "goku-ssj-fly": "url('./assets/goku-ssj-fly.svg')",
  "sprite3-run": "url('./assets/sprite3-run.svg')",
  "goku-base": "url('./goku.sprite/Base Goku (Yadrat Armor).png')",
  "goku-flying": "url('./goku.sprite/Flying foward Goku (Yadrat Armor).svg')",
  "goku-ssj-flying": "url('./goku.sprite/Flying foward Goku SSJ (Yadrat Armor).svg')",
  "goku-ssj-armor": "url('./goku.sprite/Goku SSJ (Yadrat Armor).svg')",
};

function applySkins() {
  const bg1 = SKIN_MAP[config.skinP1] || SKIN_MAP.player1;
  const bg2 = SKIN_MAP[config.skinP2] || SKIN_MAP.player2;
  player1El.style.backgroundImage = bg1;
  player2El.style.backgroundImage = bg2;
}

const joystickLeft = document.getElementById("joystickLeft");
const joystickRight = document.getElementById("joystickRight");
const knobLeft = document.getElementById("joystickKnobLeft");
const knobRight = document.getElementById("joystickKnobRight");

const GAME_DURATION = 60;
const MAX_TIME = 180;
const LEVEL_STEP = 80;
const BASE_PLAYER_SPEED = 5;
const BASE_OBSTACLE_SPEED = 1.5;
const BASE_FRUIT_COUNT = 4;
const SHIELD_BLOCK_COOLDOWN_MS = 900;
const RESPAWN_DELAY = 5000;

const respawnP1El = document.getElementById("respawnP1");
const respawnP2El = document.getElementById("respawnP2");

const player1 = { x: 40, y: 40, vx: 0, vy: 0, w: 50, h: 78, touchX: 0, touchY: 0 };
const player2 = { x: 120, y: 120, vx: 0, vy: 0, w: 58, h: 78, touchX: 0, touchY: 0 };
const player1State = { speedUntil: 0, shield: 0, hitCooldownUntil: 0, deadUntil: 0 };
const player2State = { speedUntil: 0, shield: 0, hitCooldownUntil: 0, deadUntil: 0 };
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

function applyMapSize() {
  gameWrapperEl.classList.remove("map-xs", "map-small", "map-medium", "map-large", "map-xl");
  gameArea.classList.remove("map-xs", "map-small", "map-medium", "map-large", "map-xl");
  if (config.mapSize !== "medium") {
    gameWrapperEl.classList.add(`map-${config.mapSize}`);
    gameArea.classList.add(`map-${config.mapSize}`);
  }
}

function applyMapTheme() {
  gameArea.classList.remove("theme-field", "theme-desert", "theme-ice", "theme-volcano", "theme-forest", "theme-space");
  gameArea.classList.add(`theme-${config.mapTheme}`);
}

function applyUiTheme() {
  if (config.uiTheme === "dark") {
    document.body.classList.add("dark");
  } else {
    document.body.classList.remove("dark");
  }
}

function isDead(playerState) {
  return Date.now() < playerState.deadUntil;
}

function getRespawnTime(playerState) {
  if (playerState.deadUntil <= 0) return 0;
  return Math.max(0, Math.ceil((playerState.deadUntil - Date.now()) / 1000));
}

function respawnPlayer(playerNumber) {
  const player = playerNumber === 1 ? player1 : player2;
  const state = playerNumber === 1 ? player1State : player2State;
  state.deadUntil = 0;
  state.hitCooldownUntil = Date.now() + 1000;
  player.x = 40 + (playerNumber === 2 ? 80 : 0);
  player.y = 40;
  player.vx = 0;
  player.vy = 0;
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

  const hasTouch1 = player1.touchX !== 0 || player1.touchY !== 0;
  const hasTouch2 = player2.touchX !== 0 || player2.touchY !== 0;

  if (!isDead(player1State)) {
    if (hasTouch1) {
      const mag = Math.hypot(player1.touchX, player1.touchY);
      const normX = player1.touchX / mag;
      const normY = player1.touchY / mag;
      player1.vx = normX * speed1;
      player1.vy = normY * speed1;
    } else {
      player1.vx = 0;
      player1.vy = 0;
      if (keys.a) player1.vx = -speed1;
      if (keys.d) player1.vx = speed1;
      if (keys.w) player1.vy = -speed1;
      if (keys.s) player1.vy = speed1;
    }
  }

  if (playerMode === 2 && !isDead(player2State)) {
    if (hasTouch2) {
      const mag = Math.hypot(player2.touchX, player2.touchY);
      const normX = player2.touchX / mag;
      const normY = player2.touchY / mag;
      player2.vx = normX * speed2;
      player2.vy = normY * speed2;
    } else {
      player2.vx = 0;
      player2.vy = 0;
      if (keys.ArrowLeft) player2.vx = -speed2;
      if (keys.ArrowRight) player2.vx = speed2;
      if (keys.ArrowUp) player2.vy = -speed2;
      if (keys.ArrowDown) player2.vy = speed2;
    }
  }
}

function renderPlayers() {
  const p1Dead = isDead(player1State);
  const p2Dead = isDead(player2State);

  player1El.classList.toggle("hidden", p1Dead);
  if (!p1Dead) {
    player1El.style.left = `${player1.x}px`;
    player1El.style.top = `${player1.y}px`;
  }
  if (playerMode === 2) {
    player2El.classList.toggle("hidden", p2Dead);
    if (!p2Dead) {
      player2El.style.left = `${player2.x}px`;
      player2El.style.top = `${player2.y}px`;
    }
  }
  player1El.classList.toggle("speed-active", !p1Dead && hasSpeedBoost(player1State));
  player2El.classList.toggle("speed-active", playerMode === 2 && !p2Dead && hasSpeedBoost(player2State));
  player1El.classList.toggle("shield-active", !p1Dead && player1State.shield > 0);
  player2El.classList.toggle("shield-active", playerMode === 2 && !p2Dead && player2State.shield > 0);
  applySkins();
}

function chooseFruitType() {
  if (config.gameMode === "specialFruits") {
    const r = Math.random();
    if (r < 0.25) return { type: "rare", points: 25, size: 24 };
    if (r < 0.48) return { type: "speed", points: 12, size: 24, ability: "speed" };
    if (r < 0.7) return { type: "time", points: 8, size: 24, ability: "time" };
    return { type: "shield", points: 8, size: 24, ability: "shield" };
  }

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
  let base = BASE_FRUIT_COUNT;
  if (config.difficulty === "easy") base += 2;
  if (config.difficulty === "hard") base = Math.max(2, base - 1);
  const targetCount = Math.min(base + Math.floor(level / 2), 9);
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

  let obstacleCount = Math.min(1 + Math.floor(level / 2), 6);

  if (config.difficulty === "easy") obstacleCount = Math.max(1, Math.floor(obstacleCount * 0.6));
  if (config.difficulty === "hard") obstacleCount = Math.min(10, Math.floor(obstacleCount * 1.4));

  if (config.gameMode === "hardMode") obstacleCount = Math.min(12, Math.floor(obstacleCount * 1.6));
  if (config.gameMode === "impossibleMode") obstacleCount = Math.min(14, Math.floor(obstacleCount * 2.5));

  let speedMultiplier = 1;
  if (config.difficulty === "easy") speedMultiplier *= 0.7;
  if (config.difficulty === "hard") speedMultiplier *= 1.3;
  if (config.gameMode === "impossibleMode") speedMultiplier *= 2.0;

  const safeZones = [
    { x: 40, y: 40, r: 80 },
    { x: 120, y: 120, r: 80 },
  ];

  for (let i = 0; i < obstacleCount; i += 1) {
    const obstacle = document.createElement("div");
    obstacle.className = "obstacle";

    let x, y, safe;
    do {
      x = Math.random() * (areaRect.width - 34);
      y = Math.random() * (areaRect.height - 34);
      safe = safeZones.every((z) => Math.hypot(x - z.x, y - z.y) > z.r);
    } while (!safe);

    obstacle.style.left = `${x}px`;
    obstacle.style.top = `${y}px`;
    gameArea.appendChild(obstacle);

    const directionX = Math.random() > 0.5 ? 1 : -1;
    const directionY = Math.random() > 0.5 ? 1 : -1;
    const speedFactor = (BASE_OBSTACLE_SPEED + level * 0.22) * speedMultiplier;

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

function updateRespawnDisplay() {
  const p1Time = getRespawnTime(player1State);
  const p2Time = getRespawnTime(player2State);

  respawnP1El.classList.toggle("hidden", p1Time <= 0 || playerMode === 1);
  if (p1Time > 0) respawnP1El.textContent = `P1 revive em ${p1Time}s`;

  respawnP2El.classList.toggle("hidden", p2Time <= 0);
  if (p2Time > 0) respawnP2El.textContent = `P2 revive em ${p2Time}s`;
}

function gameLoop() {
  if (gameOver) return;

  const areaRect = gameArea.getBoundingClientRect();
  const maxX1 = areaRect.width - player1.w;
  const maxY1 = areaRect.height - player1.h;
  const maxX2 = areaRect.width - player2.w;
  const maxY2 = areaRect.height - player2.h;

  updatePlayerVelocity();

  if (!isDead(player1State)) {
    player1.x = clamp(player1.x + player1.vx, 0, maxX1);
    player1.y = clamp(player1.y + player1.vy, 0, maxY1);
  }
  if (playerMode === 2 && !isDead(player2State)) {
    player2.x = clamp(player2.x + player2.vx, 0, maxX2);
    player2.y = clamp(player2.y + player2.vy, 0, maxY2);
  }

  renderPlayers();
  updateObstacles(areaRect.width, areaRect.height);

  for (let i = fruits.length - 1; i >= 0; i -= 1) {
    const target = fruits[i];
    const p1Hit = !isDead(player1State) && hasCollision(player1, target);
    const p2Hit = playerMode === 2 && !isDead(player2State) && hasCollision(player2, target);
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

  if (!isDead(player1State) && collidedWithObstacle(player1) && onObstacleCollision(player1State)) {
    if (playerMode === 1) {
      endGame();
      return;
    }
    player1State.deadUntil = Date.now() + RESPAWN_DELAY;
    player1.vx = 0;
    player1.vy = 0;
  }

  if (playerMode === 2 && !isDead(player2State) && collidedWithObstacle(player2) && onObstacleCollision(player2State)) {
    player2State.deadUntil = Date.now() + RESPAWN_DELAY;
    player2.vx = 0;
    player2.vy = 0;
  }

  if (playerMode === 2 && isDead(player1State) && isDead(player2State)) {
    endGame();
    return;
  }

  if (isDead(player1State) && Date.now() >= player1State.deadUntil) respawnPlayer(1);
  if (playerMode === 2 && isDead(player2State) && Date.now() >= player2State.deadUntil) respawnPlayer(2);

  updateRespawnDisplay();
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
  player1State.deadUntil = 0;
  player2State.deadUntil = 0;
  respawnP1El.classList.add("hidden");
  respawnP2El.classList.add("hidden");
  resetJoystick("left", player1, knobLeft);
  resetJoystick("right", player2, knobRight);

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
  applyMapSize();
  applyMapTheme();
  applyUiTheme();
  updateJoystickVisibility();
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
  resetJoystick("left", player1, knobLeft);
  resetJoystick("right", player2, knobRight);
  clearEndMessage();
  respawnP1El.classList.add("hidden");
  respawnP2El.classList.add("hidden");
  player1State.deadUntil = 0;
  player2State.deadUntil = 0;
  player1El.classList.remove("hidden");
  player2El.classList.remove("hidden");
  modeOverlayEl.classList.remove("hidden");
  updateJoystickVisibility();
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

const themeToggleBtn = document.getElementById("themeToggleBtn");

themeToggleBtn.addEventListener("click", () => {
  config.uiTheme = config.uiTheme === "dark" ? "light" : "dark";
  applyUiTheme();
  themeToggleBtn.textContent = config.uiTheme === "dark" ? "◑" : "◐";
});

document.querySelectorAll(".menu-options button").forEach((btn) => {
  btn.addEventListener("click", () => {
    const group = btn.closest(".menu-options").dataset.group;
    config[group] = btn.dataset.value;
    btn.closest(".menu-options").querySelectorAll("button").forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
  });
});

renderPowerHud();
refreshScoreHud();
player2El.classList.add("hidden");

const JOYSTICK_RADIUS = 30;
const joystickState = { left: { active: false, touchId: -1 }, right: { active: false, touchId: -1 } };

function getJoystickCenter(el) {
  const rect = el.getBoundingClientRect();
  return { cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2 };
}

function handleJoystickStart(touch, side, playerObj, knobEl, joystickEl) {
  const state = joystickState[side];
  state.active = true;
  state.touchId = touch.identifier;
  const { cx, cy } = getJoystickCenter(joystickEl);
  updateJoystick(touch, cx, cy, playerObj, knobEl);
}

function handleJoystickMove(touch, side, playerObj, knobEl, joystickEl) {
  const state = joystickState[side];
  if (!state.active || touch.identifier !== state.touchId) return;
  const { cx, cy } = getJoystickCenter(joystickEl);
  updateJoystick(touch, cx, cy, playerObj, knobEl);
}

function handleJoystickEnd(touch, side, playerObj, knobEl) {
  const state = joystickState[side];
  if (!state.active || touch.identifier !== state.touchId) return;
  state.active = false;
  state.touchId = -1;
  playerObj.touchX = 0;
  playerObj.touchY = 0;
  knobEl.style.transform = "translate(-50%, -50%)";
  updatePlayerVelocity();
}

function resetJoystick(side, playerObj, knobEl) {
  const state = joystickState[side];
  state.active = false;
  state.touchId = -1;
  playerObj.touchX = 0;
  playerObj.touchY = 0;
  knobEl.style.transform = "translate(-50%, -50%)";
}

function updateJoystick(touch, cx, cy, playerObj, knobEl) {
  let dx = touch.clientX - cx;
  let dy = touch.clientY - cy;
  const dist = Math.hypot(dx, dy);
  const clamped = Math.min(dist, JOYSTICK_RADIUS);
  const angle = Math.atan2(dy, dx);
  const limitedX = Math.cos(angle) * clamped;
  const limitedY = Math.sin(angle) * clamped;

  knobEl.style.transform = `translate(calc(-50% + ${limitedX}px), calc(-50% + ${limitedY}px))`;

  const intensity = dist > 0 ? clamped / JOYSTICK_RADIUS : 0;
  playerObj.touchX = intensity * Math.cos(angle);
  playerObj.touchY = intensity * Math.sin(angle);
  updatePlayerVelocity();
}

joystickLeft.addEventListener("touchstart", (e) => {
  e.preventDefault();
  const touch = e.changedTouches[0];
  handleJoystickStart(touch, "left", player1, knobLeft, joystickLeft);
}, { passive: false });

joystickRight.addEventListener("touchstart", (e) => {
  e.preventDefault();
  const touch = e.changedTouches[0];
  handleJoystickStart(touch, "right", player2, knobRight, joystickRight);
}, { passive: false });

document.addEventListener("touchmove", (e) => {
  for (const touch of e.changedTouches) {
    handleJoystickMove(touch, "left", player1, knobLeft, joystickLeft);
    handleJoystickMove(touch, "right", player2, knobRight, joystickRight);
  }
}, { passive: false });

document.addEventListener("touchend", (e) => {
  for (const touch of e.changedTouches) {
    handleJoystickEnd(touch, "left", player1, knobLeft);
    handleJoystickEnd(touch, "right", player2, knobRight);
  }
});

document.addEventListener("touchcancel", (e) => {
  for (const touch of e.changedTouches) {
    handleJoystickEnd(touch, "left", player1, knobLeft);
    handleJoystickEnd(touch, "right", player2, knobRight);
  }
});

function updateJoystickVisibility() {
  joystickRight.classList.toggle("hidden", playerMode === 1);
}
