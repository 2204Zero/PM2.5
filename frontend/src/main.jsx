import React from "react";
import ReactDOM from "react-dom/client";
import App from "/src/App.jsx";
import "leaflet/dist/leaflet.css";
import "./styles/responsive.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);