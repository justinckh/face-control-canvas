import React from "react";

export default function PS5Window() {
  return (
    <div
      style={{
        position: "absolute",
        bottom: "20px",
        right: "20px",
        width: "300px",
        height: "200px",
        backgroundColor: "#2a2a2a",
        border: "2px solid #444",
        borderRadius: "8px",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)",
        zIndex: 50,
        overflow: "hidden",
      }}
    >
      {/* Image container */}
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "10px",
          backgroundColor: "#1a1a1a",
        }}
      >
        <img
          src="/PS5_pic.png"
          alt="PS5"
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
          }}
        />
      </div>
    </div>
  );
}
