import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

import sushiSalmon from "../assets/sprites/sushi_salmon.png";
import sushiShrimp from "../assets/sprites/sushi_shrimp.png";
import sushiTamago from "../assets/sprites/sushi_tamago.png";

import { supabase } from "../supabase";

export default function Settings({ onClose, background, extraButtons }) {
  const navigate = useNavigate();

  const [ready, setReady] = useState(false);
  const [session, setSession] = useState(null);

  const [masterVolume, setMasterVolume] = useState(50);
  const [musicVolume, setMusicVolume] = useState(50);
  const [soundEffects, setSoundEffects] = useState(50);
  const [hardMode, setHardMode] = useState(false);
  const [hints, setHints] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      const localSettings = JSON.parse(localStorage.getItem("gameSettings")) || {
        masterVolume: 50,
        musicVolume: 50,
        soundEffects: 50,
        hardMode: false,
        hints: true,
      };

      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        if (!isMounted) return;

        setSession(currentSession ?? null);

        if (!currentSession?.user) {
          setMasterVolume(localSettings.masterVolume);
          setMusicVolume(localSettings.musicVolume);
          setSoundEffects(localSettings.soundEffects);
          setHardMode(localSettings.hardMode);
          setHints(localSettings.hints);
          setReady(true);
          return;
        }

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("master_volume, music_volume, sound_effects_volume")
          .eq("user_id", currentSession.user.id)
          .single();

        if (error || !profile) {
          setMasterVolume(localSettings.masterVolume);
          setMusicVolume(localSettings.musicVolume);
          setSoundEffects(localSettings.soundEffects);
          setHardMode(localSettings.hardMode);
          setHints(localSettings.hints);
          setReady(true);
          return;
        }

        setMasterVolume(profile.master_volume ?? 50);
        setMusicVolume(profile.music_volume ?? 50);
        setSoundEffects(profile.sound_effects_volume ?? 50);
        setHardMode(localSettings.hardMode);
        setHints(localSettings.hints);
        setReady(true);
      } catch (error) {
        setMasterVolume(localSettings.masterVolume);
        setMusicVolume(localSettings.musicVolume);
        setSoundEffects(localSettings.soundEffects);
        setHardMode(localSettings.hardMode);
        setHints(localSettings.hints);
        setReady(true);
      }
    }

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleExit = () => {
    if (onClose) onClose();
    else navigate("/");
  };

  const handleSave = async () => {
    const settings = { masterVolume, musicVolume, soundEffects, hardMode, hints };
    localStorage.setItem("gameSettings", JSON.stringify(settings));

    try {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      if (currentSession?.user) {
        const { error } = await supabase
          .from("profiles")
          .update({
            master_volume: masterVolume,
            music_volume: musicVolume,
            sound_effects_volume: soundEffects,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", currentSession.user.id);

        if (error) {
          console.error("Failed to save settings to Supabase:", error);
        }
      }

      alert("Settings Saved!");
    } catch (error) {
      console.error("Failed to save settings:", error);
      alert("Settings Saved Locally!");
    }
  };

  const handleReset = async () => {
    const defaults = {
      masterVolume: 50,
      musicVolume: 50,
      soundEffects: 50,
      hardMode: false,
      hints: true,
    };

    setMasterVolume(defaults.masterVolume);
    setMusicVolume(defaults.musicVolume);
    setSoundEffects(defaults.soundEffects);
    setHardMode(defaults.hardMode);
    setHints(defaults.hints);

    localStorage.setItem("gameSettings", JSON.stringify(defaults));

    try {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      if (currentSession?.user) {
        const { error } = await supabase
          .from("profiles")
          .update({
            master_volume: defaults.masterVolume,
            music_volume: defaults.musicVolume,
            sound_effects_volume: defaults.soundEffects,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", currentSession.user.id);

        if (error) {
          console.error("Failed to reset settings in Supabase:", error);
        }
      }
    } catch (error) {
      console.error("Failed to reset settings:", error);
    }
  };

  const handleResetProgress = async () => {
    const confirmed = window.confirm(
      "Reset all progress? This will clear local progress and reset your saved level progress."
    );
    if (!confirmed) return;

    localStorage.removeItem("guestHasSeenStory1");
    localStorage.removeItem("levelProgress");
    localStorage.removeItem("gameSettings");

    try {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      if (currentSession?.user) {
        const { error } = await supabase
          .from("profiles")
          .update({
            level: 0,
            sustain_score: 0,
            level1_stars: 0,
            level2_stars: 0,
            level3_stars: 0,
            level4_stars: 0,
            level1_score: 0,
            level2_score: 0,
            level3_score: 0,
            level4_score: 0,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", currentSession.user.id);

        if (error) {
          console.error("Failed to reset progress in Supabase:", error);
          alert("Could not fully reset cloud progress.");
          return;
        }
      }

      alert("Progress Reset!");
    } catch (error) {
      console.error("Failed to reset progress:", error);
      alert("Local progress reset, but cloud reset failed.");
    }
  };

  const sliderRows = [
    { label: "Master Volume", value: masterVolume, setter: setMasterVolume, img: sushiSalmon },
    { label: "Music Volume", value: musicVolume, setter: setMusicVolume, img: sushiShrimp },
    { label: "Sound Effects", value: soundEffects, setter: setSoundEffects, img: sushiTamago },
  ];

  const toggleRows = [
    { label: "Hard Mode", value: hardMode, setter: setHardMode },
    { label: "Hints", value: hints, setter: setHints },
  ];


  if (!ready) return null;

  return (
    <div>
      {background && (
        <img
          src={background}
          alt=""
          style={{ position: "fixed", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }}
        />
      )}

      {background && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.15)", zIndex: 0 }} />
      )}

      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(580px, 230vw)",
          height: "min(720px, 80vh)",
          background: "rgba(255,255,255,0.92)",
          borderRadius: "30px",
          padding: "28px",
          backdropFilter: "blur(18px)",
          boxShadow: "0 25px 50px rgba(0,0,0,0.16)",
          zIndex: 1,
          fontFamily: "'Fredoka One', cursive",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <h1 style={{ textAlign: "center", fontSize: "38px", marginBottom: "24px" }}>
          SETTINGS
        </h1>

        <div style={{ flex: 1, overflowY: "auto", paddingRight: "8px" }}>
          {sliderRows.map((row) => (
            <div key={row.label} style={{ marginBottom: "32px" }}>
              <div style={{ fontSize: "24px", marginBottom: "10px" }}>{row.label}</div>
              <div className="sliderWrap" style={{ "--val": row.value / 100 }}>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={row.value}
                  className="sushiRange"
                  onChange={(e) => row.setter(Number(e.target.value))}
                  style={{
                    background: `linear-gradient(
                      to right,
                      #7FBF3F 0%,
                      #7FBF3F ${row.value}%,
                      #dfe8d1 ${row.value}%,
                      #dfe8d1 100%
                    )`,
                  }}
                />
                <img className="sushiKnob" src={row.img} alt="" draggable={false} />
              </div>
            </div>
          ))}

          {toggleRows.map((row) => (
            <div
              key={row.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "22px",
                fontSize: "24px",
              }}
            >
              {row.label}
              <label className="switch">
                <input type="checkbox" checked={row.value} onChange={() => row.setter(!row.value)} />
                <span className="slider" />
              </label>
            </div>
          ))}

          <div
            style={{
              marginTop: "22px",
              padding: "18px",
              borderRadius: "20px",
              background: "rgba(255,240,240,0.92)",
              border: "1px solid rgba(220,100,100,0.35)",
            }}
          >
            <div style={{ fontSize: "18px", fontWeight: 800, color: "#c0392b", marginBottom: "6px" }}>
              DANGER ZONE
            </div>
            <div style={{ fontSize: "14px", lineHeight: 1.5, color: "#5a2d2d", marginBottom: "14px" }}>
              Warning: this setting will permanently erase your progress.
            </div>
            <button style={dangerButtonStyle} onClick={handleResetProgress}>Reset Progress</button>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            marginTop: "18px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <button style={buttonStyle} onClick={handleSave}>Save</button>
          <button style={buttonStyle} onClick={handleReset}>Reset Settings</button>
          <button style={buttonStyle} onClick={handleExit}>Exit</button>
          {extraButtons}
        </div>
      </div>

      <style>{`
        .sliderWrap {
          position: relative;
          width: 100%;
          height: 64px;
          --thumbSize: 56px;
          --trackH: 14px;
          --pad: calc(var(--thumbSize) / 2);
          padding-left: var(--pad);
          padding-right: var(--pad);
          box-sizing: border-box;
        }
        .sushiRange {
          position: absolute;
          left: var(--pad);
          width: calc(100% - (var(--pad) * 2));
          top: 50%;
          transform: translateY(-50%);
          height: var(--trackH);
          appearance: none;
          border-radius: 10px;
          outline: none;
        }
        .sushiRange::-webkit-slider-runnable-track {
          height: var(--trackH);
          border-radius: 10px;
        }
        .sushiRange::-webkit-slider-thumb {
          appearance: none;
          width: var(--thumbSize);
          height: var(--thumbSize);
          background: transparent;
          border: none;
          margin-top: calc((var(--trackH) - var(--thumbSize)) / 2);
          cursor: pointer;
        }
        .sushiKnob {
          position: absolute;
          top: 50%;
          left: calc(var(--pad) + (100% - (2 * var(--pad))) * var(--val));
          transform: translate(-50%, -50%);
          width: var(--thumbSize);
          height: var(--thumbSize);
          object-fit: contain;
          pointer-events: none;
          filter: drop-shadow(0 2px 2px rgba(0,0,0,0.2));
          user-select: none;
        }
        .switch {
          position: relative;
          display: inline-block;
          width: 60px;
          height: 34px;
        }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider {
          position: absolute;
          cursor: pointer;
          inset: 0;
          background-color: #ccc;
          border-radius: 34px;
        }
        .slider:before {
          content: "";
          position: absolute;
          height: 26px;
          width: 26px;
          left: 4px;
          bottom: 4px;
          background-color: white;
          border-radius: 50%;
          transition: .3s;
        }
        input:checked + .slider { background-color: #4CAF50; }
        input:checked + .slider:before { transform: translateX(26px); }
      `}</style>
    </div>
  );
}

const buttonStyle = {
  padding: "14px 38px",
  fontSize: "20px",
  borderRadius: "18px",
  border: "none",
  backgroundColor: "#e8e1cf",
  cursor: "pointer",
  boxShadow: "0 8px 15px rgba(0,0,0,0.15)",
  fontFamily: "'Fredoka One', cursive",
};

const dangerButtonStyle = {
  padding: "14px 38px",
  fontSize: "20px",
  borderRadius: "18px",
  border: "none",
  backgroundColor: "#c0392b",
  color: "white",
  cursor: "pointer",
  boxShadow: "0 8px 15px rgba(0,0,0,0.15)",
  fontFamily: "'Fredoka One', cursive",
};