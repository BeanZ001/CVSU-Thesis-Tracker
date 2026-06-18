

import { useState, useRef, useEffect } from "react";
import { useNotifications } from "../context/NotificationContext";

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (diff < 60)        return "just now";
  if (diff < 3600)      return Math.floor(diff / 60) + "m ago";
  if (diff < 86400)     return Math.floor(diff / 3600) + "h ago";
  return Math.floor(diff / 86400) + "d ago";
}

const TYPE_COLORS = {
  file_received:    "#47c6ff",
  file_sent:        "#a8edaf",
  msg_received:     "#ffdd75",
  msg_file_received:"#47c6ff",
  msg_file_sent:    "#a8edaf",
  msg_reply:        "#ffdd75",
  db_approved:      "#a8edaf",
  db_changed:       "#ff6b6b",
  status_changed:   "#c4b5fd",
  info:             "#94a3b8",
};

export default function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  
  useEffect(() => {
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      {}
      <button
        onClick={() => setOpen(o => !o)}
        title="Notifications"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          position: "relative",
          padding: "6px 8px",
          borderRadius: 8,
          fontSize: 20,
          lineHeight: 1,
          transition: "background 0.15s",
          color: "var(--text)",
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: "absolute",
            top: 2, right: 2,
            background: "#ff4757",
            color: "#fff",
            borderRadius: "50%",
            minWidth: 16,
            height: 16,
            fontSize: 10,
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 3px",
            boxShadow: "0 0 0 2px var(--bg, #1a1a2e)",
            lineHeight: 1,
          }}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {}
      {open && (
        <div style={{
          position: "absolute",
          right: 0,
          top: "calc(100% + 8px)",
          width: 340,
          maxHeight: 460,
          background: "#2a2d3e",
          border: "1px solid rgba(255,255,255,0.18)",
          borderRadius: 12,
          boxShadow: "0 8px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06)",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}>
          {}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "13px 16px 11px",
            borderBottom: "1px solid rgba(255,255,255,0.12)",
            background: "#31354a",
          }}>
            <span style={{ fontWeight: 800, fontSize: 14, color: "#f0f0f8", fontFamily: "var(--font-head)" }}>
              🔔 Notifications {unreadCount > 0 && <span style={{ color: "#ff6b7a" }}>({unreadCount})</span>}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  background: "rgba(71,198,255,0.15)",
                  border: "1px solid rgba(71,198,255,0.3)",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 11,
                  color: "#47c6ff",
                  fontWeight: 700,
                  padding: "3px 9px",
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center", color: "#9ba3c2", fontSize: 13 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🔕</div>
                No notifications yet
              </div>
            ) : notifications.map(n => {
              const unread = !parseInt(n.is_read);
              const accent = TYPE_COLORS[n.type] ?? "#94a3b8";
              return (
                <div
                  key={n.id}
                  onClick={() => unread && markRead(n.id)}
                  style={{
                    padding: "11px 16px",
                    borderBottom: "1px solid rgba(255,255,255,0.07)",
                    cursor: unread ? "pointer" : "default",
                    background: unread ? "rgba(255,255,255,0.06)" : "transparent",
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => { if (unread) e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = unread ? "rgba(255,255,255,0.06)" : "transparent"; }}
                >
                  {}
                  <div style={{ width: 3, borderRadius: 2, background: accent, alignSelf: "stretch", flexShrink: 0 }} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: unread ? 700 : 500,
                      fontSize: 13,
                      color: unread ? "#f0f0f8" : "#b0b8d8",
                      marginBottom: 2,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}>
                      {n.title}
                    </div>
                    {n.body && (
                      <div style={{
                        fontSize: 12,
                        color: "#8890aa",
                        lineHeight: 1.4,
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}>
                        {n.body}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: "#6b7394", marginTop: 4 }}>
                      {timeAgo(n.created_at)}
                    </div>
                  </div>

                  {}
                  {unread && (
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: accent, flexShrink: 0, marginTop: 5,
                      boxShadow: `0 0 6px ${accent}`,
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
