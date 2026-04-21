import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Settings from "../../Settings";
import { saveLevelResult } from "../../../utils/levelProgress";
import { supabase } from "../../../supabase";

import bgImg from "../../../assets/sprites/stacking_background.png";
import riceImg from "../../../assets/sprites/stacking_rice.png";
import middleImg from "../../../assets/sprites/stacking_middle.png";
import roeImg from "../../../assets/sprites/stacking_roe.png";
import completedSushiImg from "../../../assets/sprites/sushi_salmon.png";
import settingsCogImg from "../../../assets/settings_cog.png";
import livesImg from "../../../assets/sprites/river-game-sprites/lives.png";
import blankHoneyImg from "../../../assets/sprites/fish-prep/blankhoney.png";
import filledHoneyImg from "../../../assets/sprites/fish-prep/honey2.png";

const CURRENT_LEVEL_ID = 3;

const CONFIG = {
  WIDTH: 21,
  HEIGHT: 15,
  CELL_PX: 52,
  BASE_WIDTH: 3,
  base_clear_points: 100,
  max_multiplier: 5.0,
  multiplier_increment: 0.1,
  initial_drop_interval: 0.45,
  min_drop_interval: 0.1,
  speed_bump_per_clears: 5,
  speed_increase_percent: 10,
  max_blocks_without_color: 4,
  max_consecutive_same: 2,
  left_tally_width_px: 0,
  soft_drop_multiplier: 12,
  tray_smooth_speed: 22,
  min_spawn_gap: 0.55,
  max_spawn_gap_extra: 0.85,
  sprite_scale: 1.6,
  stack_row_pitch: 0.56,
  spawn_avoid_tray_columns: true,
  rice_sprite_scale: 1.6,
  middle_sprite_scale: 1.6,
  roe_sprite_scale: 3.8,
  roe_crop_bottom_fraction: 0.26,
  fall_speed_osc_amp: 0.085,
  fall_speed_osc_hz: 0.32,
  fall_speed_global_clamp_min: 0.93,
  fall_speed_global_clamp_max: 1.07,
  piece_fall_mul_min: 0.84,
  piece_fall_mul_max: 1.08,
};

const PIECE_KEYS = ["Rice", "Middle", "Roe"];
const SLOT_BY_KEY = { Rice: 0, Middle: 1, Roe: 2 };
const SPRITES = {
  Rice: riceImg,
  Middle: middleImg,
  Roe: roeImg,
  CompletedSushi: completedSushiImg,
};

function pieceScaleMul(spriteKey) {
  if (spriteKey === "Rice") return CONFIG.rice_sprite_scale;
  if (spriteKey === "Middle") return CONFIG.middle_sprite_scale;
  if (spriteKey === "Roe") return CONFIG.roe_sprite_scale;
  return 1;
}

function drawPieceSprite(ctx, img, px, py, sz, spriteKey) {
  if (!img?.naturalWidth) return;
  if (spriteKey === "Roe" && CONFIG.roe_crop_bottom_fraction > 0 && img.naturalHeight) {
    const crop = Math.min(0.45, CONFIG.roe_crop_bottom_fraction);
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const sh = nh * (1 - crop);
    if (sh > 1) {
      const aspect = nw / sh;
      const drawW = sz * aspect;
      const drawH = sz;
      ctx.drawImage(img, 0, 0, nw, sh, px + (sz - drawW) / 2, py, drawW, drawH);
      return;
    }
  }
  const aspect = img.naturalWidth / img.naturalHeight;
  const drawW = aspect >= 1 ? sz : sz * aspect;
  const drawH = aspect >= 1 ? sz / aspect : sz;
  ctx.drawImage(img, px + (sz - drawW) / 2, py + (sz - drawH) / 2, drawW, drawH);
}

let nextPieceId = 1;

function randomInt(maxExclusive) {
  return Math.floor(Math.random() * maxExclusive);
}

function randomSpawnGap() {
  return CONFIG.min_spawn_gap + Math.random() * CONFIG.max_spawn_gap_extra;
}

class GameState {
  constructor() {
    this.reset();
  }

  reset() {
    const W = CONFIG.WIDTH;
    this.stack_slots = [[], [], []];
    this.spawn_color_history = [];
    this.spawn_sprite_history = [];
    this.base_x = Math.floor((W - CONFIG.BASE_WIDTH) / 2);
    this.base_x_smooth = this.base_x;
    this.score = 0;
    this.multiplier = 0;
    this.total_locks = 0;
    this.total_clears = 0;
    this.completed_sushi = 0;
    this.drop_interval = CONFIG.initial_drop_interval;
    this.game_over = false;
    this.falling = [];
    this.spawn_timer = 0;
    this.spawnCap = 1;
    this.elapsed = 0;
    this.last_lock_wrong = false;
    nextPieceId = 1;
    this._try_spawn_initial();
  }

