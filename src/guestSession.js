// src/guestSession.js

const KEY = "guest_profile";

const DEFAULT_GUEST_PROFILE = {
  user_id: "guest",
  display_name: "Guest",
  sustain_score: 0,
  level: 0,

  level1_stars: 0,
  level2_stars: 0,
  level3_stars: 0,
  level4_stars: 0,

  level1_score: 0,
  level2_score: 0,
  level3_score: 0,
  level4_score: 0,

  master_volume: 50,
  music_volume: 50,
  sound_effects_volume: 50,

  created_at: null,
  updated_at: null,
};

export function getGuestProfile() {
  try {
    const raw = sessionStorage.getItem(KEY);

    if (!raw) return null;

    const parsed = JSON.parse(raw);

    return {
      ...DEFAULT_GUEST_PROFILE,
      ...parsed,
    };
  } catch (error) {
    console.error("Failed to read guest profile:", error);
    return null;
  }
}

export function isGuestMode() {
  return !!getGuestProfile();
}

export function startGuestMode(partial = {}) {
  const now = new Date().toISOString();

  const existing = getGuestProfile();

  const guest = {
    ...DEFAULT_GUEST_PROFILE,
    ...existing,
    ...partial,
    user_id: "guest",
    created_at: existing?.created_at ?? partial.created_at ?? now,
    updated_at: now,
  };

  sessionStorage.setItem(KEY, JSON.stringify(guest));
  return guest;
}

export function updateGuestProfile(patch = {}) {
  const cur = getGuestProfile();
  if (!cur) return null;

  const next = {
    ...DEFAULT_GUEST_PROFILE,
    ...cur,
    ...patch,
    user_id: "guest",
    updated_at: new Date().toISOString(),
  };

  sessionStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function endGuestMode() {
  sessionStorage.removeItem(KEY);
}

export function resetGuestProfile() {
  const now = new Date().toISOString();

  const guest = {
    ...DEFAULT_GUEST_PROFILE,
    created_at: now,
    updated_at: now,
  };

  sessionStorage.setItem(KEY, JSON.stringify(guest));
  return guest;
}