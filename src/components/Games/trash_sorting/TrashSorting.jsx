import { supabase } from "../../../supabase";
import { useEffect, useRef, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { saveLevelResult } from "../../../utils/levelProgress";
import Settings from "../../Settings";

import blankHoneyImg from "../../../assets/sprites/fish-prep/blankhoney.png";
import filledHoneyImg from "../../../assets/sprites/fish-prep/honey2.png";
import wavingBearImg from "../../../assets/sprites/river-game-sprites/wavingbear.png";
import homescreenImg from "../../../assets/trees_background1.png"; 
import trash2Img from "../../../assets/sprites/river-game-sprites/trash2.png";
import trash3Img from "../../../assets/sprites/river-game-sprites/trash3.png";
import trash4Img from "../../../assets/sprites/river-game-sprites/trash4.png";
import trashcanImg from "../../../assets/sprites/river-game-sprites/trashcan.png";
import plasticBag from "../../../assets/sprites/trash-sorting/plastic_bag.png";
import sodaCan from "../../../assets/sprites/trash-sorting/soda_can.png";
import plasticBottle from "../../../assets/sprites/trash-sorting/plastic_bottle.png";

// BINS
import compostBinImg from "../../../assets/sprites/trash-sorting/compostbin.png";
import recycleBinImg from "../../../assets/sprites/trash-sorting/recyclebin.png";
import landfillBinImg from "../../../assets/sprites/trash-sorting/landfillbin.png";
import specialBinImg from "../../../assets/sprites/trash-sorting/specialbin.png";
// COMPOST 
import deadfishImg from "../../../assets/sprites/fish-prep/deadfish.png";
import filletImg from "../../../assets/sprites/fish-prep/fillet.png";
import bonefishImg from "../../../assets/sprites/fish-prep/fishbone2.png";
import fishtailImg from "../../../assets/sprites/fish-prep/fishtail.png";
import bananaImg from "../../../assets/sprites/trash-sorting/banana_compost.png"; 
import appleImg from "../../../assets/sprites/trash-sorting/apple_compost.png";
import compostBottle from "../../../assets/sprites/trash-sorting/compost_bottle.png";
// landfill:
import batteryImg from "../../../assets/sprites/trash-sorting/battery.png";

import livesImg from "../../../assets/sprites/river-game-sprites/lives.png";
import settingsCogImg from "../../../assets/settings_cog.png";


const ITEM_IMAGES = {
  "Banana": bananaImg,
  "Apple": appleImg,
  "Aluminum Can":  trash2Img,
  "Fish tail": fishtailImg,
  "Shrink Wrap ":  trash3Img,
  "Mask": trash4Img,
  "Battery": batteryImg,
  "SPECIAL":  batteryImg,
  "Plastic bottle": plasticBottle,
  "Compost bottle": compostBottle,
  "Soda can": sodaCan,
  "Plastic bag": plasticBag
};
const CATEGORY_IMAGE_POOLS = {
  COMPOST: [bananaImg, appleImg, fishtailImg, compostBottle],   // add more compost images here
  RECYCLE: [trash3Img, trash2Img, plasticBottle, plasticBag, sodaCan],                         // add more recycle images here
  LANDFILL: [trash4Img ],                        // add more landfill images here
  SPECIAL: [batteryImg],                       // add more special images here
};
const BIN_IMAGES = {
    COMPOST: compostBinImg,
    RECYCLE: recycleBinImg,
    LANDFILL: landfillBinImg,
    SPECIAL: specialBinImg,
};

const ITEM_BANK = [
  // COMPOST
  { name: "Banana", category: "COMPOST", img: bananaImg, why: "Banana peels are organic and break down naturally in compost.", whyNot: "This is organic food waste, it doesn't belong here." },
  { name: "Apple", category: "COMPOST", img: appleImg, why: "Apple cores are organic food waste perfect for composting.", whyNot: "This is organic food waste, it doesn't belong here." },
  { name: "Fish tail", category: "COMPOST", img: fishtailImg, why: "Fish tails are organic and can be composted.", whyNot: "This is organic food waste it doesn't belong here." },
  { name: "Compost bottle", category: "COMPOST", img: compostBottle, why: "Compostable bottles can go in the compost bin.", whyNot: "This is a compostable item, it doesn't belong here." },
  // RECYCLE
  { name: "Aluminum Can", category: "RECYCLE", img: trash2Img, why: "Aluminum cans are recyclable!", whyNot: "This is recyclable metal, it doesn't belong here." },
  { name: "Shrink Wrap", category: "RECYCLE", img: trash3Img, why: "Shrink wrap is recyclable.", whyNot: "This is recyclable plastic, it doesn't belong here." },
  { name: "Plastic bottle", category: "RECYCLE", img: plasticBottle, why: "Clean plastic bottles can be recycled.", whyNot: "This is recyclable plastic, it doesn't belong here." },
  { name: "Soda can", category: "RECYCLE", img: sodaCan, why: "Soda cans are made of aluminum and can be recycled.", whyNot: "This is recyclable metal, it doesn't belong here." },
  { name: "Plastic bag", category: "RECYCLE", img: plasticBag, why: "Many plastic bags can be recycled at special drop-off locations.", whyNot: "This is recyclable plastic, it doesn't belong here." },
  // LANDFILL
  { name: "Mask", category: "LANDFILL", img: trash4Img, why: "Masks are non-recyclable and should be disposed of in the landfill.", whyNot: "This is non-recyclable plastic — it doesn't belong here." },
  // SPECIAL
  { name: "Battery", category: "SPECIAL", img: batteryImg, why: "Batteries need special disposal to prevent chemical leaks.", whyNot: "This is hazardous — it doesn't belong here." },
];

const ITEM_SIZE_OVERRIDES = {
  banana:      { w: 120, h: 62 },
  apple:       { w: 120, h: 62 },
  "fish tail": { w: 120, h: 68 },
  "aluminum can": { w: 110, h: 56 },
  "shrink wrap": { w: 110, h: 58 },
  mask:        { w: 100, h: 54 },
  battery:     { w: 150, h: 95 },
  "plastic bottle": { w: 120, h: 58 },
  "compost bottle": { w: 120, h: 58 },
  "soda can": { w: 120, h: 58 },
  "plastic bag": { w: 120, h: 58 }
};


// ─── Pyodide / Python game logic ──────────────────────────────────────────────
const PYODIDE_CDN = "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js";

const SORT_GAME_PY = `
from __future__ import annotations
from dataclasses import dataclass
import random

CATEGORIES = ["COMPOST", "RECYCLE", "LANDFILL", "SPECIAL"]
POINTS_CORRECT = 50
PENALTY_WRONG = 25
PENALTY_SPECIAL_WRONG = 75
STREAK_BONUS_PER = 10
MAX_SPEED_BONUS = 75
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
                ("Banana", "COMPOST", "Banana peels are organic and break down naturally in compost.", "This is organic waste, it doesn't belong here."),
                ("Apple", "COMPOST", "Apple cores are organic food waste perfect for composting.", "This is organic waste, it doesn't belong here."),
                ("Fish tail", "COMPOST", "Fish tails are organic and can be composted.", "This is organic waste, it doesn't belong here."),
                ("Aluminum can", "RECYCLE", "Aluminum cans are recyclable!", "This is recyclable metal, it doesn't belong here."),
                ("Plastic bottle", "RECYCLE", "Clean plastic bottles can be recycled.", "This is recyclable plastic, it doesn't belong here."),
                ("Shrink Wrap", "RECYCLE", "Shrink wrap is recyclable.", "This is recyclable plastic, it doesn't belong here."),
                ("Battery", "SPECIAL", "Batteries need special disposal to prevent chemical leaks.", "This is hazardous, it doesn't belong here."),
                ("Banana", "COMPOST", "Banana peels are organic and break down naturally in compost.", "This is organic waste, it doesn't belong here."),
                ("Apple", "COMPOST", "Apple cores are organic food waste perfect for composting.", "This is organic waste, it doesn't belong here."),
                ("Fish tail", "COMPOST", "Fish tails are organic and can be composted.", "This is organic waste, it doesn't belong here."),
                ("Plastic bottle", "RECYCLE", "Clean plastic bottles can be recycled.", "This is recyclable plastic, it doesn't belong here."),
                ("Shrink Wrap", "RECYCLE", "Shrink wrap is recyclable.", "This is recyclable plastic, it doesn't belong here."),
                ("Battery", "SPECIAL", "Batteries need special disposal to prevent chemical leaks.", "This is hazardous, it doesn't belong here."),
                ("Compost bottle", "COMPOST", "Compostable bottles can go in the compost bin.", "This is a compostable item, it doesn't belong here."),
                ("Soda can", "RECYCLE", "Soda cans are made of aluminum and can be recycled.", "This is recyclable metal, it doesn't belong here."),
                ("Plastic bag", "RECYCLE", "Many plastic bags can be recycled at special drop-off locations.", "This is recyclable plastic, it doesn't belong here."),
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
  { speaker: "Bear", text: "Not everything goes in the same bin, the wrong choice can hurt the environment!" },
  { speaker: "Narrator", text: "Drag each item into the correct bin: Compost, Recycle, Landfill, or Special waste." },
  { speaker: "Narrator", text: "Sort faster for a speed bonus. Watch out for special waste, wrong placement costs more points!" },
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
  if (score >= 1000) return 3;
  if (score >= 500) return 2;
  return 1;
}

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

// ─── Component ─────────────────────────────────────────────────────────────────
export default function RecycleGame() {
  const navigate = useNavigate();

  // for lives
  const [lives, setLives] = useState(3);
    const [showSettings, setShowSettings] = useState(false);    
  // Dialogue
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

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
  //const animFrameRef = useRef(null);
  //const tickRef = useRef(null);

  // ── Layout ────────────────────────────────────────────────────────────────────
function layoutItems(pyItems) {
  const cols = 4;
  const itemW = 130, itemH = 56, gapX = 14, gapY = 12;
  const startX = 16, startY = 60;
  setItems(pyItems.map((it, idx) => {
    const sizeOverride = ITEM_SIZE_OVERRIDES[it.name?.toLowerCase?.()] ?? { w: itemW, h: itemH };
    const r = Math.floor(idx / cols);
    const c = idx % cols;
    const x = startX + c * (itemW + gapX);
    const y = startY + r * (itemH + gapY);
    // Match by name to get the right image
    const bankItem = ITEM_BANK.find(b => b.name === it.name) 
      ?? ITEM_BANK.find(b => b.category === it.category);
    return {
      ...it,
      x,
      y,
      homeX: x,
      homeY: y,
      w: sizeOverride.w,
      h: sizeOverride.h,
      img: bankItem?.img ?? trash2Img,
    };
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
    if (!gameObjRef.current || !gameState?.started || gameState?.finished || showResults) return;
    const state = toJS(gameObjRef.current.asDict(nowMs()));
    setGameState(state);
  }, 500);
  return () => clearInterval(id);
}, [pyReady, gameStarted, gameState?.started, gameState?.finished, showResults]);
  // ── Finish → show results ─────────────────────────────────────────────────────
useEffect(() => {
  if (!gameState?.finished || showResults) return;
  const stars = calcStars(gameState.score, gameState.misses, gameState.criticalMisses);
  setFinalStars(stars);
  saveLevelResult(4, stars);

  async function saveProgress() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { data: currentProfile, error: fetchError } = await supabase
        .from("profiles")
        .select("level, level4_stars, level4_score, sustain_score")
        .eq("user_id", session.user.id)
        .single();
      if (fetchError || !currentProfile) return;
      const actualScore = stars * 130;
      const newBestStars = Math.max(currentProfile.level4_stars ?? 0, stars);
      const newBestScore = Math.max(currentProfile.level4_score ?? 0, actualScore);
      const nextUnlockedLevel = Math.max(currentProfile.level ?? 0, 5);
      const currentSustainScore = currentProfile.sustain_score ?? 0;
      const nextSustainScore = Math.max(0, currentSustainScore - (currentProfile.level4_score ?? 0) + newBestScore);
      await supabase.from("profiles").update({
        level4_stars: newBestStars,
        level4_score: newBestScore,
        level: nextUnlockedLevel,
        sustain_score: nextSustainScore,
        updated_at: new Date().toISOString(),
      }).eq("user_id", session.user.id);
    } catch (error) {
      console.error("Failed to save progress:", error);
    }
  }
  saveProgress();

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

// ── Lives → game over ─────────────────────────────────────────────────────────
useEffect(() => {
  if (lives <= 0 && gameStarted && !showResults) {
    setTimeout(() => {
      setShowResults(true);
      const stars = 1;
      setFinalStars(stars);
      saveLevelResult(4, stars);
      setTimeout(() => {
        setHoneyEarned(prev => { const n = [...prev]; n[0] = true; return n; });
        setTimeout(() => {
          setHoneyPop(prev => { const n = [...prev]; n[0] = true; return n; });
          setTimeout(() => {
            setHoneyPop(prev => { const n = [...prev]; n[0] = false; return n; });
          }, 600);
        }, 20);
      }, 600);
    }, 800);
  }
}, [lives, gameStarted, showResults]);

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
  const dragging = draggingRef.current; // ← save it first
  if (!dragging) return; // ← double check
  setGhostPos({ x: e.clientX, y: e.clientY });
  setItems(prev => prev.map(it => it.id === dragging.id ? { ...it, dragX: e.clientX, dragY: e.clientY } : it));
}

  function onMouseUp(e) {
  if (!draggingRef.current) return;
  const { id } = draggingRef.current;
  const item = items.find(it => it.id === id);
  draggingRef.current = null;
  setDraggingId(null);

  if (!item || !containerRef.current || !gameObjRef.current) return;  // ← add gameObjRef check

    // find center of dragged item
    const containerRect = containerRef.current.getBoundingClientRect();
    const cx = e.clientX - containerRect.left;
    const cy = e.clientY - containerRect.top;
    const binCategory = getBinUnderPoint(cx, cy, containerRef.current) ?? "NONE";

let newState;
try {
  newState = toJS(gameObjRef.current.dropItem(id, binCategory, nowMs()));
} catch (err) {
  console.error("Drop error:", err);
  return;
}
setGameState(newState);
syncPlaced(newState.items);

    if (newState.lastDrop) {
      const drop = newState.lastDrop;
      if (drop.isCorrect) {
        setFeedback({ text: "✔ Correct! " + drop.message, type: "correct" });
      } else if (drop.missType === "critical") {
        setFeedback({ text: "⚠ Critical! " + drop.message, type: "critical" });
        setLives(prev => Math.max(0, prev - 1));  // ← added this line
      } else {
        setFeedback({ text: "✖ Not quite. " + drop.message, type: "wrong" });
      }
      setTimeout(() => setFeedback(null), 6000);
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
  const dragging = draggingRef.current; // ← save it first
  if (!dragging) return;
  const touch = e.touches[0];
  setGhostPos({ x: touch.clientX, y: touch.clientY });
  setItems(prev => prev.map(it => it.id === dragging.id ? { ...it, dragX: touch.clientX, dragY: touch.clientY } : it));
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
    setLives(3);
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
        fontFamily: "'Fredoka One', cursive, sans-serif",
        display: "flex", flexDirection: "column",
        userSelect: "none", color: "#eee",
      }}
    >
      <style>{` 
        @import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;700;800&display=swap');

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
  <span className="rg-hud-label">Lives</span>
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
        <div className="rg-hud-block">
          <span className="rg-hud-label">Time</span>
          <span className="rg-hud-val">{elapsed}s</span>
        </div>
      </div>

      {/*<div id="rg-top-right">
        <button className="rg-top-btn" onClick={() => navigate("/level-selection")}>← Menu</button>
        <button className="rg-top-btn" onClick={handleReset}>↺ Reset</button>
      </div>*/}
      {gameStarted && (
  <button onClick={() => setShowSettings(true)} title="Settings" style={{
    position: "fixed", top: "14px", right: "14px", zIndex: 30,
    width: "46px", height: "46px",
    background: "rgba(255,255,255,0.22)",
    backdropFilter: "blur(14px) saturate(1.6)",
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
)}

      {/* ── Feedback hint bar — bottom center, like FishPrepGame ── */}
      {gameStarted && feedback && (
        <div style={{
          position: "fixed", 
          top: "84px",
          //bottom: "650px", 
          left: "50%", 
          transform: "translateX(-50%)",
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
          fontFamily: "Fredoka One', cursive, sans-serif",
          boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
          transition: "background 0.3s ease",
        }}>
          {feedback.text}
        </div>
      )}

      {/* ── Main layout: left panel + right bins ── */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "row",
        gap: "20px", padding: "140px 60px 80px",
        overflow: "hidden",
      }}>

{/* ── Left: items panel ── */}
<div style={{
  width: "420px", flexShrink: 0,
  background: "rgba(255,255,255,0.25)",
  borderRadius: "14px",
  border: "1px solid #5fb3de",
  padding: "12px",  // ← smaller padding
  display: "flex", flexDirection: "column",
  overflow: "hidden",
}}>
          {/*<div style={{ fontSize: "13px", color: "#111111", marginBottom: "10px" }}>
            Drag items into matching bins. Faster finish = more points!
            &nbsp;+100 correct, -50 wrong, -150 critical. &nbsp;+10 bonus per streak.
          </div>*/}
<div style={{
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)", // for how many colss we want for items
  gap: "10px",
  flex: 1,
  alignContent: "start",
  overflowY: "auto",
}}>
  {items.map((item) => {
    const isDragging = draggingId === item.id;
    return (
      <div
        key={item.id}
        onMouseDown={(e) => onMouseDown(e, item)}
        onTouchStart={(e) => onTouchStart(e, item)}
        onMouseEnter={(e) => { if (!item.placed) e.currentTarget.style.transform = "scale(1.08)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
        style={{
          height: `${item.h}px`,
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
      ><img
  src={item.img}
  alt={item.name}
  draggable={false}
  style={{ width: "auto", maxWidth: "100%", height: "100%", objectFit: "contain" }}
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
          gap: "2px",
          overflow: "visible", 
        }}>
{["COMPOST", "RECYCLE", "LANDFILL", "SPECIAL"].map((cat) => {
  const placedCount = items.filter(it => it.placed && it.category === cat).length;
  return (
    <div
      key={cat}
      data-bin={cat}
      style={{
        borderRadius: "14px",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "flex-end",
        position: "relative",
        overflow: "hidden",
        cursor: "default",
      }}
    ><img
  src={BIN_IMAGES[cat]}
  alt={cat}
  draggable={false}
  style={{
    width: "150%",
    height: "140%",
    maxHeight: "160%",
    objectFit: "contain",
    objectPosition: "center",
    pointerEvents: "none",
  }}
/>
      {placedCount > 0 && (
        <div style={{
          position: "absolute", bottom: "8px",
          background: "rgba(0,0,0,0.55)",
          color: "white", borderRadius: "20px",
          padding: "3px 12px", fontSize: "13px",
          fontFamily: "'Fredoka One', cursive",
        }}>
          {placedCount} sorted
        </div>
      )}
    </div>
  );
})}
        </div>
      </div>

      {/* ── Drag ghost ── */}
      {draggingId && (() => {
        const item = items.find(it => it.id === draggingId);
        if (!item) return null;
        return (
          <div style={{
            position: "fixed",
            left: ghostPos.x - item.w / 2,
            top: ghostPos.y - item.h / 2,
            width: `${item.w}px`,
            height: `${item.h}px`,
            borderRadius: "14px",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
            pointerEvents: "none", zIndex: 9999,
            transform: "scale(1.05)",
            background: "rgba(255,255,255,0.06)",
          }}>
            <img
              src={item.img}
              alt={item.name}
              draggable={false}
              style={{ width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }}
            />
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
      <h1 style={{ fontSize: "clamp(28px,5vw,52px)", margin: "0 0 8px", color: "#2c2316" }}>
        {lives <= 0 ? "Out of Lives!" : "Sorting Complete!"}
      </h1>

      <div style={{
        fontSize: "14px", letterSpacing: "2px", opacity: 0.6,
        textTransform: "uppercase", marginBottom: "4px", color: "#5a4a35",
      }}>
        Rating
      </div>

      <div style={{ display: "flex", gap: "8px", justifyContent: "center", margin: "18px 0" }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className={`honey${honeyEarned[i] ? " earned" : ""}${honeyPop[i] ? " pop" : ""}`}>
            <img src={honeyEarned[i] ? filledHoneyImg : blankHoneyImg} alt="" />
          </div>
        ))}
      </div>

      <div style={{
        display: "flex", justifyContent: "center",
        gap: "32px", margin: "18px 0 32px", flexWrap: "wrap",
      }}>
        <div style={{
          background: "#e8e1cf", borderRadius: "22px",
          padding: "18px 32px", boxShadow: "0 8px 15px rgba(0,0,0,0.1)",
        }}>
          <div style={{ fontSize: "14px", letterSpacing: "2px", opacity: 0.6, color: "#5a4a35" }}>SCORE</div>
          <div style={{ fontSize: "clamp(28px,4vw,42px)", color: "#5a4a35" }}>
            {gameState?.score ?? 0}
          </div>
        </div>
        <div style={{
          background: "#e8e1cf", borderRadius: "22px",
          padding: "18px 32px", boxShadow: "0 8px 15px rgba(0,0,0,0.1)",
        }}>
          <div style={{ fontSize: "14px", letterSpacing: "2px", opacity: 0.6, color: "#5a4a35" }}>TIME</div>
          <div style={{ fontSize: "clamp(28px,4vw,42px)", color: "#5a4a35" }}>
            {elapsed}s
          </div>
        </div>
        <div style={{
          background: "#e8e1cf", borderRadius: "22px",
          padding: "18px 32px", boxShadow: "0 8px 15px rgba(0,0,0,0.1)",
        }}>
          <div style={{ fontSize: "14px", letterSpacing: "2px", opacity: 0.6, color: "#5a4a35" }}>SORTED</div>
          <div style={{ fontSize: "clamp(28px,4vw,42px)", color: "#5a4a35" }}>
            {gameState?.placedCount ?? 0}/{gameState?.totalItems ?? 16}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: "16px", flexWrap: "wrap" }}>
        <button
          onClick={() => navigate("/level-selection")}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          style={{
            padding: "14px 38px", fontSize: "20px", borderRadius: "18px",
            border: "none", backgroundColor: "#e8e1cf", color: "#3d2e1e",
            cursor: "pointer", boxShadow: "0 8px 15px rgba(0,0,0,0.15)",
            fontFamily: "'Fredoka One', cursive", transition: "transform 0.1s ease",
          }}
        >
          ← Level Menu
        </button>
        <button
          onClick={handleReset}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          style={{
            padding: "14px 38px", fontSize: "20px", borderRadius: "18px",
            border: "none", backgroundColor: "#7FBF3F", color: "white",
            cursor: "pointer", boxShadow: "0 8px 15px rgba(0,0,0,0.15)",
            fontFamily: "'Fredoka One', cursive", transition: "transform 0.1s ease",
          }}
        >
          Play Again ↺
        </button>
      </div>
    </div>
  </div>
)}


            {showSettings && (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, color: "#000"}}>
    <Settings
      onClose={() => setShowSettings(false)}
      extraButtons={
        <button onClick={() => setShowQuitConfirm(true)} style={{
          padding: "14px 38px", fontSize: "20px", borderRadius: "18px",
          border: "none", backgroundColor: "#7FBF3F", color: "white",
          cursor: "pointer", fontFamily: "'Fredoka One', cursive",
        }}>
          Main Menu
        </button>
      }
    />
  </div>
)}

      {showQuitConfirm && (
        <QuitConfirmModal
          onConfirm={() => {
            setShowQuitConfirm(false);
            setShowSettings(false);
            navigate("/level-selection");
          }}
          onCancel={() => setShowQuitConfirm(false)}
        />
      )}

{/* ── Bottom hint pill ── */}
<div style={{
  position: "fixed", bottom: "18px", left: "50%", transform: "translateX(-50%)",
  background: "rgba(255,255,255,0.22)",
  backdropFilter: "blur(14px) saturate(1.6)",
  WebkitBackdropFilter: "blur(14px) saturate(1.6)",
  border: "1px solid rgba(255,255,255,0.45)",
  borderRadius: "50px",
  padding: "8px 24px",
  boxShadow: "0 4px 18px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.5)",
  fontSize: "0.75rem", fontWeight: 800, letterSpacing: "1px",
  color: "rgba(255,255,255,0.9)",
  textShadow: "0 1px 3px rgba(0,0,0,0.35)",
  pointerEvents: "none", zIndex: 15,
  whiteSpace: "nowrap",
}}>
  Drag items into the correct bin • Special waste costs -150 points!
</div>


    </div>
  );
}