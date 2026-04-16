import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import homescreenImg from "../assets/homescreen.jpg";

export default function Game() {
  const nav = useNavigate();
  const [tab, setTab] = useState("about");

  const recipesList = useMemo(
    () => [
      { level: 1, text: "Rice + Salmon = 🥘" },
      { level: 2, text: "Rice + Shrimp = 🍤" },
      { level: 3, text: "Rice + Tamago = 🍳" },
      { level: 4, text: "Rice + Tuna = 🍣" },
      { level: 5, text: "Rice + Avocado = 🥑" },
      { level: 6, text: "Rice + Cucumber = 🥒" },
      { level: 7, text: "Rice + Crab = 🦀" },
      { level: 8, text: "Rice + Eel = 🐟" },
      { level: 9, text: "Rice + Tofu = 🍲" },
      { level: 10, text: "Rice + Mushroom = 🍄" },
      { level: 11, text: "Rice + Beef = 🥩" },
      { level: 12, text: "Rice + Chicken = 🍗" },
      { level: 13, text: "Rice + Carrot = 🥕" },
      { level: 14, text: "Rice + Seaweed = 🌿" },
      { level: 15, text: "Rice + Tempura = 🍤" },
      { level: 16, text: "Rice + Onion = 🧅" },
      { level: 17, text: "Rice + Pepper = 🫑" },
      { level: 18, text: "Rice + Corn = 🌽" },
      { level: 19, text: "Rice + Eggplant = 🍆" },
      { level: 20, text: "Rice + Sesame = 🌰" },
      { level: 21, text: "Rice + Tomato = 🍅" },
      { level: 22, text: "Rice + Lettuce = 🥬" },
      { level: 23, text: "Rice + Pork = 🍖" },
      { level: 24, text: "Rice + Fish Roe = 🟠" },
    ],
    []
  );

  const content = useMemo(
    () => ({
      about:
        "Sustainabear is a culinary-themed game where players match ingredients to complete recipes while managing a growing restaurant. Success depends not only on speed and strategy, but also on making sustainable choices that reduce food waste and improve efficiency.",
      team: "This game is presented to you by the Overcooked Team.\n\n ~View our code here~ \n https://github.com/mia-oww/Undercooked",
      achievements: "- 🍣 First Dish: Finish the first chapter\n\n- ⭐️ Triple Threat: Earn 3 stars on any level.\n\n- 🌱 Sustainable Master: Reach maximum sustainability score.\n\n- 🎯 On a Roll! : Complete 5 levels in a row without failing. \n\n- 🏅 Perfect Plate: Earn 3 stars on ALL levels.\n\n- 💎 Cosmetic Completionist: Collect every cosmetic in the game.\n",
    }),
    []
  );


  const active = (key) => tab === key;

  return (
    <div>
      <img
        src={homescreenImg}
        alt=""
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: 0,
        }}
      />

      <div
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "28px",
          zIndex: 1,
          fontFamily: "'Fredoka One', cursive",
        }}
      >
        <div
          style={{
            width: "75vw",
            maxWidth: "1100px",
            minWidth: "900px",
            background: "rgba(255,255,255,0.72)",
            borderRadius: "35px",
            padding: "60px",
            backdropFilter: "blur(18px)",
            boxShadow: "0 25px 50px rgba(0,0,0,0.15)",
            display: "grid",
            gridTemplateColumns: "260px 1fr",
            gap: "26px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <div style={{ fontSize: "32px", letterSpacing: "0.5px" }}>GAME INFO</div>

            <button
              onClick={() => setTab("about")}
              style={{
                ...tabBtn,
                ...(active("about") ? tabBtnActive : null),
              }}
            >
              about the game
            </button>

            <button
              onClick={() => setTab("recipes")}
              style={{
                ...tabBtn,
                ...(active("recipes") ? tabBtnActive : null),
              }}
            >
              recipes
            </button>

            <button
              onClick={() => setTab("achievements")}
              style={{
                ...tabBtn,
                ...(active("achievements") ? tabBtnActive : null),
              }}
            >
              achievements
            </button>

            <button
              onClick={() => setTab("team")}
              style={{
                ...tabBtn,
                ...(active("team") ? tabBtnActive : null),
              }}
            >
              meet our team
            </button>

            <div style={{ flex: 1 }} />

            <button onClick={() => nav("/")} style={exitBtn}>
              Exit
            </button>
          </div>

          <div
            style={{
              borderRadius: "24px",
              background: "rgba(255,255,255,0.35)",
              border: "1px solid rgba(0,0,0,0.08)",
              padding: "28px 30px",
              minHeight: "420px",
              boxShadow: "0 10px 22px rgba(0,0,0,0.08) inset",
              overflow: "hidden",
            }}
          >
            {tab === "recipes" ? (
              <div
                style={{
                  height: "480px",
                  overflowY: "auto",
                  paddingRight: "12px",
                }}
                className="recipesScroll"
              >
                <div style={{ fontSize: "24px", marginBottom: "14px", color: "rgba(0,0,0,0.9)" }}>
                  Recipes
                </div>

                {recipesList.map((r) => (
                  <div
                    key={r.level}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "20px 20px",
                      borderRadius: "18px",
                      background: "rgba(255,255,255,0.55)",
                      boxShadow: "0 8px 15px rgba(0,0,0,0.10)",
                      marginBottom: "14px",
                    }}
                  >
                    <div style={{ fontSize: "18px", opacity: 0.9 }}>Level {r.level}</div>
                    <div style={{ fontSize: "20px" }}>{r.text}</div>
                  </div>
                ))}
              </div>
            ) : tab === "achievements" ? (
              <div
                style={{
                  height: "480px",
                  overflowY: "auto",
                  paddingRight: "12px",
                }}
                className="recipesScroll"
              >
                <div style={{ fontSize: "24px", marginBottom: "14px", color: "rgba(0,0,0,0.9)" }}>
                  🏆 Achievements 🏆
                </div>

                {content.achievements.split("\n").filter(line => line.trim()).map((achievement, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "16px 20px",
                      borderRadius: "18px",
                      background: "rgba(255,255,255,0.55)",
                      boxShadow: "0 8px 15px rgba(0,0,0,0.10)",
                      marginBottom: "14px",
                      fontSize: "18px",
                      color: "rgba(0,0,0,0.9)",
                    }}
                  >
                    {achievement}
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  fontSize: "22px",
                  lineHeight: "1.65",
                  whiteSpace: "pre-line",
                  color: "rgba(0,0,0,0.9)",
                  textShadow: "0 1px 0 rgba(255,255,255,0.35)",
                }}
              >
                {content[tab]}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>
        {`
          button:focus { outline: none; }

          .recipesScroll::-webkit-scrollbar {
            width: 12px;
          }

          .recipesScroll::-webkit-scrollbar-track {
            background: rgba(255,255,255,0.35);
            border-radius: 999px;
          }

          .recipesScroll::-webkit-scrollbar-thumb {
            background: rgba(127, 174, 151, 0.85);
            border-radius: 999px;
          }

          .recipesScroll::-webkit-scrollbar-thumb:hover {
            background: rgba(127, 174, 151, 1);
          }
        `}
      </style>
    </div>
  );
}

const tabBtn = {
  width: "100%",
  padding: "18px",
  borderRadius: "14px",
  border: "none",
  cursor: "pointer",
  background: "rgba(255,255,255,0.55)",
  boxShadow: "0 8px 15px rgba(0,0,0,0.10)",
  fontFamily: "'Fredoka One', cursive",
  fontSize: "20px",
  textAlign: "center",
  transition: "transform 120ms ease, box-shadow 120ms ease, background 120ms ease",
};

const tabBtnActive = {
  background: "rgba(127, 174, 151, 0.95)",
  boxShadow: "0 10px 18px rgba(0,0,0,0.14)",
  transform: "translateY(-1px)",
};

const exitBtn = {
  width: "100%",
  padding: "18px",
  borderRadius: "14px",
  border: "1px solid rgba(0,0,0,0.25)",
  background: "rgba(255,255,255,0.55)",
  cursor: "pointer",
  boxShadow: "0 8px 15px rgba(0,0,0,0.10)",
  fontFamily: "'Fredoka One', cursive",
  fontSize: "20px",
};
