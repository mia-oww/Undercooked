import { useEffect, useRef, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { saveLevelResult } from "../../../utils/levelProgress";
import blankHoneyImg from "../../../assets/sprites/fish-prep/blankhoney.png";
import filledHoneyImg from "../../../assets/sprites/fish-prep/honey2.png";
import wavingBearImg from "../../../assets/sprites/river-game-sprites/wavingbear.png";
import homescreenImg from "../../../assets/trees_background1.png"; 
import trash2Img from "../../../assets/sprites/river-game-sprites/trash2.png";
import trash3Img from "../../../assets/sprites/river-game-sprites/trash3.png";
import trash4Img from "../../../assets/sprites/river-game-sprites/trash4.png";
import trashcanImg from "../../../assets/sprites/river-game-sprites/trashcan.png";

const ITEM_IMAGES = {
  COMPOST:  trash2Img,
  RECYCLE:  trash3Img,
  LANDFILL: trash4Img,
  SPECIAL:  trashcanImg,
};

// ─── Pyodide / Python game logic ──────────────────────────────────────────────
const PYODIDE_CDN = "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js";

const SORT_GAME_PY = `
from __future__ import annotations
from dataclasses import dataclass
import random

CATEGORIES = ["COMPOST", "RECYCLE", "LANDFILL", "SPECIAL"]
POINTS_CORRECT = 100
PENALTY_WRONG = 50
PENALTY_SPECIAL_WRONG = 150
STREAK_BONUS_PER = 10
MAX_SPEED_BONUS = 200
BONUS_ZERO_AT_SEC = 90.0

def speedBonus(elapsedSec):
    if elapsedSec <= 0: return MAX_SPEED_BONUS
    if elapsedSec >= BONUS_ZERO_AT_SEC: return 0
    t = elapsedSec / BONUS_ZERO_AT_SEC
    return int(MAX_SPEED_BONUS * (1.0 - t))

@dataclass
class Item:
    id: int
    name: str
    category: str
    why: str
    whyNot: str
    placed: bool = False

@dataclass
class Game:
    items: list
    score: int = 0
    misses: int = 0
    criticalMisses: int = 0
    placedCount: int = 0
    started: bool = False
    startMs: object = None
    finished: bool = False
    finishMs: object = None
    streak: int = 0
    lastDrop: object = None

    @property
    def totalItems(self):
        return len(self.items)

    def reset(self, seed=None):
        rng = random.Random(seed)
        sushiTrashBank = [
            ("Rice scraps", "COMPOST",
             "Rice is organic food waste that can break down naturally in compost.",
             "This contains organic food material, which doesn't belong here."),
            ("Seaweed scraps (nori)", "COMPOST",
             "Seaweed is natural organic material that can decompose in compost systems.",
             "This is organic food material, which doesn't belong here."),
            ("Wasabi leftovers", "COMPOST",
             "Food leftovers are organic and can be composted instead of sent to landfill.",
             "This contains organic food residue, which doesn't belong here."),
            ("Soiled paper napkin", "COMPOST",
             "Soiled paper fibers can often be composted when recycling is not possible.",
             "This contains food residue and paper fibers, which don't belong here."),
            ("Aluminum drink can", "RECYCLE",
             "Aluminum is a recyclable metal that can be reused many times.",
             "This is metal material, which doesn't belong here."),
            ("Clean plastic bottle", "RECYCLE",
             "Clean plastic bottles are recyclable materials in many programs.",
             "This is rigid plastic material, which doesn't belong here."),
            ("Clean cardboard sleeve", "RECYCLE",
             "Clean cardboard fibers can be recycled into new paper products.",
             "This is clean paper/cardboard material, which doesn't belong here."),
            ("Glass sauce bottle", "RECYCLE",
             "Glass containers can be melted and reused through recycling systems.",
             "This is glass material, which doesn't belong here."),
            ("Plastic soy sauce packet", "LANDFILL",
             "This is multi-layer plastic film that usually cannot be recycled curbside.",
             "This is thin plastic film material, which doesn't belong here."),
            ("Plastic wrap film", "LANDFILL",
             "Plastic film is not commonly accepted in curbside recycling.",
             "This is soft plastic film material, which doesn't belong here."),
            ("Greasy takeout container", "LANDFILL",
             "Food-contaminated plastic often cannot be recycled.",
             "This contains greasy plastic material, which doesn't belong here."),
            ("Styrofoam tray", "LANDFILL",
             "Foam containers are rarely recyclable in standard programs.",
             "This is foam plastic material, which doesn't belong here."),
            ("Battery (kitchen timer)", "SPECIAL",
             "Batteries contain chemicals and metals that require special disposal.",
             "This contains hazardous battery materials, which don't belong here."),
            ("Broken light bulb", "SPECIAL",
             "Some light bulbs contain sensitive materials that require special handling.",
             "This contains fragile or sensitive materials, which don't belong here."),
            ("Old POS device", "SPECIAL",
             "Electronics contain metals and components that must be recycled properly.",
             "This contains electronic components and metals, which don't belong here."),
            ("Rechargeable battery pack", "SPECIAL",
             "Rechargeable batteries require proper disposal to prevent fire risk.",
             "This contains rechargeable battery materials, which don't belong here."),
        ]
        rng.shuffle(sushiTrashBank)
        items = []
        iid = 1
        for name, cat, why, whyNot in sushiTrashBank:
            items.append(Item(id=iid, name=name, category=cat, why=why, whyNot=whyNot))
            iid += 1
        self.items = items
        self.score = 0; self.misses = 0; self.criticalMisses = 0
        self.placedCount = 0; self.started = False; self.startMs = None
        self.finished = False; self.finishMs = None; self.streak = 0; self.lastDrop = None

    def _ensureStarted(self, nowMs):
        if not self.started:
            self.started = True
            self.startMs = nowMs

    def elapsedMs(self, nowMs):
        if not self.started or self.startMs is None: return 0
        endMs = self.finishMs if self.finished and self.finishMs is not None else nowMs
        return max(0, int(endMs - self.startMs))

    def asDict(self, nowMs):
        ems = self.elapsedMs(nowMs)
        return {
            "items": [{"id": it.id, "name": it.name, "category": it.category,
                       "why": it.why, "whyNot": it.whyNot, "placed": it.placed}
                      for it in self.items],
            "score": self.score, "misses": self.misses, "criticalMisses": self.criticalMisses,
            "placedCount": self.placedCount, "totalItems": self.totalItems,
            "started": self.started, "finished": self.finished, "elapsedMs": ems,
            "bonusPreview": speedBonus(ems / 1000.0) if self.started else MAX_SPEED_BONUS,
            "streak": self.streak, "lastDrop": self.lastDrop,
        }

    def dropItem(self, itemId, binCategory, nowMs):
        if self.finished: return self.asDict(nowMs)
        self._ensureStarted(nowMs)
        item = next((it for it in self.items if it.id == itemId), None)
        if item is None or item.placed: return self.asDict(nowMs)
        if binCategory == "NONE":
            self.lastDrop = None
            return self.asDict(nowMs)
        isCorrect = (binCategory == item.category)
        missType = None
        if isCorrect:
            item.placed = True
            self.placedCount += 1
            self.streak += 1
            self.score += POINTS_CORRECT + (STREAK_BONUS_PER * max(0, self.streak - 1))
        else:
            self.streak = 0
            if item.category == "SPECIAL":
                self.criticalMisses += 1; penalty = PENALTY_SPECIAL_WRONG; missType = "critical"
            else:
                self.misses += 1; penalty = PENALTY_WRONG; missType = "normal"
            self.score = max(0, self.score - penalty)
        message = item.why if isCorrect else item.whyNot
        self.lastDrop = {"itemId": item.id, "name": item.name, "isCorrect": isCorrect,
                         "message": message, "chosen": binCategory,
                         "streak": self.streak, "missType": missType}
        if self.placedCount == self.totalItems:
            self.finished = True
            self.finishMs = nowMs
            elapsedSec = (self.finishMs - self.startMs) / 1000.0 if self.startMs is not None else 9999.0
            self.score += speedBonus(elapsedSec)
        return self.asDict(nowMs)

def newGame(seed=None):
    g = Game(items=[])
    g.reset(seed=seed)
    return g
`;

// ─── Constants ─────────────────────────────────────────────────────────────────
const DIALOGUE = [
  { speaker: "Bear", text: "Welcome to the recycling station! After a big sushi day, there's a lot of waste to handle." },
  { speaker: "Bear", text: "Not everything goes in the same bin — the wrong choice can hurt the environment!" },
  { speaker: "Narrator", text: "Drag each item into the correct bin: Compost, Recycle, Landfill, or Special waste." },
  { speaker: "Narrator", text: "Sort faster for a speed bonus. Watch out for special waste — wrong placement costs more points!" },
];

const BIN_COLORS = {
  COMPOST:  { bg: "#4caf50", light: "#a5d6a7", emoji: "🌱" },
  RECYCLE:  { bg: "#2196f3", light: "#90caf9", emoji: "♻️" },
  LANDFILL: { bg: "#9e9e9e", light: "#e0e0e0", emoji: "🗑️" },
  SPECIAL:  { bg: "#ff5722", light: "#ffccbc", emoji: "⚠️" },
};

const CATEGORY_HINTS = {
  COMPOST:  "Food scraps & soiled paper → Compost",
  RECYCLE:  "Clean bottles, cans & cardboard → Recycle",
  LANDFILL: "Contaminated or multi-layer plastic → Landfill",
  SPECIAL:  "Batteries & electronics → Special disposal",
};

function nowMs() { return Math.floor(performance.now()); }

function toJS(x) {
  return x.toJs({ dict_converter: Object.fromEntries });
}

function calcStars(score, misses, criticalMisses) {
  if (criticalMisses === 0 && misses === 0) return 3;
  if (criticalMisses === 0 && misses <= 2) return 2;
  return 1;
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function RecycleGame() {
  const navigate = useNavigate();

  // Dialogue
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);

  // Pyodide
  const [pyReady, setPyReady] = useState(false);
  const [pyError, setPyError] = useState(null);
  const pyRef = useRef(null);
  const gameObjRef = useRef(null);

  // Game state (JS mirror of Python state)
  const [gameState, setGameState] = useState(null);
  const [items, setItems] = useState([]); // {id, name, category, placed, x, y, homeX, homeY}
  const [feedback, setFeedback] = useState(null); // {text, type: "correct"|"wrong"|"critical"}

  // Drag
  const draggingRef = useRef(null); // {id, offX, offY}
  const [draggingId, setDraggingId] = useState(null);
  const [ghostPos, setGhostPos] = useState({ x: 0, y: 0 });

  // Results
  const [showResults, setShowResults] = useState(false);
  const [honeyEarned, setHoneyEarned] = useState([false, false, false]);
  const [honeyPop, setHoneyPop] = useState([false, false, false]);
  const [finalStars, setFinalStars] = useState(0);

  // Canvas / layout refs
  const containerRef = useRef(null);
  const animFrameRef = useRef(null);
  const tickRef = useRef(null);

  // ── Layout ────────────────────────────────────────────────────────────────────
  function layoutItems(pyItems) {
    const cols = 4;
    const itemW = 130, itemH = 56, gapX = 14, gapY = 12;
    const startX = 16, startY = 60;
    setItems(pyItems.map((it, idx) => {
      const r = Math.floor(idx / cols);
      const c = idx % cols;
      const x = startX + c * (itemW + gapX);
      const y = startY + r * (itemH + gapY);
      return { ...it, x, y, homeX: x, homeY: y, w: itemW, h: itemH };
    }));
  }

  // ── Load Pyodide ──────────────────────────────────────────────────────────────
  function initGame(py) {
    pyRef.current = py;
    const newGame = py.globals.get("newGame");
    gameObjRef.current = newGame(null);
    const state = toJS(gameObjRef.current.asDict(nowMs()));
    setGameState(state);
    layoutItems(state.items);
    setPyReady(true);
  }

  useEffect(() => {
    if (window.__pyodide_loaded) {
      initGame(window.__pyodide_instance);
      return;
    }
    const script = document.createElement("script");
    script.src = PYODIDE_CDN;
    script.onload = async () => {
      try {
        const py = await window.loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/" });
        py.runPython(SORT_GAME_PY);
        window.__pyodide_loaded = true;
        window.__pyodide_instance = py;
        initGame(py);
      } catch (e) {
        setPyError("Failed to load game engine: " + e.message);
      }
    };
    document.head.appendChild(script);
  }, []);

  function syncPlaced(pyItems) {
    const map = new Map(pyItems.map(it => [it.id, it.placed]));
    setItems(prev => prev.map(it => ({ ...it, placed: map.get(it.id) ?? it.placed })));
  }

  // ── Tick (update elapsed time display) ───────────────────────────────────────
  useEffect(() => {
    if (!pyReady || !gameStarted) return;
    const id = setInterval(() => {
      if (!gameObjRef.current || !gameState?.started || gameState?.finished) return;
      const state = toJS(gameObjRef.current.asDict(nowMs()));
      setGameState(state);
    }, 500);
    return () => clearInterval(id);
  }, [pyReady, gameStarted, gameState?.started, gameState?.finished]);

  // ── Finish → show results ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!gameState?.finished || showResults) return;
    const stars = calcStars(gameState.score, gameState.misses, gameState.criticalMisses);
    setFinalStars(stars);
    saveLevelResult(4, stars);
    setTimeout(() => {
      setShowResults(true);
      [0, 1, 2].forEach((i) => {
        if (i < stars) {
          setTimeout(() => {
            setHoneyEarned(prev => { const n = [...prev]; n[i] = true; return n; });
            setTimeout(() => {
              setHoneyPop(prev => { const n = [...prev]; n[i] = true; return n; });
              setTimeout(() => {
                setHoneyPop(prev => { const n = [...prev]; n[i] = false; return n; });
              }, 600);
            }, 20);
          }, 600 + i * 450);
        }
      });
    }, 800);
  }, [gameState?.finished]);

  // ── Dialogue ──────────────────────────────────────────────────────────────────
  const isLastDialogue = dialogueIndex === DIALOGUE.length - 1;

  function handleDialogueClick() {
    if (isLastDialogue) {
      setGameStarted(true);
    } else {
      setDialogueIndex(i => i + 1);
    }
  }

  // ── Drag helpers ──────────────────────────────────────────────────────────────
  function getBinUnderPoint(cx, cy, containerEl) {
    const rect = containerEl.getBoundingClientRect();
    const relX = cx - rect.left;
    const relY = cy - rect.top;
    // bins are positioned absolutely inside the game area; we query them
    const binEls = containerEl.querySelectorAll("[data-bin]");
    for (const el of binEls) {
      const br = el.getBoundingClientRect();
      const elX = br.left - rect.left;
      const elY = br.top - rect.top;
      if (relX >= elX && relX <= elX + br.width && relY >= elY && relY <= elY + br.height) {
        return el.dataset.bin;
      }
    }
    return null;
  }

  function onMouseDown(e, item) {
    if (!gameStarted || item.placed || gameState?.finished) return;
    e.preventDefault();
    draggingRef.current = { id: item.id, offX: -40, offY: -20 };
    setDraggingId(item.id);
  }

  function onMouseMove(e) {
    if (!draggingRef.current) return;
    e.preventDefault();
    setGhostPos({ x: e.clientX, y: e.clientY });
    setItems(prev => prev.map(it => it.id === draggingRef.current.id ? { ...it, dragX: e.clientX, dragY: e.clientY } : it));
  }

  function onMouseUp(e) {
    if (!draggingRef.current) return;
    const { id } = draggingRef.current;
    const item = items.find(it => it.id === id);
    draggingRef.current = null;
    setDraggingId(null);

    if (!item || !containerRef.current) return;

    // find center of dragged item
    const containerRect = containerRef.current.getBoundingClientRect();
    const cx = e.clientX - containerRect.left;
    const cy = e.clientY - containerRect.top;
    const binCategory = getBinUnderPoint(cx, cy, containerRef.current) ?? "NONE";

    const newState = toJS(gameObjRef.current.dropItem(id, binCategory, nowMs()));
    setGameState(newState);
    syncPlaced(newState.items);

    if (newState.lastDrop) {
      const drop = newState.lastDrop;
      if (drop.isCorrect) {
        setFeedback({ text: "✔ Correct! " + drop.message, type: "correct" });
      } else if (drop.missType === "critical") {
        setFeedback({ text: "⚠ Critical! " + drop.message, type: "critical" });
      } else {
        setFeedback({ text: "✖ Not quite. " + drop.message, type: "wrong" });
      }
      setTimeout(() => setFeedback(null), 4000);
    }

    // snap back if not placed
    const placed = newState.items.find(it => it.id === id)?.placed;
    if (!placed) {
      setItems(prev => prev.map(it => it.id === id ? { ...it, x: it.homeX, y: it.homeY } : it));
    }
  }

  // Touch support
  function onTouchStart(e, item) {
    if (!gameStarted || item.placed || gameState?.finished) return;
    draggingRef.current = { id: item.id, offX: -40, offY: -20 };
    setDraggingId(item.id);
  }

  function onTouchMove(e) {
    if (!draggingRef.current) return;
    e.preventDefault();
    const touch = e.touches[0];
    setGhostPos({ x: touch.clientX, y: touch.clientY });
    setItems(prev => prev.map(it => it.id === draggingRef.current.id ? { ...it, dragX: touch.clientX, dragY: touch.clientY } : it));
  }

  function onTouchEnd(e) {
    if (!draggingRef.current) return;
    const touch = e.changedTouches[0];
    const syntheticEvent = { clientX: touch.clientX, clientY: touch.clientY };
    onMouseUp(syntheticEvent);
  }

  // ── Reset ─────────────────────────────────────────────────────────────────────
  function handleReset() {
    const newGame = pyRef.current.globals.get("newGame");
    gameObjRef.current = newGame(null);
    const state = toJS(gameObjRef.current.asDict(nowMs()));
    setGameState(state);
    layoutItems(state.items);
    setFeedback(null);
    setShowResults(false);
    setHoneyEarned([false, false, false]);
    setHoneyPop([false, false, false]);
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  const elapsed = gameState ? (gameState.elapsedMs / 1000).toFixed(2) : "0.00";

  const BIN_RGB = {
    COMPOST:  "rgb(110,200,120)",
    RECYCLE:  "rgb(80,150,240)",
    LANDFILL: "rgb(160,160,175)",
    SPECIAL:  "rgb(240,120,80)",
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{
        width: "100vw", height: "100vh", overflow: "hidden",
        background: `url(${homescreenImg}) center/cover no-repeat`,
        fontFamily: "system-ui, -apple-system, sans-serif",
        display: "flex", flexDirection: "column",
        userSelect: "none", color: "#eee",
      }}
    >
      <style>{`
        @keyframes honeyPop {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.45) rotate(-8deg); }
          65%  { transform: scale(0.9) rotate(4deg); }
          85%  { transform: scale(1.12); }
          100% { transform: scale(1); }
        }
        .honey-jar { width: 52px; height: 52px; }
        .honey-jar.pop { animation: honeyPop 0.6s cubic-bezier(0.34,1.56,0.6,1) forwards; }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── HUD ── */}
      <style>{`
        #rg-hud {
          position: fixed; top: 14px; left: 50%; transform: translateX(-50%); z-index: 20;
          display: flex; align-items: center; justify-content: center;
          gap: 10px; background: none; pointer-events: none;
        }
        .rg-hud-block {
          display: flex; flex-direction: column; align-items: center; min-width: 58px;
          background: rgba(255,255,255,0.22);
          backdrop-filter: blur(14px) saturate(1.6);
          -webkit-backdrop-filter: blur(14px) saturate(1.6);
          border: 1px solid rgba(255,255,255,0.45); border-radius: 18px;
          padding: 5px 18px 6px;
          box-shadow: 0 4px 18px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.5);
        }
        .rg-hud-label {
          font-size: 0.5rem; letter-spacing: 1.5px; text-transform: uppercase;
          color: rgba(255,255,255,0.75); font-weight: 800;
          text-shadow: 0 1px 3px rgba(0,0,0,0.35); white-space: nowrap;
        }
        .rg-hud-val {
          font-family: 'Fredoka One', cursive; font-size: 1.4rem; line-height: 1.1;
          color: #fff; transition: color 0.3s; text-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
        .rg-hud-val.good { color: #5effa0; }
        .rg-hud-val.bad  { color: #ff6b6b; }

        #rg-top-right {
          position: fixed; top: 14px; right: 14px; z-index: 20;
          display: flex; gap: 8px; pointer-events: auto;
        }
        .rg-top-btn {
          padding: 8px 20px;
          background: #e8e1cf; color: #3d2e1e;
          border: none; border-radius: 18px;
          font-family: 'Fredoka One', cursive; font-size: 15px;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(0,0,0,0.12);
          transition: transform 0.12s ease;
        }
        .rg-top-btn:hover { transform: scale(1.05); }
      `}</style>

      <div id="rg-hud">
        <div className="rg-hud-block">
          <span className="rg-hud-label">Score</span>
          <span className="rg-hud-val">{gameState?.score ?? 0}</span>
        </div>
        <div className="rg-hud-block">
          <span className="rg-hud-label">Placed</span>
          <span className="rg-hud-val">{gameState?.placedCount ?? 0}/{gameState?.totalItems ?? 16}</span>
        </div>
        <div className="rg-hud-block">
          <span className="rg-hud-label">Misses</span>
          <span className={`rg-hud-val${(gameState?.misses ?? 0) > 0 ? " bad" : ""}`}>{gameState?.misses ?? 0}</span>
        </div>
        <div className="rg-hud-block">
          <span className="rg-hud-label">Critical</span>
          <span className={`rg-hud-val${(gameState?.criticalMisses ?? 0) > 0 ? " bad" : ""}`}>{gameState?.criticalMisses ?? 0}</span>
        </div>
        <div className="rg-hud-block">
          <span className="rg-hud-label">Time</span>
          <span className="rg-hud-val">{elapsed}s</span>
        </div>
      </div>

      <div id="rg-top-right">
        <button className="rg-top-btn" onClick={() => navigate("/level-selection")}>← Menu</button>
        <button className="rg-top-btn" onClick={handleReset}>↺ Reset</button>
      </div>

      {/* ── Feedback hint bar — bottom center, like FishPrepGame ── */}
      {gameStarted && feedback && (
        <div style={{
          position: "fixed", bottom: "18px", left: "50%", transform: "translateX(-50%)",
          fontSize: "0.88rem", fontWeight: 700, letterSpacing: "0.5px", zIndex: 15,
          whiteSpace: "nowrap", pointerEvents: "none",
          textShadow: "0 1px 4px rgba(0,0,0,0.4)",
          background: feedback.type === "correct"
            ? "rgba(74,124,89,0.88)"
            : feedback.type === "critical"
              ? "rgba(180,30,30,0.88)"
              : "rgba(184,92,32,0.88)",
          backdropFilter: "blur(8px)",
          color: "white", padding: "8px 24px", borderRadius: "50px",
          border: "1px solid rgba(255,255,255,0.2)",
          fontFamily: "system-ui, sans-serif",
          boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
          transition: "background 0.3s ease",
        }}>
          {feedback.text}
        </div>
      )}

      {/* ── Main layout: left panel + right bins ── */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "row",
        gap: "22px", padding: "72px 24px 16px",
        overflow: "hidden",
      }}>

        {/* ── Left: items panel ── */}
        <div style={{
          width: "520px", flexShrink: 0,
          background: "#e6e6e6",
          borderRadius: "14px",
          border: "1px solid #2a2a38",
          padding: "14px",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
          <div style={{ fontSize: "13px", color: "#111111", marginBottom: "10px" }}>
            Drag items into matching bins. Faster finish = more points.
            &nbsp;+100 correct, -50 wrong, -150 critical. &nbsp;+10 bonus per streak.
          </div>
<div style={{
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: "8px",
  flex: 1,
  alignContent: "start",
}}>
  {items.map((item) => {
    const isDragging = draggingId === item.id;
    return (
      <div
        key={item.id}
        onMouseDown={(e) => onMouseDown(e, item)}
        onTouchStart={(e) => onTouchStart(e, item)}
        style={{
          height: "60px",
          borderRadius: "10px",
          background: item.placed ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.15)",
          border: "2px solid rgba(255,255,255,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: item.placed ? "default" : "grab",
          opacity: item.placed ? 0.25 : isDragging ? 0.5 : 1,
          pointerEvents: item.placed ? "none" : "auto",
          boxShadow: "0 3px 8px rgba(0,0,0,0.25)",
          padding: "4px",
        }}
      >
        <img
          src={ITEM_IMAGES[item.category]}
          alt={item.name}
          draggable={false}
          style={{ height: "100%", objectFit: "contain" }}
        />
      </div>
    );
  })}
</div>
        </div>

        {/* ── Right: 2x2 bins ── */}
        <div style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: "1fr 1fr",
          gap: "16px",
        }}>
          {["COMPOST", "RECYCLE", "LANDFILL", "SPECIAL"].map((cat) => { // IMAGES for bins could be added here instead of colored boxes
            const rgb = BIN_RGB[cat];
            return (
              <div
                key={cat}
                data-bin={cat}
                style={{
                  borderRadius: "14px",
                  border: `2px solid #eee`,
                  background: rgb,
                  display: "flex", flexDirection: "column",
                  padding: "12px 14px",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div style={{ fontSize: "700 18px system-ui", fontWeight: "bold", fontSize: "18px" }}>
                  {cat}
                </div>
                {/* inner dark drop area */}
                <div style={{
                  flex: 1, marginTop: "10px",
                  background: "#e9e9e9",
                  borderRadius: "10px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "13px", color: "#555",
                }}>
                  {items.filter(it => it.placed && it.category === cat).length > 0
                    ? `${items.filter(it => it.placed && it.category === cat).length} sorted`
                    : "drop here"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Drag ghost ── */}
      {draggingId && (() => {
        const item = items.find(it => it.id === draggingId);
        if (!item) return null;
        const rgb = BIN_RGB[item.category];
        return (
          <div style={{
            position: "fixed",
            left: ghostPos.x - 50,
            top: ghostPos.y - 26,
            width: "100px", height: "52px",
            background: rgb,
            border: "2px solid #eee",
            borderRadius: "12px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: "bold", fontSize: "15px", color: "#fff",
            boxShadow: "0 10px 28px rgba(0,0,0,0.5)",
            pointerEvents: "none", zIndex: 9999,
            transform: "scale(1.08)",
          }}>
            {item.category[0]}
          </div>
        );
      })()}

      {/* ── Loading overlay ── */}
      {!pyReady && !pyError && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 500,
          background: "rgba(17,17,24,0.95)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: "12px",
        }}>
          <div style={{ fontSize: "20px" }}>Loading Python engine…</div>
          <div style={{ fontSize: "13px", color: "#888" }}>This may take a moment the first time</div>
        </div>
      )}
      {pyError && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 500,
          background: "rgba(17,17,24,0.95)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ color: "#ff4d4d", fontSize: "16px" }}>{pyError}</div>
        </div>
      )}

      {/* ── Intro dialogue ── */}
      {pyReady && !gameStarted && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 300,
          background: "rgba(0,0,0,0.6)",
        }}>
          {/* Skip button */}
          <button
            onClick={() => setGameStarted(true)}
            style={{
              position: "absolute", top: "3%", right: "3%",
              padding: "14px 38px", fontSize: "20px", borderRadius: "18px",
              border: "none", backgroundColor: "#e8e1cf", color: "#3d2e1e",
              cursor: "pointer", fontFamily: "'Fredoka One', cursive",
              boxShadow: "0 8px 15px rgba(0,0,0,0.15)",
              transition: "transform 0.1s ease",
            }}
            onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          >
            Skip →
          </button>

          {/* Level menu button */}
          <button
            onClick={() => navigate("/level-selection")}
            style={{
              position: "absolute", top: "3%", left: "3%",
              padding: "14px 38px", fontSize: "20px", borderRadius: "18px",
              border: "none", backgroundColor: "#e8e1cf", color: "#3d2e1e",
              cursor: "pointer", fontFamily: "'Fredoka One', cursive",
              boxShadow: "0 8px 15px rgba(0,0,0,0.15)",
              transition: "transform 0.1s ease",
            }}
            onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          >
            ← Level Menu
          </button>

          {/* Waving bear — bottom left, same as FishPrepGame */}
          <img
            src={wavingBearImg}
            alt="waving bear"
            style={{
              position: "absolute", bottom: 0, left: "2%",
              height: "55vh", maxHeight: "420px",
              objectFit: "contain", zIndex: 1,
              filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.2))",
              pointerEvents: "none",
            }}
          />

          {/* Dialogue box — bottom center, clicking advances */}
          <div
            onClick={handleDialogueClick}
            style={{
              position: "absolute", bottom: "4%", left: "50%",
              transform: "translateX(-50%)",
              width: "72vw", maxWidth: "860px",
              cursor: "pointer", zIndex: 2,
            }}
          >
            {/* Speaker tab */}
            <div style={{
              display: "inline-block",
              background: "#f5eedc",
              border: "3px solid #c8b89a",
              borderBottom: "none",
              borderRadius: "14px 14px 0 0",
              padding: "6px 22px",
              fontFamily: "'Fredoka One', cursive",
              fontSize: "18px", color: "#5a4a35",
              marginLeft: "24px",
              boxShadow: "0 -2px 8px rgba(0,0,0,0.06)",
            }}>
              {DIALOGUE[dialogueIndex].speaker}
            </div>

            {/* Dialogue content */}
            <div style={{
              background: "#fdf6e3",
              border: "3px solid #c8b89a",
              borderRadius: "0 18px 18px 18px",
              padding: "24px 32px",
              boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
            }}>
              <p style={{
                fontFamily: "'Fredoka One', cursive",
                fontSize: "clamp(16px,1.8vw,22px)",
                color: "#3d2e1e", margin: 0, lineHeight: 1.6,
                minHeight: "60px",
              }}>
                {DIALOGUE[dialogueIndex].text}
              </p>

              <div style={{ display: "flex", alignItems: "center", marginTop: "16px", gap: "10px" }}>
                {DIALOGUE.map((_, i) => (
                  <div key={i} style={{
                    width: i === dialogueIndex ? "20px" : "8px",
                    height: "8px", borderRadius: "999px",
                    background: i === dialogueIndex ? "#c8b89a" : "#e0d5c0",
                    transition: "width 0.2s ease", flexShrink: 0,
                  }} />
                ))}
                <span style={{
                  marginLeft: "auto",
                  fontFamily: "'Fredoka One', cursive",
                  fontSize: "14px", color: "#a08c72", flexShrink: 0,
                }}>
                  {isLastDialogue ? "Let's sort! ▶" : "Click to continue ▶"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Results screen ── */}
      {showResults && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 400,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.6)",
        }}>
          <div style={{
            width: "min(520px, 90vw)",
            background: "#1b1b24",
            border: "1px solid #3a3a52",
            borderRadius: "18px", padding: "40px 36px",
            textAlign: "center",
            boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
          }}>
            <div style={{ fontSize: "26px", marginBottom: "6px" }}>You finished!</div>
            <div style={{ fontSize: "14px", color: "#bdbdd3", marginBottom: "4px" }}>
              Time: {elapsed}s &nbsp;|&nbsp; Final score: {gameState?.score}
            </div>
            <div style={{ fontSize: "13px", color: "#888", marginBottom: "20px" }}>
              Misses: {gameState?.misses} &nbsp;|&nbsp; Critical: {gameState?.criticalMisses}
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "center", margin: "16px 0" }}>
              {[0, 1, 2].map((i) => (
                <img key={i} src={honeyEarned[i] ? filledHoneyImg : blankHoneyImg} alt=""
                  className={`honey-jar${honeyPop[i] ? " pop" : ""}`}
                  style={{ opacity: honeyEarned[i] ? 1 : 0.25 }} />
              ))}
            </div>

            <div style={{ fontSize: "14px", color: "#bdbdd3", marginBottom: "24px" }}>
              {finalStars === 3 && "Perfect sorting! Zero waste champion 🏆"}
              {finalStars === 2 && "Great job! A few small mistakes."}
              {finalStars === 1 && "Good start — keep learning the categories!"}
            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button onClick={() => navigate("/level-selection")} style={{
                background: "#2d2d3f", color: "#eee", border: "1px solid #3a3a52",
                padding: "10px 24px", borderRadius: "10px", cursor: "pointer", fontSize: "14px",
              }}>Level Menu</button>
              <button onClick={handleReset} style={{
                background: "#3a3a52", color: "#eee", border: "1px solid #555",
                padding: "10px 24px", borderRadius: "10px", cursor: "pointer", fontSize: "14px",
              }}>Play Again ↺</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}