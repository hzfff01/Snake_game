/**
 * =====================================================
 *  Snake Game — game.js
 *  Algorithm + Logic fully commented in Hindi/English
 * =====================================================
 *
 *  ALGORITHM OVERVIEW:
 *  -------------------
 *  1. Snake ek Array of {x,y} objects hai.
 *     Index 0 = HEAD, last index = TAIL.
 *
 *  2. Har game tick par:
 *     a) Current direction se naya HEAD calculate karo
 *     b) Collision check karo (wall + self)
 *     c) HEAD ko array ke aage push karo (unshift)
 *     d) Agar food khaya → tail mat hatao (saanp bada hota hai)
 *        Agar nahi khaya → tail hatao (pop) — length same rehti
 *
 *  3. Food placement: Random position lo, agar snake par
 *     pad rahi ho to dobara try karo (Rejection Sampling).
 *
 *  4. Speed (difficulty): Level badhne par interval kam hota hai.
 *     speed_ms = max(80, 200 - (level - 1) * 20)
 * =====================================================
 */

// ─── Canvas & Grid Setup ─────────────────────────────
const canvas = document.getElementById('canvas');
const ctx    = canvas.getContext('2d');

const COLS = 20;          // grid columns
const ROWS = 20;          // grid rows
const CELL = canvas.width / COLS;   // each cell size in pixels (400/20 = 20px)

// ─── Game State Variables ────────────────────────────
let snake;      // Array of {x, y} — snake body segments
let dir;        // Current moving direction {x, y}
let nextDir;    // Queued next direction (prevents 180° reversal mid-tick)
let food;       // Food position {x, y}
let score;      // Current score
let best;       // All-time best score (session)
let level;      // Current level (based on score)
let gameLoop;   // setInterval reference
let paused;     // boolean — game paused?
let started;    // boolean — game started?
let dead;       // boolean — game over?

// ─── DOM References ──────────────────────────────────
const scoreEl   = document.getElementById('score');
const bestEl    = document.getElementById('best');
const levelEl   = document.getElementById('level');
const btnStart  = document.getElementById('btn-start');
const btnPause  = document.getElementById('btn-pause');
const btnRestart= document.getElementById('btn-restart');

// ─── Colors (theme-aware) ────────────────────────────
function getColors() {
  const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return {
    bg:         dark ? '#1a1a18' : '#f7f6f2',
    grid:       dark ? '#2a2a28' : '#edebe4',
    snakeHead:  '#1D9E75',
    snakeBodyA: '#5DCAA5',
    snakeBodyB: '#0F6E56',
    food:       '#D85A30',
    overlay:    'rgba(0,0,0,0.55)',
    textLight:  '#ffffff',
    textAccent: '#9FE1CB',
    textDanger: '#F0997B',
  };
}

// ─── INIT ─────────────────────────────────────────────
/**
 * Game ko initial state par reset karta hai.
 * Pehli baar aur restart dono par call hota hai.
 */
function init() {
  // Snake 3 cells lambi, center ke paas start hoti hai, right direction me
  snake   = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
  dir     = { x: 1, y: 0 };   // right
  nextDir = { x: 1, y: 0 };

  score   = 0;
  level   = 1;
  paused  = false;
  dead    = false;
  started = false;

  best = best || 0;   // best pehle se saved rahta hai session me

  placeFood();
  updateScoreUI();
  draw();
}

// ─── FOOD PLACEMENT ───────────────────────────────────
/**
 * Rejection Sampling Algorithm:
 * Random position generate karo. Agar woh position snake ke
 * kisi bhi segment par padti ho, to dobara try karo.
 * Tab tak repeat karo jab tak empty cell na mile.
 */
function placeFood() {
  let pos;
  do {
    pos = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS),
    };
  } while (snake.some(seg => seg.x === pos.x && seg.y === pos.y));
  food = pos;
}

// ─── GAME TICK (Core Algorithm) ───────────────────────
/**
 * Yeh function har interval tick par call hota hai.
 *
 * Steps:
 * 1. Guard clauses — agar game ruka hua hai ya khatam ho gayi toh kuch mat karo
 * 2. Direction update (queued nextDir se)
 * 3. Naya HEAD calculate karo
 * 4. Wall collision check
 * 5. Self collision check
 * 6. Snake array update (unshift + conditional pop)
 * 7. Food check → score, level, speed update
 * 8. Canvas redraw
 */