  _try_spawn_initial() {
    const p = this._spawn_piece();
    if (p) {
      this.falling.push(p);
      this.spawn_timer = randomSpawnGap();
    } else {
      this.game_over = true;
    }
  }

  _maxYForPiece(piece) {
    const H = CONFIG.HEIGHT;
    const cols = this._base_columns();
    const x = piece.x;
    const pitch = CONFIG.stack_row_pitch;
    if (!cols.includes(x)) return H - 1;
    const col_idx = x - this.base_x;
    const len = this.stack_slots[col_idx].length;
    return H - 2 - len * pitch;
  }

  _cellsPerSecond() {
    return 1 / this.drop_interval;
  }

  _fiveWindowAllowedCategories() {
    const last4 = this.spawn_color_history.slice(-4);
    let allowed = [...PIECE_KEYS];
    if (last4.length === 4) {
      const have = new Set(last4);
      if (have.size === 1) {
        const only = [...have][0];
        allowed = allowed.filter((c) => c !== only);
      } else if (have.size === 2) {
        allowed = allowed.filter((c) => !have.has(c));
      }
    }
    return allowed;
  }

  _applyStreakSpriteConstraint(allowedCategories) {
    const lt = this.spawn_sprite_history.slice(-2);
    if (lt.length < 2 || lt[0] !== lt[1]) return allowedCategories;
    const dup = lt[1];
    let next = allowedCategories.filter((c) => c !== dup);
    return next.length ? next : allowedCategories;
  }

  _pickCategoryAndSprite() {
    const windowSize = CONFIG.max_blocks_without_color;
    const maxStreak = CONFIG.max_consecutive_same;
    const recent = windowSize ? this.spawn_color_history.slice(-windowSize) : [];
    const lastN = maxStreak ? this.spawn_color_history.slice(-maxStreak) : [];
    const varietyMissing = new Set(PIECE_KEYS);
    recent.forEach((c) => { if (PIECE_KEYS.includes(c)) varietyMissing.delete(c); });
    let streakColor = null;
    if (lastN.length === maxStreak && new Set(lastN).size === 1) streakColor = lastN[0];

    let allowed = this._fiveWindowAllowedCategories();
    allowed = this._applyStreakSpriteConstraint(allowed);

    const pickFromPool = (pool) => {
      let pl = pool.filter((c) => c !== streakColor);
      if (pl.length === 0) pl = [...pool];
      const forced = pl.filter((c) => varietyMissing.has(c));
      const use = forced.length ? forced : pl;
      return use[randomInt(use.length)];
    };

    if (allowed.length === 0) allowed = this._fiveWindowAllowedCategories();
    let category = pickFromPool(allowed);

    const lt = this.spawn_sprite_history.slice(-2);
    if (lt.length === 2 && lt[0] === lt[1] && lt[1] === category) {
      const pool = PIECE_KEYS.filter((c) => c !== category);
      category = pool[randomInt(pool.length)];
    }

    return { category, sprite_key: category };
  }

  _randomPieceFallMul() {
    const lo = CONFIG.piece_fall_mul_min;
    const hi = CONFIG.piece_fall_mul_max;
    return lo + Math.random() * (hi - lo);
  }

  _globalFallSpeedMul() {
    const t = this.elapsed;
    const w = CONFIG.fall_speed_osc_amp * Math.sin(t * CONFIG.fall_speed_osc_hz * Math.PI * 2);
    const m = 1 + w;
    return Math.max(CONFIG.fall_speed_global_clamp_min, Math.min(CONFIG.fall_speed_global_clamp_max, m));
  }

  _spawn_piece() {
    const H = CONFIG.HEIGHT;
    if (this.stack_slots.some((slot) => slot.length >= H - 1)) return null;
    const { category, sprite_key } = this._pickCategoryAndSprite();
    const slot = SLOT_BY_KEY[sprite_key];
    this.spawn_color_history.push(category);
    this.spawn_sprite_history.push(sprite_key);
    return {
      id: nextPieceId++,
      slot,
      x: this._spawnColumnForSprite(sprite_key),
      y: 0,
      sprite_key,
      fallMul: this._randomPieceFallMul(),
    };
  }

  move_base(dx) {
    const W = CONFIG.WIDTH;
    const bw = CONFIG.BASE_WIDTH;
    this.base_x = Math.max(0, Math.min(W - bw, this.base_x + dx));
  }

  _base_columns() {
    return Array.from({ length: CONFIG.BASE_WIDTH }, (_, i) => this.base_x + i);
  }

  _columnAllowedForSprite(spriteKey, x) {
    const W = CONFIG.WIDTH;
    if (x === 0) return spriteKey === "Rice";
    if (x === 1) return spriteKey !== "Roe";
    if (x === W - 1) return spriteKey === "Roe";
    if (x === W - 2) return spriteKey !== "Rice";
    return true;
  }

