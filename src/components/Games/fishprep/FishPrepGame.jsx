import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { saveLevelResult } from "../../../utils/levelProgress";
import Settings from "../../Settings";
import "./styles.css";
import { supabase } from "../../../supabase";
import LoadingScreen from "../../../LoadingScreen";
import backgroundImg from "../../../assets/sprites/fish-prep/background2.png";
import pageBgImg from "../../../assets/trees_background1.png";
import deadfishImg from "../../../assets/sprites/fish-prep/deadfish.png";
import filletImg from "../../../assets/sprites/fish-prep/fillet.png";
import bonefishImg from "../../../assets/sprites/fish-prep/fishbone2.png";
import fishtailImg from "../../../assets/sprites/fish-prep/fishtail.png";
import knifeImg from "../../../assets/sprites/fish-prep/knife.png";
import compostbinImg from "../../../assets/sprites/fish-prep/compostbin.png";
import recyclebinImg from "../../../assets/sprites/fish-prep/recyclebin.png";
import trashbinImg from "../../../assets/sprites/fish-prep/trashbin.png";
import blankHoneyImg from "../../../assets/sprites/fish-prep/blankhoney.png";
import filledHoneyImg from "../../../assets/sprites/fish-prep/honey2.png";
import settingsCogImg from "../../../assets/settings_cog.png";
import wavingBearImg from "../../../assets/sprites/river-game-sprites/wavingbear.png";
import livesImg from "../../../assets/sprites/river-game-sprites/lives.png";
import sliceSound from "../../../assets/sprites/fish-prep/slice.mp3";

// speed fish sprites
import redSnapperImg from "../../../assets/sprites/fish-prep/red_snapper.png";
import mackerelImg from "../../../assets/sprites/fish-prep/mackerel.png";
import yellowfinImg from "../../../assets/sprites/fish-prep/yellowfin.png";
import tunaImg from "../../../assets/sprites/fish-prep/tuna.png";
import redsnapperBoneImg from "../../../assets/sprites/fish-prep/RedsnapperBone.png";
import redsnapperTailImg from "../../../assets/sprites/fish-prep/RedsnapperTail.png";
import mackerelBoneImg from "../../../assets/sprites/fish-prep/MackerelBone.png";
import mackerelTailImg from "../../../assets/sprites/fish-prep/MackerelTail.png";
import yellowfinBoneImg from "../../../assets/sprites/fish-prep/YellowfinBone.png";
import yellowfinTailImg from "../../../assets/sprites/fish-prep/YellowfinTail.png";
import tunaBoneImg from "../../../assets/sprites/fish-prep/TunaBone.png";
import tunaTailImg from "../../../assets/sprites/fish-prep/TunaTail.png";

