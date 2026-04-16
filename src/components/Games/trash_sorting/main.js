const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");
const resetBtn = document.getElementById("resetBtn");
const factBox = document.getElementById("factBox");
const W = canvas.width, H = canvas.height;

const COLOR_RGB = {
  COMPOST:  "rgb(110,200,120)",
  RECYCLE:  "rgb(80,150,240)",
  LANDFILL: "rgb(160,160,175)",
  SPECIAL:  "rgb(240,120,80)",
};
const CATEGORIES = ["COMPOST", "RECYCLE", "LANDFILL", "SPECIAL"];

const BIN_W = 170, BIN_H = 190;
const ITEM_SIZE = 52;

const bins = [];
const gapX = 22, gapY = 22;
const marginRight = 40;
const gridOriginX = W - marginRight - (2 * BIN_W + gapX);
const gridOriginY = 190;
const layout = [{gx:0,gy:0},{gx:1,gy:0},{gx:0,gy:1},{gx:1,gy:1}];

for (let i = 0; i < 4; i++) {
  const cat = CATEGORIES[i];
  const p = layout[i];
  bins.push({
    category: cat,
    x: gridOriginX + p.gx * (BIN_W + gapX),
    y: gridOriginY + p.gy * (BIN_H + gapY),
    w: BIN_W, h: BIN_H,
  });
}

function showEducationalFeedback(drop) {
  if (!drop) {
    factBox.textContent = "";
    factBox.className = "";
    return;
  }

  if (drop.isCorrect) {
    factBox.className = "fact-correct";
    factBox.textContent = "✔ Correct. " + drop.message;
  } else if (drop.missType === "critical") {
    factBox.className = "fact-critical";
    factBox.textContent = "⚠ Critical mistake. " + drop.message;
  } else {
    factBox.className = "fact-wrong";
    factBox.textContent = "✖ Not quite. " + drop.message;
  }
}

const leftPanel = { x: 30, y: 170, w: 520, h: 430 };

let pyodide = null;
let py = null;      // pyodide.globals
let gameObj = null; // engine.Game instance (Python)
let state = null;

let items = [];     // JS positions: {id,name,category,placed,x,y,homeX,homeY}
let draggingId = null;
let dragOffX = 0, dragOffY = 0;

function toJS(x) {
  return x.toJs({ dict_converter: Object.fromEntries });
}

function nowMs() { return Math.floor(performance.now()); }

function rectContains(r, mx, my) {
  return mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
}
function findBinUnder(mx, my) {
  for (const b of bins) if (rectContains(b, mx, my)) return b;
  return null;
}
function drawRoundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function layoutItemsFromState(pyState) {
  const startX = leftPanel.x + 30;
  const startY = leftPanel.y + 40;
  const spacing = 14;
  const cols = 6;

  items = pyState.items.map((it, idx) => {
    const r = Math.floor(idx / cols);
    const c = idx % cols;
    const x = startX + c * (ITEM_SIZE + spacing) + (Math.random() * 10 - 5);
    const y = startY + r * (ITEM_SIZE + spacing) + (Math.random() * 10 - 5);

    return {
      id: it.id,
      name: it.name,
      category: it.category,
      placed: it.placed,
      x, y,
      homeX: x,
      homeY: y,
    };
  });
}

function syncPlacedFlags(pyState) {
  const placedMap = new Map(pyState.items.map(it => [it.id, it.placed]));
  for (const it of items) it.placed = placedMap.get(it.id) ?? false;
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#111118";
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#eee";
  ctx.font = "700 28px system-ui";
  ctx.fillText("Sorting Game", 30, 48);

ctx.fillStyle = "#bdbdd3";
ctx.font = "16px system-ui";

ctx.fillText("Drag items into matching bins. Faster finish = more points.", 30, 78);
ctx.fillText("+100 correct, -50 wrong, -150 critical.", 30, 98);
ctx.fillText("+10 bonus for each correct streak.", 30, 118);

  if (state) {
    const t = (state.elapsedMs / 1000).toFixed(2);
    const statsY = 150;
    ctx.fillStyle = "#eee";
    ctx.font = "16px system-ui";
    ctx.fillText(`Score: ${state.score}`, 30, statsY);
    ctx.fillText(`Placed: ${state.placedCount}/${state.totalItems}`, 170, statsY);
    ctx.fillText(`Misses: ${state.misses}`, 360, statsY);
    ctx.fillText(`Critical: ${state.criticalMisses}`, 470, statsY);
    ctx.fillText(`Time: ${t}s`, 610, statsY);
  }

  // left panel
  ctx.fillStyle = "#1b1b24";
  drawRoundRect(leftPanel.x, leftPanel.y, leftPanel.w, leftPanel.h, 18);
  ctx.fill();
  ctx.strokeStyle = "#2a2a38";
  ctx.lineWidth = 2;
  ctx.stroke();

  // bins
  for (const b of bins) {
    ctx.fillStyle = COLOR_RGB[b.category];
    drawRoundRect(b.x, b.y, b.w, b.h, 14);
    ctx.fill();

    ctx.strokeStyle = "#eee";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#1b1b24";
    drawRoundRect(b.x + 12, b.y + 42, b.w - 24, b.h - 54, 12);
    ctx.fill();

    ctx.fillStyle = "#eee";
    ctx.font = "700 18px system-ui";
    ctx.fillText(b.category, b.x + 14, b.y + 26);
  }

  // items (draw dragging last)
  const ordered = [...items].sort((a, b) => (a.id === draggingId ? 1 : 0) - (b.id === draggingId ? 1 : 0));
  for (const it of ordered) {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    drawRoundRect(it.x + 4, it.y + 4, ITEM_SIZE, ITEM_SIZE, 12);
    ctx.fill();

    ctx.fillStyle = COLOR_RGB[it.category];
    drawRoundRect(it.x, it.y, ITEM_SIZE, ITEM_SIZE, 12);
    ctx.fill();

    ctx.strokeStyle = "#eee";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#fff";
    ctx.font = "700 16px system-ui";
    ctx.fillText(it.category[0], it.x + ITEM_SIZE / 2 - 5, it.y + ITEM_SIZE / 2 + 6);

    if (it.placed) {
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.fillRect(it.x, it.y, ITEM_SIZE, ITEM_SIZE);
    }
  }

  if (state?.finished) {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, W, H);

    const boxW = 560, boxH = 240;
    const bx = (W - boxW) / 2, by = (H - boxH) / 2;

    ctx.fillStyle = "#1b1b24";
    drawRoundRect(bx, by, boxW, boxH, 18);
    ctx.fill();
    ctx.strokeStyle = "#eee";
    ctx.lineWidth = 2;
    ctx.stroke();

    const t = (state.elapsedMs / 1000).toFixed(2);
    ctx.fillStyle = "#eee";
    ctx.font = "700 28px system-ui";
    ctx.fillText("You finished!", bx + 190, by + 50);

    ctx.font = "18px system-ui";
    ctx.fillText(`Time: ${t}s`, bx + 210, by + 95);
    ctx.fillText(`Final score: ${state.score}`, bx + 200, by + 130);

    ctx.fillStyle = "#bdbdd3";
    ctx.font = "16px system-ui";
    ctx.fillText(`Press Reset to play again.`, bx + 190, by + 180);
  }
}