  _spawnColumnForSprite(sprite_key) {
    const W = CONFIG.WIDTH;
    const trayCols = this._base_columns();
    const pool = [];
    for (let c = 0; c < W; c += 1) {
      if (!this._columnAllowedForSprite(sprite_key, c)) continue;
      if (CONFIG.spawn_avoid_tray_columns && trayCols.includes(c)) continue;
      pool.push(c);
    }
    if (pool.length > 0) return pool[randomInt(pool.length)];
    const fallback = [];
    for (let c = 0; c < W; c += 1) {
      if (!this._columnAllowedForSprite(sprite_key, c)) continue;
      fallback.push(c);
    }
    if (fallback.length > 0) return fallback[randomInt(fallback.length)];
    return randomInt(W);
  }

  update(dt, soft_drop) {
    if (this.game_over) return;
    this.last_lock_wrong = false;
    this.elapsed += dt;
    const trayK = Math.min(1, CONFIG.tray_smooth_speed * dt);
    this.base_x_smooth += (this.base_x - this.base_x_smooth) * trayK;
    this.spawn_timer -= dt;
    let spawnedThisFrame = false;
    if (this.spawn_timer <= 0 && this.falling.length < this.spawnCap) {
      const p = this._spawn_piece();
      if (p) {
        this.falling.push(p);
        this.spawn_timer = randomSpawnGap();
        spawnedThisFrame = true;
      }
    }

    const globalMul = this._globalFallSpeedMul();
    const baseSpeed = this._cellsPerSecond() * dt * globalMul;
    const sortedByDepth = [...this.falling].sort((a, b) => b.y - a.y || a.id - b.id);
    const bottomPieceId = sortedByDepth[0]?.id ?? null;
    const sorted = [...this.falling].sort((a, b) => b.y - a.y);
    const toLock = [];

    for (const piece of sorted) {
      const pm = piece.fallMul ?? 1;
      const softMul = soft_drop && bottomPieceId !== null && piece.id === bottomPieceId
        ? CONFIG.soft_drop_multiplier : 1;
      const dy = baseSpeed * pm * softMul;
      let nextY = piece.y + dy;
      const maxY = this._maxYForPiece(piece);
      let hitLimit = false;
      if (nextY > maxY) { nextY = maxY; hitLimit = true; }
      for (const other of this.falling) {
        if (other.id === piece.id || other.x !== piece.x) continue;
        if (other.y <= piece.y) continue;
        const cap = other.y - 1;
        if (nextY > cap) { nextY = cap; hitLimit = true; }
      }
      piece.y = nextY;
      if (hitLimit) toLock.push(piece);
    }

    toLock.sort((a, b) => b.y - a.y);
    const seen = new Set();
    for (const piece of toLock) {
      if (seen.has(piece.id)) continue;
      seen.add(piece.id);
      this._lock_piece(piece);
    }

    if (!this.game_over && this.falling.length === 0 && !spawnedThisFrame) {
      this.spawnCap = 1;
      const p = this._spawn_piece();
      if (p) {
        this.falling.push(p);
        this.spawn_timer = randomSpawnGap();
      } else {
        this.game_over = true;
      }
    }
  }

  _lock_piece(piece) {
    const cols = this._base_columns();
    const idx = this.falling.findIndex((p) => p.id === piece.id);
    if (idx === -1) return;
    this.falling.splice(idx, 1);
    const { sprite_key: color } = piece;
    const col = piece.x;
    const in_tray = cols.includes(col);
    const col_idx = in_tray ? col - this.base_x : -1;
    if (!in_tray) {
      this.multiplier = 0;
    } else {
      this.stack_slots[col_idx].push(color);
      if (col_idx !== piece.slot) {
        this.multiplier = 0;
        this.last_lock_wrong = true;
      } else {
        this.multiplier = Math.min(CONFIG.max_multiplier, this.multiplier + CONFIG.multiplier_increment);
      }
    }
    this.total_locks += 1;
    this.spawn_timer = Math.max(this.spawn_timer, randomSpawnGap());
    this._check_and_clear();
  }

  _check_and_clear() {
    const base_pts = CONFIG.base_clear_points;
    const n = CONFIG.speed_bump_per_clears;
    const pct = CONFIG.speed_increase_percent / 100;
    let cleared_any = true;
    while (cleared_any) {
      cleared_any = false;
      const min_len = Math.min(...this.stack_slots.map((s) => s.length));
      if (min_len <= 0) break;
      for (let i = min_len - 1; i >= 0; i -= 1) {
        const row = [this.stack_slots[0][i], this.stack_slots[1][i], this.stack_slots[2][i]];
        if (row[0] === "Rice" && row[1] === "Middle" && row[2] === "Roe") {
          this.stack_slots.forEach((slot) => { slot.splice(i, 1); });
          this.score += Math.floor(base_pts * (1 + this.multiplier));
          this.total_clears += 1;
          this.completed_sushi += 1;
          if (this.total_clears % n === 0) {
            this.drop_interval = Math.max(CONFIG.min_drop_interval, this.drop_interval / (1 + pct));
          }
          cleared_any = true;
          break;
        }
      }
    }
  }
}

