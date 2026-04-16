import { useEffect, useState } from "react";
import { supabase } from "../supabase.js";
import defaultBearImg from "../assets/profile_icons/default_bear.png";

const AVATARS = [
  { id: "bear",    img: defaultBearImg, label: "Bear" },
  { id: "panda",   emoji: "🐼", label: "Panda" },
  { id: "fox",     emoji: "🦊", label: "Fox" },
  { id: "frog",    emoji: "🐸", label: "Frog" },
  { id: "penguin", emoji: "🐧", label: "Penguin" },
  { id: "bunny",   emoji: "🐰", label: "Bunny" },
  { id: "duck",    emoji: "🐥", label: "Duck" },
  { id: "koala",   emoji: "🐨", label: "Koala" },
  { id: "cat",     emoji: "🐱", label: "Cat" },
  { id: "owl",     emoji: "🦉", label: "Owl" },
  { id: "hamster", emoji: "🐹", label: "Hamster" },
  { id: "turtle",  emoji: "🐢", label: "Turtle" },
];

const AVATAR_STORAGE_KEY = "sustainabear_avatar";

function AvatarDisplay({ avatar, size = 34, fontSize = 20 }) {
  if (avatar?.img) {
    return (
      <img
        src={avatar.img}
        alt={avatar.label}
        style={{ width: size, height: size, objectFit: "contain", borderRadius: "50%" }}
      />
    );
  }
  return <span style={{ fontSize }}>{avatar?.emoji}</span>;
}

