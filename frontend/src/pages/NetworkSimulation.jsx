import { useState } from "react"; 

function NetworkSimulation() { 
  const [running, setRunning] = useState(false); 

  return ( 
    <div style={{ padding: "30px", fontFamily: "Segoe UI" }}> 
      <h1 style={{ marginBottom: "20px" }}>Network Simulation</h1> 

      <button 
        onClick={() => setRunning(!running)} 
        style={{ 
          padding: "10px 18px", 
          borderRadius: "8px", 
          border: "none", 
          background: running ? "#dc2626" : "#16a34a", 
          color: "white", 
          cursor: "pointer", 
          fontWeight: "600" 
        }} 
      > 
        {running ? "Stop Simulation" : "Start Simulation"} 
      </button> 

      <div style={{ marginTop: "40px" }}> 
        <p style={{ fontSize: "16px", opacity: 0.8 }}> 
          Cisco-style network topology simulation will appear here. 
        </p> 
      </div> 
    </div> 
  ); 
} 

export default NetworkSimulation; 