// Stars based on completed sushi count
function calcStars(completedSushi) {
  if (completedSushi >= 10) return 3;
  if (completedSushi >= 5) return 2;
  if (completedSushi >= 3) return 1;
  return 0;
}

const HUD_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;700;800&display=swap');

  #sg-hud {
    position: fixed; top: 14px; left: 50%; transform: translateX(-50%); z-index: 20;
    display: flex; align-items: center; justify-content: center;
    gap: 10px; pointer-events: none;
  }
  .sg-hud-block {
    display: flex; flex-direction: column; align-items: center; min-width: 58px;
    background: rgba(255,255,255,0.22);
    backdrop-filter: blur(14px) saturate(1.6);
    -webkit-backdrop-filter: blur(14px) saturate(1.6);
    border: 1px solid rgba(255,255,255,0.45); border-radius: 18px;
    padding: 5px 18px 6px;
    box-shadow: 0 4px 18px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.5);
  }
  .sg-hud-label {
    font-size: 0.5rem; letter-spacing: 1.5px; text-transform: uppercase;
    color: rgba(255,255,255,0.75); font-weight: 800;
    text-shadow: 0 1px 3px rgba(0,0,0,0.35); white-space: nowrap;
    font-family: 'Nunito', sans-serif;
  }
  .sg-hud-val {
    font-family: 'Fredoka One', cursive; font-size: 1.4rem; line-height: 1.1;
    color: #fff; transition: color 0.3s; text-shadow: 0 2px 6px rgba(0,0,0,0.3);
  }
  .sg-hud-val.warn { color: #ffcc55; }
  .sg-hud-val.good { color: #5effa0; }
  .sg-hud-val.danger { color: #ff6b6b; }

  @keyframes honeyPop {
    0%   { transform: scale(1); }
    40%  { transform: scale(1.45) rotate(-8deg); }
    65%  { transform: scale(0.9) rotate(4deg); }
    85%  { transform: scale(1.12); }
    100% { transform: scale(1); }
  }
  .honey img { width: 64px; height: 64px; }
  .honey.pop { animation: honeyPop 0.6s cubic-bezier(0.34,1.56,0.6,1) forwards; }
`;

export default function StackingGame() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const gameRef = useRef(new GameState());
  const keysRef = useRef({ left: false, right: false, down: false });
  const leftHoldRef = useRef(0);
  const rightHoldRef = useRef(0);
  const leftInitialRef = useRef(false);
  const rightInitialRef = useRef(false);
  const imagesRef = useRef({});
  const rafRef = useRef(0);
  const lastTsRef = useRef(0);
  const endedRef = useRef(false);

  const [hud, setHud] = useState({ score: 0, mult: 0, speed: 1.5, clears: 0, gameOver: false });
  const [assetsReady, setAssetsReady] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [finalStars, setFinalStars] = useState(0);
  const [honeyEarned, setHoneyEarned] = useState([false, false, false]);
  const [honeyPop, setHoneyPop] = useState([false, false, false]);
  const [endReason, setEndReason] = useState("time"); // "time" | "lives"
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(10);

  const W = CONFIG.WIDTH;
  const H = CONFIG.HEIGHT;
  const CELL = CONFIG.CELL_PX;
  const LEFT_PANEL_W = CONFIG.left_tally_width_px;
  const PLAYFIELD_W = W * CELL;
  const FULL_W = PLAYFIELD_W;
  const CANVAS_H = H * CELL;
  const sc = CONFIG.sprite_scale;

  const loadImages = useCallback(() => {
    const entries = Object.entries(SPRITES);
    return Promise.all(
      entries.map(([key, src]) =>
        new Promise((resolve) => {
          const im = new Image();
          im.onload = () => resolve([key, im]);
          im.onerror = () => resolve([key, null]);
          im.src = src;
        })
      )
    ).then((pairs) => {
      const map = {};
      pairs.forEach(([k, v]) => { map[k] = v; });
      map.__bg = new Image();
      return new Promise((resolve) => {
        map.__bg.onload = () => { imagesRef.current = map; resolve(); };
        map.__bg.onerror = () => { imagesRef.current = map; resolve(); };
        map.__bg.src = bgImg;
      });
    });
  }, []);

  const drawPlayfieldOverlay = useCallback((ctx, offX) => {
    const pad = 6;
    ctx.save();
    ctx.fillStyle = "rgba(8, 14, 22, 0.28)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
    ctx.lineWidth = 3;
    const r = 14;
    const x0 = offX + pad;
    const y0 = pad;
    const rw = FULL_W - pad * 2;
    const rh = CANVAS_H - pad * 2;
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(x0, y0, rw, rh, r);
    } else {
      ctx.rect(x0, y0, rw, rh);
    }
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255, 248, 220, 0.06)";
    ctx.fillRect(x0, (H - 1) * CELL, rw, CELL);
    ctx.restore();
  }, [CANVAS_H, FULL_W, H, CELL]);

  const drawStackedSprite = useCallback((ctx, img, offX, gridCol, row_idx, spriteKey) => {
    if (!img) return;
    const mul = pieceScaleMul(spriteKey);
    const sz = CELL * sc * mul;
    const px = offX + gridCol * CELL + (CELL - sz) / 2;
    const pitch = CONFIG.stack_row_pitch;
    const gridRowVisual = (H - 2) - row_idx * pitch;
    const py = gridRowVisual * CELL + (CELL - sz) / 2;
    drawPieceSprite(ctx, img, px, py, sz, spriteKey);
  }, [CELL, sc, H]);

  const drawFallingSprite = useCallback((ctx, img, offX, gridColFloat, gridRowFloat, spriteKey) => {
    if (!img) return;
    const mul = pieceScaleMul(spriteKey);
    const sz = CELL * sc * mul;
    const px = offX + gridColFloat * CELL + (CELL - sz) / 2;
    const py = gridRowFloat * CELL + (CELL - sz) / 2;
    drawPieceSprite(ctx, img, px, py, sz, spriteKey);
  }, [CELL, sc]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const g = gameRef.current;
    const imgs = imagesRef.current;
    const bx = g.base_x_smooth;
    const OFF = 0;

    ctx.clearRect(0, 0, FULL_W, CANVAS_H);
    drawPlayfieldOverlay(ctx, OFF);

    // Tally: single sushi icon + count, bottom-left, no box
    const tallyImg = imgs.CompletedSushi;
    if (g.completed_sushi > 0 && tallyImg?.complete && tallyImg.naturalWidth) {
      const TALLY_H = 52;
      const TALLY_W = TALLY_H * (tallyImg.naturalWidth / tallyImg.naturalHeight);
      const tallyX = 16;
      const tallyY = CANVAS_H - TALLY_H - 16;
      ctx.save();
      ctx.drawImage(tallyImg, tallyX, tallyY, TALLY_W, TALLY_H);
      ctx.font = `bold 22px 'Fredoka One', cursive`;
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = 6;
      ctx.fillStyle = "#fff";
      ctx.fillText(`x${g.completed_sushi}`, tallyX + TALLY_W + 6, tallyY + TALLY_H * 0.72);
      ctx.restore();
    }

    const tx = OFF + bx * CELL;
    const ty = (H - 1) * CELL;
    const tw = CONFIG.BASE_WIDTH * CELL;
    const th = CELL;
    ctx.save();
    ctx.shadowColor = "rgba(255, 200, 120, 0.65)";
    ctx.shadowBlur = 18;
    ctx.fillStyle = "rgba(245, 210, 140, 0.72)";
    ctx.fillRect(tx, ty, tw, th);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.fillRect(tx, ty, tw, th * 0.35);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
    ctx.lineWidth = 4;
    ctx.strokeRect(tx + 2, ty + 2, tw - 4, th - 4);
    ctx.strokeStyle = "rgba(60, 40, 20, 0.55)";
    ctx.lineWidth = 2;
    ctx.strokeRect(tx + 6, ty + 6, tw - 12, th - 12);
    ctx.fillStyle = "rgba(40, 28, 14, 0.35)";
    ctx.fillRect(tx + 8, ty + th - 8, tw - 16, 6);
    ctx.restore();

    for (let col_idx = 0; col_idx < 3; col_idx += 1) {
      const slot = g.stack_slots[col_idx];
      slot.forEach((color_key, row_idx) => {
        const grid_col = bx + col_idx;
        drawStackedSprite(ctx, imgs[color_key], OFF, grid_col, row_idx, color_key);
      });
    }

    for (const piece of g.falling) {
      drawFallingSprite(ctx, imgs[piece.sprite_key], OFF, piece.x, piece.y, piece.sprite_key);
    }
  }, [CANVAS_H, FULL_W, H, CELL, drawPlayfieldOverlay, drawStackedSprite, drawFallingSprite]);

  const handleInput = useCallback((dt) => {
    const g = gameRef.current;
    const k = keysRef.current;
    const moveSpeed = 14;
    if (k.left) {
      if (!leftInitialRef.current) { g.move_base(-1); leftInitialRef.current = true; }
      else {
        leftHoldRef.current += dt;
        if (leftHoldRef.current >= 0.12) { g.move_base(-1); leftHoldRef.current -= 1 / moveSpeed; }
      }
    } else { leftHoldRef.current = 0; leftInitialRef.current = false; }
    if (k.right) {
      if (!rightInitialRef.current) { g.move_base(1); rightInitialRef.current = true; }
      else {
        rightHoldRef.current += dt;
        if (rightHoldRef.current >= 0.12) { g.move_base(1); rightHoldRef.current -= 1 / moveSpeed; }
      }
    } else { rightHoldRef.current = 0; rightInitialRef.current = false; }
  }, []);

  const persistProgress = useCallback(async (stars, score) => {
    saveLevelResult(CURRENT_LEVEL_ID, stars);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { data: currentProfile, error: fetchError } = await supabase
        .from("profiles")
        .select("level, level1_stars, level2_stars, level3_stars, level4_stars, level1_score, level2_score, level3_score, level4_score, sustain_score")
        .eq("user_id", session.user.id)
        .single();
      if (fetchError || !currentProfile) return;
      const newBestStars = Math.max(currentProfile.level3_stars ?? 0, stars);
      const newBestScore = Math.max(currentProfile.level3_score ?? 0, score);
      const nextUnlockedLevel = Math.max(currentProfile.level ?? 0, CURRENT_LEVEL_ID + 1);
      const currentSustainScore = currentProfile.sustain_score ?? 0;
      const nextSustainScore = Math.max(0, currentSustainScore - (currentProfile.level3_score ?? 0) + newBestScore);
      await supabase.from("profiles").update({
        level3_stars: newBestStars,
        level3_score: newBestScore,
        level: nextUnlockedLevel,
        sustain_score: nextSustainScore,
        updated_at: new Date().toISOString(),
      }).eq("user_id", session.user.id);
    } catch (e) {
      console.error("Failed to save stacking game progress:", e);
    }
  }, []);

  const triggerEndScreen = useCallback((reason, g) => {
    if (endedRef.current) return;
    endedRef.current = true;
    const stars = calcStars(g.completed_sushi);
    setFinalStars(stars);
    setEndReason(reason);
    setHoneyEarned([false, false, false]);
    setHoneyPop([false, false, false]);
    setShowEnd(true);

    // Stagger honey reveals after modal is visible
    [0, 1, 2].forEach((i) => {
      if (i < stars) {
        setTimeout(() => {
          setHoneyEarned(prev => { const n = [...prev]; n[i] = true; return n; });
          setTimeout(() => {
            setHoneyPop(prev => { const n = [...prev]; n[i] = true; return n; });
            setTimeout(() => setHoneyPop(prev => { const n = [...prev]; n[i] = false; return n; }), 600);
          }, 20);
        }, 600 + i * 450);
      }
    });

    persistProgress(stars, g.score);
  }, [persistProgress]);

  const tick = useCallback((ts) => {
    if (!lastTsRef.current) lastTsRef.current = ts;
    const rawDelta = ts - lastTsRef.current;
    lastTsRef.current = ts;
    const dt = Math.min(rawDelta / 1000, 0.1);
    const g = gameRef.current;

    if (!g.game_over) {
      handleInput(dt);
      g.update(dt, keysRef.current.down);

      if (g.last_lock_wrong) {
        setLives(prev => {
          const next = Math.max(0, prev - 1);
          if (next <= 0) {
            g.game_over = true;
            triggerEndScreen("lives", g);
          }
          return next;
        });
      }

      setTimeLeft(prev => {
        const next = Math.max(0, prev - dt);
        if (next <= 0 && !endedRef.current) {
          g.game_over = true;
          triggerEndScreen("time", g);
        }
        return next;
      });
    }

    if (g.game_over && !endedRef.current) {
      triggerEndScreen("time", g);
    }

    const nextSpeed = g.drop_interval > 0 ? Math.round((1 / g.drop_interval) * 100) / 100 : 0;
    setHud((prev) => {
      const next = { score: g.score, mult: g.multiplier, speed: nextSpeed, clears: g.total_clears, gameOver: g.game_over };
      if (prev.score === next.score && prev.mult === next.mult && prev.speed === next.speed && prev.clears === next.clears && prev.gameOver === next.gameOver) return prev;
      return next;
    });

    draw();
    rafRef.current = requestAnimationFrame(tick);
  }, [draw, handleInput, persistProgress, triggerEndScreen]);

  useEffect(() => {
    let cancelled = false;
    loadImages().then(() => {
      if (!cancelled) {
        setAssetsReady(true);
        lastTsRef.current = 0;
        rafRef.current = requestAnimationFrame(tick);
      }
    }).catch(() => {
      if (!cancelled) {
        setAssetsReady(true);
        lastTsRef.current = 0;
        rafRef.current = requestAnimationFrame(tick);
      }
    });
    return () => { cancelled = true; cancelAnimationFrame(rafRef.current); };
  }, [loadImages, tick]);

  useEffect(() => {
    const down = (e) => {
      if (e.code === "ArrowLeft") keysRef.current.left = true;
      if (e.code === "ArrowRight") keysRef.current.right = true;
      if (e.code === "ArrowDown") keysRef.current.down = true;
    };
    const up = (e) => {
      if (e.code === "ArrowLeft") keysRef.current.left = false;
      if (e.code === "ArrowRight") keysRef.current.right = false;
      if (e.code === "ArrowDown") keysRef.current.down = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  const restart = () => {
    endedRef.current = false;
    setShowEnd(false);
    setLives(3);
    setTimeLeft(60);
    setHoneyEarned([false, false, false]);
    setHoneyPop([false, false, false]);
    gameRef.current = new GameState();
    lastTsRef.current = 0;
    leftHoldRef.current = 0;
    rightHoldRef.current = 0;
    leftInitialRef.current = false;
    rightInitialRef.current = false;
  };

  const btnStyle = {
    padding: "14px 38px",
    fontSize: "20px",
    borderRadius: "18px",
    border: "none",
    cursor: "pointer",
    boxShadow: "0 8px 15px rgba(0,0,0,0.15)",
    fontFamily: "'Fredoka One', cursive",
    transition: "transform 0.1s ease",
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        position: "relative",
        fontFamily: "'Fredoka One', cursive",
        color: "#e8eef5",
        userSelect: "none",
        background: `url(${bgImg}) center/cover no-repeat`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
      }}
    >
      <style>{HUD_STYLES}</style>

      {/* ── Glass HUD ── */}
      <div id="sg-hud">
        <div className="sg-hud-block">
          <span className="sg-hud-label">Score</span>
          <span className="sg-hud-val">{hud.score}</span>
        </div>
        <div className="sg-hud-block">
          <span className="sg-hud-label">Clears</span>
          <span className={`sg-hud-val${hud.clears > 0 ? " good" : ""}`}>{hud.clears}</span>
        </div>
        <div className="sg-hud-block">
          <span className="sg-hud-label">Mult</span>
          <span className={`sg-hud-val${hud.mult >= 1 ? " warn" : ""}`}>×{Number(hud.mult ?? 0).toFixed(1)}</span>
        </div>
        <div className="sg-hud-block">
          <span className="sg-hud-label">Speed</span>
          <span className="sg-hud-val">{hud.speed}</span>
        </div>
        <div className="sg-hud-block">
          <span className="sg-hud-label">Lives</span>
          <div style={{ display: "flex", alignItems: "center" }}>
            {[0, 1, 2].map(i => (
              <img key={i} src={livesImg} alt="" style={{
                width: "28px", height: "28px", objectFit: "contain",
                marginRight: i < 2 ? "-6px" : 0,
                filter: i >= lives ? "grayscale(1) opacity(0.3)" : "none",
                transition: "filter 0.3s",
              }} />
            ))}
          </div>
        </div>
        <div className="sg-hud-block">
          <span className="sg-hud-label">Time</span>
          <span className={`sg-hud-val${timeLeft <= 10 ? " danger" : timeLeft <= 20 ? " warn" : ""}`}>
            {Math.ceil(timeLeft)}s
          </span>
        </div>
      </div>

      {/* ── Settings cog ── */}
      <button
        onClick={() => setShowSettings(true)}
        title="Settings"
        style={{
          position: "fixed", top: "14px", right: "14px", zIndex: 550,
          width: "46px", height: "46px",
          background: "rgba(255,255,255,0.22)",
          backdropFilter: "blur(14px) saturate(1.6)",
          WebkitBackdropFilter: "blur(14px) saturate(1.6)",
          border: "1px solid rgba(255,255,255,0.45)", borderRadius: "14px",
          boxShadow: "0 4px 18px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.5)",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
        }}
        onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1) rotate(22deg)"}
        onMouseLeave={e => e.currentTarget.style.transform = "scale(1) rotate(0deg)"}
      >
        <img src={settingsCogImg} alt="settings" style={{ width: "26px", height: "26px", objectFit: "contain" }} />
      </button>

      {/* ── Levels button ── */}
      <button
        onClick={() => navigate("/level-selection")}
        style={{
          position: "fixed", top: "14px", left: "14px", zIndex: 550,
          padding: "10px 20px", fontSize: "16px", borderRadius: "18px",
          border: "1px solid rgba(255,255,255,0.45)",
          background: "rgba(255,255,255,0.22)",
          backdropFilter: "blur(14px) saturate(1.6)",
          WebkitBackdropFilter: "blur(14px) saturate(1.6)",
          color: "#fff", cursor: "pointer",
          fontFamily: "'Fredoka One', cursive",
          boxShadow: "0 4px 18px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.5)",
          transition: "transform 0.1s ease",
        }}
        onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
        onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
      >
        ← Levels
      </button>

      {/* ── Bottom hint pill ── */}
      <div style={{
        position: "fixed", bottom: "18px", left: "50%", transform: "translateX(-50%)",
        background: "rgba(255,255,255,0.22)",
        backdropFilter: "blur(14px) saturate(1.6)",
        WebkitBackdropFilter: "blur(14px) saturate(1.6)",
        border: "1px solid rgba(255,255,255,0.45)",
        borderRadius: "50px", padding: "8px 24px",
        boxShadow: "0 4px 18px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.5)",
        fontSize: "0.75rem", fontWeight: 800, letterSpacing: "1px",
        color: "rgba(255,255,255,0.9)", textShadow: "0 1px 3px rgba(0,0,0,0.35)",
        pointerEvents: "none", zIndex: 15, whiteSpace: "nowrap",
        fontFamily: "'Nunito', sans-serif",
      }}>
        Stack a Rice, Salmon, & Roe to create a sushi roll! | Use ←→ to move, ↓ to drop.
      </div>

      {/* ── Loading overlay ── */}
      {!assetsReady && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 500,
          background: "rgba(17,17,24,0.95)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: "12px",
        }}>
          <div style={{ fontSize: "20px", fontFamily: "'Fredoka One', cursive" }}>Loading game…</div>
          <div style={{ fontSize: "13px", color: "#888", fontFamily: "'Nunito', sans-serif" }}>Hang tight!</div>
        </div>
      )}

      {/* ── Canvas ── */}
      <div style={{
        flex: 1, minHeight: 0, width: "100%",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "72px 8px 48px",
        boxSizing: "border-box",
      }}>
        <canvas
          ref={canvasRef}
          width={FULL_W}
          height={CANVAS_H}
          style={{
            display: "block",
            maxWidth: "100%",
            maxHeight: "100%",
            width: "auto",
            height: "auto",
            aspectRatio: `${FULL_W} / ${CANVAS_H}`,
            borderRadius: 8,
            boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
          }}
        />
      </div>

      {/* ── Results screen — FishPrepGame style ── */}
      {showEnd && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 400,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)",
        }}>
          <div style={{
            width: "65vw", maxWidth: "860px",
            background: "rgba(255,255,255,0.82)",
            borderRadius: "35px", padding: "50px",
            backdropFilter: "blur(18px)",
            boxShadow: "0 25px 50px rgba(0,0,0,0.18)",
            fontFamily: "'Fredoka One', cursive",
            textAlign: "center",
          }}>
            <div style={{ fontSize: "clamp(2.5rem,6vw,4rem)", marginBottom: "8px" }}>
              {endReason === "time" ? "⏰" : "💔"}
            </div>
            <h1 style={{ fontSize: "clamp(28px,5vw,52px)", margin: "0 0 8px", color: "#2c2316" }}>
              {endReason === "time" ? "Time's Up!" : "Out of Lives!"}
            </h1>
            <div style={{
              fontSize: "14px", letterSpacing: "2px", opacity: 0.6,
              textTransform: "uppercase", marginBottom: "18px", color: "#5a4a35",
            }}>
              Sushi Rating
            </div>

            {/* Honey jars */}
            <div style={{ display: "flex", gap: "8px", justifyContent: "center", margin: "18px 0" }}>
              {[0, 1, 2].map((i) => (
                <div key={i} className={`honey${honeyPop[i] ? " pop" : ""}`}>
                  <img src={honeyEarned[i] ? filledHoneyImg : blankHoneyImg} alt="" />
                </div>
              ))}
            </div>

            {/* Stats */}
            <div style={{ display: "flex", justifyContent: "center", gap: "24px", margin: "18px 0 16px", flexWrap: "wrap" }}>
              {[
                { label: "SCORE", val: gameRef.current.score },
                { label: "SUSHI MADE", val: gameRef.current.completed_sushi },
                { label: "CLEARS", val: gameRef.current.total_clears },
              ].map(({ label, val }) => (
                <div key={label} style={{
                  background: "#e8e1cf", borderRadius: "22px",
                  padding: "18px 28px", boxShadow: "0 8px 15px rgba(0,0,0,0.1)",
                }}>
                  <div style={{ fontSize: "14px", letterSpacing: "2px", opacity: 0.6, color: "#5a4a35", textTransform: "uppercase" }}>{label}</div>
                  <div style={{ fontSize: "clamp(24px,4vw,38px)", color: "#5a4a35" }}>{val}</div>
                </div>
              ))}
            </div>

            <div style={{ color: "#5c5040", marginBottom: "28px", fontSize: "clamp(13px,2.2vw,16px)", lineHeight: 1.45 }}>
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: "16px", flexWrap: "wrap" }}>
              <button
                onClick={() => navigate("/level-selection")}
                onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                style={{ ...btnStyle, backgroundColor: "#e8e1cf", color: "#3d2e1e" }}
              >
                ← Level Menu
              </button>
              <button
                onClick={restart}
                onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                style={{ ...btnStyle, backgroundColor: "#7FBF3F", color: "white" }}
              >
                Play Again ↺
              </button>
              <button
                onClick={() => navigate("/level/4")}
                onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                style={{ ...btnStyle, backgroundColor: "#7FBF3F", color: "white" }}
              >
                Next Level →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Settings panel ── */}
      {showSettings && (
        <div style={{ position: "fixed", inset: 0, zIndex: 550 }}>
          <Settings onClose={() => setShowSettings(false)} />
        </div>
      )}
    </div>
  );
}