"use client";

import { useState } from "react";

type Job = { requestId: string; status: string; videoUrl?: string };

const SPACE = "https://lightricks-ltx-video-distilled.hf.space";
const API_NAME = "text_to_video";

function findVideoUrl(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return (value.startsWith("https://") || value.startsWith("http://")) ? value : null;
  if (Array.isArray(value)) {
    for (const item of value) { const found = findVideoUrl(item); if (found) return found; }
    return null;
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.url === "string" && (obj.url.startsWith("https://") || obj.url.startsWith("http://"))) return obj.url;
    for (const item of Object.values(obj)) { const found = findVideoUrl(item); if (found) return found; }
  }
  return null;
}

function dimensions(ratio: string, resolution: string) {
  const longSide = resolution === "480P" ? 832 : 1280;
  const [rw, rh] = ratio.split(":").map(Number);
  const scale = longSide / Math.max(rw, rh);
  const even = (n: number) => Math.max(256, Math.floor(n / 16) * 16);
  return { width: even(rw * scale), height: even(rh * scale) };
}

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState("5");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [resolution, setResolution] = useState("768P");
  const [job, setJob] = useState<Job | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setError(""); setJob(null); setBusy(true);
    try {
      const { width, height } = dimensions(aspectRatio, resolution);
      const data = [
        prompt.trim(),
        "worst quality, blurry, distorted, watermark",
        "", "",
        height, width,
        "text-to-video",
        Number(duration),
        9,
        Math.floor(Math.random() * 4294967295),
        true,
        1,
        true
      ];
      const submit = await fetch(`${SPACE}/gradio_api/call/${API_NAME}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data })
      });
      if (!submit.ok) {
        const detail = await submit.text();
        throw new Error(submit.status === 429
          ? "El motor gratuito está ocupado o alcanzó su cuota temporal. Espera un poco y vuelve a intentarlo."
          : `No se pudo conectar con el motor gratuito (HTTP ${submit.status}). ${detail.slice(0, 180)}`);
      }
      const submitted = await submit.json();
      if (!submitted.event_id) throw new Error("El motor no devolvió un identificador de trabajo.");

      const resultResponse = await fetch(`${SPACE}/gradio_api/call/${API_NAME}/${encodeURIComponent(submitted.event_id)}`, {
        method: "GET",
        headers: { "Accept": "text/event-stream" },
        cache: "no-store"
      });
      if (!resultResponse.ok) throw new Error("Se perdió la conexión con la cola de generación.");
      const raw = await resultResponse.text();
      const blocks = raw.split("\n\n").filter(Boolean);
      let result: unknown = null;
      for (const block of blocks) {
        const lines = block.split("\n");
        const event = lines.find(line => line.startsWith("event:"))?.slice(6).trim();
        const payload = lines.find(line => line.startsWith("data:"))?.slice(5).trim();
        if (event === "error") throw new Error("El motor gratuito no pudo generar el video. Puede estar ocupado; inténtalo de nuevo.");
        if (event === "complete" && payload) result = JSON.parse(payload);
      }
      const videoUrl = findVideoUrl(result);
      if (!videoUrl) throw new Error("El motor terminó, pero no devolvió un archivo de video reproducible.");
      setJob({ requestId: submitted.event_id, status: "COMPLETED", videoUrl });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocurrió un error al generar el video.");
    } finally {
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
            <div><label htmlFor="duration">Duración</label><select id="duration" value={duration} onChange={e => setDuration(e.target.value)}><option value="3">3 segundos</option><option value="5">5 segundos</option><option value="8">8 segundos</option></select></div>
            <div><label htmlFor="ratio">Formato</label><select id="ratio" value={aspectRatio} onChange={e => setAspectRatio(e.target.value)}><option value="16:9">Horizontal · 16:9</option><option value="9:16">Vertical · 9:16</option><option value="1:1">Cuadrado · 1:1</option><option value="4:3">Clásico · 4:3</option><option value="3:4">Retrato · 3:4</option><option value="21:9">Cinemático · 21:9</option></select></div>
            <div><label htmlFor="resolution">Calidad</label><select id="resolution" value={resolution} onChange={e => setResolution(e.target.value)}><option value="480P">Estándar</option><option value="768P">Alta · hasta 1280 px</option></select></div>
          </div>
          <button className="generate" onClick={generate} disabled={busy || prompt.trim().length < 8}><span>✦</span>{busy ? "Generando con motor gratuito..." : "Generar video"}<b>↗</b></button>
          <p className="notice">Motor LTX Video comunitario. Uso gratuito sujeto a disponibilidad, cola y límites diarios de Hugging Face. No requiere saldo FAL.</p>
          {error && <div className="error" role="alert">{error}</div>}
        </div>
        <div className="preview">
          <div className="preview-head"><span>02 / RESULTADO</span><span className="live-dot">● MOTOR LTX VIDEO</span></div>
          {!job?.videoUrl ? <div className="empty"><div className="orb"><span>✦</span></div><h3>{busy ? "Tu idea está tomando forma" : "Tu próximo video empieza aquí"}</h3><p>{busy ? "Enviando a la cola gratuita. La generación puede tardar varios minutos; no cierres esta página." : "Tu creación aparecerá en este espacio cuando esté lista."}{busy ? "" : ""}</p>{busy && <div className="loader"><i /></div>}</div> :
            <div className="result"><video src={job.videoUrl} controls playsInline /><a className="download" href={job.videoUrl} target="_blank" rel="noreferrer" download>Descargar video ↗</a></div>}
          <div className="preview-foot"><span>EVOLUTION AI STUDIO</span><span>POWERED BY LTX VIDEO</span></div>
        </div>
      </section>
      <footer><span>EVOLUTION AI © 2026</span><span>CREA SIN LÍMITES. IMAGINA SIN FRONTERAS.</span></footer>
    </main>
  );
}
