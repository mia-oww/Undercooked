// Toggle time Ctrl + F s.timeLeft =

import { useEffect, useRef, useCallback, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Settings from "../Settings";
import { saveLevelResult } from "../../utils/levelProgress";
import { supabase } from "../../supabase";

// ── Asset imports ────────────────────────────────────────────────────────────
import grassImg from "../../assets/sprites/river-game-sprites/grass.png";
import trashcanImg from "../../assets/sprites/river-game-sprites/trashcan.png";
import fishingNetImg from "../../assets/sprites/river-game-sprites/fishing_net.png";
import trash2Img from "../../assets/sprites/river-game-sprites/trash2.png";
import trash3Img from "../../assets/sprites/river-game-sprites/trash3.png";
import trash4Img from "../../assets/sprites/river-game-sprites/trash4.png";
import salmonImg from "../../assets/sprites/river-game-sprites/salmon.png";
import yellowfinImg from "../../assets/sprites/river-game-sprites/yellowfin.png";
import tunaImg from "../../assets/sprites/river-game-sprites/tuna.png";
import red_snapperImg from "../../assets/sprites/river-game-sprites/red_snapper.png";
import mackerelImg from "../../assets/sprites/river-game-sprites/mackerel.png";
import livesImg from "../../assets/sprites/river-game-sprites/lives.png";
import wavingBearImg from "../../assets/sprites/river-game-sprites/wavingbear.png";
import settingsCogImg from "../../assets/settings_cog.png";
import blankHoneyImg from "../../assets/sprites/fish-prep/blankhoney.png";
import filledHoneyImg from "../../assets/sprites/fish-prep/honey2.png";
import plasticBottle from "../../assets/sprites/trash-sorting/plastic_bottle.png";
import compostBottle from "../../assets/sprites/trash-sorting/compost_bottle.png";
import plasticBag from "../../assets/sprites/trash-sorting/plastic_bag.png";
import sodaCan from "../../assets/sprites/trash-sorting/soda_can.png";

const A = {
  grass: grassImg,
  trashcan: trashcanImg,
  fishingNet: fishingNetImg,
  trash2: trash2Img,
  trash3: trash3Img,
  trash4: trash4Img,
  plasticBottle: plasticBottle,
  compostBottle: compostBottle,
  plasticBag: plasticBag,
  sodaCan: sodaCan,
  salmon: salmonImg,
  yellowfin: yellowfinImg,
  tuna: tunaImg,
  red_snapper: red_snapperImg,
  mackerel: mackerelImg,
  lives: livesImg,
};

const TRASH_ASSETS = [A.trash2, A.trash3, A.trash4, A.plasticBottle, A.compostBottle, A.plasticBag, A.sodaCan];
const FISH_ASSETS = [A.salmon, A.yellowfin, A.tuna, A.red_snapper, A.mackerel];

const CFG = {
  normal: {
    spawnDelay: 1800,
    itemSpeed: 9000,
    rampSpawn: 130,
    rampSpeed: 350,
    minSpawn: 550,
    minSpeed: 3800,
  },
  hard: {
    spawnDelay: 650,
    itemSpeed: 4200,
    rampSpawn: 60,
    rampSpeed: 250,
    minSpawn: 280,
    minSpeed: 1800,
  },
};

const TRASH_SZ_MIN = 42;
const TRASH_SZ_MAX = 88;
const FISH_SZ_MIN = 52;
const FISH_SZ_MAX = 74;
const ITEM_MIN_Y_SEP = 70;
const MIN_ARRIVAL_GAP_MS = 900;
const CATCHER_HALF = 36;

const WAVE_BANDS = [
  { yFrac: 0.18, amp: 5, freq: 0.012, speed: 0.6, alpha: 0.13, width: 2.5 },
  { yFrac: 0.32, amp: 4, freq: 0.018, speed: 0.9, alpha: 0.1, width: 2 },
  { yFrac: 0.48, amp: 6, freq: 0.01, speed: 0.5, alpha: 0.14, width: 3 },
  { yFrac: 0.62, amp: 3.5, freq: 0.022, speed: 1.1, alpha: 0.09, width: 1.8 },
  { yFrac: 0.76, amp: 5, freq: 0.014, speed: 0.7, alpha: 0.12, width: 2.5 },
];

const SHIMMER_LINES = Array.from({ length: 10 }, () => ({
  xFrac: Math.random(),
  yFrac: 0.1 + Math.random() * 0.8,
  lenFrac: 0.05 + Math.random() * 0.12,
  alpha: 0.07 + Math.random() * 0.1,
  phase: Math.random() * Math.PI * 2,
  pulseSpeed: 0.8 + Math.random() * 1.2,
}));

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;700;800&display=swap');

  #rr-root *, #rr-root *::before, #rr-root *::after { margin:0; padding:0; box-sizing:border-box; }

  #rr-root {
    position:fixed; inset:0; overflow:hidden;
    user-select:none; font-family:'Nunito',sans-serif;
  }

  #rr-bg {
    position:absolute; inset:0; width:100%; height:100%;
    object-fit:cover; object-position:center; z-index:0;
  }

  #rr-scene { position:absolute; inset:0; overflow:hidden; z-index:1; }
  #rr-river { position:absolute; left:0; right:0; overflow:hidden; }
  #rr-river-canvas { position:absolute; inset:0; width:100%; height:100%; }

  #rr-catch-line {
    position:absolute; width:2px; top:0; bottom:0;
    background:rgba(255,255,255,0.22); z-index:5;
    box-shadow:0 0 6px rgba(255,255,255,0.3);
  }

  .rr-item {
    position:absolute; will-change:left;
    filter:drop-shadow(2px 3px 4px rgba(0,0,0,0.3));
    animation:rrFloat linear, rrBob ease-in-out infinite;
    animation-fill-mode:forwards; z-index:6;
    display:flex; align-items:center; justify-content:center;
  }
  .rr-item img { width:100%; height:100%; object-fit:contain; pointer-events:none; }
  @keyframes rrFloat { from { left:105%; } to { left:-80px; } }
  @keyframes rrBob   { 0%,100% { margin-top:0; } 50% { margin-top:-9px; } }
  .rr-item.paused { animation-play-state: paused !important; }

  #rr-catcher-zone {
    position:absolute; left:38px; width:80px; height:80px;
    display:flex; align-items:center; justify-content:center;
    z-index:10; transform:translateY(-50%); pointer-events:none;
  }
  #rr-catcher {
    width:72px; height:72px; object-fit:contain;
    filter:drop-shadow(0 4px 10px rgba(0,0,0,0.5));
  }
  #rr-catcher.rr-catch-anim { animation:rrCatchPop 0.4s ease forwards; }
  @keyframes rrCatchPop {
    0%   { transform:scale(1); }
    40%  { transform:scale(1.65) rotate(-15deg); }
    70%  { transform:scale(0.85) rotate(10deg); }
    100% { transform:scale(1); }
  }
  #rr-catcher.rr-miss-anim { animation:rrMissShake 0.35s ease forwards; }
  @keyframes rrMissShake {
    0%,100% { transform:translateX(0); }
    25% { transform:translateX(-10px) rotate(-10deg); }
    75% { transform:translateX(10px) rotate(10deg); }
  }

  #rr-hud {
    position:fixed; top:14px; left:0; right:0; z-index:20;
    display:flex; align-items:center; justify-content:center;
    padding:0 10px; gap:6px; background:none; pointer-events:none;
  }
  .rr-hud-block {
    display:flex; flex-direction:column; align-items:center; min-width:48px;
    background:rgba(255,255,255,0.22);
    backdrop-filter:blur(14px) saturate(1.6);
    -webkit-backdrop-filter:blur(14px) saturate(1.6);
    border:1px solid rgba(255,255,255,0.45); border-radius:18px;
    padding:5px 10px 6px;
    box-shadow:0 4px 18px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.5);
    pointer-events:auto;
  }
  .rr-hud-block.rr-lives-block { padding:4px 8px; }
  .rr-hud-label {
    font-size:0.5rem; letter-spacing:1.5px; text-transform:uppercase;
    color:rgba(255,255,255,0.75); font-weight:800;
    text-shadow:0 1px 3px rgba(0,0,0,0.35); white-space:nowrap;
  }
  .rr-hud-val {
    font-family:'Fredoka One',cursive; font-size:1.4rem; line-height:1.1;
    color:#fff; transition:color 0.3s; text-shadow:0 2px 6px rgba(0,0,0,0.3);
  }
  .rr-hud-val.good { color:#5effa0; }
  .rr-hud-val.bad  { color:#ff6b6b; }

  #rr-lives-display { display:flex; align-items:center; }
  #rr-lives-display img { width:38px; height:38px; object-fit:contain; margin-right:-8px; }
  #rr-lives-display img:last-child { margin-right:0; }
  #rr-lives-display img.rr-lost { filter:grayscale(1) opacity(0.3); }

  #rr-fish-val {
    font-family:'Fredoka One',cursive; font-size:1.7rem; line-height:1.1;
    color:#fff; text-shadow:0 2px 6px rgba(0,0,0,0.3);
  }
  #rr-fish-val.rr-pop { animation:rrFishPop 0.4s ease; }
  @keyframes rrFishPop {
    0%   { transform:scale(1);   color:#e8e1cf; }
    40%  { transform:scale(1.5); color:#e0faff; }
    100% { transform:scale(1);   color:#e8e1cf; }
  }

  #rr-combo-display {
    font-family:'Fredoka One',cursive; font-size:1.1rem;
    color:#fff; min-width:60px; text-align:center;
    text-shadow:0 2px 4px rgba(0,0,0,0.3);
  }

  #rr-toggle-btn {
    background:rgba(255,255,255,0.18);
    backdrop-filter:blur(14px) saturate(1.6);
    -webkit-backdrop-filter:blur(14px) saturate(1.6);
    border:1.5px solid rgba(255,255,255,0.4); border-radius:50px;
    padding:6px 14px; display:flex; align-items:center; gap:6px;
    cursor:pointer; color:#fff;
    font-family:'Fredoka One',cursive; font-size:0.9rem;
    transition:all 0.2s cubic-bezier(0.34,1.56,0.64,1);
    box-shadow:0 4px 18px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.4);
    pointer-events:auto; text-shadow:0 1px 4px rgba(0,0,0,0.3); white-space:nowrap;
  }
  #rr-toggle-btn:hover  { transform:scale(1.06); border-color:rgba(255,255,255,0.7); }
  #rr-toggle-btn:active { transform:scale(0.94); }
  #rr-toggle-btn.rr-trash-mode { border-color:rgba(255,100,100,0.7); background:rgba(231,76,60,0.25); }
  #rr-toggle-btn.rr-fish-mode  { border-color:rgba(79,195,232,0.7); background:rgba(79,195,232,0.22); color:#e8e1cf; text-shadow:none; }
  .rr-mode-icon { width:30px; height:30px; object-fit:contain; }

  #rr-hard-badge {
    display:none;
    font-family:'Fredoka One',cursive; font-size:0.8rem;
    background:rgba(231,76,60,0.85); backdrop-filter:blur(10px);
    color:white; border-radius:50px; padding:4px 12px; letter-spacing:1px;
    border:1px solid rgba(255,120,100,0.5);
    animation:rrBadgePulse 2s ease-in-out infinite; pointer-events:auto;
  }
  @keyframes rrBadgePulse {
    0%,100% { box-shadow:0 0 8px rgba(231,76,60,0.4); }
    50%     { box-shadow:0 0 18px rgba(231,76,60,0.9); }
  }

  #rr-settings-btn {
    position:fixed; top:14px; right:14px; z-index:30;
    width:46px; height:46px;
    background:rgba(255,255,255,0.22);
    backdrop-filter:blur(14px) saturate(1.6);
    -webkit-backdrop-filter:blur(14px) saturate(1.6);
    border:1px solid rgba(255,255,255,0.45); border-radius:14px;
    box-shadow:0 4px 18px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.5);
    cursor:pointer; display:flex; align-items:center; justify-content:center;
    transition:all 0.25s cubic-bezier(0.34,1.56,0.64,1);
    font-size:1.3rem; line-height:1;
  }
  #rr-settings-btn:hover  { transform:scale(1.1) rotate(22deg); border-color:rgba(255,255,255,0.7); }
  #rr-settings-btn:active { transform:scale(0.92); }

  .rr-popup {
    position:absolute; font-family:'Fredoka One',cursive; font-size:1.55rem;
    pointer-events:none; animation:rrPopUp 0.9s ease forwards; z-index:25;
    text-shadow:0 2px 6px rgba(0,0,0,0.5);
  }
  .rr-popup-img {
    position:absolute; display:flex; align-items:center; gap:6px;
    pointer-events:none; animation:rrPopUp 0.9s ease forwards; z-index:25;
    font-family:'Fredoka One',cursive; font-size:1.35rem;
    text-shadow:0 2px 6px rgba(0,0,0,0.5);
  }
  .rr-popup-img img { width:32px; height:32px; object-fit:contain; }
  @keyframes rrPopUp {
    0%   { opacity:1; transform:translateY(0) scale(1); }
    55%  { opacity:1; transform:translateY(-48px) scale(1.2); }
    100% { opacity:0; transform:translateY(-80px) scale(0.85); }
  }

  #rr-hard-row {
    display:flex; align-items:center; gap:12px;
    cursor:pointer; padding:8px 18px; border-radius:50px;
    border:2px solid rgba(255,255,255,0.12);
    transition:border-color 0.25s, background 0.25s;
  }
  #rr-hard-row:hover { border-color:rgba(255,255,255,0.28); }
  #rr-hard-row.on { border-color:#e74c3c; background:rgba(231,76,60,0.15); }
  #rr-hard-switch {
    width:46px; height:24px; border-radius:50px;
    background:rgba(255,255,255,0.12); border:2px solid rgba(255,255,255,0.2);
    position:relative; flex-shrink:0; transition:background 0.25s, border-color 0.25s;
  }
  #rr-hard-row.on #rr-hard-switch { background:#e74c3c; border-color:#e74c3c; }
  #rr-hard-knob {
    position:absolute; top:2px; left:2px; width:16px; height:16px;
    border-radius:50%; background:rgba(255,255,255,0.45);
    transition:left 0.25s, background 0.25s;
  }
  #rr-hard-row.on #rr-hard-knob { left:24px; background:white; }
  #rr-hard-text {
    font-family:'Fredoka One',cursive; font-size:1.05rem;
    color:rgba(255,255,255,0.4); transition:color 0.25s;
  }
  #rr-hard-row.on #rr-hard-text { color:#ff7070; }

  #rr-timer-display { color:#fff; }
  #rr-timer-display.urgent { color:#ff6b6b; animation:rrTimerPulse 0.6s ease-in-out infinite; }
  @keyframes rrTimerPulse { 0%,100% { transform:scale(1); } 50% { transform:scale(1.15); } }

  #rr-hint {
    position:fixed; bottom:18px; left:50%; transform:translateX(-50%);
    font-size:0.72rem; color:rgba(255,255,255,0.7);
    font-weight:700; letter-spacing:0.5px; z-index:15;
    white-space:nowrap; pointer-events:none;
    text-shadow:0 1px 4px rgba(0,0,0,0.4);
    background:rgba(0,0,0,0.18); backdrop-filter:blur(8px);
    padding:5px 16px; border-radius:50px;
    border:1px solid rgba(255,255,255,0.15);
  }

  /* ── Honey jars (matches FishPrepGame) ───────────────────────────────── */
  .honey {
    width: clamp(64px, 9vw, 110px);
    height: clamp(64px, 9vw, 110px);
    display: flex; align-items: center; justify-content: center;
    opacity: 0.35;
    transform: scale(0.88);
    transition: opacity 0.3s ease, transform 0.3s ease;
  }
  .honey img { width: 100%; height: 100%; object-fit: contain; }
  .honey.earned { opacity: 1; transform: scale(1); }
  .honey.pop { animation: honeyPop 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards; }
  @keyframes honeyPop {
    0%   { transform: scale(0.6); opacity: 0.4; }
    60%  { transform: scale(1.25); opacity: 1; }
    100% { transform: scale(1);   opacity: 1; }
  }