// Spawns small impact sparks at screen-space (x, y).
// Done with raw DOM so there's no React re-render overhead during rapid mashing.
function spawnSparks(x, y) {
  const symbols = ["✦", "✸", "★", "✺", "·", "✷"];
  const count = 6;
  for (let i = 0; i < count; i++) {
    const el = document.createElement("span");
    const angle = (360 / count) * i + (Math.random() * 40 - 20);
    const dist  = 16 + Math.random() * 24;
    const rad   = (angle * Math.PI) / 180;
    const tx    = (Math.cos(rad) * dist).toFixed(1);
    const ty    = (Math.sin(rad) * dist).toFixed(1);
    el.textContent = symbols[i % symbols.length];
    el.style.cssText = `
      position:fixed;
      left:${x}px; top:${y}px;
      font-size:${9 + Math.random() * 7}px;
      color:${Math.random() > 0.4 ? "#fff" : "#ffe066"};
      pointer-events:none;
      z-index:999;
      transform:translate(-50%,-50%);
      --tx:${tx}px; --ty:${ty}px;
      animation:sparkFly 0.38s ease-out forwards;
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 420);
  }
}

const BASE_W = 2048;
const BASE_H = 1559;
const BOARD_LEFT = 369;
const BOARD_TOP = 1006;
const BOARD_W = 737;
const BOARD_H = 377;
const BOARD_CX = BOARD_LEFT + BOARD_W / 2 + 20;
const BOARD_CY = BOARD_TOP + BOARD_H / 2 - 164;
const BONE_INIT_X = BOARD_CX + 60;
const BONE_INIT_Y = BOARD_CY;
const TAIL_INIT_X = BOARD_CX - 220;
const TAIL_INIT_Y = BOARD_CY + 10;
const KNIFE_INIT_X = 1229;
const KNIFE_INIT_Y = BOARD_CY;
const HIT_PAD_X = 200;
const HIT_PAD_Y = 120;
const TRAY_ZONE_X = 100;
const TRAY_ZONE_Y = 30;
const TRAY_ZONE_W = 750;
const TRAY_ZONE_H = 470;
const FISH_TRAY_CX = 450;
const FISH_TRAY_CY = 250;
const BIN_W = 226;
const BIN_H = 207;
const TRAY_CX = 1576;
const COMPOST_CY = 764;
const RECYCLE_CY = 1007;
const TRASH_CY = 1249;
const BOTTOM_SLOT_CX = 1579;
const BOTTOM_SLOT_CY = 1247.5;

const INTRO_DIALOGUE = [
  { speaker: "Bear", text: "Great work out there! We caught some amazing fish from the river today!" },
  { speaker: "Bear", text: "Now it's time to prepare them. Let's head to the prep station and get these fillets ready for our customers!" },
  { speaker: "Narrator", text: "Grab a fish from the ice tray on the left and drag it onto the cutting board." },
  { speaker: "Narrator", text: "Then pick up the knife and drop it on the fish to slice it. Don't worry — try a couple times if it wriggles!" },
  { speaker: "Narrator", text: "Once cut, sort the fish bones and tail into the compost bin. Zero waste, maximum sustainability! ♻️" },
];

const currentLevelId = 2;

// mid dialogue
const MID_DIALOGUE = [
  { speaker: "Narrator", text: "Nice work! Now you know what to expect." },
  { speaker: "Narrator", text: "Let's turn up the heat! Prep as many fish as you can before the timer runs out. They'll come one after another — stay sharp!" },
];

// all fish including og salmon
const ALL_FISH = [
  { id: "mackerel",   fish: mackerelImg,   bone: mackerelBoneImg,   tail: mackerelTailImg,   name: "Mackerel",    transform: "translateX(11px) translateY(-7px) translate(-50%,-50%) rotate(-24deg) scaleY(1.24) scaleX(-1.30)", boneScale: 1.0, tailScale: 1.0, boneRotate: -24, tailRotate: -24 },
  { id: "yellowfin",  fish: yellowfinImg,  bone: yellowfinBoneImg,  tail: yellowfinTailImg,  name: "Yellowfin",   transform: "translateX(30px) translate(-50%,-50%) rotate(15deg) scaleY(1.47) scaleX(-1.55)", boneScale: 0.9, tailScale: 0.9, boneRotate: 15, tailRotate: 15, boneOffsetX: 15, tailOffsetY: -27, tailOffsetX: -4 },
  { id: "tuna",       fish: tunaImg,       bone: tunaBoneImg,       tail: tunaTailImg,       name: "Tuna",        transform: "translate(-50%,-50%) rotate(15deg) scaleY(1.75) scaleX(-1.85)", boneScale: 1.3, tailScale: 1.6, boneOffsetX: 25, tailOffsetX: 22, boneRotate: 45, tailRotate: 45 },
  { id: "redsnapper", fish: redSnapperImg, bone: redsnapperBoneImg, tail: redsnapperTailImg, name: "Red Snapper", transform: "translate(-50%,-50%) rotate(0deg) scaleY(1.4) scaleX(-1.4)",  boneScale: 0.9, tailScale: 0.9, boneOffsetY: -8, tailOffsetY: -8 },
  { id: "salmon",     fish: deadfishImg,   bone: bonefishImg,       tail: fishtailImg,       name: "Salmon",      transform: "translate(-50%,-50%) rotate(15deg) scaleY(0.85) scaleX(0.9)",  boneScale: 1.0, tailScale: 1.0 },
];

export default function FishPrepGame() {
  const navigate = useNavigate();
  const debugMode = new URLSearchParams(window.location.search).get("debug") === "1";
  const skipTutorialMode = new URLSearchParams(window.location.search).get("skip") === "1";
  const [debugFishIndex, setDebugFishIndex] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [introReady, setIntroReady] = useState(false);
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [sustainabilityScore, setSustainabilityScore] = useState(3);
  const [stage, setStageState] = useState("grab_fish");
  const [dragging, setDragging] = useState(null);
  const [openBin, setOpenBin] = useState(null);
  const [glowBin, setGlowBin] = useState(null);
  const [hint, setHint] = useState("Grab a fish from the tray!");
  const [hintDone, setHintDone] = useState(false);
  const [bonefishTossed, setBonefishTossed] = useState(false);
  const [fishtailTossed, setFishtailTossed] = useState(false);
  const [bonefishVisible, setBonefishVisible] = useState(true);
  const [fishtailVisible, setFishtailVisible] = useState(true);
  const [knifeCutting, setKnifeCutting] = useState(false);
  const [filletVisible, setFilletVisible] = useState(false);
  const [honeyStars, setHoneyStars] = useState([false, false, false]);
  // Speed round: starts at 1000, -200 per wrong sort, game over at 0 (5 mistakes)
  const [score, setScore] = useState(1000);
  const [timeLeft, setTimeLeft] = useState(60);
  const [gamePhase, setGamePhase] = useState("tutorial");
  const [midDialogueIndex, setMidDialogueIndex] = useState(0);
  const [fishPrepped, setFishPrepped] = useState(0);
  const [activeFishImg, setActiveFishImg] = useState(deadfishImg);
  const activeFishImgRef = useRef(deadfishImg);
  const [activeBoneImg, setActiveBoneImg] = useState(bonefishImg);
  const [activeTailImg, setActiveTailImg] = useState(fishtailImg);
  const [activeFishTransform, setActiveFishTransform] = useState(ALL_FISH[0].transform);
  const [activeBoneScale, setActiveBoneScale] = useState(1.0);
  const [activeTailScale, setActiveTailScale] = useState(1.0);
  const [activeBoneOffsetY, setActiveBoneOffsetY] = useState(0);
  const [activeTailOffsetY, setActiveTailOffsetY] = useState(0);
  const [activeBoneOffsetX, setActiveBoneOffsetX] = useState(0);
  const [activeTailOffsetX, setActiveTailOffsetX] = useState(0);
  const [activeBoneRotate, setActiveBoneRotate] = useState(0);
  const [activeTailRotate, setActiveTailRotate] = useState(0);
  const [canSkipTutorial, setCanSkipTutorial] = useState(skipTutorialMode);
  const [fishLoadKey, setFishLoadKey] = useState(0);
  const [countdown, setCountdown] = useState(null);
  const [knifeStuck, setKnifeStuck] = useState(false);
  const [stuckClickCount, setStuckClickCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Preload all fish images so the browser decodes them during the tutorial.
  useEffect(() => {
    ALL_FISH.forEach(({ fish, bone, tail }) => {
      [fish, bone, tail].forEach(src => {
        const img = new Image();
        img.src = src;
      });
    });
  }, []);

  const sceneRef = useRef(null);
  const stageRef = useRef("grab_fish");
  const fishDodgedRef = useRef(false);
  const knifeCuttingRef = useRef(false);
  const bonefishTossedRef = useRef(false);
  const fishtailTossedRef = useRef(false);
  const sustainabilityRef = useRef(3);
  const draggingRef = useRef(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const knifePosRef = useRef(null);
  const bonePosRef = useRef(null);
  const tailPosRef = useRef(null);
  const fishPosRef = useRef(null);

  const deadfishRef = useRef(null);
  const bonefishRef = useRef(null);
  const fishtailRef = useRef(null);
  const filletRef = useRef(null);
  const knifeRef = useRef(null);
  const compostBinRef = useRef(null);
  const recycleBinRef = useRef(null);
  const trashBinRef = useRef(null);
  const zoneCompostRef = useRef(null);
  const zoneRecycleRef = useRef(null);
  const zoneTrashRef = useRef(null);
  const zoneFishtrayRef = useRef(null);
  const cutLineRef = useRef(null);
  const gamePhaseRef = useRef("tutorial");
  const fishPreppedRef = useRef(0);
  const fishStartTimeRef = useRef(null);
  const loadNextFishRef = useRef(null);
  const tutorialStarsRef = useRef(3);
  const totalSortsRef = useRef(0);
  const wrongSortsRef = useRef(0);
  const speedWrongRef = useRef(0);
  const binOrderRef = useRef({ compost: COMPOST_CY, recycle: RECYCLE_CY, trash: TRASH_CY });
  const knifeStuckRef = useRef(false);
  const stuckClicksRef = useRef(0);
  const speedFishCountRef = useRef(0);
  const dot0 = useRef(null);
  const dot1 = useRef(null);
  const dot2 = useRef(null);
  const dot3 = useRef(null);

  const sx = useCallback((x) => {
    if (!sceneRef.current) return 0;
    return x * (sceneRef.current.getBoundingClientRect().width / BASE_W);
  }, []);

  const sy = useCallback((y) => {
    if (!sceneRef.current) return 0;
    return y * (sceneRef.current.getBoundingClientRect().height / BASE_H);
  }, []);

  const toLocal = useCallback((clientX, clientY) => {
    const r = sceneRef.current.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  }, []);

  const hint_ = useCallback((text, done = false) => {
    setHint(text);
    setHintDone(done);
  }, []);

  const setStage = useCallback((next) => {
    stageRef.current = next;
    setStageState(next);
  }, []);

  const pointInZone = useCallback((zoneEl, x, y) => {
    if (!zoneEl || !sceneRef.current) return false;
    const r = zoneEl.getBoundingClientRect();
    const s = sceneRef.current.getBoundingClientRect();
    return x >= r.left - s.left && x <= r.right - s.left &&
           y >= r.top - s.top && y <= r.bottom - s.top;
  }, []);

  const placeEl = useCallback((el, x, y) => {
    if (!el) return;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  }, []);

  const placeBin = useCallback((el, cxBase, cyBase) => {
    if (!el) return;
    el.style.left = `${sx(cxBase)}px`;
    el.style.top = `${sy(cyBase)}px`;
    el.style.width = `${sx(BIN_W)}px`;
    el.style.height = `${sy(BIN_H)}px`;
  }, [sx, sy]);

  const placeZone = useCallback((el, cxBase, cyBase, wBase, hBase) => {
    if (!el) return;
    el.style.left = `${sx(cxBase - wBase / 2)}px`;
    el.style.top = `${sy(cyBase - hBase / 2)}px`;
    el.style.width = `${sx(wBase)}px`;
    el.style.height = `${sy(hBase)}px`;
  }, [sx, sy]);

  const placeSprites = useCallback(() => {
    const cx = sx(BOARD_CX);
    const cy = sy(BOARD_CY);
    const currentStage = stageRef.current;
    const currentDragging = draggingRef.current;

    if (currentStage === "grab_fish" && currentDragging === "deadfish") {
      placeEl(deadfishRef.current, fishPosRef.current.x, fishPosRef.current.y);
      if (deadfishRef.current) {
        deadfishRef.current.style.opacity = "1";
        deadfishRef.current.style.display = "block";
      }
    } else if (currentStage === "grab_fish") {
      if (deadfishRef.current) deadfishRef.current.style.display = "none";
    } else {
      placeEl(deadfishRef.current, cx, cy);
      if (deadfishRef.current) {
        deadfishRef.current.style.display = "block";
        deadfishRef.current.style.opacity = currentStage === "initial" ? "1" : "0";
      }
    }

    placeEl(filletRef.current, cx, cy);

    if (bonePosRef.current)
      placeEl(bonefishRef.current, bonePosRef.current.x, bonePosRef.current.y + sy(20));
    if (tailPosRef.current)
      placeEl(fishtailRef.current, tailPosRef.current.x, tailPosRef.current.y + sy(20));
    if (knifePosRef.current)
      placeEl(knifeRef.current, knifePosRef.current.x, knifePosRef.current.y);

    if (knifeRef.current)
      knifeRef.current.style.display = currentStage === "initial" ? "block" : "none";

    const bo = binOrderRef.current;
    const cxFor = (cy) => cy === TRASH_CY ? BOTTOM_SLOT_CX : TRAY_CX;
    const cyFor = (cy) => cy === TRASH_CY ? BOTTOM_SLOT_CY : cy;
    placeBin(compostBinRef.current, cxFor(bo.compost), cyFor(bo.compost));
    placeBin(recycleBinRef.current, cxFor(bo.recycle), cyFor(bo.recycle));
    placeBin(trashBinRef.current,   cxFor(bo.trash),   cyFor(bo.trash));
    placeZone(zoneCompostRef.current, cxFor(bo.compost) - 30, cyFor(bo.compost), 200, 160);
    placeZone(zoneRecycleRef.current, cxFor(bo.recycle) - 30, cyFor(bo.recycle), 200, 160);
    placeZone(zoneTrashRef.current,   cxFor(bo.trash)   - 30, cyFor(bo.trash),   200, 160);

    if (zoneFishtrayRef.current) {
      zoneFishtrayRef.current.style.left = `${sx(TRAY_ZONE_X)}px`;
      zoneFishtrayRef.current.style.top = `${sy(TRAY_ZONE_Y)}px`;
      zoneFishtrayRef.current.style.width = `${sx(TRAY_ZONE_W)}px`;
      zoneFishtrayRef.current.style.height = `${sy(TRAY_ZONE_H)}px`;
      zoneFishtrayRef.current.style.display =
        currentStage === "grab_fish" && currentDragging !== "deadfish" ? "block" : "none";
    }

    const order = ["grab_fish", "initial", "fish_cut", "fillet_done"];
    const idx = order.indexOf(currentStage);
    [dot0, dot1, dot2, dot3].forEach((d, i) => {
      if (!d.current) return;
      d.current.classList.toggle("on", i <= idx);
      d.current.classList.toggle("current", order[i] === currentStage);
    });
  }, [sx, sy, placeEl, placeBin, placeZone]);

  const initPositions = useCallback(() => {
    knifePosRef.current = { x: sx(KNIFE_INIT_X), y: sy(KNIFE_INIT_Y) };
    bonePosRef.current = { x: sx(BONE_INIT_X), y: sy(BONE_INIT_Y) };
    tailPosRef.current = { x: sx(TAIL_INIT_X), y: sy(TAIL_INIT_Y) };
    fishPosRef.current = { x: sx(FISH_TRAY_CX), y: sy(FISH_TRAY_CY) };
  }, [sx, sy]);

  const triggerGlow = useCallback((bin, correct) => {
    setGlowBin({ bin, correct });
    setTimeout(() => setGlowBin(null), 1400);
  }, []);

  const checkAllSorted = useCallback(() => {
    if (bonefishTossedRef.current && fishtailTossedRef.current) {
      const delay = gamePhaseRef.current === "speed_round" ? 400 : 1500;
      setTimeout(() => {
        setStage("fillet_done");
        setFilletVisible(true);

        if (gamePhaseRef.current === "tutorial") {
          tutorialStarsRef.current = sustainabilityRef.current;
          if (sustainabilityRef.current === 3) hint_("Perfect! All waste composted!", true);
          setTimeout(() => {
            gamePhaseRef.current = "mid_dialogue";
            setGamePhase("mid_dialogue");
            setMidDialogueIndex(0);
            setFilletVisible(false);
            if (deadfishRef.current) deadfishRef.current.style.opacity = "0";
          }, 1800);
        } else {
          fishPreppedRef.current += 1;
          setFishPrepped(fishPreppedRef.current);
          hint_("Nice! Next fish!", true);
          setTimeout(() => loadNextFishRef.current?.(), 600);
        }
      }, delay);
    }
  }, [setStage, hint_]);

  const startGame = useCallback(() => {
    setGameStarted(true);
    initPositions();
    placeSprites();
  }, [initPositions, placeSprites]);

  // debug
  useEffect(() => {
    if (!debugMode) return;
    const fish = ALL_FISH[debugFishIndex];
    activeFishImgRef.current = fish.fish;
    setActiveFishImg(fish.fish);
    setActiveBoneImg(fish.bone);
    setActiveTailImg(fish.tail);
    setActiveFishTransform(fish.transform);
    setActiveBoneScale(fish.boneScale ?? 1.0);
    setActiveTailScale(fish.tailScale ?? 1.0);
    setActiveBoneOffsetY(fish.boneOffsetY ?? 0);
    setActiveTailOffsetY(fish.tailOffsetY ?? 0);
    setActiveBoneOffsetX(fish.boneOffsetX ?? 0);
    setActiveTailOffsetX(fish.tailOffsetX ?? 0);
    setActiveBoneRotate(fish.boneRotate ?? 0);
    setActiveTailRotate(fish.tailRotate ?? 0);
    setGameStarted(true);
    setStage("initial");
    initPositions();
    placeSprites();
  }, [debugMode, debugFishIndex, initPositions, placeSprites, setStage]);

  useEffect(() => {
    initPositions();
    placeSprites();

    const onPointerMove = (e) => {
      if (!draggingRef.current) return;
      const p = toLocal(e.clientX, e.clientY);
      const nx = p.x - dragOffsetRef.current.x;
      const ny = p.y - dragOffsetRef.current.y;

      if (draggingRef.current === "deadfish") fishPosRef.current = { x: nx, y: ny };
      if (draggingRef.current === "knife") knifePosRef.current = { x: nx, y: ny };
      if (draggingRef.current === "bonefish") bonePosRef.current = { x: nx, y: ny };
      if (draggingRef.current === "fishtail") tailPosRef.current = { x: nx, y: ny };

      if (draggingRef.current === "bonefish" || draggingRef.current === "fishtail") {
        const pos = draggingRef.current === "bonefish" ? bonePosRef.current : tailPosRef.current;
        if (pointInZone(zoneCompostRef.current, pos.x, pos.y)) setOpenBin("compost");
        else if (pointInZone(zoneRecycleRef.current, pos.x, pos.y)) setOpenBin("recycle");
        else if (pointInZone(zoneTrashRef.current, pos.x, pos.y)) setOpenBin("trash");
        else setOpenBin(null);
      }

      placeSprites();
    };

    const onPointerUp = () => {
      if (!draggingRef.current) return;
      const fishCX = sx(BOARD_CX);
      const fishCY = sy(BOARD_CY);
      setOpenBin(null);

      if (draggingRef.current === "deadfish") {
        draggingRef.current = null;
        setDragging(null);
        const hit = Math.abs(fishPosRef.current.x - fishCX) <= sx(200) &&
                    Math.abs(fishPosRef.current.y - fishCY) <= sy(150);
        if (hit) {
          setStage("initial");
          hint_("Go ahead and pick up the knife and drop it on the fish!");
        } else {
          hint_("Place the fish on the cutting board!");
          if (deadfishRef.current) deadfishRef.current.style.display = "none";
        }
        placeSprites();
        return;
      }

      if (draggingRef.current === "knife") {
        const hit = Math.abs(knifePosRef.current.x - fishCX) <= sx(HIT_PAD_X) &&
                    Math.abs(knifePosRef.current.y - fishCY) <= sy(HIT_PAD_Y);

        const isSalmon = activeFishImgRef.current === deadfishImg;

        if (hit && !fishDodgedRef.current) {
          fishDodgedRef.current = true;
          if (isSalmon) {
            draggingRef.current = null;
            setDragging(null);
            const fish = deadfishRef.current;
            if (fish) {
              fish.style.transition = "transform 100ms ease";
              const flops = [
                [100, "translate(-50%,-50%) rotate(15deg) scaleY(0.85)"],
                [200, "translate(-50%,-50%) rotate(-12deg) scaleY(1.15) scaleX(0.9)"],
                [300, "translate(-50%,-50%) rotate(10deg) scaleY(0.8) scaleX(1.1)"],
                [400, "translate(-50%,-50%) rotate(-8deg) scaleY(1.1)"],
                [500, "translate(-50%,-50%) rotate(3deg) scaleY(0.95)"],
                [600, "translate(-50%,-50%) rotate(0deg) scaleY(1)"],
              ];
              flops.forEach(([delay, transform]) => {
                setTimeout(() => {
                  if (fish) fish.style.transform = transform;
                  if (delay === 600) fish.style.transition = "none";
                }, delay);
              });
            }
            knifePosRef.current = { x: sx(KNIFE_INIT_X), y: sy(KNIFE_INIT_Y) };
            hint_("Looks like there's still some life in the fella. Don't be shy, try again!");
            placeSprites();
            return;
          }
        }

        if (hit && fishDodgedRef.current) {
          // Every 3rd speed-round fish: knife gets stuck — mash to free it
          if (gamePhaseRef.current === "speed_round" && speedFishCountRef.current % 3 === 0) {
            draggingRef.current = null;
            setDragging(null);
            knifeStuckRef.current = true;
            setKnifeStuck(true);
            stuckClicksRef.current = 0;
            setStuckClickCount(0);
            const knife = knifeRef.current;
            if (knife) {
              knife.style.display = "block";
              knife.style.left = `${fishCX}px`;
              knife.style.top = `${fishCY}px`;
              knife.classList.add("knife-stuck");
            }
            hint_("The knife is stuck! Mash click to free it!");
            return;
          }

          knifeCuttingRef.current = true;
          setKnifeCutting(true);
          draggingRef.current = null;
          setDragging(null);
          hint_("Slicing…");

          const knife = knifeRef.current;
          const cutLine = cutLineRef.current;
          const fast = gamePhaseRef.current === "speed_round";
          if (knife) {
            knife.style.display = "block";
            knife.style.left = `${fishCX}px`;
            knife.style.top = `${fishCY}px`;
            knife.classList.add(fast ? "knife-slicing-fast" : "knife-slicing");
          }
          const sfx = new Audio(sliceSound);
          sfx.volume = 0.45;
          sfx.play();
          if (cutLine) {
            cutLine.style.left = `${fishCX}px`;
            cutLine.style.top = `${fishCY}px`;
            setTimeout(() => cutLine.classList.add("visible"), fast ? 80 : 250);
          }

          setTimeout(() => {
            if (knife) {
              knife.classList.remove("knife-slicing");
              knife.classList.remove("knife-slicing-fast");
            }
            if (cutLine) cutLine.classList.remove("visible");
            knifePosRef.current = { x: sx(KNIFE_INIT_X), y: sy(KNIFE_INIT_Y) };
            bonePosRef.current = { x: sx(BONE_INIT_X), y: sy(BONE_INIT_Y) };
            tailPosRef.current = { x: sx(TAIL_INIT_X), y: sy(TAIL_INIT_Y) };
            knifeCuttingRef.current = false;
            setKnifeCutting(false);
            setStage("fish_cut");
            setBonefishVisible(true);
            setFishtailVisible(true);
            hint_("Sort the fish waste into the correct bin!");
            placeSprites();
          }, fast ? 350 : 800);
          return;
        }

        knifePosRef.current = { x: sx(KNIFE_INIT_X), y: sy(KNIFE_INIT_Y) };
        hint_("Don't be scared, he won't bite! Drop the knife directly on the fish.");
        draggingRef.current = null;
        setDragging(null);
        placeSprites();
        return;
      }

      if (draggingRef.current === "bonefish") {
        draggingRef.current = null;
        setDragging(null);
        const overCompost = pointInZone(zoneCompostRef.current, bonePosRef.current.x, bonePosRef.current.y);
        const overRecycle = pointInZone(zoneRecycleRef.current, bonePosRef.current.x, bonePosRef.current.y);
        const overTrash   = pointInZone(zoneTrashRef.current,   bonePosRef.current.x, bonePosRef.current.y);

        if (overCompost || overRecycle || overTrash) {
          bonefishTossedRef.current = true;
          setBonefishTossed(true);
          setBonefishVisible(false);
          totalSortsRef.current += 1;
          if (overCompost) {
            triggerGlow("compost", true);
            hint_("Bones in compost — nice!", true);
          } else {
            wrongSortsRef.current += 1;
            sustainabilityRef.current = Math.max(0, sustainabilityRef.current - 1);
            setSustainabilityScore(sustainabilityRef.current);
            triggerGlow(overRecycle ? "recycle" : "trash", false);
            hint_("Fish bones should go in compost... cmon now");
            if (gamePhaseRef.current === "speed_round") {
              speedWrongRef.current += 1;
              setScore((prev) => {
                const next = Math.max(0, prev - 200);
                if (next === 0) setTimeout(() => setShowResults(true), 600);
                return next;
              });
            }
          }
          setTimeout(() => {
            if (!fishtailTossedRef.current) hint_("Now sort the fish tail!");
          }, 1400);
          checkAllSorted();
          placeSprites();
          return;
        }

        // missed all bins — reset
        bonePosRef.current = { x: sx(BONE_INIT_X), y: sy(BONE_INIT_Y) };
        hint_("Drop it in the correct bin on the right!");
        placeSprites();
        return;
      }

      if (draggingRef.current === "fishtail") {
        draggingRef.current = null;
        setDragging(null);
        const overCompost = pointInZone(zoneCompostRef.current, tailPosRef.current.x, tailPosRef.current.y);
        const overRecycle = pointInZone(zoneRecycleRef.current, tailPosRef.current.x, tailPosRef.current.y);
        const overTrash   = pointInZone(zoneTrashRef.current,   tailPosRef.current.x, tailPosRef.current.y);

        if (overCompost || overRecycle || overTrash) {
          fishtailTossedRef.current = true;
          setFishtailTossed(true);
          setFishtailVisible(false);
          totalSortsRef.current += 1;
          if (overCompost) {
            triggerGlow("compost", true);
            hint_("Tail in compost, NICE!", true);
          } else {
            wrongSortsRef.current += 1;
            sustainabilityRef.current = Math.max(0, sustainabilityRef.current - 1);
            setSustainabilityScore(sustainabilityRef.current);
            triggerGlow(overRecycle ? "recycle" : "trash", false);
            hint_("HEY! The fish tail should go in compost!");
            if (gamePhaseRef.current === "speed_round") {
              speedWrongRef.current += 1;
              setScore((prev) => {
                const next = Math.max(0, prev - 200);
                if (next === 0) setTimeout(() => setShowResults(true), 600);
                return next;
              });
            }
          }
          setTimeout(() => {
            if (!bonefishTossedRef.current) hint_("Now sort the fish bones!");
          }, 1400);
          checkAllSorted();
          placeSprites();
          return;
        }

        // missed all bins — reset
        tailPosRef.current = { x: sx(TAIL_INIT_X), y: sy(TAIL_INIT_Y) };
        hint_("Drop it in the correct bin on the right!");
        placeSprites();
        return;
      }

      draggingRef.current = null;
      setDragging(null);
      placeSprites();
    };

    const onResize = () => { initPositions(); placeSprites(); };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("resize", onResize);
    };
  }, [sx, sy, toLocal, pointInZone, placeSprites, initPositions, setStage, hint_, checkAllSorted, triggerGlow]);

  useEffect(() => {
    if (!showResults) return;

    // declare actualScore FIRST before using it
    const actualScore = score;
    // 1000 = 3 stars (no mistakes), 800 = 2 stars (1 mistake), 600 = 1 star (2 mistakes), 0 = 0 stars (5 mistakes / game over)
    const stars = actualScore >= 1000 ? 3 : actualScore >= 800 ? 2 : actualScore >= 600 ? 1 : 0;
    tutorialStarsRef.current = stars;

    setHoneyStars([false, false, false]);
    [0, 1, 2].forEach((i) => {
      if (i < stars) {
        setTimeout(() => {
          setHoneyStars((prev) => {
            const next = [...prev];
            next[i] = true;
            return next;
          });
        }, 600 + i * 450);
      }
    });

    async function saveProgress() {
      saveLevelResult(currentLevelId, stars);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          return;
        }

        const { data: currentProfile, error: fetchError } = await supabase
          .from("profiles")
          .select("level, level1_stars, level2_stars, level3_stars, level4_stars, level1_score, level2_score, level3_score, level4_score, sustain_score")
          .eq("user_id", session.user.id)
          .single();

        if (fetchError || !currentProfile) {
          console.error("Failed to fetch profile:", fetchError);
          return;
        }

        const currentSavedStars = currentProfile.level2_stars ?? 0;
        const newBestStars = Math.max(currentSavedStars, stars);

        const currentSavedScore = currentProfile.level2_score ?? 0;
        const newBestScore = Math.max(currentSavedScore, actualScore);

        const nextUnlockedLevel = Math.max(currentProfile.level ?? 0, 3);
        const currentSustainScore = currentProfile.sustain_score ?? 0;
        const nextSustainScore = Math.max(0, currentSustainScore - currentSavedScore + newBestScore);

        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            level2_stars: newBestStars,
            level2_score: newBestScore,
            level: nextUnlockedLevel,
            sustain_score: nextSustainScore,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", session.user.id);

        if (updateError) {
          console.error("Failed to save level progress to Supabase:", updateError);
        }
      } catch (error) {
        console.error("Failed to save progress:", error);
      }
    }

    saveProgress();
  }, [showResults, score]);

  useEffect(() => {
    async function checkSkipIntro() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile, error } = await supabase
            .from("profiles")
            .select("level")
            .eq("user_id", session.user.id)
            .single();
          if (!error && profile?.level > currentLevelId) {
            startGame();
            setCanSkipTutorial(true);
            setIntroReady(true);
            setLoading(false);
            return;
          }
        }
      } catch (error) {
        console.error("Failed to check intro skip:", error);
      }
      setIntroReady(true);
      setLoading(false);
    }
    checkSkipIntro();
  }, [currentLevelId, startGame]);

  // speed round
  const loadNextSpeedFish = useCallback(() => {
    if (deadfishRef.current) deadfishRef.current.style.display = "none";
    if (filletRef.current)   filletRef.current.style.display   = "none";
    speedFishCountRef.current += 1;

    const fish = ALL_FISH[Math.floor(Math.random() * ALL_FISH.length)];
    const positions = [COMPOST_CY, RECYCLE_CY, TRASH_CY];
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    binOrderRef.current = { compost: positions[0], recycle: positions[1], trash: positions[2] };
    activeFishImgRef.current = fish.fish;
    setActiveFishImg(fish.fish);
    setActiveBoneImg(fish.bone);
    setActiveTailImg(fish.tail);
    setActiveFishTransform(fish.transform ?? ALL_FISH[0].transform);
    setActiveBoneScale(fish.boneScale ?? 1.0);
    setActiveTailScale(fish.tailScale ?? 1.0);
    setActiveBoneOffsetY(fish.boneOffsetY ?? 0);
    setActiveTailOffsetY(fish.tailOffsetY ?? 0);
    setActiveBoneOffsetX(fish.boneOffsetX ?? 0);
    setActiveTailOffsetX(fish.tailOffsetX ?? 0);
    setActiveBoneRotate(fish.boneRotate ?? 0);
    setActiveTailRotate(fish.tailRotate ?? 0);
    bonefishTossedRef.current = false;
    fishtailTossedRef.current = false;
    setBonefishTossed(false);
    setFishtailTossed(false);
    setBonefishVisible(true);
    setFishtailVisible(true);
    setFilletVisible(false);
    setStage("initial");
    initPositions();
    setFishLoadKey((k) => k + 1);
    fishStartTimeRef.current = Date.now();
    hint_("Slice the fish!");
  }, [setStage, hint_, initPositions]);

  useEffect(() => {
    loadNextFishRef.current = loadNextSpeedFish;
  }, [loadNextSpeedFish]);

  const startSpeedRound = useCallback(() => {
    speedWrongRef.current = 0;
    setScore(1000);
    if (deadfishRef.current) deadfishRef.current.style.display = "none";
    if (filletRef.current)   filletRef.current.style.display   = "none";
    speedFishCountRef.current = 0;
    setGamePhase("countdown");
    gamePhaseRef.current = "countdown";
    setCountdown(3);
    setTimeout(() => setCountdown(2), 1000);
    setTimeout(() => setCountdown(1), 2000);
    setTimeout(() => setCountdown("GO"), 3000);
    setTimeout(() => {
      setCountdown(null);
      gamePhaseRef.current = "speed_round";
      setGamePhase("speed_round");
      loadNextFishRef.current?.();
    }, 3700);
  }, []);

  const STUCK_CLICKS_NEEDED = 10;

  const handleStuckMash = useCallback(() => {
    if (!knifeStuckRef.current) return;

    const fish = deadfishRef.current;
    if (fish) {
      fish.classList.remove("fish-mash-shake");
      void fish.offsetWidth;
      fish.classList.add("fish-mash-shake");
    }

    stuckClicksRef.current += 1;
    setStuckClickCount(stuckClicksRef.current);

    const progress = stuckClicksRef.current / STUCK_CLICKS_NEEDED;

    const knife = knifeRef.current;
    if (knife) {
      const r = knife.getBoundingClientRect();
      spawnSparks(r.left + r.width / 2, r.top + r.height * 0.65);
      const dur = Math.max(0.12, 0.3 - progress * 0.18);
      knife.style.animationDuration = `${dur}s`;
    }

    if (sceneRef.current) {
      const intensity = Math.round(2 + progress * 5);
      sceneRef.current.style.setProperty("--shake-px", `${intensity}px`);
      sceneRef.current.classList.remove("scene-mash");
      void sceneRef.current.offsetWidth;
      sceneRef.current.classList.add("scene-mash");
    }

    if (progress < 0.4)       hint_("The knife is stuck! Mash to free it!");
    else if (progress < 0.8)  hint_("Keep going! Almost there…");
    else                      hint_("ALMOST FREE — PULL IT OUT!");

    if (stuckClicksRef.current < STUCK_CLICKS_NEEDED) return;

    const flash = document.createElement("div");
    flash.className = "stuck-free-flash";
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 400);

    knifeStuckRef.current = false;
    setKnifeStuck(false);

    if (knife) knife.classList.remove("knife-stuck");

    const fishCX = sx(BOARD_CX);
    const fishCY = sy(BOARD_CY);
    const cutLine = cutLineRef.current;

    knifeCuttingRef.current = true;
    setKnifeCutting(true);
    hint_("Slicing…");

    if (knife) {
      knife.style.display = "block";
      knife.style.left = `${fishCX}px`;
      knife.style.top = `${fishCY}px`;
      knife.classList.add("knife-slicing-fast");
    }
    const sfx = new Audio(sliceSound);
    sfx.volume = 0.45;
    sfx.play();
    if (cutLine) {
      cutLine.style.left = `${fishCX}px`;
      cutLine.style.top = `${fishCY}px`;
      setTimeout(() => cutLine.classList.add("visible"), 80);
    }

    setTimeout(() => {
      if (knife) knife.classList.remove("knife-slicing-fast");
      if (cutLine) cutLine.classList.remove("visible");
      knifePosRef.current = { x: sx(KNIFE_INIT_X), y: sy(KNIFE_INIT_Y) };
      bonePosRef.current  = { x: sx(BONE_INIT_X),  y: sy(BONE_INIT_Y)  };
      tailPosRef.current  = { x: sx(TAIL_INIT_X),  y: sy(TAIL_INIT_Y)  };
      knifeCuttingRef.current = false;
      setKnifeCutting(false);
      setStage("fish_cut");
      setBonefishVisible(true);
      setFishtailVisible(true);
      hint_("Sort the fish waste into the correct bin!");
      placeSprites();
    }, 350);
  }, [sx, sy, setStage, hint_, placeSprites]);

  useEffect(() => {
    if (fishLoadKey === 0) return;
    if (gamePhaseRef.current !== "speed_round") return;
    initPositions();
    placeSprites();
  }, [fishLoadKey, initPositions, placeSprites]);

  // timer
  useEffect(() => {
    if (gamePhase !== "speed_round") return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setShowResults(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gamePhase]);

  const onFishtrayPointerDown = (e) => {
    if (stageRef.current !== "grab_fish") return;
    e.preventDefault();
    const p = toLocal(e.clientX, e.clientY);
    fishPosRef.current = { x: p.x, y: p.y };
    dragOffsetRef.current = { x: 0, y: 0 };
    draggingRef.current = "deadfish";
    setDragging("deadfish");
    hint_("Drop the fish on the cutting board!");
    placeSprites();
  };

  const onKnifePointerDown = (e) => {
    if (stageRef.current !== "initial" || knifeCuttingRef.current) return;
    e.preventDefault();
    const p = toLocal(e.clientX, e.clientY);
    dragOffsetRef.current = { x: p.x - knifePosRef.current.x, y: p.y - knifePosRef.current.y };
    draggingRef.current = "knife";
    setDragging("knife");
    if (knifeRef.current) knifeRef.current.style.width = "clamp(70px, 12vw, 120px)";
    hint_("Drop the knife onto the fish!");
    placeSprites();
  };

  const onBonefishPointerDown = (e) => {
    if (stageRef.current !== "fish_cut" || bonefishTossedRef.current) return;
    e.preventDefault();
    const p = toLocal(e.clientX, e.clientY);
    dragOffsetRef.current = { x: p.x - bonePosRef.current.x, y: p.y - bonePosRef.current.y };
    draggingRef.current = "bonefish";
    setDragging("bonefish");
    hint_("Drop the fish bones into the correct bin!");
    placeSprites();
  };

  const onFishtailPointerDown = (e) => {
    if (stageRef.current !== "fish_cut" || fishtailTossedRef.current) return;
    e.preventDefault();
    const p = toLocal(e.clientX, e.clientY);
    dragOffsetRef.current = { x: p.x - tailPosRef.current.x, y: p.y - tailPosRef.current.y };
    draggingRef.current = "fishtail";
    setDragging("fishtail");
    hint_("Drop the fish tail into the correct bin!");
    placeSprites();
  };

  const getBinClass = (binName) => {
    let cls = "bin";
    if (openBin === binName) cls += " open";
    if (glowBin?.bin === binName) cls += glowBin.correct ? " glow-correct" : " glow-wrong";
    if (glowBin?.correct && binName === "compost" && glowBin?.bin !== "compost") cls += " glow-correct";
    return cls;
  };

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

  const handleMidDialogueNext = () => {
    if (midDialogueIndex < MID_DIALOGUE.length - 1) {
      setMidDialogueIndex((i) => i + 1);
    } else {
      startSpeedRound();
    }
  };

  // lives: 1000=5, 800=4, 600=3, 400=2, 200=1, 0=0
  const lives = Math.round(score / 200);

  const messages = {
    3: "Perfect Score! WOW. ALL pieces went into the correct bins!",
    2: "Good work! Just one wrong sort.",
    1: "Rough round — a few pieces went into the wrong bin!",
    0: "Game over! All 5 mistakes used up. Better luck next time!",
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

  const QuitConfirmModal = ({ onConfirm, onCancel }) => {
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
  };

  return (
    <div className="page" style={{ backgroundImage: `url(${pageBgImg})`, backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" }}>
      <LoadingScreen isLoading={loading} />
      <div id="scene" className="scene" ref={sceneRef}
        style={{ backgroundImage: `url(${backgroundImg})` }}>

        <div ref={zoneFishtrayRef} className="fishTrayZone" onPointerDown={onFishtrayPointerDown} />

        <img ref={deadfishRef} id="deadfish" className="sprite" src={activeFishImg} draggable="false"
          style={{ display: "none", transform: ALL_FISH.find(f => f.fish === activeFishImg)?.transform ?? activeFishTransform }}
          />
        <div ref={cutLineRef} id="cut-line" className="cut-line" />
        <img ref={filletRef} id="fillet" className={`sprite fillet${filletVisible ? " visible" : ""}${gamePhase === "speed_round" ? " fast" : ""}`}
          src={filletImg} draggable="false"
          style={{ display: filletVisible ? "block" : "none" }} />

        <img ref={bonefishRef} id="bonefish" className="sprite bonefish" src={activeBoneImg}
          draggable="false" onPointerDown={onBonefishPointerDown}
          style={{
            display: (stage === "fish_cut" || stage === "fillet_done") && bonefishVisible ? "block" : "none",
            cursor: bonefishTossed ? "default" : dragging === "bonefish" ? "grabbing" : "grab",
            transform: dragging === "bonefish" ? `translate(calc(-50% + ${activeBoneOffsetX}px), calc(-50% + ${activeBoneOffsetY}px)) rotate(${activeBoneRotate - 6}deg) scale(${activeBoneScale * 1.04})` : `translate(calc(-50% + ${activeBoneOffsetX}px), calc(-50% + ${activeBoneOffsetY}px)) rotate(${activeBoneRotate}deg) scale(${activeBoneScale})`,
            filter: dragging === "bonefish" ? "drop-shadow(0 8px 16px rgba(0,0,0,0.35))" : "none",
          }} />

        <img ref={fishtailRef} id="fishtail" className="sprite fishtail" src={activeTailImg}
          draggable="false" onPointerDown={onFishtailPointerDown}
          style={{
            display: (stage === "fish_cut" || stage === "fillet_done") && fishtailVisible ? "block" : "none",
            cursor: fishtailTossed ? "default" : dragging === "fishtail" ? "grabbing" : "grab",
            transform: dragging === "fishtail" ? `translate(calc(-50% + ${activeTailOffsetX}px), calc(-50% + ${activeTailOffsetY}px)) rotate(${activeTailRotate + 5}deg) scale(${activeTailScale * 1.06})` : `translate(calc(-50% + ${activeTailOffsetX}px), calc(-50% + ${activeTailOffsetY}px)) rotate(${activeTailRotate}deg) scale(${activeTailScale})`,
            filter: dragging === "fishtail" ? "drop-shadow(0 8px 16px rgba(0,0,0,0.35))" : "none",
          }} />

        <img ref={knifeRef} id="knife" className="sprite knife" src={knifeImg}
          draggable="false" onPointerDown={onKnifePointerDown}
          style={{
            display: stage === "initial" ? "block" : "none",
            cursor: knifeCutting ? "default" : dragging === "knife" ? "grabbing" : "grab",
            transform: dragging === "knife" ? "translate(-50%,-50%) rotate(-10deg) scale(1.06) scaleX(-1)" : "translate(-50%,-50%) scaleX(-1)",
            filter: dragging === "knife" ? "drop-shadow(0 8px 20px rgba(0,0,0,0.4))" : "none",
          }} />

        <img ref={compostBinRef} className={getBinClass("compost")} src={compostbinImg} alt="" />
        <img ref={recycleBinRef} className={getBinClass("recycle")} src={recyclebinImg} alt="" />
        <img ref={trashBinRef} className={getBinClass("trash")} src={trashbinImg} alt="" />
        <div ref={zoneCompostRef} className="binZone" />
        <div ref={zoneRecycleRef} className="binZone" />
        <div ref={zoneTrashRef} className="binZone" />

        <div className="dots">
          <div ref={dot0} className="dot" />
          <div ref={dot1} className="dot" />
          <div ref={dot2} className="dot" />
          <div ref={dot3} className="dot" />
        </div>

        <button onClick={() => setShowSettings(true)} title="Settings"
          style={{
            position: "absolute", top: "14px", right: "14px", zIndex: 30,
            width: "46px", height: "46px",
            background: "rgba(255,255,255,0.22)",
            backdropFilter: "blur(14px) saturate(1.6)",
            WebkitBackdropFilter: "blur(14px) saturate(1.6)",
            border: "1px solid rgba(255,255,255,0.45)", borderRadius: "14px",
            boxShadow: "0 4px 18px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.5)",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.1) rotate(22deg)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.7)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1) rotate(0deg)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.45)";
          }}>
          <img src={settingsCogImg} alt="settings" style={{ width: "26px", height: "26px", objectFit: "contain" }} />
        </button>
      </div>

      {/* HUD — Score, Lives, Fish Prepped, Time */}
      {gameStarted && (
        <div id="fp-hud">
          <div className="fp-hud-block">
            <span className="fp-hud-label">Score</span>
            <span className="fp-hud-val">{score}</span>
          </div>

          {gamePhase === "speed_round" && (
            <div className="fp-hud-block">
              <span className="fp-hud-label">Lives</span>
              <div style={{ display: "flex", alignItems: "center" }}>
                {[0, 1, 2, 3, 4].map(i => (
                  <img key={i} src={livesImg} alt="" style={{
                    width: "28px", height: "28px", objectFit: "contain",
                    marginRight: i < 4 ? "-6px" : 0,
                    filter: i >= lives ? "grayscale(1) opacity(0.3)" : "none",
                    transition: "filter 0.3s",
                  }} />
                ))}
              </div>
            </div>
          )}

          <div className="fp-hud-block">
            <span className="fp-hud-label">Fish Prepped</span>
            <span className="fp-hud-val">{fishPrepped}</span>
          </div>

          <div className="fp-hud-block">
            <span className="fp-hud-label">Time</span>
            <span className={`fp-hud-val${timeLeft <= 10 ? " urgent" : ""}`}>
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
            </span>
          </div>
        </div>
      )}

      {/* Skip tutorial button — only for returning players, only during tutorial phase */}
      {gameStarted && canSkipTutorial && gamePhase === "tutorial" && (
        <button
          onClick={() => startSpeedRound()}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          style={{
            ...btnStyle,
            position: "fixed", top: "3%", right: "3%", zIndex: 60,
            backgroundColor: "#e8e1cf", color: "#3d2e1e",
            fontSize: "16px", padding: "10px 24px",
          }}>
          Skip Tutorial →
        </button>
      )}

      {/* Hint bar */}
      {gameStarted && (
        <div style={{
          position: "fixed", bottom: "18px", left: "50%", transform: "translateX(-50%)",
          fontSize: "0.82rem", fontWeight: 700, letterSpacing: "0.5px", zIndex: 15,
          whiteSpace: "nowrap", pointerEvents: "none",
          textShadow: "0 1px 4px rgba(0,0,0,0.4)",
          background: hintDone ? "rgba(74,124,89,0.88)" : "rgba(184,92,32,0.88)",
          backdropFilter: "blur(8px)",
          color: "white", padding: "8px 20px", borderRadius: "50px",
          border: "1px solid rgba(255,255,255,0.2)",
          fontFamily: "'Fredoka One', cursive",
          boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
          transition: "background 0.3s ease",
        }}>
          {hint}
        </div>
      )}

      {/* Intro dialogue */}
      {introReady && !gameStarted && !showResults && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50 }}>
          <button
            onClick={startGame}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            style={{ ...btnStyle, position: "absolute", top: "3%", right: "3%", backgroundColor: "#e8e1cf", color: "#3d2e1e" }}>
            Skip →
          </button>

          <button
            onClick={() => navigate("/level-selection")}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            style={{ ...btnStyle, position: "absolute", top: "3%", left: "3%", backgroundColor: "#e8e1cf", color: "#3d2e1e" }}>
            ← Level Menu
          </button>

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

          <div
            onClick={handleDialogueNext}
            style={{
              position: "absolute", bottom: "4%", left: "50%",
              transform: "translateX(-50%)",
              width: "72vw", maxWidth: "860px",
              cursor: "pointer", zIndex: 2,
            }}
          >
            <div style={{
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
            }}>
              {currentLine.speaker}
            </div>

            <div style={{
              background: "#fdf6e3",
              border: "3px solid #c8b89a",
              borderRadius: "0 18px 18px 18px",
              padding: "24px 32px",
              boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
              textAlign: "left",
            }}>
              <p style={{
                fontFamily: "'Fredoka One', cursive",
                fontSize: "clamp(16px, 1.8vw, 22px)",
                color: "#3d2e1e",
                margin: 0, lineHeight: 1.6,
                minHeight: "60px",
              }}>
                {currentLine.text}
              </p>

              <div style={{ display: "flex", alignItems: "center", marginTop: "16px", gap: "10px" }}>
                <button
                  onClick={handleDialogueBack}
                  disabled={dialogueIndex === 0}
                  onMouseEnter={(e) => { if (dialogueIndex > 0) e.currentTarget.style.transform = "scale(1.1)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                  style={{
                    background: "transparent", border: "none",
                    padding: "4px 12px",
                    fontFamily: "'Fredoka One', cursive", fontSize: "16px",
                    color: dialogueIndex === 0 ? "#c8b89a" : "#a08c72",
                    cursor: dialogueIndex === 0 ? "not-allowed" : "pointer",
                    transition: "transform 0.1s ease", flexShrink: 0,
                  }}>
                  ◀
                </button>

                {INTRO_DIALOGUE.map((_, i) => (
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
                  {isLastDialogue ? "Let's go! ▶" : "Click to continue ▶"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* mid dialogue */}
      {gamePhase === "mid_dialogue" && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50 }} onClick={handleMidDialogueNext}>
          <img src={wavingBearImg} alt="waving bear" style={{
            position: "absolute", bottom: 0, left: "2%",
            height: "55vh", maxHeight: "420px",
            objectFit: "contain", zIndex: 1,
            filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.2))",
            pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute", bottom: "4%", left: "50%",
            transform: "translateX(-50%)",
            width: "72vw", maxWidth: "860px",
            cursor: "pointer", zIndex: 2,
          }}>
            <div style={{
              display: "inline-block", background: "#f5eedc",
              border: "3px solid #c8b89a", borderBottom: "none",
              borderRadius: "14px 14px 0 0", padding: "6px 22px",
              fontFamily: "'Fredoka One', cursive", fontSize: "18px",
              color: "#5a4a35", marginLeft: "24px",
            }}>
              {MID_DIALOGUE[midDialogueIndex].speaker}
            </div>
            <div style={{
              background: "#fdf6e3", border: "3px solid #c8b89a",
              borderRadius: "0 18px 18px 18px", padding: "24px 32px",
              boxShadow: "0 8px 30px rgba(0,0,0,0.18)", textAlign: "left",
            }}>
              <p style={{
                fontFamily: "'Fredoka One', cursive",
                fontSize: "clamp(16px, 1.8vw, 22px)",
                color: "#3d2e1e", margin: 0, lineHeight: 1.6, minHeight: "60px",
              }}>
                {MID_DIALOGUE[midDialogueIndex].text}
              </p>
              <div style={{ display: "flex", alignItems: "center", marginTop: "16px", gap: "10px" }}>
                {MID_DIALOGUE.map((_, i) => (
                  <div key={i} style={{
                    width: i === midDialogueIndex ? "20px" : "8px",
                    height: "8px", borderRadius: "999px",
                    background: i === midDialogueIndex ? "#c8b89a" : "#e0d5c0",
                    transition: "width 0.2s ease",
                  }} />
                ))}
                <span style={{
                  marginLeft: "auto", fontFamily: "'Fredoka One', cursive",
                  fontSize: "14px", color: "#a08c72",
                }}>
                  {midDialogueIndex === MID_DIALOGUE.length - 1 ? "Let's go! ▶" : "Click to continue ▶"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Knife-stuck mash event */}
      {knifeStuck && (
        <>
          <div
            onPointerDown={handleStuckMash}
            style={{ position: "fixed", inset: 0, zIndex: 22, cursor: "crosshair" }}
          />
          <div style={{
            position: "fixed", bottom: "80px", left: "50%",
            transform: "translateX(-50%)",
            zIndex: 23, pointerEvents: "none",
            display: "flex", flexDirection: "column", alignItems: "center", gap: "8px",
          }}>
            <div style={{
              fontFamily: "'Fredoka One', cursive",
              color: "#fff",
              fontSize: "clamp(16px, 2.5vw, 22px)",
              textShadow: "0 2px 10px rgba(0,0,0,0.5)",
              letterSpacing: "1px",
            }}>
              🔪 MASH TO FREE THE KNIFE!
            </div>
            <div style={{
              width: "clamp(180px, 28vw, 260px)", height: "16px",
              background: "rgba(255,255,255,0.25)",
              borderRadius: "99px", overflow: "hidden",
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            }}>
              {(() => {
                const pct = Math.min(stuckClickCount / STUCK_CLICKS_NEEDED, 1);
                const hue = Math.round(105 - pct * 95);
                return (
                  <div style={{
                    height: "100%",
                    width: `${pct * 100}%`,
                    background: `linear-gradient(90deg, hsl(${hue},72%,40%), hsl(${hue + 18},80%,58%))`,
                    borderRadius: "99px",
                    transition: "width 0.05s ease, background 0.15s ease",
                    boxShadow: `0 0 ${6 + pct * 10}px hsl(${hue},80%,55%)`,
                  }} />
                );
              })()}
            </div>
          </div>
        </>
      )}

      {/* Countdown */}
      {countdown !== null && (
        <span
          key={countdown}
          className={`countdown-num${countdown === "GO" ? " countdown-go" : ""}`}
        >
          {countdown}
        </span>
      )}

      {/* Results screen */}
      {showResults && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200,
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
            <div style={{ fontSize: "clamp(2.5rem,6vw,4rem)", marginBottom: "8px" }}>🐟</div>
            <h1 style={{ fontSize: "clamp(28px,5vw,52px)", margin: "0 0 8px", color: "#2c2316" }}>
              Fish Prep Complete!
            </h1>
            <div style={{
              fontSize: "14px", letterSpacing: "2px", opacity: 0.6,
              textTransform: "uppercase", marginBottom: "18px", color: "#5a4a35",
            }}>
              Sustainability Rating
            </div>

            <div style={{ display: "flex", gap: "8px", justifyContent: "center", margin: "18px 0" }}>
              {[0, 1, 2].map((i) => (
                <div key={i} className={`honey${honeyStars[i] ? " earned pop" : ""}`} style={{ position: "relative" }}>
                  <img src={blankHoneyImg} alt="" />
                  <img src={filledHoneyImg} alt="" style={{
                    position: "absolute", top: 0, left: 0,
                    opacity: honeyStars[i] ? 1 : 0,
                    transition: "opacity 500ms ease",
                  }} />
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: "32px", margin: "18px 0 28px", flexWrap: "wrap" }}>
              <div style={{
                background: "#e8e1cf", borderRadius: "22px",
                padding: "18px 32px", boxShadow: "0 8px 15px rgba(0,0,0,0.1)",
              }}>
                <div style={{ fontSize: "14px", letterSpacing: "2px", opacity: 0.6, color: "#5a4a35" }}>
                  POINTS
                </div>
                <div style={{ fontSize: "clamp(28px,4vw,42px)", color: "#5a4a35" }}>
                  {score}
                </div>
              </div>
              <div style={{
                background: "#e8e1cf", borderRadius: "22px",
                padding: "18px 32px", boxShadow: "0 8px 15px rgba(0,0,0,0.1)",
              }}>
                <div style={{ fontSize: "14px", letterSpacing: "2px", opacity: 0.6, color: "#5a4a35" }}>
                  FISH PREPPED
                </div>
                <div style={{ fontSize: "clamp(28px,4vw,42px)", color: "#5a4a35" }}>
                  {fishPrepped}
                </div>
              </div>
            </div>

            <div style={{ color: "#5c5040", marginBottom: "28px", fontSize: "clamp(13px,2.2vw,16px)", lineHeight: 1.45 }}>
              {messages[tutorialStarsRef.current] || messages[1]}
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: "16px", flexWrap: "wrap" }}>
              <button
                onClick={() => navigate("/level-selection")}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                style={{ ...btnStyle, backgroundColor: "#e8e1cf", color: "#3d2e1e" }}>
                ← Level Menu
              </button>
              <button
                onClick={() => navigate("/level/3")}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                style={{ ...btnStyle, backgroundColor: "#7FBF3F", color: "white" }}>
                Next Level →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* debug nav */}
      {debugMode && (
        <div style={{
          position: "fixed", bottom: "60px", left: "50%", transform: "translateX(-50%)",
          zIndex: 300, display: "flex", alignItems: "center", gap: "16px",
          background: "rgba(0,0,0,0.75)", borderRadius: "16px", padding: "10px 24px",
          fontFamily: "'Fredoka One', cursive", color: "white",
        }}>
          <button onClick={() => setDebugFishIndex((i) => (i - 1 + ALL_FISH.length) % ALL_FISH.length)}
            style={{ background: "none", border: "none", color: "white", fontSize: "22px", cursor: "pointer" }}>◀</button>
          <span style={{ fontSize: "18px", minWidth: "120px", textAlign: "center" }}>
            {debugFishIndex + 1} / {ALL_FISH.length} — {ALL_FISH[debugFishIndex].name}
          </span>
          <button onClick={() => setDebugFishIndex((i) => (i + 1) % ALL_FISH.length)}
            style={{ background: "none", border: "none", color: "white", fontSize: "22px", cursor: "pointer" }}>▶</button>
        </div>
      )}

      {/* Settings overlay */}
      {showSettings && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60 }}>
          <Settings
            onClose={() => setShowSettings(false)}
            extraButtons={
              <button
                onClick={() => setShowQuitConfirm(true)}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                style={{
                  padding: "14px 38px", fontSize: "20px", borderRadius: "18px",
                  border: "none", backgroundColor: "#7FBF3F", color: "white",
                  cursor: "pointer", boxShadow: "0 8px 15px rgba(0,0,0,0.15)",
                  fontFamily: "'Fredoka One', cursive", transition: "transform 0.1s ease",
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
    </div>
  );
}