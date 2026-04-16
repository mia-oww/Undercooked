# sortGame.py
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


def speedBonus(elapsedSec: float) -> int:
    if elapsedSec <= 0:
        return MAX_SPEED_BONUS
    if elapsedSec >= BONUS_ZERO_AT_SEC:
        return 0
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
    items: list[Item]
    score: int = 0
    misses: int = 0
    criticalMisses: int = 0
    placedCount: int = 0
    started: bool = False
    startMs: int | None = None
    finished: bool = False
    finishMs: int | None = None
    streak: int = 0
    lastDrop: dict | None = None

    @property
    def totalItems(self) -> int:
        return len(self.items)

    def reset(self, seed: int | None = None) -> None:
        rng = random.Random(seed)

        sushiTrashBank = [
            # COMPOST
            ("Rice scraps", "COMPOST",
             "Rice is organic food waste that can break down naturally in compost.",
             "This contains organic food material, which doesn’t belong here."),
            ("Seaweed scraps (nori)", "COMPOST",
             "Seaweed is natural organic material that can decompose in compost systems.",
             "This is organic food material, which doesn’t belong here."),
            ("Wasabi leftovers", "COMPOST",
             "Food leftovers are organic and can be composted instead of sent to landfill.",
             "This contains organic food residue, which doesn’t belong here."),
            ("Soiled paper napkin", "COMPOST",
             "Soiled paper fibers can often be composted when recycling is not possible.",
             "This contains food residue and paper fibers, which don’t belong here."),

            # RECYCLE
            ("Aluminum drink can", "RECYCLE",
             "Aluminum is a recyclable metal that can be reused many times.",
             "This is metal material, which doesn’t belong here."),
            ("Clean plastic bottle", "RECYCLE",
             "Clean plastic bottles are recyclable materials in many programs.",
             "This is rigid plastic material, which doesn’t belong here."),
            ("Clean cardboard sleeve", "RECYCLE",
             "Clean cardboard fibers can be recycled into new paper products.",
             "This is clean paper/cardboard material, which doesn’t belong here."),
            ("Glass sauce bottle", "RECYCLE",
             "Glass containers can be melted and reused through recycling systems.",
             "This is glass material, which doesn’t belong here."),

            # LANDFILL
            ("Plastic soy sauce packet", "LANDFILL",
             "This is multi-layer plastic film that usually cannot be recycled curbside.",
             "This is thin plastic film material, which doesn’t belong here."),
            ("Plastic wrap film", "LANDFILL",
             "Plastic film is not commonly accepted in curbside recycling.",
             "This is soft plastic film material, which doesn’t belong here."),
            ("Greasy takeout container", "LANDFILL",
             "Food-contaminated plastic often cannot be recycled.",
             "This contains greasy plastic material, which doesn’t belong here."),
            ("Styrofoam tray", "LANDFILL",
             "Foam containers are rarely recyclable in standard programs.",
             "This is foam plastic material, which doesn’t belong here."),

            # SPECIAL
            ("Battery (kitchen timer)", "SPECIAL",
             "Batteries contain chemicals and metals that require special disposal.",
             "This contains hazardous battery materials, which don’t belong here."),
            ("Broken light bulb", "SPECIAL",
             "Some light bulbs contain sensitive materials that require special handling.",
             "This contains fragile or sensitive materials, which don’t belong here."),
            ("Old POS device", "SPECIAL",
             "Electronics contain metals and components that must be recycled properly.",
             "This contains electronic components and metals, which don’t belong here."),
            ("Rechargeable battery pack", "SPECIAL",
             "Rechargeable batteries require proper disposal to prevent fire risk.",
             "This contains rechargeable battery materials, which don’t belong here."),
        ]

        rng.shuffle(sushiTrashBank)

        items: list[Item] = []
        iid = 1
        for name, cat, why, whyNot in sushiTrashBank:
            items.append(Item(id=iid, name=name, category=cat, why=why, whyNot=whyNot))
            iid += 1

        self.items = items
        self.score = 0
        self.misses = 0
        self.criticalMisses = 0
        self.placedCount = 0
        self.started = False
        self.startMs = None
        self.finished = False
        self.finishMs = None
        self.streak = 0
        self.lastDrop = None

    def _ensureStarted(self, nowMs: int) -> None:
        if not self.started:
            self.started = True
            self.startMs = nowMs

    def elapsedMs(self, nowMs: int) -> int:
        if not self.started or self.startMs is None:
            return 0
        endMs = self.finishMs if self.finished and self.finishMs is not None else nowMs
        return max(0, int(endMs - self.startMs))

    def asDict(self, nowMs: int) -> dict:
        ems = self.elapsedMs(nowMs)
        return {
            "items": [
                {
                    "id": it.id,
                    "name": it.name,
                    "category": it.category,
                    "why": it.why,
                    "whyNot": it.whyNot,
                    "placed": it.placed,
                }
                for it in self.items
            ],
            "score": self.score,
            "misses": self.misses,
            "criticalMisses": self.criticalMisses,
            "placedCount": self.placedCount,
            "totalItems": self.totalItems,
            "started": self.started,
            "finished": self.finished,
            "elapsedMs": ems,
            "bonusPreview": speedBonus(ems / 1000.0) if self.started else MAX_SPEED_BONUS,
            "streak": self.streak,
            "lastDrop": self.lastDrop,
        }

    def dropItem(self, itemId: int, binCategory: str, nowMs: int) -> dict:
        """
        binCategory: "COMPOST/RECYCLE/LANDFILL/SPECIAL" or "NONE" for dropped nowhere.
        """
        if self.finished:
            return self.asDict(nowMs)

        self._ensureStarted(nowMs)

        item = next((it for it in self.items if it.id == itemId), None)
        if item is None or item.placed:
            return self.asDict(nowMs)

        if binCategory == "NONE":
            self.lastDrop = None
            return self.asDict(nowMs)

        isCorrect = (binCategory == item.category)
        missType: str | None = None

        if isCorrect:
            item.placed = True
            self.placedCount += 1
            self.streak += 1
            self.score += POINTS_CORRECT + (STREAK_BONUS_PER * max(0, self.streak - 1))
        else:
            self.streak = 0
            if item.category == "SPECIAL":
                self.criticalMisses += 1
                penalty = PENALTY_SPECIAL_WRONG
                missType = "critical"
            else:
                self.misses += 1
                penalty = PENALTY_WRONG
                missType = "normal"
            self.score = max(0, self.score - penalty)

        message = item.why if isCorrect else item.whyNot

        self.lastDrop = {
            "itemId": item.id,
            "name": item.name,
            "isCorrect": isCorrect,
            "message": message,
            "chosen": binCategory,
            "streak": self.streak,
            "missType": missType,  # "normal" | "critical" | None
        }

        if self.placedCount == self.totalItems:
            self.finished = True
            self.finishMs = nowMs
            elapsedSec = (self.finishMs - self.startMs) / 1000.0 if self.startMs is not None else 9999.0
            self.score += speedBonus(elapsedSec)

        return self.asDict(nowMs)


def newGame(seed: int | None = None) -> Game:
    g = Game(items=[])
    g.reset(seed=seed)
    return g