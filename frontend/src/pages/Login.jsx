import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../axiosConfig";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      // Prepare form data (IMPORTANT for OAuth2)
      const formData = new URLSearchParams();
      formData.append("username", username);
      formData.append("password", password);

      const response = await axios.post(
        "/auth/login",
        formData,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      const token = response.data.access_token;

      // Save token
      sessionStorage.setItem("token", token);

      // Redirect to dashboard
      navigate("/");

    } catch (err) {
      setError("Invalid username or password");
    }
  };

  return (
    <div style={{ padding: "40px", fontFamily: "Segoe UI" }}>
      <h2>Admin Login</h2>

      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: "15px" }}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ padding: "8px", width: "250px" }}
            required
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: "8px", width: "250px" }}
            required
          />
        </div>

        <button
          type="submit"
          style={{
            padding: "8px 16px",
            background: "#111",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer"
          }}
        >
          Login
        </button>
      </form>

      {error && (
        <p style={{ color: "red", marginTop: "15px" }}>
          {error}
        </p>
      )}
    </div>
  );
}

export default Login;