function step() {
  if (paused || dead || !started) return;

  // Step 2: direction apply karo
  dir = { ...nextDir };

  // Step 3: naya head position
  const head = {
    x: snake[0].x + dir.x,
    y: snake[0].y + dir.y,
  };

  // Step 4: Wall collision
  if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
    endGame();
    return;
  }

  // Step 5: Self collision — kya head apne body se takra raha hai?
  if (snake.some(seg => seg.x === head.x && seg.y === head.y)) {
    endGame();
    return;
  }

  // Step 6: Head ko front me add karo
  snake.unshift(head);

  // Step 7: Food check
  if (head.x === food.x && head.y === food.y) {
    // Food khaya! Tail nahi hatao → snake badi hoti hai
    score++;
    level = Math.floor(score / 5) + 1;
    updateScoreUI();
    placeFood();

    // Speed increase: naya interval set karo
    clearInterval(gameLoop);
    gameLoop = setInterval(step, getSpeed());
  } else {
    // Food nahi khaya → tail hatao → length same rehti
    snake.pop();
  }

  // Step 8: Redraw
  draw();
}

// ─── SPEED CALCULATION ────────────────────────────────
/**
 * Level ke basis par interval milliseconds return karta hai.
 * Minimum 80ms (max speed) tak jata hai.
 * Formula: speed = max(80, 200 - (level - 1) * 20)
 */
function getSpeed() {
  return Math.max(80, 200 - (level - 1) * 20);
}

// ─── GAME END ─────────────────────────────────────────
function endGame() {
  dead = true;
  clearInterval(gameLoop);
  if (score > best) {
    best = score;
    bestEl.textContent = best;
  }
  drawGameOver();
}

// ─── START / PAUSE / RESTART ──────────────────────────
function startGame() {
  if (dead) init();
  started = true;
  paused  = false;
  clearInterval(gameLoop);
  gameLoop = setInterval(step, getSpeed());
  draw();
}

function togglePause() {
  if (!started || dead) return;
  paused = !paused;
  if (paused) {
    clearInterval(gameLoop);
    drawPauseOverlay();
  } else {
    gameLoop = setInterval(step, getSpeed());
  }
}

function restartGame() {
  clearInterval(gameLoop);
  init();
}

// ─── DIRECTION CHANGE ─────────────────────────────────
/**
 * 180-degree reversal prevent karta hai:
 * Agar snake right ja rahi hai to left direction ignore hogi.
 * nextDir queue use karta hai taaki mid-tick change safe rahe.
 */
function changeDir(dx, dy) {
  // Opposite direction block karo
  if (dir.x === -dx && dir.y === -dy) return;
  nextDir = { x: dx, y: dy };
}

// ─── UI UPDATE ────────────────────────────────────────
function updateScoreUI() {
  scoreEl.textContent = score;
  levelEl.textContent = level;
  if (score > best) {
    best = score;
    bestEl.textContent = best;
  }
}

// ─── DRAWING ──────────────────────────────────────────

/** Har frame me poora canvas redraw karta hai */
function draw() {
  const c = getColors();

  // Background
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Grid dots
  drawGrid(c);

  // Food
  drawFood(c);

  // Snake
  drawSnake(c);

  // Overlay agar game shuru nahi hua
  if (!started && !dead) {
    drawOverlay('Snake Game 🐍', 'Start dabao ya Space press karo', c.textAccent, c);
  }
}

/** Subtle background grid dots */
function drawGrid(c) {
  ctx.fillStyle = c.grid;
  for (let r = 0; r < ROWS; r++) {
    for (let col = 0; col < COLS; col++) {
      ctx.fillRect(col * CELL + CELL / 2 - 1, r * CELL + CELL / 2 - 1, 2, 2);
    }
  }
}

/** Food (apple shape) draw karta hai */
function drawFood(c) {
  const cx = food.x * CELL + CELL / 2;
  const cy = food.y * CELL + CELL / 2;
  const r  = CELL * 0.36;

  // Apple body (circle)
  ctx.fillStyle = c.food;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Apple stem
  ctx.strokeStyle = c.snakeBodyB;
  ctx.lineWidth   = 1.5;
  ctx.lineCap     = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + 3, cy - r - 5);
  ctx.stroke();

  // Apple leaf (tiny arc)
  ctx.strokeStyle = c.snakeHead;
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.arc(cx + 4, cy - r - 3, 3, Math.PI, 0);
  ctx.stroke();
}

