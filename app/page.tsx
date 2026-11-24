"use client";

import { useEffect, useRef, useState } from "react";

type JobResult = { requestId: string; status: string; videoUrl?: string; error?: string };

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState("6");
  const [ratio, setRatio] = useState("9:16");
  const [resolution, setResolution] = useState("768P");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [error, setError] = useState("");
  const pollRef = useRef(false);

  useEffect(() => () => { pollRef.current = false; }, []);

  async function generate() {
    if (prompt.trim().length < 8) {
      setError("Escribe una descripción un poco más completa para crear tu video.");
      return;
    }
    setBusy(true);
    setError("");
    setVideoUrl("");
    setStatus("Enviando tu idea al motor de video…");
    pollRef.current = true;
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), duration: Number(duration), aspectRatio: ratio, resolution })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo iniciar la generación.");
      const requestId = data.request_id as string;
      setStatus("Tu video está en la cola. Preparando la escena…");
      const started = Date.now();
      while (pollRef.current && Date.now() - started < 240000) {
        await new Promise(resolve => setTimeout(resolve, 3500));
        const check = await fetch("/api/status?requestId=" + encodeURIComponent(requestId), { cache: "no-store" });
        const result = await check.json();
        if (!check.ok) throw new Error(result.error || "No se pudo consultar el progreso.");
        if (result.status === "COMPLETED" && result.videoUrl) {
          setVideoUrl(result.videoUrl);
          setStatus("¡Video terminado!");
          return;
        }
        if (result.status === "FAILED") throw new Error(result.error || "El motor no pudo completar este video.");
        setStatus(result.status === "IN_PROGRESS" ? "Generando tu video… esto puede tardar un poco." : "Esperando turno en el motor…");
      }
      if (pollRef.current) throw new Error("La generación sigue tardando. Puedes volver a consultar más tarde; no envíes otra solicitud todavía.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocurrió un error inesperado.");
      setStatus("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <nav className="topbar">
        <a className="brand" href="#"><span className="brand-mark">E</span><span>EVOLUTION <b>AI</b></span></a>
        <span className="top-pill">ESTUDIO DE VIDEO · ACCESO PÚBLICO</span>
      </nav>
      <section className="hero">
        <div className="eyebrow"><span className="spark">✦</span> TU ESTUDIO AUDIOVISUAL</div>
        <h1>Convierte tus ideas en <em>video.</em></h1>
        <p className="intro">Describe tu escena, elige el formato y deja que Evolution AI la cree.</p>
      </section>
      <section className="workspace">
        <div className="panel">
          <div className="panel-head">
            <div><span className="step">01</span><h2>Describe tu video</h2></div>
            <span className="subtle">TEXTO A VIDEO</span>
          </div>
          <label htmlFor="prompt">¿Qué quieres ver?</label>
          <textarea id="prompt" value={prompt} onChange={e => setPrompt(e.target.value)} maxLength={5000} placeholder="Ejemplo: Un carro deportivo rojo recorriendo una carretera tropical al atardecer, tomas cinematográficas, iluminación realista…" />
          <div className="counter">{prompt.length}/5000</div>
          <div className="settings">
            <div><label htmlFor="duration">Duración</label><select id="duration" value={duration} onChange={e => setDuration(e.target.value)}><option value="6">6 segundos</option><option value="10">10 segundos</option><option value="15">15 segundos</option></select></div>
            <div><label htmlFor="ratio">Formato</label><select id="ratio" value={ratio} onChange={e => setRatio(e.target.value)}><option value="9:16">Vertical 9:16</option><option value="16:9">Horizontal 16:9</option><option value="1:1">Cuadrado 1:1</option><option value="4:3">Clásico 4:3</option></select></div>
            <div><label htmlFor="resolution">Resolución</label><select id="resolution" value={resolution} onChange={e => setResolution(e.target.value)}><option value="768P">768P</option><option value="1080P">1080P</option><option value="480P">480P</option></select></div>
          </div>
          <button className="generate" onClick={generate} disabled={busy}>{busy ? "CREANDO TU VIDEO…" : "CREAR VIDEO"} <b>{busy ? "…" : "↗"}</b></button>
          <p className="notice">Motor MiniMax H3 Max Turbo a través de fal.ai. La generación consume créditos de la cuenta conectada. Cada creación admite hasta 15 segundos.</p>
          {status && <p className="notice" aria-live="polite">{status}</p>}
          {error && <div className="error" role="alert">{error}</div>}
        </div>
        <div className="preview">
          <div className="preview-head"><span>VISTA PREVIA</span><span className="live-dot">● MOTOR DE VIDEO</span></div>
          {videoUrl ? <div className="result"><video src={videoUrl} controls playsInline /><a className="download" href={videoUrl} target="_blank" rel="noreferrer" download>DESCARGAR VIDEO ↗</a></div> :
            <div className="empty"><div className="orb"><span>✦</span></div><h3>{busy ? "Estamos creando tu escena" : "Tu próxima creación empieza aquí"}</h3><p>{busy ? "El motor está trabajando. No cierres esta página mientras esperamos el resultado." : "Tu video aparecerá aquí cuando termine la generación."}{busy && <span className="loader"><i /></span>}</p></div>}
          <div className="preview-foot"><span>EVOLUTION AI</span><span>CREATIVIDAD SIN LÍMITES</span></div>
        </div>
      </section>
      <footer><span>EVOLUTION AI © 2026</span><span>CREA · PREVISUALIZA · DESCARGA</span></footer>
    </main>
  );
}
