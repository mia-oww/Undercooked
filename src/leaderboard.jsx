import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabase";
import homescreenImg from "./assets/homescreen.jpg";

export default function LeaderboardPage() {
  const navigate = useNavigate();

  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  async function fetchLeaderboard() {
    setLoading(true);
    setErrorMsg("");

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, display_name, sustain_score")
        .order("sustain_score", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Leaderboard fetch error:", error);
        setErrorMsg(error.message || "Failed to load leaderboard.");
        setLeaders([]);
      } else {
        setLeaders(data || []);
      }
    } catch (err) {
      console.error("Unexpected leaderboard error:", err);
      setErrorMsg("Something went wrong loading the leaderboard.");
      setLeaders([]);
    } finally {
      setLoading(false);
    }
  }

  const rankedLeaders = [];
  let lastScore = null;
  let lastRank = 0;

  for (let i = 0; i < leaders.length; i++) {
    const user = leaders[i];
    const score = user.sustain_score ?? 0;

    let rank;
    if (i === 0) {
      rank = 1;
    } else if (score === lastScore) {
      rank = lastRank;
    } else {
      rank = i + 1;
    }

    rankedLeaders.push({ ...user, rank });
    lastScore = score;
    lastRank = rank;
  }

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
          objectPosition: "center",
          zIndex: 0,
        }}
      />

      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.15)",
          zIndex: 0,
        }}
      />

      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "60vw",
          maxWidth: "800px",
          maxHeight: "75vh",
          overflowY: "auto",
          background: "rgba(255,255,255,0.75)",
          borderRadius: "35px",
          padding: "50px",
          backdropFilter: "blur(18px)",
          boxShadow: "0 25px 50px rgba(0,0,0,0.15)",
          zIndex: 1,
          fontFamily: "'Fredoka One', cursive",
        }}
      >
        <h1 style={{ textAlign: "center", fontSize: "52px", marginBottom: "30px" }}>
          LEADERBOARD
        </h1>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "24px",
            marginBottom: "16px",
            paddingBottom: "10px",
            borderBottom: "2px solid rgba(0,0,0,0.15)",
          }}
        >
          <div style={{ width: "30%" }}>Position</div>
          <div style={{ width: "30%", textAlign: "center" }}>Player</div>
          <div style={{ width: "50%", textAlign: "right" }}>Sustain Score</div>
        </div>

        {loading && (
          <div style={{ textAlign: "center", fontSize: "20px" }}>
            Loading...
          </div>
        )}

        {!loading && errorMsg && (
          <div style={{ textAlign: "center", fontSize: "20px", color: "#b00020" }}>
            {errorMsg}
          </div>
        )}

        {!loading && !errorMsg && leaders.length === 0 && (
          <div style={{ textAlign: "center", fontSize: "20px" }}>
            No players found.
          </div>
        )}

        {!loading &&
          !errorMsg &&
          rankedLeaders.map((user, index) => (
            <div
              key={user.user_id || index}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "14px 0",
                fontSize: "22px",
                borderBottom: "1px solid rgba(0,0,0,0.1)",
              }}
            >
              <div style={{ width: "20%" }}>#{user.rank}</div>

              <div
                style={{
                  width: "45%",
                  textAlign: "center",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {user.display_name || "Anonymous"}
              </div>

              <div style={{ width: "35%", textAlign: "right", color: "#2ecc71" }}>
                {user.sustain_score ?? 0}
              </div>
            </div>
          ))}

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "12px",
            marginTop: "30px",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={fetchLeaderboard}
            disabled={loading}
            style={{
              padding: "14px 38px",
              fontSize: "20px",
              borderRadius: "18px",
              border: "none",
              backgroundColor: "#e8e1cf",
              cursor: loading ? "wait" : "pointer",
              boxShadow: "0 8px 15px rgba(0,0,0,0.15)",
              fontFamily: "'Fredoka One', cursive",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>

          <button
            onClick={() => navigate("/")}
            style={{
              padding: "14px 38px",
              fontSize: "20px",
              borderRadius: "18px",
              border: "none",
              backgroundColor: "#e8e1cf",
              cursor: "pointer",
              boxShadow: "0 8px 15px rgba(0,0,0,0.15)",
              fontFamily: "'Fredoka One', cursive",
            }}
          >
            Exit
          </button>
        </div>
      </div>
    </div>
  );
}