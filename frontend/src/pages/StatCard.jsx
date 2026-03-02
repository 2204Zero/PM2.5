import React from "react";

function StatCard({ title, value, accentColor = "#0F172A" }) {
  return (
    <div
      style={{
        background: "white",
        padding: "22px",
        borderRadius: "16px",
        border: "1px solid #E2E8F0",
        transition: "all 0.2s ease",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow =
          "0 10px 25px rgba(0,0,0,0.06)";
        e.currentTarget.style.transform = "translateY(-3px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: "14px",
          color: "#64748B",
          fontWeight: "500",
        }}
      >
        {title}
      </p>

      <h2
        style={{
          margin: "10px 0 0",
          fontSize: "26px",
          fontWeight: "600",
          color: accentColor,
        }}
      >
        {value}
      </h2>
    </div>
  );
}

export default StatCard;