`;

function QuitConfirmModal({ onConfirm, onCancel }) {
  const btnBase = {
    padding: "12px 32px",
    fontSize: "18px",
    borderRadius: "16px",
    border: "none",
    cursor: "pointer",
    fontFamily: "'Fredoka One', cursive",
    transition: "transform 0.1s ease",
    boxShadow: "0 6px 12px rgba(0,0,0,0.12)",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          background: "rgba(255,255,255,0.95)",
          borderRadius: "28px",
          padding: "44px 48px",
          maxWidth: "420px",
          width: "90vw",
          textAlign: "center",
          boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
          fontFamily: "'Fredoka One', cursive",
        }}
      >
        <div style={{ fontSize: "3rem", marginBottom: "12px" }}>🏠</div>
        <h2 style={{ fontSize: "28px", color: "#3d2e1e", margin: "0 0 10px" }}>
          Go to Main Menu?
        </h2>
        <p
          style={{
            fontFamily: "'Nunito', sans-serif",
            fontSize: "16px",
            color: "#7a6a58",
            lineHeight: 1.6,
            margin: "0 0 32px",
          }}
        >
          Your current progress won't be saved.
          <br />
          Are you sure you want to leave?
        </p>
        <div style={{ display: "flex", gap: "14px", justifyContent: "center" }}>
          <button
            onClick={onCancel}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            style={{ ...btnBase, backgroundColor: "#e8e1cf", color: "#3d2e1e" }}
          >
            Keep Playing
          </button>
          <button
            onClick={onConfirm}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            style={{ ...btnBase, backgroundColor: "#7FBF3F", color: "white" }}
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RiverGame() {
  const navigate = useNavigate();
  const { levelId } = useParams();
  const currentLevelId = Number(levelId || 1);
  const totalLevelCount = 9;

  const [showSettings, setShowSettings] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [endScreen, setEndScreen] = useState(null);
  const [honeyStars, setHoneyStars] = useState([false, false, false]);

  const stateRef = useRef({
    score: 0,
    lives: 3,
    trashCombo: 0,
    fishCount: 0,
    timeLeft: 60,
    mode: "trash",
    gameRunning: false,
    hardMode: false,
    spawnDelay: 1800,
    itemSpeed: 9000,
    catcherY: 0,
    activeItems: [],
    spawnId: 0,
    spawnInterval: null,
    diffInterval: null,
    timerInterval: null,
    rafId: null,
    W: 0,
    H: 0,
    BANK_H: 0,
    RIVER_TOP: 0,
    RIVER_H: 0,
    CATCH_X: 100,
  });

  const canvasRef = useRef(null);
  const riverRef = useRef(null);
  const catcherRef = useRef(null);
  const catcherZoneRef = useRef(null);
  const sceneRef = useRef(null);
  const scoreDisplayRef = useRef(null);
  const livesDisplayRef = useRef(null);
  const comboDisplayRef = useRef(null);
  const fishValRef = useRef(null);
  const timerDisplayRef = useRef(null);
  const hardBadgeRef = useRef(null);
  const toggleBtnRef = useRef(null);
  const modeIconRef = useRef(null);
  const modeLabelRef = useRef(null);
  const hardRowRef = useRef(null);
  const catchLineRef = useRef(null);

  const spawnItemRef = useRef(null);
  const rampUpRef = useRef(null);
  const updateTimerRef = useRef(null);
  const endGameRef = useRef(null);

  // Animate honey jars when end screen appears
  useEffect(() => {
    if (!endScreen) return;
    setHoneyStars([false, false, false]);
    [0, 1, 2].forEach((i) => {
      if (i < endScreen.earnedStars) {
        setTimeout(() => {
          setHoneyStars((prev) => {
            const next = [...prev];
            next[i] = true;
            return next;
          });
        }, 600 + i * 450);
      }
    });
  }, [endScreen]);

  const layout = useCallback(() => {
    const s = stateRef.current;
    s.W = window.innerWidth;
    s.H = window.innerHeight;
    s.BANK_H = Math.round(s.H * 0.2);
    s.RIVER_TOP = s.BANK_H;
    s.RIVER_H = s.H - s.BANK_H * 2;
    s.CATCH_X = 100;

    if (riverRef.current) {
      riverRef.current.style.top = `${s.RIVER_TOP}px`;
      riverRef.current.style.height = `${s.RIVER_H}px`;
    }
    if (catchLineRef.current) {
      catchLineRef.current.style.left = `${s.CATCH_X}px`;
    }
    if (canvasRef.current) {
      canvasRef.current.width = s.W;
      canvasRef.current.height = s.RIVER_H;
    }
    if (!s.gameRunning && catcherZoneRef.current) {
      s.catcherY = s.RIVER_TOP + s.RIVER_H / 2;
      catcherZoneRef.current.style.top = `${s.catcherY}px`;
    }
  }, []);

  const drawRiver = useCallback((ts) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { RIVER_H } = stateRef.current;
    if (!RIVER_H) {
      stateRef.current.rafId = requestAnimationFrame(drawRiver);
      return;
    }

    const ctx = canvas.getContext("2d");
    const t = ts * 0.001;
    const cw = canvas.width;
    const ch = canvas.height;

    const grad = ctx.createLinearGradient(0, 0, 0, ch);
    grad.addColorStop(0, "#72d4f7");
    grad.addColorStop(0.35, "#3aaee0");
    grad.addColorStop(0.72, "#1e8bbf");
    grad.addColorStop(1, "#0e6898");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cw, ch);

    ctx.save();
    WAVE_BANDS.forEach((w) => {
      const y0 = w.yFrac * ch;
      const offset = t * w.speed * 60;
      ctx.beginPath();
      for (let x = 0; x <= cw; x += 3) {
        const y = y0 + Math.sin((x + offset) * w.freq) * w.amp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      const wg = ctx.createLinearGradient(0, 0, cw, 0);
      wg.addColorStop(0, "rgba(255,255,255,0)");
      wg.addColorStop(0.08, `rgba(255,255,255,${w.alpha})`);
      wg.addColorStop(0.92, `rgba(255,255,255,${w.alpha})`);
      wg.addColorStop(1, "rgba(255,255,255,0)");
      ctx.strokeStyle = wg;
      ctx.lineWidth = w.width;
      ctx.stroke();
    });
    ctx.restore();

    ctx.save();
    SHIMMER_LINES.forEach((s) => {
      const pulse = 0.5 + 0.5 * Math.sin(t * s.pulseSpeed + s.phase);
      const x1 = s.xFrac * cw;
      const y = s.yFrac * ch;
      const len = s.lenFrac * cw;
      const sg = ctx.createLinearGradient(x1, y, x1 + len, y);
      sg.addColorStop(0, "rgba(255,255,255,0)");
      sg.addColorStop(0.5, `rgba(255,255,255,${s.alpha * pulse})`);
      sg.addColorStop(1, "rgba(255,255,255,0)");
      ctx.strokeStyle = sg;
      ctx.lineWidth = 1 + pulse * 2;
      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.lineTo(x1 + len, y);
      ctx.stroke();
    });
    ctx.restore();

    const topFoam = ctx.createLinearGradient(0, 0, 0, 20);
    topFoam.addColorStop(0, "rgba(255,255,255,0.55)");
    topFoam.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = topFoam;
    ctx.fillRect(0, 0, cw, 20);

    const botFoam = ctx.createLinearGradient(0, ch - 20, 0, ch);
    botFoam.addColorStop(0, "rgba(255,255,255,0)");
    botFoam.addColorStop(1, "rgba(255,255,255,0.55)");
    ctx.fillStyle = botFoam;
    ctx.fillRect(0, ch - 20, cw, 20);

    stateRef.current.rafId = requestAnimationFrame(drawRiver);
  }, []);

  const updateTimer = useCallback(() => {
    const { timeLeft } = stateRef.current;
    const m = Math.floor(timeLeft / 60);
    const sec = timeLeft % 60;
    if (timerDisplayRef.current) {
      timerDisplayRef.current.textContent = `${m}:${sec.toString().padStart(2, "0")}`;
      timerDisplayRef.current.classList.toggle("urgent", timeLeft <= 10);
    }
  }, []);

  const updateLives = useCallback(() => {
    const { lives } = stateRef.current;
    if (!livesDisplayRef.current) return;
    livesDisplayRef.current.innerHTML = "";
    for (let i = 0; i < 3; i++) {
      const img = document.createElement("img");
      img.src = A.lives;
      if (i >= lives) img.classList.add("rr-lost");
      livesDisplayRef.current.appendChild(img);
    }
  }, []);

  const updateScore = useCallback((delta) => {
    if (!scoreDisplayRef.current) return;
    scoreDisplayRef.current.textContent = stateRef.current.score;
    scoreDisplayRef.current.className =
      "rr-hud-val" + (delta > 0 ? " good" : delta < 0 ? " bad" : "");
    setTimeout(() => {
      if (scoreDisplayRef.current) scoreDisplayRef.current.className = "rr-hud-val";
    }, 400);
  }, []);

  const updateTrashCombo = useCallback(() => {
    const { trashCombo } = stateRef.current;
    if (comboDisplayRef.current) {
      comboDisplayRef.current.textContent =
        trashCombo >= 3 ? `🔥 x${trashCombo}` : trashCombo > 0 ? `✨ x${trashCombo}` : "—";
    }
  }, []);

  const updateFishCount = useCallback(() => {
    if (!fishValRef.current) return;
    fishValRef.current.textContent = stateRef.current.fishCount;
    fishValRef.current.classList.remove("rr-pop");
    void fishValRef.current.offsetWidth;
    fishValRef.current.classList.add("rr-pop");
    setTimeout(() => {
      if (fishValRef.current) fishValRef.current.classList.remove("rr-pop");
    }, 400);
  }, []);

  const popup = useCallback((text, color, x, y) => {
    if (!sceneRef.current) return;
    const p = document.createElement("div");
    p.className = "rr-popup";
    p.style.cssText = `color:${color};left:${x}px;top:${y}px`;
    p.textContent = text;
    sceneRef.current.appendChild(p);
    setTimeout(() => p.remove(), 900);
  }, []);

  const popupImg = useCallback((imgSrc, text, color, x, y) => {
    if (!sceneRef.current) return;
    const p = document.createElement("div");
    p.className = "rr-popup-img";
    p.style.cssText = `color:${color};left:${x - 20}px;top:${y}px`;
    const img = document.createElement("img");
    img.src = imgSrc;
    const span = document.createElement("span");
    span.textContent = text;
    p.appendChild(img);
    p.appendChild(span);
    sceneRef.current.appendChild(p);
    setTimeout(() => p.remove(), 900);
  }, []);

  const setMode = useCallback((m) => {
    stateRef.current.mode = m;
    const isTrash = m === "trash";
    if (catcherRef.current) catcherRef.current.src = isTrash ? A.trashcan : A.fishingNet;
    if (toggleBtnRef.current) toggleBtnRef.current.className = isTrash ? "rr-trash-mode" : "rr-fish-mode";
    if (modeIconRef.current) modeIconRef.current.src = isTrash ? A.trashcan : A.fishingNet;
    if (modeLabelRef.current) modeLabelRef.current.textContent = isTrash ? "Trash Can" : "Fish Net";
  }, []);

  const toggleMode = useCallback(() => {
    setMode(stateRef.current.mode === "trash" ? "fish" : "trash");
  }, [setMode]);

  const calculateEarnedStars = useCallback((scoreValue, fishSaved) => {
    if (scoreValue <= 0 && fishSaved <= 0) return 0;
    if (scoreValue >= 120 || fishSaved >= 8) return 3;
    if (scoreValue >= 70 || fishSaved >= 4) return 2;
    return 1;
  }, []);

  const removeTracked = useCallback((id) => {
    const { activeItems } = stateRef.current;
    const idx = activeItems.findIndex((a) => a.id === id);
    if (idx !== -1) activeItems.splice(idx, 1);
  }, []);

  const pickSafeY = useCallback((sz) => {
    const { RIVER_H, activeItems } = stateRef.current;
    const margin = sz / 2 + 8;
    const minY = margin;
    const maxY = RIVER_H - margin;
    if (maxY <= minY) return RIVER_H / 2;

    for (let attempt = 0; attempt < 20; attempt++) {
      const candidate = minY + Math.random() * (maxY - minY);
      const tooClose = activeItems.some((a) => Math.abs(a.riverY - candidate) < ITEM_MIN_Y_SEP);
      if (!tooClose) return candidate;
    }
    return minY + Math.random() * (maxY - minY);
  }, []);

  const arrivalDelay = useCallback((dur) => {
    const { W, CATCH_X } = stateRef.current;
    const startX = W * 1.05;
    const endX = -80;
    return ((startX - CATCH_X) / (startX - endX)) * dur;
  }, []);

  const endGame = useCallback(
    async (timeUp = false) => {
      const s = stateRef.current;
      s.gameRunning = false;
      setGameStarted(false);
      s.activeItems.length = 0;

      clearInterval(s.spawnInterval);
      clearInterval(s.diffInterval);
      clearInterval(s.timerInterval);

      if (timerDisplayRef.current) {
        timerDisplayRef.current.classList.remove("urgent");
      }

      document.querySelectorAll(".rr-item").forEach((i) => i.remove());

      const earnedStars = calculateEarnedStars(s.score, s.fishCount);

      // always save locally first, so guest mode still works
      saveLevelResult(currentLevelId, earnedStars);

      // if logged in, also save to Supabase
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          const starColumnMap = {
            1: "level1_stars",
            2: "level2_stars",
            3: "level3_stars",
            4: "level4_stars",
          };

          const scoreColumnMap = {
            1: "level1_score",
            2: "level2_score",
            3: "level3_score",
            4: "level4_score",
          };

          const starColumn = starColumnMap[currentLevelId];
          const scoreColumn = scoreColumnMap[currentLevelId];
          if (starColumn) {
            const { data: currentProfile, error: fetchError } = await supabase
              .from("profiles")
              .select("level, level1_stars, level2_stars, level3_stars, level4_stars, level1_score, level2_score, level3_score, level4_score, sustain_score")
              .eq("user_id", session.user.id)
              .single();

            if (!fetchError && currentProfile) {
              const currentSavedStars = currentProfile[starColumn] ?? 0;
              const newBestStars = Math.max(currentSavedStars, earnedStars);

              const currentSavedScore = currentProfile[scoreColumn] ?? 0;
              const newBestScore = Math.max(currentSavedScore, s.score);

              const nextUnlockedLevel = Math.max(currentProfile.level ?? 0, currentLevelId + 1);
              const currentSustainScore = currentProfile.sustain_score ?? 0;
              const nextSustainScore = Math.max(0, currentSustainScore - currentSavedScore + newBestScore);

              await supabase
                .from("profiles")
                .update({
                  [starColumn]: newBestStars,
                  [scoreColumn]: newBestScore,
                  level: nextUnlockedLevel,
                  sustain_score: nextSustainScore,
                  updated_at: new Date().toISOString(),
                })
                .eq("user_id", session.user.id);
            }
          }
        }
      } catch (error) {
        console.error("Failed to save level progress to Supabase:", error);
      }

      setEndScreen({
        timeUp,
        score: s.score,
        fishCount: s.fishCount,
        hardMode: s.hardMode,
        earnedStars,
        currentLevelId,
        nextLevelId: currentLevelId + 1,
        hasNextLevel: currentLevelId < totalLevelCount,
      });
    },
    [calculateEarnedStars, currentLevelId, totalLevelCount]
  );

  const spawnItem = useCallback(() => {
    const s = stateRef.current;
    if (!s.gameRunning) return;

    const isTrash = Math.random() > 0.45;
    const assets = isTrash ? TRASH_ASSETS : FISH_ASSETS;
    const src = assets[Math.floor(Math.random() * assets.length)];
    const type = isTrash ? "trash" : "fish";

    const riverCap = Math.floor(s.RIVER_H * 0.22);
    let sz;
    if (isTrash) {
      const lo = Math.min(TRASH_SZ_MIN, riverCap);
      const hi = Math.min(TRASH_SZ_MAX, riverCap);
      sz = Math.round(lo + Math.pow(Math.random(), 0.8) * (hi - lo));
    } else {
      const fishLo = Math.min(FISH_SZ_MIN, riverCap);
      const fishHi = Math.min(FISH_SZ_MAX, riverCap);
      sz = Math.round(fishLo + Math.random() * (fishHi - fishLo));
    }

    const dur = s.itemSpeed + Math.random() * 2500;
    const arrivalT = performance.now() + arrivalDelay(dur);

    const tooSoon = s.activeItems.some((a) => Math.abs(a.arrivalTime - arrivalT) < MIN_ARRIVAL_GAP_MS);
    if (tooSoon) {
      setTimeout(spawnItem, 120);
      return;
    }

    const itemRiverY = pickSafeY(sz);
    const itemSceneY = s.RIVER_TOP + itemRiverY;
    const id = ++s.spawnId;
    s.activeItems.push({ id, arrivalTime: arrivalT, riverY: itemRiverY });

    const el = document.createElement("div");
    el.className = "rr-item";
    el.style.width = `${sz}px`;
    el.style.height = `${sz}px`;
    el.style.top = `${itemRiverY - sz / 2}px`;

    const img = document.createElement("img");
    img.src = src;
    img.alt = type;
    el.appendChild(img);

    const bob = 1.4 + Math.random() * 1.2;
    el.style.animationDuration = `${dur}ms, ${bob}s`;

    if (riverRef.current) riverRef.current.appendChild(el);

    const check = setInterval(() => {
      if (!stateRef.current.gameRunning) {
        clearInterval(check);
        removeTracked(id);
        el.remove();
        return;
      }

      const rect = el.getBoundingClientRect();
      const itemX = rect.left + rect.width / 2;
      const { CATCH_X, catcherY, mode } = stateRef.current;

      if (itemX < CATCH_X + 20 && itemX > CATCH_X - 30) {
        clearInterval(check);
        removeTracked(id);

        const inRange = Math.abs(catcherY - itemSceneY) < CATCHER_HALF + 24;
        const caught =
          inRange && ((type === "trash" && mode === "trash") || (type === "fish" && mode === "fish"));
        const wrongCatch = inRange && !caught;

        el.remove();

        if (caught) {
          if (type === "trash") {
            stateRef.current.trashCombo++;
            const pts = 10 * (stateRef.current.trashCombo >= 3 ? 2 : 1);
            stateRef.current.score += pts;
            updateScore(pts);
            updateTrashCombo();
            popupImg(
              src,
              stateRef.current.trashCombo >= 3 ? `+${pts} 🔥` : `+${pts}`,
              "#f39c12",
              CATCH_X,
              catcherY - 40
            );
          } else {
            stateRef.current.fishCount++;
            stateRef.current.trashCombo = 0;
            if(type === 'salmonImg') {
              stateRef.current.score += 10;
              updateScore(10);
            }
            else if(type === 'mackerelImg') {
              stateRef.current.score += 20;
              updateScore(20);
            }
            else if(type === 'red_snapperImg') {
              stateRef.current.score += 30;
              updateScore(30);
            }
            else if(type === 'yellowfinImg') {
              stateRef.current.score += 40;
              updateScore(40);
            }
            else if(type === 'tunaImg') {
              stateRef.current.score += 50;
              updateScore(50);
            }
            else {
              stateRef.current.score += 100;
              updateScore(100);
            }
            updateFishCount();
            updateTrashCombo();
            popupImg(src, "+1", "#4fc3e8", CATCH_X, catcherY - 40);
          }

          const c = catcherRef.current;
          if (c) {
            c.classList.remove("rr-miss-anim");
            void c.offsetWidth;
            c.classList.add("rr-catch-anim");
            setTimeout(() => c.classList.remove("rr-catch-anim"), 400);
          }
        } else {
          stateRef.current.trashCombo = 0;
          stateRef.current.lives--;
          updateScore(-1);
          updateLives();
          updateTrashCombo();

          const c = catcherRef.current;
          if (c) {
            c.classList.remove("rr-catch-anim");
            void c.offsetWidth;
            c.classList.add("rr-miss-anim");
            setTimeout(() => c.classList.remove("rr-miss-anim"), 400);
          }

          popup(wrongCatch ? "✖ WRONG!" : "✖ MISSED!", "#e74c3c", CATCH_X, itemSceneY - 30);

          if (stateRef.current.lives <= 0) endGame();
        }
      } else if (itemX < -80) {
        clearInterval(check);
        removeTracked(id);
        el.remove();
      }
    }, 40);
  }, [
    arrivalDelay,
    pickSafeY,
    removeTracked,
    updateFishCount,
    updateLives,
    updateScore,
    updateTrashCombo,
    popup,
    popupImg,
    endGame,
  ]);

  const rampUp = useCallback(() => {
    const s = stateRef.current;
    const cfg = s.hardMode ? CFG.hard : CFG.normal;
    s.spawnDelay = Math.max(cfg.minSpawn, s.spawnDelay - cfg.rampSpawn);
    s.itemSpeed = Math.max(cfg.minSpeed, s.itemSpeed - cfg.rampSpeed);

    clearInterval(s.spawnInterval);
    s.spawnInterval = setInterval(spawnItem, s.spawnDelay);
  }, [spawnItem]);

  useEffect(() => {
    spawnItemRef.current = spawnItem;
  }, [spawnItem]);

  useEffect(() => {
    rampUpRef.current = rampUp;
  }, [rampUp]);

  useEffect(() => {
    updateTimerRef.current = updateTimer;
  }, [updateTimer]);

  useEffect(() => {
    endGameRef.current = endGame;
  }, [endGame]);

  const pauseGame = useCallback(() => {
    const s = stateRef.current;
    if (!s.gameRunning) return;
    s.gameRunning = false;
    clearInterval(s.spawnInterval);
    clearInterval(s.diffInterval);
    clearInterval(s.timerInterval);
    document.querySelectorAll(".rr-item").forEach((el) => el.classList.add("paused"));
  }, []);

  const resumeGame = useCallback(() => {
    const s = stateRef.current;
    if (s.gameRunning) return;
    s.gameRunning = true;
    document.querySelectorAll(".rr-item").forEach((el) => el.classList.remove("paused"));
    s.spawnInterval = setInterval(() => spawnItemRef.current?.(), s.spawnDelay);
    s.diffInterval = setInterval(() => rampUpRef.current?.(), 8000);
    s.timerInterval = setInterval(() => {
      s.timeLeft--;
      updateTimerRef.current?.();
      if (s.timeLeft <= 0) endGameRef.current?.(true);
    }, 1000);
  }, []);

  const openSettings = useCallback(() => {
    pauseGame();
    setShowSettings(true);
  }, [pauseGame]);

  const closeSettings = useCallback(() => {
    setShowSettings(false);
    setShowQuitConfirm(false);
    resumeGame();
  }, [resumeGame]);

  const startGame = useCallback(() => {
    const s = stateRef.current;
    s.score = 0;
    s.lives = 3;
    s.trashCombo = 0;
    s.fishCount = 0;
    s.timeLeft = 60;
    s.activeItems.length = 0;
    s.spawnId = 0;

    const cfg = s.hardMode ? CFG.hard : CFG.normal;
    s.spawnDelay = cfg.spawnDelay;
    s.itemSpeed = cfg.itemSpeed;
    s.gameRunning = true;

    setGameStarted(true);
    setEndScreen(null);
    setHoneyStars([false, false, false]);

    layout();
    setMode("trash");
    updateScore(0);
    updateLives();
    updateTrashCombo();
    updateTimer();

    if (fishValRef.current) fishValRef.current.textContent = "0";
    if (hardBadgeRef.current) {
      hardBadgeRef.current.style.display = s.hardMode ? "inline-block" : "none";
    }

    document.querySelectorAll(".rr-item").forEach((i) => i.remove());

    s.spawnInterval = setInterval(spawnItem, s.spawnDelay);
    s.diffInterval = setInterval(rampUp, 8000);
    s.timerInterval = setInterval(() => {
      stateRef.current.timeLeft--;
      updateTimer();
      if (stateRef.current.timeLeft <= 0) endGame(true);
    }, 1000);

    spawnItem();
  }, [layout, setMode, updateScore, updateLives, updateTrashCombo, updateTimer, spawnItem, rampUp, endGame]);

  useEffect(() => {
    setShowSettings(false);
    setShowQuitConfirm(false);
    setEndScreen(null);

    const s = stateRef.current;
    s.gameRunning = false;
    clearInterval(s.spawnInterval);
    clearInterval(s.diffInterval);
    clearInterval(s.timerInterval);

    document.querySelectorAll(".rr-item").forEach((i) => i.remove());

    if (Number(levelId) > 1) {
      setDialogueIndex(0);
      startGame();
    } else {
      setGameStarted(false);
    }
  }, [levelId, startGame]);

  useEffect(() => {
    const styleEl = document.createElement("style");
    styleEl.textContent = STYLES;
    document.head.appendChild(styleEl);

    layout();
    window.addEventListener("resize", layout);
    stateRef.current.rafId = requestAnimationFrame(drawRiver);
    updateLives();

    const onMouseMove = (e) => {
      const s = stateRef.current;
      if (!s.gameRunning) return;
      s.catcherY = Math.max(s.RIVER_TOP, Math.min(s.RIVER_TOP + s.RIVER_H, e.clientY));
      if (catcherZoneRef.current) catcherZoneRef.current.style.top = `${s.catcherY}px`;
    };

    const onTouchMove = (e) => {
      const s = stateRef.current;
      if (!s.gameRunning) return;
      e.preventDefault();
      s.catcherY = Math.max(s.RIVER_TOP, Math.min(s.RIVER_TOP + s.RIVER_H, e.touches[0].clientY));
      if (catcherZoneRef.current) catcherZoneRef.current.style.top = `${s.catcherY}px`;
    };

    const onKeyDown = (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        if (stateRef.current.gameRunning) toggleMode();
      }
      if (e.code === "Escape") closeSettings();
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.head.removeChild(styleEl);
      window.removeEventListener("resize", layout);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("keydown", onKeyDown);
      cancelAnimationFrame(stateRef.current.rafId);
      clearInterval(stateRef.current.spawnInterval);
      clearInterval(stateRef.current.diffInterval);
      clearInterval(stateRef.current.timerInterval);
      document.querySelectorAll(".rr-item").forEach((i) => i.remove());
    };
  }, [layout, drawRiver, updateLives, toggleMode, closeSettings]);

  const handleHardRowClick = useCallback(() => {
    const s = stateRef.current;
    s.hardMode = !s.hardMode;
    hardRowRef.current?.classList.toggle("on", s.hardMode);
    const startBtn = document.getElementById("rr-start-btn");
    if (startBtn) {
      startBtn.classList.toggle("rr-hard-btn", s.hardMode);
      startBtn.textContent = s.hardMode ? " Start Hard!" : "Start!";
    }
  }, []);

  const INTRO_DIALOGUE = [
    { speaker: "Narrator", text: "Oh no! The river is full of trash,clean it up while catching salmon for our hungry customers!" },
    { speaker: "Narrator", text: "Move your mouse up and down to position your catcher along the left edge of the river." },
    { speaker: "Bear", text: "Switch between the Trash Can and Fish Net using SPACE or the button above. Only catch what matches!" },
    { speaker: "Bear", text: "Build a trash streak for bonus points, and catch as many salmon as you can. Good luck!" },
  ];

  const isLastDialogue = dialogueIndex === INTRO_DIALOGUE.length - 1;
  const currentLine = INTRO_DIALOGUE[dialogueIndex];

  const handleDialogueNext = () => {
    if (!isLastDialogue) {
      setDialogueIndex((i) => i + 1);
    } else {
      setDialogueIndex(0);
      startGame();
    }
  };

  const handleDialogueBack = (e) => {
    e.stopPropagation();
    if (dialogueIndex > 0) setDialogueIndex((i) => i - 1);
  };

  const btnStyle = {
    padding: "14px 38px",
    fontSize: "20px",
    borderRadius: "18px",
    border: "none",
    backgroundColor: "#e8e1cf",
    cursor: "pointer",
    boxShadow: "0 8px 15px rgba(0,0,0,0.15)",
    fontFamily: "'Fredoka One', cursive",
    transition: "transform 0.1s ease",
  };

  return (
    <div id="rr-root">
      <img src={A.grass} id="rr-bg" alt="" />

      <div id="rr-scene" ref={sceneRef}>
        <div id="rr-river" ref={riverRef}>
          <canvas id="rr-river-canvas" ref={canvasRef} />
        </div>
        <div id="rr-catch-line" ref={catchLineRef} />
        <div id="rr-catcher-zone" ref={catcherZoneRef}>
          <img id="rr-catcher" ref={catcherRef} src={A.trashcan} alt="catcher" />
        </div>
      </div>

      <div id="rr-hud" style={{ display: gameStarted ? "flex" : "none" }}>
        <div className="rr-hud-block">
          <span className="rr-hud-label">Score</span>
          <span className="rr-hud-val" id="rr-score-display" ref={scoreDisplayRef}>
            0
          </span>
        </div>
        <div className="rr-hud-block">
          <span className="rr-hud-label">Trash Streak</span>
          <span id="rr-combo-display" ref={comboDisplayRef}>
            —
          </span>
        </div>
        <button id="rr-toggle-btn" ref={toggleBtnRef} className="rr-trash-mode" onClick={toggleMode}>
          <img className="rr-mode-icon" ref={modeIconRef} src={A.trashcan} alt="mode" />
          <span ref={modeLabelRef}>Trash Can</span>
          <span style={{ opacity: 0.45 }}>⇄</span>
        </button>
        <span id="rr-hard-badge" ref={hardBadgeRef}>
          HARD
        </span>
        <div className="rr-hud-block">
          <span className="rr-hud-label">Saved</span>
          <span id="rr-fish-val" ref={fishValRef}>
            0
          </span>
        </div>
        <div className="rr-hud-block rr-lives-block">
          <span className="rr-hud-label">Lives</span>
          <div id="rr-lives-display" ref={livesDisplayRef} />
        </div>
        <div className="rr-hud-block">
          <span className="rr-hud-label">Time</span>
          <span className="rr-hud-val" id="rr-timer-display" ref={timerDisplayRef}>
            1:00
          </span>
        </div>
      </div>

      {gameStarted && (
        <button id="rr-settings-btn" title="Settings" onClick={openSettings}>
          <img
            src={settingsCogImg}
            alt="settings"
            style={{ width: "26px", height: "26px", objectFit: "contain" }}
          />
        </button>
      )}

      {showSettings && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60 }}>
          <Settings
            onClose={closeSettings}
            extraButtons={
              <button
                onClick={() => setShowQuitConfirm(true)}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                style={{
                  padding: "14px 38px",
                  fontSize: "20px",
                  borderRadius: "18px",
                  border: "none",
                  backgroundColor: "#7FBF3F",
                  color: "white",
                  cursor: "pointer",
                  boxShadow: "0 8px 15px rgba(0,0,0,0.15)",
                  fontFamily: "'Fredoka One', cursive",
                  transition: "transform 0.1s ease",
                }}
              >
                Main Menu
              </button>
            }
          />
        </div>
      )}

      {showQuitConfirm && (
        <QuitConfirmModal
          onConfirm={() => navigate("/")}
          onCancel={() => setShowQuitConfirm(false)}
        />
      )}

      {gameStarted && <div id="rr-hint">Move mouse · SPACE or click button to switch modes</div>}

      {endScreen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "65vw",
              maxWidth: "860px",
              background: "rgba(255,255,255,0.82)",
              borderRadius: "35px",
              padding: "50px",
              backdropFilter: "blur(18px)",
              boxShadow: "0 25px 50px rgba(0,0,0,0.18)",
              fontFamily: "'Fredoka One', cursive",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "clamp(2.5rem,6vw,4rem)", marginBottom: "8px" }}>
              {endScreen.timeUp ? "⏰" : "🐟"}
            </div>
            <h1 style={{ fontSize: "clamp(28px,5vw,52px)", margin: "0 0 8px" }}>
              {endScreen.timeUp ? "Time's Up!" : "Game Over!"}
            </h1>

            {endScreen.hardMode && (
              <div style={{ color: "#e74c3c", fontSize: "18px", marginBottom: "12px" }}>Hard Mode</div>
            )}

            {/* Honey jar rating — matches FishPrepGame */}
            <div style={{
              fontSize: "14px", letterSpacing: "2px", opacity: 0.6,
              textTransform: "uppercase", marginBottom: "4px", color: "#5a4a35",
            }}>
              Rating
            </div>
            <div style={{ display: "flex", gap: "8px", justifyContent: "center", margin: "18px 0" }}>
              {[0, 1, 2].map((i) => (
                <div key={i} className={`honey${honeyStars[i] ? " earned pop" : ""}`}>
                  <img src={honeyStars[i] ? filledHoneyImg : blankHoneyImg} alt="" />
                </div>
              ))}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "32px",
                margin: "18px 0 32px",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  background: "#e8e1cf",
                  borderRadius: "22px",
                  padding: "18px 32px",
                  boxShadow: "0 8px 15px rgba(0,0,0,0.1)",
                }}
              >
                <div style={{ fontSize: "14px", letterSpacing: "2px", opacity: 0.6 }}>SCORE</div>
                <div style={{ fontSize: "clamp(28px,4vw,42px)", color: "#5a4a35" }}>
                  {endScreen.score}
                </div>
              </div>

              <div
                style={{
                  background: "#e8e1cf",
                  borderRadius: "22px",
                  padding: "18px 32px",
                  boxShadow: "0 8px 15px rgba(0,0,0,0.1)",
                }}
              >
                <div style={{ fontSize: "14px", letterSpacing: "2px", opacity: 0.6 }}>SALMON SAVED</div>
                <div
                  style={{
                    fontSize: "clamp(28px,4vw,42px)",
                    color: "#4fc3e8",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    justifyContent: "center",
                  }}
                >
                  {endScreen.fishCount}
                  <img
                    src={A.salmon}
                    style={{ width: "36px", height: "36px", objectFit: "contain" }}
                    alt="salmon"
                  />
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: "16px", flexWrap: "wrap" }}>
              <button
                onClick={() => navigate("/level-selection")}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                style={btnStyle}
              >
                ← Level Menu
              </button>

              <button
                onClick={() => {
                  if (endScreen.hasNextLevel) {
                    navigate(`/level/${endScreen.nextLevelId}`);
                  }
                }}
                onMouseEnter={(e) => {
                  if (endScreen.hasNextLevel) e.currentTarget.style.transform = "scale(1.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                }}
                style={{
                  ...btnStyle,
                  backgroundColor: endScreen.hasNextLevel ? "#7FBF3F" : "#cccccc",
                  color: "white",
                  cursor: endScreen.hasNextLevel ? "pointer" : "not-allowed",
                  opacity: endScreen.hasNextLevel ? 1 : 0.6,
                }}
              >
                Next Level →
              </button>
            </div>
          </div>
        </div>
      )}

      {!gameStarted && !endScreen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50 }}>
          <button
            onClick={() => {
              setDialogueIndex(0);
              startGame();
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            style={{ ...btnStyle, position: "absolute", top: "3%", right: "3%" }}
          >
            Skip →
          </button>

          <button
            onClick={() => navigate("/level-selection")}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            style={{ ...btnStyle, position: "absolute", top: "3%", left: "3%" }}
          >
            ← Level Menu
          </button>

          <div
            id="rr-hard-row"
            ref={hardRowRef}
            onClick={handleHardRowClick}
            style={{ position: "absolute", top: "3%", left: "50%", transform: "translateX(-50%)" }}
          >
            <div id="rr-hard-switch">
              <div id="rr-hard-knob" />
            </div>
            <span id="rr-hard-text">Hard Mode</span>
          </div>

          <img
            src={wavingBearImg}
            alt="waving bear"
            style={{
              position: "absolute",
              bottom: 0,
              left: "2%",
              height: "55vh",
              maxHeight: "420px",
              objectFit: "contain",
              zIndex: 1,
              filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.2))",
              pointerEvents: "none",
            }}
          />

          <div
            onClick={handleDialogueNext}
            style={{
              position: "absolute",
              bottom: "4%",
              left: "50%",
              transform: "translateX(-50%)",
              width: "72vw",
              maxWidth: "860px",
              cursor: "pointer",
              zIndex: 2,
            }}
          >
            <div
              style={{
                display: "inline-block",
                background: "#f5eedc",
                border: "3px solid #c8b89a",
                borderBottom: "none",
                borderRadius: "14px 14px 0 0",
                padding: "6px 22px",
                fontFamily: "'Fredoka One', cursive",
                fontSize: "18px",
                color: "#5a4a35",
                marginLeft: "24px",
                boxShadow: "0 -2px 8px rgba(0,0,0,0.06)",
              }}
            >
              {currentLine.speaker}
            </div>

            <div
              style={{
                background: "#fdf6e3",
                border: "3px solid #c8b89a",
                borderRadius: "0 18px 18px 18px",
                padding: "24px 32px",
                boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
                textAlign: "left",
              }}
            >
              <p
                style={{
                  fontFamily: "'Fredoka One', cursive",
                  fontSize: "clamp(16px, 1.8vw, 22px)",
                  color: "#3d2e1e",
                  margin: 0,
                  lineHeight: 1.6,
                  minHeight: "60px",
                  textAlign: "left",
                  whiteSpace: "normal",
                  wordBreak: "normal",
                }}
              >
                {currentLine.text}
              </p>

              <div style={{ display: "flex", alignItems: "center", marginTop: "16px", gap: "10px" }}>
                <button
                  onClick={handleDialogueBack}
                  disabled={dialogueIndex === 0}
                  onMouseEnter={(e) => {
                    if (dialogueIndex > 0) e.currentTarget.style.transform = "scale(1.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: "4px 12px",
                    fontFamily: "'Fredoka One', cursive",
                    fontSize: "16px",
                    color: dialogueIndex === 0 ? "#c8b89a" : "#a08c72",
                    cursor: dialogueIndex === 0 ? "not-allowed" : "pointer",
                    transition: "transform 0.1s ease",
                    flexShrink: 0,
                  }}
                >
                  ◀
                </button>

                {INTRO_DIALOGUE.map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: i === dialogueIndex ? "20px" : "8px",
                      height: "8px",
                      borderRadius: "999px",
                      background: i === dialogueIndex ? "#c8b89a" : "#e0d5c0",
                      transition: "width 0.2s ease",
                      flexShrink: 0,
                    }}
                  />
                ))}

                <span
                  style={{
                    marginLeft: "auto",
                    fontFamily: "'Fredoka One', cursive",
                    fontSize: "14px",
                    color: "#a08c72",
                    flexShrink: 0,
                  }}
                >
                  {isLastDialogue ? "Let's go! ▶" : "Click to continue ▶"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
