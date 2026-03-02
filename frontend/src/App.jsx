import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";

// --- Dashboard Error Boundary Wrapper ---
function SafeDashboard() {
  return (
    <Dashboard.ErrorBoundary>
      <Dashboard />
    </Dashboard.ErrorBoundary>
  );
}
// ----------------------------------------
import ZoneDetail from "./pages/ZoneDetail";
import Login from "./pages/Login";

// 🔐 Route Protection Component (Session-based)
function PrivateRoute({ children }) {
  const token = sessionStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  return (
    <Router>
      <Routes>

        {/* Public Route */}
        <Route path="/login" element={<Login />} />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <SafeDashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="/zone/:zoneId"
          element={
            <PrivateRoute>
              <ZoneDetail />
            </PrivateRoute>
          }
        />

      </Routes>
    </Router>
  );
}

export default App;