export default function PlayerProfile({ username, isGuest, onLogout, onLogin }) {
  const [open, setOpen] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState("bear");
  const [pendingAvatar, setPendingAvatar] = useState(null);

  useEffect(() => {
    async function loadAvatar() {
      if (isGuest) {
        const savedAvatar = localStorage.getItem(AVATAR_STORAGE_KEY) || "bear";
        setSelectedAvatar(savedAvatar);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        const savedAvatar = localStorage.getItem(AVATAR_STORAGE_KEY) || "bear";
        setSelectedAvatar(savedAvatar);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("avatar_id")
        .eq("user_id", user.id)
        .single();

      if (!error && data?.avatar_id) {
        setSelectedAvatar(data.avatar_id);
        localStorage.setItem(AVATAR_STORAGE_KEY, data.avatar_id);
      } else {
        const savedAvatar = localStorage.getItem(AVATAR_STORAGE_KEY) || "bear";
        setSelectedAvatar(savedAvatar);
      }
    }

    loadAvatar();
  }, [isGuest]);

  const currentAvatar = AVATARS.find((a) => a.id === selectedAvatar) || AVATARS[0];

  function handleOpen() {
    setPendingAvatar(selectedAvatar);
    setOpen(true);
  }

  function handleClose() {
    setPendingAvatar(null);
    setOpen(false);
  }

  async function handleSave() {
    if (!pendingAvatar) {
      setOpen(false);
      return;
    }

    setSelectedAvatar(pendingAvatar);
    localStorage.setItem(AVATAR_STORAGE_KEY, pendingAvatar);

    if (!isGuest) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase
          .from("profiles")
          .update({ avatar_id: pendingAvatar })
          .eq("user_id", user.id);
      }
    }

    setOpen(false);
  }

  const pendingAvatarObj = AVATARS.find((a) => a.id === pendingAvatar) || currentAvatar;

  return (
    <>
      {/* ── Avatar Chip (top-right) ── */}
      <button
        onClick={handleOpen}
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          zIndex: 5,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 16px 8px 10px",
          borderRadius: 18,
          border: "3px solid #90A25C",
          backgroundColor: "#d4edb0", //button color bg
          cursor: "pointer",
          fontFamily: "'Fredoka One', cursive",
          fontSize: 18,
          color: "#3a5c20",
          transition: "transform 0.1s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.05)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        <span style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          backgroundColor: "#e8f5d0",
          border: "2px solid #90A25C",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}>
          <AvatarDisplay avatar={currentAvatar} size={28} fontSize={18} />
        </span>
        <span style={{ maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {username || "Player"}
        </span>
        {isGuest && (
          <span style={{
            fontSize: 11,
            backgroundColor: "#f0c040",
            color: "#7a5500",
            borderRadius: 6,
            padding: "1px 6px",
            fontFamily: "'Fredoka One', cursive",
          }}>
            GUEST
          </span>
        )}
      </button>

      {/* ── Modal Overlay ── */}
      {open && (
        <div
          onClick={handleClose}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 20,
            backgroundColor: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "fadeIn 0.15s ease",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(680px, 92vw)",
              minHeight: 380,
              borderRadius: 24,
              overflow: "hidden",
              display: "flex",
              boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
              animation: "popIn 0.2s cubic-bezier(0.34,1.56,0.64,1)",
              fontFamily: "'Fredoka One', cursive",
            }}
          >
            {/* Left panel */}
            <div style={{
              width: 200,
              flexShrink: 0,
              backgroundColor: "#f5f0e0",
              padding: "32px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              borderRight: "2px solid #d9ceaa",
            }}>
              <h2 style={{
                margin: "0 0 16px 0",
                fontSize: 22,
                color: "#2d4a10",
                letterSpacing: 0.5,
                textTransform: "uppercase",
              }}>
                Player Info
              </h2>

              {/* Avatar preview in sidebar */}
              <div style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                backgroundColor: "#d4edb0",
                border: "3px solid #5a8a3c",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 44,
                margin: "0 auto 8px",
                transition: "transform 0.2s ease",
              }}>
                <AvatarDisplay avatar={pendingAvatarObj} size={52} fontSize={44} />
              </div>
              <p style={{
                textAlign: "center",
                margin: 0,
                fontSize: 13,
                color: "#5a8a3c",
              }}>
                {pendingAvatarObj.label}
              </p>

              <div style={{ flex: 1 }} />

              {/* Log out (logged in users) or Log in (guests) */}
              {!isGuest && onLogout && (
                <button
                  onClick={onLogout}
                  style={{
                    width: "100%",
                    padding: "10px 0",
                    borderRadius: 14,
                    border: "2px solid #e0a0a0",
                    backgroundColor: "transparent",
                    color: "#c05050",
                    fontFamily: "'Fredoka One', cursive",
                    fontSize: 16,
                    cursor: "pointer",
                    transition: "background-color 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#fceaea";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  Log out
                </button>
              )}
              {isGuest && onLogin && (
                <button
                  onClick={onLogin}
                  style={{
                    width: "100%",
                    padding: "10px 0",
                    borderRadius: 14,
                    border: "2px solid #5a8a3c",
                    backgroundColor: "transparent",
                    color: "#3a6020",
                    fontFamily: "'Fredoka One', cursive",
                    fontSize: 16,
                    cursor: "pointer",
                    transition: "background-color 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#d4edb0";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  Log in
                </button>
              )}

              {/* Save button */}
              <button
                onClick={handleSave}
                style={{
                  width: "100%",
                  padding: "10px 0",
                  borderRadius: 14,
                  border: "none",
                  backgroundColor: "#5a8a3c",
                  color: "white",
                  fontFamily: "'Fredoka One', cursive",
                  fontSize: 16,
                  cursor: "pointer",
                  boxShadow: "0 4px 0 #3a6020",
                  transition: "transform 0.1s ease, box-shadow 0.1s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = "translateY(2px)";
                  e.currentTarget.style.boxShadow = "0 2px 0 #3a6020";
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 4px 0 #3a6020";
                }}
              >
                Save
              </button>

              <button
                onClick={handleClose}
                style={{
                  width: "100%",
                  padding: "10px 0",
                  borderRadius: 14,
                  border: "2px solid #c0baa0",
                  backgroundColor: "transparent",
                  color: "#7a7060",
                  fontFamily: "'Fredoka One', cursive",
                  fontSize: 16,
                  cursor: "pointer",
                  transition: "background-color 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#ece6d0";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                Exit
              </button>
            </div>

            {/* Right panel */}
            <div style={{
              flex: 1,
              backgroundColor: "#fffdf5",
              padding: "32px 28px",
              overflowY: "auto",
            }}>
              {/* Username row */}
              <div style={{ marginBottom: 28 }}>
                <p style={{
                  margin: "0 0 6px 0",
                  fontSize: 13,
                  color: "#8a8070",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}>
                  Username
                </p>
                <div style={{
                  padding: "10px 16px",
                  borderRadius: 12,
                  backgroundColor: "#f0ead8",
                  border: "2px solid #d9ceaa",
                  fontSize: 18,
                  color: "#2d4a10",
                }}>
                  {username || "Player"}
                  {isGuest && (
                    <span style={{
                      marginLeft: 8,
                      fontSize: 11,
                      backgroundColor: "#f0c040",
                      color: "#7a5500",
                      borderRadius: 6,
                      padding: "2px 6px",
                    }}>
                      GUEST
                    </span>
                  )}
                </div>
              </div>

              {/* Avatar picker */}
              <div>
                <p style={{
                  margin: "0 0 10px 0",
                  fontSize: 13,
                  color: "#8a8070",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}>
                  Choose your avatar
                </p>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 10,
                }}>
                  {AVATARS.map((avatar) => {
                    const isSelected = pendingAvatar === avatar.id;
                    return (
                      <button
                        key={avatar.id}
                        onClick={() => setPendingAvatar(avatar.id)}
                        title={avatar.label}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 4,
                          padding: "10px 6px",
                          borderRadius: 14,
                          border: isSelected ? "3px solid #5a8a3c" : "3px solid transparent",
                          backgroundColor: isSelected ? "#d4edb0" : "#f0ead8",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          boxShadow: isSelected ? "0 0 0 2px #5a8a3c40" : "none",
                          transform: isSelected ? "scale(1.06)" : "scale(1)",
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = "#e4dcc8";
                            e.currentTarget.style.transform = "scale(1.04)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = "#f0ead8";
                            e.currentTarget.style.transform = "scale(1)";
                          }
                        }}
                      >
                        <AvatarDisplay avatar={avatar} size={36} fontSize={28} />
                        <span style={{
                          fontSize: 10,
                          color: isSelected ? "#3a6020" : "#8a8070",
                          fontFamily: "'Fredoka One', cursive",
                        }}>
                          {avatar.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.88); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  );
}