/** Snake draw karta hai — head alag, body alternating color */
function drawSnake(c) {
  snake.forEach((seg, i) => {
    const pad = i === 0 ? 1 : 2;
    const r   = i === 0 ? 6 : 4;

    if (i === 0) {
      ctx.fillStyle = c.snakeHead;
    } else if (i % 2 === 0) {
      ctx.fillStyle = c.snakeBodyA;
    } else {
      ctx.fillStyle = c.snakeBodyB;
    }

    drawRoundRect(seg.x * CELL + pad, seg.y * CELL + pad, CELL - pad * 2, CELL - pad * 2, r);
    ctx.fill();

    // Head par aankhein draw karo
    if (i === 0) drawEyes(seg, c);
  });
}

/** Snake ki aankhein — direction ke hisaab se position hoti hain */
function drawEyes(head, c) {
  const cx = head.x * CELL + CELL / 2;
  const cy = head.y * CELL + CELL / 2;

  // Eye offset calculation based on direction
  let e1, e2;
  if (dir.x !== 0) {
    // Horizontal movement: aankhein upar-neeche
    e1 = { x: cx + dir.x * 3, y: cy - 3 };
    e2 = { x: cx + dir.x * 3, y: cy + 3 };
  } else {
    // Vertical movement: aankhein left-right
    e1 = { x: cx - 3, y: cy + dir.y * 3 };
    e2 = { x: cx + 3, y: cy + dir.y * 3 };
  }

  // White part
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(e1.x, e1.y, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(e2.x, e2.y, 2.5, 0, Math.PI * 2); ctx.fill();

  // Pupil (direction ki taraf shift hota hai)
  ctx.fillStyle = '#2c2c2a';
  ctx.beginPath(); ctx.arc(e1.x + dir.x * 0.8, e1.y + dir.y * 0.8, 1.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(e2.x + dir.x * 0.8, e2.y + dir.y * 0.8, 1.2, 0, Math.PI * 2); ctx.fill();
}

/** Rounded rectangle path helper */
function drawRoundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/** Semi-transparent overlay with title + subtitle */
function drawOverlay(title, subtitle, titleColor, c) {
  ctx.fillStyle = c.overlay;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = titleColor;
  ctx.font      = '500 22px -apple-system, sans-serif';
  ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 16);

  ctx.fillStyle = c.textLight;
  ctx.font      = '400 13px -apple-system, sans-serif';
  ctx.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 14);
}

function drawGameOver() {
  draw();   // pehle current state draw karo
  const c = getColors();
  drawOverlay(`Game Over! Score: ${score}`, 'Restart karo ya Space dabao', c.textDanger, c);
}

function drawPauseOverlay() {
  draw();
  const c = getColors();
  drawOverlay('⏸ Paused', 'Continue karne ke liye Space dabao', c.textAccent, c);
}

// ─── EVENT LISTENERS ──────────────────────────────────

// Buttons
btnStart.addEventListener('click', startGame);
btnPause.addEventListener('click', togglePause);
btnRestart.addEventListener('click', restartGame);

// D-Pad
document.getElementById('up').addEventListener('click',    () => { ensureStarted(); changeDir(0, -1); });
document.getElementById('down').addEventListener('click',  () => { ensureStarted(); changeDir(0,  1); });
document.getElementById('left').addEventListener('click',  () => { ensureStarted(); changeDir(-1, 0); });
document.getElementById('right').addEventListener('click', () => { ensureStarted(); changeDir( 1, 0); });

function ensureStarted() {
  if (!started || dead) startGame();
}

// Keyboard Controls
document.addEventListener('keydown', e => {
  // Prevent page scroll on arrow keys & space
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) {
    e.preventDefault();
  }

  switch (e.key) {
    case ' ':
      if (!started || dead) startGame();
      else togglePause();
      break;
    case 'ArrowUp':
      ensureStarted(); changeDir(0, -1); break;
    case 'ArrowDown':
      ensureStarted(); changeDir(0,  1); break;
    case 'ArrowLeft':
      ensureStarted(); changeDir(-1, 0); break;
    case 'ArrowRight':
      ensureStarted(); changeDir( 1, 0); break;
    case 'r':
    case 'R':
      restartGame(); break;
  }
});

// Touch / Swipe Controls (mobile)
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}, { passive: true });

canvas.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;

  // Minimum swipe distance check (10px)
  if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;

  ensureStarted();

  // Dominant axis determine karo
  if (Math.abs(dx) > Math.abs(dy)) {
    changeDir(dx > 0 ? 1 : -1, 0);  // Horizontal swipe
  } else {
    changeDir(0, dy > 0 ? 1 : -1);  // Vertical swipe
  }
}, { passive: true });

// ─── START ────────────────────────────────────────────
init();