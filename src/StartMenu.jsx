import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import homescreenImg from "./assets/homescreen.jpg";
import playBtnImg from "./assets/play_button.png";
import settingsBtnImg from "./assets/settings_button.png";
import infoBtnImg from "./assets/info_button.png";
import PlayerProfile from "./components/playerProfile";

import Settings from "./components/Settings";

import { supabase } from "./supabase";
import {
  isGuestMode,
  getGuestProfile,
  endGuestMode,
  startGuestMode,
} from "./guestSession";


export default function StartMenu() {
  const navigate = useNavigate();

  const [ready, setReady] = useState(false);
  const [session, setSession] = useState(null);
  const [playBusy, setPlayBusy] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    let stillMounted = true;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!stillMounted) return;

        setSession(data?.session ?? null);

        const hasLoginSession = !!data?.session;
        if (!hasLoginSession && !isGuestMode()) {
          startGuestMode();
        }
      } finally {
        if (stillMounted) setReady(true);
      }
    })();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession ?? null);

        if (nextSession) {
          endGuestMode();
        }

        if (!nextSession && !isGuestMode()) {
          startGuestMode();
        }
      }
    );

    return () => {
      stillMounted = false;
      authListener?.subscription?.unsubscribe?.();
    };
  }, []);

  if (!ready) return null;

  const guestMode = isGuestMode();
  const guestProfile = getGuestProfile();

  async function handlePlayClick() {
    if (playBusy) return;
    setPlayBusy(true);

    try {
      if (session?.user) {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("level")
          .eq("user_id", session.user.id)
          .single();

        if (error) {
          console.error("Failed to fetch profile level:", error);
          navigate("/story1");
          return;
        }

        const currentLevel = profile?.level ?? 0;

        if (currentLevel === 0) {
          navigate("/story1");
        } else {
          navigate("/level-selection");
        }
        return;
      }

      if (!isGuestMode()) {
        startGuestMode();
      }

      const guestHasSeenStory1 =
        localStorage.getItem("guestHasSeenStory1") === "true";

      if (guestHasSeenStory1) {
        navigate("/level-selection");
      } else {
        navigate("/story1");
      }
    } finally {
      setPlayBusy(false);
    }
  }

  function handleClearCache() {
    const confirmed = window.confirm("Clear all local guest test data and reset local progress?");
    if (!confirmed) return;

    localStorage.clear();
    endGuestMode();
    startGuestMode();
    navigate("/");
    window.location.reload();
  }

  return (
    <div>
      <img
        src={homescreenImg}
        alt="Home"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
        }}
      />

      <img
        src={playBtnImg}
        alt="Play"
        onClick={handlePlayClick}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateX(-50%) scale(1.05)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateX(-50%) scale(1)";
        }}
        style={{
          position: "fixed",
          bottom: "10%",
          left: "51%",
          transform: "translateX(-50%)",
          width: "20vw",
          cursor: playBusy ? "wait" : "pointer",
          zIndex: 1,
          transition: "transform 0.15s ease",
          opacity: playBusy ? 0.9 : 1,
        }}
      />

      <button
        onClick={() => navigate("/leaderboard")}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateX(-50%) scale(1.05)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateX(-50%) scale(1)";
        }}
        style={{
          position: "fixed",
          bottom: "2%", // below Play (which is 10%)
          left: "51%",
          transform: "translateX(-50%)",
          width: "18vw",
          padding: "12px",
          borderRadius: "16px",
          border: "none",
          background: "rgba(0, 0, 0, 0.6)",
          color: "white",
          fontSize: "18px",
          fontFamily: "'Fredoka One', cursive",
          cursor: "pointer",
          zIndex: 1,
          transition: "transform 0.15s ease",
          boxShadow: "0 6px 12px rgba(0,0,0,0.4)",
          backdropFilter: "blur(6px)",
        }}
      >
        Leaderboard
      </button>
      


      <img
        src={settingsBtnImg}
        alt="Settings"
        onClick={() => setShowSettings(true)}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.05)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
        }}
        style={{
          position: "fixed",
          bottom: "10%",
          left: "63%",
          width: "15vw",
          cursor: "pointer",
          zIndex: 1,
          transition: "transform 0.15s ease",
        }}
      />

      <img
        src={infoBtnImg}
        alt="Info"
        onClick={() => navigate("/info")}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.05)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
        }}
        style={{
          position: "fixed",
          bottom: "10%",
          left: "23%",
          width: "15vw",
          cursor: "pointer",
          zIndex: 1,
          transition: "transform 0.15s ease",
        }}
      />

      <button
        onClick={handleClearCache}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.05)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
        }}
        style={{
          position: "fixed",
          bottom: "2%",
          left: "2%",
          zIndex: 3,
          padding: "8px 14px",
          fontSize: "12px",
          borderRadius: "12px",
          border: "none",
          backgroundColor: "rgba(223, 56, 10, 0.92)",
          cursor: "pointer",
          boxShadow: "0 6px 12px rgb(253, 253, 253)",
          fontFamily: "'Fredoka One', cursive",
          transition: "transform 0.1s ease",
          color: "white",
        }}
      >
        Clear Progress?
      </button>

<PlayerProfile
  username={
    session?.user?.user_metadata?.display_name ||
    guestProfile?.display_name ||
    "Player"
  }
  isGuest={!session && guestMode && !!guestProfile}
  onLogout={async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  }}
  onLogin={() => {
    endGuestMode();
    navigate("/auth");
  }}
/>

      {showSettings && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10 }}>
          <Settings onClose={() => setShowSettings(false)} />
        </div>
      )}
    </div>
  );
}