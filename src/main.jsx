import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import App1 from "./App1";
import "../styles.css";

function AppSwitcher() {
  const [currentApp, setCurrentApp] = useState("App");

  const switchApp = () => {
    setCurrentApp(currentApp === "App" ? "App1" : "App");
  };

  return (
    <>
      <button
        onClick={switchApp}
        style={{
          position: "fixed",
          top: "60px",
          right: "20px",
          zIndex: 10000,
          padding: "12px 24px",
          fontSize: "16px",
          fontWeight: "bold",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          background: "rgba(76, 175, 80, 0.9)",
          color: "white",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
          transition: "all 0.3s ease",
        }}
        onMouseEnter={(e) => {
          e.target.style.background = "rgba(69, 160, 73, 0.95)";
          e.target.style.transform = "scale(1.05)";
        }}
        onMouseLeave={(e) => {
          e.target.style.background = "rgba(76, 175, 80, 0.9)";
          e.target.style.transform = "scale(1)";
        }}
      >
        Switch Model
      </button>
      {currentApp === "App" ? <App /> : <App1 />}
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppSwitcher />
  </React.StrictMode>
);
