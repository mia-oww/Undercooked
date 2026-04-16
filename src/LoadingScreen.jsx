import { useEffect, useState } from "react";

const MESSAGES = [
  "Waking up the fish…",
  "Sharpening the knife…",
  "Filling the honey jars…",
  "Almost there…",
];

export default function LoadingScreen({ isLoading = true }) {
  const [msgIndex, setMsgIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      // fade out
      setVisible(false);
      return;
    }
    setVisible(true);
    const interval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % MESSAGES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [isLoading]);

  if (!isLoading && !visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#fdf6e3",
        fontFamily: "'Fredoka One', cursive",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.4s ease",
        pointerEvents: isLoading ? "all" : "none",
      }}
    >
      {/* Spinning bear paw or simple spinner */}
      <div
        style={{
          width: "64px",
          height: "64px",
          borderRadius: "50%",
          border: "5px solid #e8e1cf",
          borderTop: "5px solid #7FBF3F",
          animation: "rr-spin 0.9s linear infinite",
          marginBottom: "28px",
        }}
      />

      <style>{`
        @keyframes rr-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes rr-fade-msg {
          0%   { opacity: 0; transform: translateY(6px); }
          15%  { opacity: 1; transform: translateY(0); }
          85%  { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-6px); }
        }
      `}</style>

      <p
        key={msgIndex}
        style={{
          fontSize: "clamp(16px, 2vw, 22px)",
          color: "#5a4a35",
          margin: 0,
          animation: "rr-fade-msg 1.8s ease forwards",
        }}
      >
        {MESSAGES[msgIndex]}
      </p>
    </div>
  );
}