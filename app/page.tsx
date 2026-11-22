"use client";

import { useEffect, useRef, useState } from "react";

type Job = { requestId: string; status: string; videoUrl?: string; error?: string };

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState("10");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [resolution, setResolution] = useState("768P");
  const [job, setJob] = useState<Job | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const poller = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (poller.current) clearInterval(poller.current); }, []);

  async function generate() {
    setError(""); setJob(null); setBusy(true);
    try {
      const response = await fetch("/api/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, duration: Number(duration), aspectRatio, resolution })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo iniciar la generación.");
      setJob({ requestId: data.requestId, status: "IN_QUEUE" });
      poller.current = setInterval(async () => {
        try {
          const statusResponse = await fetch(`/api/status?requestId=${encodeURIComponent(data.requestId)}`);
          const statusData = await statusResponse.json();
          if (!statusResponse.ok) throw new Error(statusData.error || "Error consultando el progreso.");
          setJob({ requestId: data.requestId, ...statusData });
          if (statusData.status === "COMPLETED") {
            if (poller.current) clearInterval(poller.current);
            setBusy(false);
          }
        } catch (e) {
          if (poller.current) clearInterval(poller.current);
          setError(e instanceof Error ? e.message : "Error consultando el progreso.");
          setBusy(false);
        }
      }, 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocurrió un error.");
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <nav className="topbar"><a className="brand" href="#"><span className="brand-mark">E</span><span>EVOLUTION <b>AI</b></span></a><span className="top-pill">CREACIÓN DE VIDEO</span></nav>
      <section className="hero">
        <div className="eyebrow"><span className="spark">✦</span> TU IMAGINACIÓN, EN MOVIMIENTO</div>
        <h1>Convierte tus ideas<br/><em>en videos extraordinarios.</em></h1>
        <p className="intro">Describe lo que imaginas. Evolution AI lo transforma en una experiencia visual.</p>
      </section>
      <section className="workspace">
        <div className="panel">
          <div className="panel-head"><div><span className="step">01</span><h2>Describe tu video</h2></div><span className="subtle">TEXTO A VIDEO</span></div>
          <label htmlFor="prompt">¿Qué quieres crear?</label>
          <textarea id="prompt" value={prompt} onChange={e => setPrompt(e.target.value)} maxLength={4000} placeholder="Ej.: Un automóvil deportivo recorriendo una carretera costera al atardecer, tomas cinematográficas, luz dorada, movimiento fluido..." />
          <div className="counter">{prompt.length.toLocaleString("es-DO")} / 4,000</div>
          <div className="settings">
            <div><label htmlFor="duration">Duración</label><select id="duration" value={duration} onChange={e => setDuration(e.target.value)}><option value="5">5 segundos</option><option value="10">10 segundos</option><option value="15">15 segundos</option></select></div>
            <div><label htmlFor="ratio">Formato</label><select id="ratio" value={aspectRatio} onChange={e => setAspectRatio(e.target.value)}><option value="16:9">Horizontal · 16:9</option><option value="9:16">Vertical · 9:16</option><option value="1:1">Cuadrado · 1:1</option><option value="4:3">Clásico · 4:3</option><option value="3:4">Retrato · 3:4</option><option value="21:9">Cinemático · 21:9</option></select></div>
            <div><label htmlFor="resolution">Resolución</label><select id="resolution" value={resolution} onChange={e => setResolution(e.target.value)}><option value="480P">480P</option><option value="768P">768P · Recomendada</option><option value="1080P">1080P · Refinada</option></select></div>
          </div>
          <button className="generate" onClick={generate} disabled={busy || prompt.trim().length < 8}><span>✦</span>{busy ? "Creando tu video..." : "Generar video"}<b>↗</b></button>
          <p className="notice">La generación usa el motor de video de fal.ai. Puede consumir créditos de tu cuenta.</p>
          {error && <div className="error" role="alert">{error}</div>}
        </div>
        <div className="preview">
          <div className="preview-head"><span>02 / RESULTADO</span><span className="live-dot">● MOTOR CONECTADO</span></div>
          {!job?.videoUrl ? <div className="empty"><div className="orb"><span>✦</span></div><h3>{busy ? "Tu idea está tomando forma" : "Tu próximo video empieza aquí"}</h3><p>{busy ? (job?.status === "IN_PROGRESS" ? "El motor está creando las imágenes en movimiento..." : "Preparando tu generación. Esto puede tardar unos minutos.") : "Tu creación aparecerá en este espacio cuando esté lista."}</p>{busy && <div className="loader"><i /></div>}</div> :
            <div className="result"><video src={job.videoUrl} controls playsInline /><a className="download" href={job.videoUrl} target="_blank" rel="noreferrer" download>Descargar video ↗</a></div>}
          <div className="preview-foot"><span>EVOLUTION AI STUDIO</span><span>POWERED BY FAL.AI</span></div>
        </div>
      </section>
      <footer><span>EVOLUTION AI © 2026</span><span>CREA SIN LÍMITES. IMAGINA SIN FRONTERAS.</span></footer>
    </main>
  );
}