function getMousePos(evt) {
  const r = canvas.getBoundingClientRect();
  const mx = (evt.clientX - r.left) * (canvas.width / r.width);
  const my = (evt.clientY - r.top) * (canvas.height / r.height);
  return { mx, my };
}

canvas.addEventListener("mousedown", (evt) => {
  if (!state || state.finished) return;
  const { mx, my } = getMousePos(evt);

  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    if (it.placed) continue;
    if (mx >= it.x && mx <= it.x + ITEM_SIZE && my >= it.y && my <= it.y + ITEM_SIZE) {
      draggingId = it.id;
      dragOffX = it.x - mx;
      dragOffY = it.y - my;
      items.splice(i, 1);
      items.push(it);
      break;
    }
  }
});

canvas.addEventListener("mousemove", (evt) => {
  if (draggingId === null) return;
  const { mx, my } = getMousePos(evt);
  const it = items.find(x => x.id === draggingId);
  if (!it) return;
  it.x = mx + dragOffX;
  it.y = my + dragOffY;
});

canvas.addEventListener("mouseup", () => {
  if (draggingId === null || !state || state.finished) return;

  const it = items.find(x => x.id === draggingId);
  if (!it) { draggingId = null; return; }

  const centerX = it.x + ITEM_SIZE / 2;
  const centerY = it.y + ITEM_SIZE / 2;
  const b = findBinUnder(centerX, centerY);
  const binCategory = b ? b.category : "NONE";

  state = toJS(gameObj.dropItem(it.id, binCategory, nowMs()));
  syncPlacedFlags(state);
  showEducationalFeedback(state.lastDrop);

  const placedNow = state.items.find(x => x.id === it.id)?.placed;
  if (placedNow && b) {
    const inner = { x: b.x + 30, y: b.y + 60, w: b.w - 60, h: b.h - 90 };
    it.x = Math.max(inner.x, Math.min(inner.x + inner.w - ITEM_SIZE, it.x));
    it.y = Math.max(inner.y, Math.min(inner.y + inner.h - ITEM_SIZE, it.y));
  } else {
    it.x = it.homeX; it.y = it.homeY;
  }

  draggingId = null;
});

async function resetGame() {
  const newGame = py.get("newGame");
  gameObj = newGame(null);
  state = toJS(gameObj.asDict(nowMs()));
  layoutItemsFromState(state);

  // clear feedback on reset
  showEducationalFeedback(null);
}

function tick() {
  if (state && state.started && !state.finished) {
    state = toJS(gameObj.asDict(nowMs()));
    syncPlacedFlags(state);
  }
  draw();
  requestAnimationFrame(tick);
}

async function boot() {
  statusEl.textContent = "Loading Pyodide...";
  pyodide = await loadPyodide({
    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/"
  });

  const code = await (await fetch("./sortGame.py")).text();
  pyodide.runPython(code);

  py = pyodide.globals;

  const newGame = py.get("newGame");
  gameObj = newGame(null);

  state = toJS(gameObj.asDict(nowMs()));
  layoutItemsFromState(state);

  resetBtn.disabled = false;
  statusEl.textContent = "Ready.";
  requestAnimationFrame(tick);
}

resetBtn.addEventListener("click", resetGame);
boot().catch((e) => {
  console.error("BOOT ERROR:", e);
  statusEl.textContent = "Failed to load: " + (e?.message ?? String(e));
});