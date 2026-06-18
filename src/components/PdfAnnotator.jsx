import { useState, useEffect, useRef, useCallback } from "react";

const COLORS = {
  yellow : "rgba(255,220,0,0.40)",
  green  : "rgba(72,200,120,0.40)",
  blue   : "rgba(80,160,255,0.40)",
  pink   : "rgba(255,100,180,0.40)",
  orange : "rgba(255,140,0,0.40)",
};

const TOOL_CONFIG = {
  highlight : { label: "Highlight",  icon: "▬", cursor: "crosshair" },
  underline : { label: "Underline",  icon: "U̲", cursor: "crosshair" },
  comment   : { label: "Comment Pin",icon: "💬", cursor: "cell" },
};

export default function PdfAnnotator({ pdfUrl, fileId, user, readOnly = false, apiUrl }) {
  const containerRef  = useRef(null);
  const pdfRef        = useRef(null);   
  const canvasRefs    = useRef([]);     
  const overlayRefs   = useRef([]);     
  const renderTaskRef = useRef([]);

  const [numPages,      setNumPages]      = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [loadError,     setLoadError]     = useState(null);
  const [annotations,   setAnnotations]   = useState([]);   
  const [activeTool,    setActiveTool]    = useState("highlight");
  const [activeColor,   setActiveColor]   = useState("yellow");
  const [drawing,       setDrawing]       = useState(null); 
  const [preview,       setPreview]       = useState(null); 
  const [commentModal,  setCommentModal]  = useState(null); 
  const [commentText,   setCommentText]   = useState("");
  const [saving,        setSaving]        = useState(false);
  const [toast,         setToast]         = useState(null);
  const [scale,         setScale]         = useState(1.4);
  const [hoveredPin,    setHoveredPin]    = useState(null); 

  useEffect(() => {
    if (!pdfUrl) return;
    setLoading(true);
    setLoadError(null);

    const pdfjsLib = window.pdfjsLib;
    if (!pdfjsLib) {
      setLoadError("PDF.js is not loaded. Add it to your index.html (see component docs).");
      setLoading(false);
      return;
    }

    pdfjsLib.getDocument({ url: pdfUrl, withCredentials: false })
      .promise
      .then(pdf => {
        pdfRef.current = pdf;
        setNumPages(pdf.numPages);
        setLoading(false);
      })
      .catch(err => {
        setLoadError("Could not load PDF. Check that the file exists on the server.");
        setLoading(false);
        console.error("PDF load error:", err);
      });
  }, [pdfUrl]);

  useEffect(() => {
    if (!pdfRef.current || numPages === 0) return;

    renderTaskRef.current.forEach(t => t?.cancel?.());
    renderTaskRef.current = [];

    for (let i = 1; i <= numPages; i++) {
      renderPage(i);
    }
  }, [numPages, scale]);

  const renderPage = async (pageNum) => {
    const pdf    = pdfRef.current;
    const canvas = canvasRefs.current[pageNum - 1];
    if (!pdf || !canvas) return;

    try {
      const page     = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      canvas.width   = viewport.width;
      canvas.height  = viewport.height;

      const ctx  = canvas.getContext("2d");
      const task = page.render({ canvasContext: ctx, viewport });
      renderTaskRef.current[pageNum - 1] = task;
      await task.promise;
    } catch (err) {
      if (err?.name !== "RenderingCancelledException") {
        console.error(`Page ${pageNum} render error:`, err);
      }
    }
  };

  
  useEffect(() => {
    if (!fileId) return;
    fetchAnnotations();
  }, [fileId]);

  const fetchAnnotations = async () => {
    try {
      const res  = await fetch(`${apiUrl}?action=get_annotations&file_id=${fileId}`);
      const data = await res.json();
      if (data.success) setAnnotations(data.annotations ?? []);
    } catch (err) {
      console.error("Annotation fetch error:", err);
    }
  };

  
  const showToast = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 2800);
  };

  
  const getRelativePos = (e, pageIndex) => {
    const canvas = canvasRefs.current[pageIndex];
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width)  * 100,
      y: ((e.clientY - rect.top)  / rect.height) * 100,
    };
  };

  const onMouseDown = (e, pageIndex) => {
    if (readOnly || e.button !== 0) return;
    const pos = getRelativePos(e, pageIndex);
    setDrawing({ page: pageIndex + 1, startX: pos.x, startY: pos.y });
    setPreview({ page: pageIndex + 1, x: pos.x, y: pos.y, width: 0, height: 0 });
  };

  const onMouseMove = (e, pageIndex) => {
    if (!drawing || drawing.page !== pageIndex + 1) return;
    const pos = getRelativePos(e, pageIndex);
    setPreview({
      page   : pageIndex + 1,
      x      : Math.min(drawing.startX, pos.x),
      y      : Math.min(drawing.startY, pos.y),
      width  : Math.abs(pos.x - drawing.startX),
      height : Math.abs(pos.y - drawing.startY),
    });
  };

  const onMouseUp = (e, pageIndex) => {
    if (!drawing || drawing.page !== pageIndex + 1) return;
    const pos    = getRelativePos(e, pageIndex);
    const width  = Math.abs(pos.x - drawing.startX);
    const height = Math.abs(pos.y - drawing.startY);

    setDrawing(null);
    setPreview(null);

    
    if (width < 1 && height < 1 && activeTool !== "comment") return;

    const ann = {
      page   : pageIndex + 1,
      x      : Math.min(drawing.startX, pos.x),
      y      : Math.min(drawing.startY, pos.y),
      width  : activeTool === "comment" ? 2 : Math.max(width, 2),
      height : activeTool === "comment" ? 3 : Math.max(height, activeTool === "underline" ? 1.2 : 2),
      color  : COLORS[activeColor],
      type   : activeTool,
    };

    
    if (activeTool === "comment") {
      setCommentModal(ann);
      setCommentText("");
    } else {
      persistAnnotation({ ...ann, comment: "" });
    }
  };

  
  const persistAnnotation = async (ann) => {
    setSaving(true);
    try {
      const res  = await fetch(apiUrl, {
        method  : "POST",
        headers : { "Content-Type": "application/json" },
        body    : JSON.stringify({
          action     : "save_annotation",
          file_id    : fileId,
          created_by : user.username,
          role       : user.role,
          type       : ann.type,
          page       : ann.page,
          x          : ann.x,
          y          : ann.y,
          width      : ann.width,
          height     : ann.height,
          color      : ann.color,
          comment    : ann.comment ?? "",
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Annotation saved.");
        await fetchAnnotations();
      } else {
        showToast(data.message ?? "Could not save annotation.", "error");
      }
    } catch {
      showToast("Server error — annotation not saved.", "error");
    } finally {
      setSaving(false);
    }
  };

  
  const deleteAnnotation = async (annId) => {
    if (!confirm("Remove this annotation?")) return;
    try {
      const res  = await fetch(apiUrl, {
        method  : "POST",
        headers : { "Content-Type": "application/json" },
        body    : JSON.stringify({
          action   : "delete_annotation",
          id       : annId,
          username : user.username,
          role     : user.role,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Annotation removed.");
        setAnnotations(prev => prev.filter(a => a.id !== annId));
      } else {
        showToast(data.message ?? "Could not delete annotation.", "error");
      }
    } catch {
      showToast("Server error.", "error");
    }
  };

  
  const pageAnnotations = (pageNum) =>
    annotations.filter(a => a.page === pageNum);

  
  const zoomIn  = () => setScale(s => Math.min(s + 0.2, 3.0));
  const zoomOut = () => setScale(s => Math.max(s - 0.2, 0.6));

  
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "#1a1a1a" }}>

      {}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "8px 16px", background: "#111",
        borderBottom: "1px solid #333", flexShrink: 0, flexWrap: "wrap",
      }}>
        {}
        <button onClick={zoomOut} style={tbBtn} title="Zoom out">−</button>
        <span style={{ color: "#888", fontSize: 13, minWidth: 38, textAlign: "center" }}>
          {Math.round(scale * 100)}%
        </span>
        <button onClick={zoomIn} style={tbBtn} title="Zoom in">+</button>

        {!readOnly && (
          <>
            <div style={{ width: 1, height: 24, background: "#333", margin: "0 4px" }} />

            {}
            {Object.entries(TOOL_CONFIG).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => setActiveTool(key)}
                title={cfg.label}
                style={{
                  ...tbBtn,
                  background: activeTool === key ? "#333" : "transparent",
                  color: activeTool === key ? "#fff" : "#888",
                  border: activeTool === key ? "1px solid #555" : "1px solid transparent",
                  fontSize: key === "underline" ? 14 : 16,
                }}
              >
                {cfg.icon}
              </button>
            ))}

            <div style={{ width: 1, height: 24, background: "#333", margin: "0 4px" }} />

            {}
            {Object.entries(COLORS).map(([name, rgba]) => (
              <button
                key={name}
                onClick={() => setActiveColor(name)}
                title={name}
                style={{
                  width: 20, height: 20, borderRadius: "50%",
                  background: rgba.replace(/[\d.]+\)$/, "0.85)"),
                  border: activeColor === name ? "2px solid #fff" : "2px solid transparent",
                  cursor: "pointer", flexShrink: 0,
                }}
              />
            ))}

            {saving && (
              <span style={{ color: "#888", fontSize: 12, marginLeft: 4 }}>Saving…</span>
            )}
          </>
        )}

        {readOnly && (
          <span style={{ color: "#666", fontSize: 12 }}>
            👁 View-only — admin annotations are shown below
          </span>
        )}

        <span style={{ marginLeft: "auto", color: "#555", fontSize: 12 }}>
          {numPages > 0 ? `${numPages} page${numPages > 1 ? "s" : ""}` : ""}
        </span>
      </div>

      {}
      <div ref={containerRef} style={{ flex: 1, overflowY: "auto", padding: "20px 0" }}>

        {loading && (
          <div style={{ textAlign: "center", color: "#666", paddingTop: 60, fontSize: 15 }}>
            Loading PDF…
          </div>
        )}

        {loadError && (
          <div style={{ textAlign: "center", color: "#ff6b6b", paddingTop: 60, fontSize: 14, padding: 32 }}>
            ⚠️ {loadError}
          </div>
        )}

        {!loading && !loadError && Array.from({ length: numPages }).map((_, i) => {
          const pageNum  = i + 1;
          const pageAnns = pageAnnotations(pageNum);
          const canvas   = canvasRefs.current[i];
          const cw       = canvas?.width  ?? 800;
          const ch       = canvas?.height ?? 1000;

          return (
            <div
              key={pageNum}
              style={{
                position: "relative", display: "block",
                margin: "0 auto 24px",
                width: "fit-content",
                boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
                userSelect: "none",
                cursor: readOnly ? "default" : TOOL_CONFIG[activeTool]?.cursor,
              }}
              onMouseDown={e => onMouseDown(e, i)}
              onMouseMove={e => onMouseMove(e, i)}
              onMouseUp={e => onMouseUp(e, i)}
            >
              {}
              <canvas
                ref={el => canvasRefs.current[i] = el}
                style={{ display: "block" }}
              />

              {}
              <svg
                ref={el => overlayRefs.current[i] = el}
                style={{
                  position: "absolute", top: 0, left: 0,
                  width: "100%", height: "100%",
                  pointerEvents: readOnly ? "none" : "all",
                  overflow: "visible",
                }}
                viewBox={`0 0 100 100`}
                preserveAspectRatio="none"
              >
                {}
                {pageAnns.map(ann => {
                  const isOwner   = ann.created_by === user?.username;
                  const canDelete = !readOnly && (isOwner || user?.role === "admin");
                  const isHovered = hoveredPin === ann.id;

                  if (ann.type === "comment") {
                    return (
                      <g
                        key={ann.id}
                        onMouseEnter={() => setHoveredPin(ann.id)}
                        onMouseLeave={() => setHoveredPin(null)}
                        style={{ cursor: "pointer" }}
                        onClick={e => e.stopPropagation()}
                      >
                        {}
                        <circle
                          cx={ann.x + 1} cy={ann.y + 1.5} r={1.8}
                          fill="rgba(80,160,255,0.85)"
                          stroke="rgba(255,255,255,0.6)"
                          strokeWidth={0.3}
                        />
                        <text
                          x={ann.x + 1} y={ann.y + 2.2}
                          textAnchor="middle" fontSize={2.2}
                          fill="white" style={{ pointerEvents: "none" }}
                        >
                          💬
                        </text>

                        {}
                        {isHovered && ann.comment && (
                          <foreignObject
                            x={Math.min(ann.x + 3, 60)} y={ann.y - 1}
                            width={32} height={20}
                            style={{ overflow: "visible" }}
                          >
                            <div xmlns="http://www.w3.org/1999/xhtml" style={{
                              background: "rgba(20,20,20,0.95)",
                              color: "#fff", fontSize: 9, padding: "5px 8px",
                              borderRadius: 6, border: "1px solid #444",
                              maxWidth: 160, wordBreak: "break-word",
                              lineHeight: 1.4, pointerEvents: "none",
                              whiteSpace: "pre-wrap",
                            }}>
                              <strong style={{ color: "#7fc8ff", fontSize: 8 }}>
                                {ann.created_by}:
                              </strong>{" "}
                              {ann.comment}
                              {canDelete && (
                                <button
                                  style={{
                                    display: "block", marginTop: 4,
                                    background: "rgba(255,80,80,0.2)",
                                    border: "1px solid rgba(255,80,80,0.5)",
                                    color: "#ff8080", fontSize: 8,
                                    borderRadius: 4, cursor: "pointer",
                                    padding: "2px 6px",
                                  }}
                                  onClick={() => deleteAnnotation(ann.id)}
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          </foreignObject>
                        )}
                      </g>
                    );
                  }

                  
                  return (
                    <g
                      key={ann.id}
                      onMouseEnter={() => setHoveredPin(ann.id)}
                      onMouseLeave={() => setHoveredPin(null)}
                    >
                      {ann.type === "highlight" ? (
                        <rect
                          x={ann.x} y={ann.y}
                          width={ann.width} height={ann.height}
                          fill={ann.color}
                          rx={0.3}
                          style={{ mixBlendMode: "multiply" }}
                        />
                      ) : (
                        
                        <rect
                          x={ann.x} y={ann.y + ann.height - 0.6}
                          width={ann.width} height={0.8}
                          fill={ann.color.replace(/[\d.]+\)$/, "0.85)")}
                        />
                      )}

                      {}
                      {isHovered && canDelete && (
                        <g
                          style={{ cursor: "pointer" }}
                          onClick={() => deleteAnnotation(ann.id)}
                        >
                          <circle
                            cx={ann.x + ann.width} cy={ann.y}
                            r={1.6}
                            fill="rgba(40,40,40,0.85)"
                            stroke="rgba(255,80,80,0.7)"
                            strokeWidth={0.3}
                          />
                          <text
                            x={ann.x + ann.width} y={ann.y + 0.6}
                            textAnchor="middle" fontSize={2}
                            fill="#ff8080"
                            style={{ pointerEvents: "none" }}
                          >
                            ×
                          </text>
                        </g>
                      )}

                      {}
                      {isHovered && (
                        <text
                          x={ann.x} y={ann.y - 0.8}
                          fontSize={1.6} fill="rgba(255,255,255,0.7)"
                          style={{ pointerEvents: "none" }}
                        >
                          {ann.created_by}
                        </text>
                      )}
                    </g>
                  );
                })}

                {}
                {preview && preview.page === pageNum && activeTool !== "comment" && (
                  <rect
                    x={preview.x} y={preview.y}
                    width={preview.width} height={preview.height}
                    fill={activeTool === "underline"
                      ? COLORS[activeColor].replace(/[\d.]+\)$/, "0.6)")
                      : COLORS[activeColor]}
                    stroke="rgba(255,255,255,0.4)"
                    strokeWidth={0.3}
                    rx={0.3}
                    style={{ pointerEvents: "none" }}
                  />
                )}
              </svg>

              {}
              <div style={{
                position: "absolute", bottom: 8, right: 12,
                background: "rgba(0,0,0,0.55)", color: "#aaa",
                fontSize: 11, padding: "2px 8px", borderRadius: 10,
                pointerEvents: "none",
              }}>
                {pageNum} / {numPages}
              </div>
            </div>
          );
        })}
      </div>

      {}
      {commentModal && (
        <div style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.65)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 9999,
        }}>
          <div style={{
            background: "#1e1e1e", border: "1px solid #444",
            borderRadius: 14, padding: "24px 28px",
            width: 380, display: "flex", flexDirection: "column", gap: 16,
          }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#fff" }}>
              💬 Add Comment
            </div>
            <textarea
              autoFocus
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="Type your comment for the student…"
              rows={4}
              style={{
                background: "#111", border: "1px solid #444",
                borderRadius: 8, color: "#fff", fontSize: 13,
                padding: "10px 12px", resize: "vertical",
                fontFamily: "inherit", lineHeight: 1.6,
              }}
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => { setCommentModal(null); setCommentText(""); }}
                style={{ ...tbBtn, color: "#888", padding: "8px 16px" }}
              >
                Cancel
              </button>
              <button
                disabled={!commentText.trim()}
                onClick={() => {
                  persistAnnotation({ ...commentModal, comment: commentText.trim() });
                  setCommentModal(null);
                  setCommentText("");
                }}
                style={{
                  padding: "8px 18px", borderRadius: 8, border: "none",
                  background: commentText.trim() ? "#e8ff47" : "#333",
                  color: "#111", fontWeight: 700, cursor: commentText.trim() ? "pointer" : "not-allowed",
                  fontSize: 13,
                }}
              >
                Save Comment
              </button>
            </div>
          </div>
        </div>
      )}

      {}
      {toast && (
        <div style={{
          position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
          padding: "10px 22px", borderRadius: 40, fontSize: 13, fontWeight: 600,
          zIndex: 9999, pointerEvents: "none", whiteSpace: "nowrap",
          ...(toast.type === "error"
            ? { background: "rgba(255,107,107,0.15)", border: "1px solid #ff6b6b", color: "#ff6b6b" }
            : { background: "rgba(76,175,130,0.15)", border: "1px solid #4caf82", color: "#4caf82" }),
        }}>
          {toast.text}
        </div>
      )}
    </div>
  );
}

const tbBtn = {
  background: "transparent", border: "1px solid #444",
  color: "#ccc", borderRadius: 6, cursor: "pointer",
  padding: "5px 10px", fontSize: 14, lineHeight: 1,
  transition: "all 0.15s",
};
