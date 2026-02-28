import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import ZoneDetail from "./pages/ZoneDetail";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/zone/:zoneId" element={<ZoneDetail />} />
      </Routes>
    </Router>
  );
}

export default App;