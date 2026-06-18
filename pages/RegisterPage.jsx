import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../context/AuthContext";

export default function RegisterPage() {
  const navigate = useNavigate();

  const [form,    setForm]    = useState({ username: "", email: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage({ text: "", type: "" });

    if (!form.username || !form.email || !form.password || !form.confirm) {
      setMessage({ text: "Please fill in all fields.", type: "error" });
      return;
    }
    if (form.password !== form.confirm) {
      setMessage({ text: "Passwords do not match.", type: "error" });
      return;
    }
    if (form.password.length < 6) {
      setMessage({ text: "Password must be at least 6 characters.", type: "error" });
      return;
    }

    setLoading(true);
    try {
      const res  = await fetch(API_URL, {
        method  : "POST",
        headers : { "Content-Type": "application/json" },
        body    : JSON.stringify({
          action   : "register",
          username : form.username,
          email    : form.email,
          password : form.password,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setMessage({ text: data.message + " You can now log in.", type: "success" });
        setForm({ username: "", email: "", password: "", confirm: "" });
        
        setTimeout(() => navigate("/login"), 1500);
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

          {}
          <div className="logo">
            <div className="logo-dot">T</div>
            <span className="logo-text">Thesis_Tracker</span>
          </div>

          {}
          <div className="tabs">
            <button className="tab" onClick={() => navigate("/login")}>Sign In</button>
            <button className="tab active">Register</button>
          </div>

          {}
          <form onSubmit={handleRegister}>
            <p className="form-title">Create account</p>
            <p className="form-sub">Join us — it only takes a moment</p>

            <div className="field">
              <label>Username</label>
              <input
                type="text"
                placeholder="choose_a_username"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
              />
            </div>

            <div className="field">
              <label>Email</label>
              <input
                type="email"
                placeholder="email@example.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div className="field">
              <label>Password</label>
              <input
                type="password"
                placeholder="At least 6 characters"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
              />
            </div>

            {}
            <div className="field">
              <label>Confirm Password</label>
              <input
                type="password"
                placeholder="Re-enter your password"
                value={form.confirm}
                onChange={e => setForm({ ...form, confirm: e.target.value })}
              />
            </div>

            <button className="btn" type="submit" disabled={loading}>
              {loading ? "Creating account…" : "Create Account →"}
            </button>
          </form>

          {}
          {message.text && (
            <div className={`message ${message.type}`}>{message.text}</div>
          )}

        </div>
      </div>
    </>
  );
}
