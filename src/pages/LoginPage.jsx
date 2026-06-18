import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { API_URL } from "../context/AuthContext";
import { ROLE_CONFIG } from "../rbacConfig";

export default function LoginPage() {
  const { login }  = useAuth();
  const navigate   = useNavigate();

  const [form,    setForm]    = useState({ identifier: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const demoLogin = (role) => {
    login({
      username : role.charAt(0).toUpperCase() + role.slice(1) + "User",
      email    : `${role}@demo.local`,
      role,
    });
    navigate("/dashboard");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage({ text: "", type: "" });

    if (!form.identifier || !form.password) {
      setMessage({ text: "Please fill in all fields.", type: "error" });
      return;
    }

    setLoading(true);
    try {
      const res  = await fetch(API_URL, {
        method  : "POST",
        headers : { "Content-Type": "application/json" },
        body    : JSON.stringify({
          action     : "login",
          identifier : form.identifier,
          password   : form.password,
        }),
      });
      const data = await res.json();

      if (data.success) {
       
        login({ ...data.user, role: data.user.role || "viewer" });
        navigate("/dashboard");
      } else {
        setMessage({ text: data.message, type: "error" });
      }
    } catch {
      setMessage({ text: "Cannot reach the server. Is XAMPP running?", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {}
      <div className="bg-blob bg-blob-1" />
      <div className="bg-blob bg-blob-2" />

      <div className="auth-screen">
        <div className="card">

            <div className="logo">
            <div className="logo-dot">T</div>
            <span className="logo-text">Thesis_Tracker</span>
          </div>

          <div className="tabs">
            <button className="tab active">Sign In</button>
            <button className="tab" onClick={() => navigate("/register")}>Register</button>
          </div>

 
          <form onSubmit={handleLogin}>
            <p className="form-title">Welcome back</p>
            <p className="form-sub">Sign in with your username or email</p>

            <div className="field">
              <label>Username or Email</label>
              <input
                type="text"
                placeholder="your_username or email@example.com"
                value={form.identifier}
                onChange={e => setForm({ ...form, identifier: e.target.value })}
              />
            </div>

            <div className="field">
              <label>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
              />
            </div>

            <button className="btn" type="submit" disabled={loading}>
              {loading ? "Signing in…" : "Sign In →"}
            </button>
          </form>

          {message.text && (
            <div className={`message ${message.type}`}>{message.text}</div>
          )}

        </div>
      </div>
    </>
  );
}
