import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import homescreenImg from "../assets/homescreen.jpg";

export default function Game() {
  const nav = useNavigate();
  const [tab, setTab] = useState("about");

  
  const content = useMemo(
    () => ({
      about:
        "Sustainabear is a series of mini-games where players work to restore the environment while learning about sustainability in a simplified way. ",
      team: "This game is presented to you by the Undercooked Team consisting of Mia, Sia, Rena, Nashita, Sid, Godric, and Ryan.\n\n ~View our code here~ \n https://github.com/mia-oww/Undercooked",
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
