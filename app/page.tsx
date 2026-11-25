"use client";

import { useState } from "react";
import LongVideoBuilder from "./long-video-builder";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState("2");
  const [ratio, setRatio] = useState("9:16");
  const [quality, setQuality] = useState("economy");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [error, setError] = useState("");

  async function generate() {
    if (prompt.trim().length < 8) {
      setError("Escribe una descripción de al menos 8 caracteres.");
      return;
    }

    setBusy(true);
    setError("");
    setVideoUrl("");
    setStatus(`Enviando un clip de ${duration} segundo(s) a Hugging Face ZeroGPU…`);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          duration: Number(duration),
          aspectRatio: ratio,
          quality
        }),
        cache: "no-store"
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "No se pudo completar la generación.");

      setVideoUrl(data.videoUrl);
      setStatus(`¡Video terminado! Duración solicitada: ${duration} segundo(s). Descárgalo para conservarlo.`);
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
        <p className="intro">Describe tu escena, elige la duración, la calidad y el formato, y deja que Evolution AI la cree.</p>
      </section>
      <section className="workspace">
        <div className="panel">
          <div className="panel-head">
            <div><span className="step">01</span><h2>Describe tu video</h2></div>
            <span className="subtle">TEXTO A VIDEO</span>
          </div>
          <label htmlFor="prompt">¿Qué quieres ver?</label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            maxLength={1800}
            placeholder="Ejemplo: Un caballo blanco corre por una playa tropical al amanecer, cámara cinematográfica suave, olas y brisa moviendo su crin…"
            disabled={busy}
          />
          <div className="counter">{prompt.length}/1800</div>
          <div className="settings">
            <div>
              <label htmlFor="duration">Duración</label>
              <select id="duration" value={duration} onChange={e => setDuration(e.target.value)} disabled={busy}>
                <option value="1">1 segundo</option>
                <option value="2">2 segundos</option>
                <option value="3">3 segundos</option>
                <option value="4">4 segundos</option>
                <option value="5">5 segundos</option>
              </select>
            </div>
            <div>
              <label htmlFor="ratio">Formato</label>
              <select id="ratio" value={ratio} onChange={e => setRatio(e.target.value)} disabled={busy}>
                <option value="9:16">Vertical 9:16</option>
                <option value="16:9">Horizontal 16:9</option>
                <option value="1:1">Cuadrado 1:1</option>
                <option value="4:3">Clásico 4:3</option>
              </select>
            </div>
            <div>
              <label htmlFor="quality">Calidad</label>
              <select id="quality" value={quality} onChange={e => setQuality(e.target.value)} disabled={busy}>
                <option value="economy">Ahorro de cuota</option>
                <option value="standard">Estándar</option>
                <option value="high">Alta definición</option>
              </select>
            </div>
          </div>
          <button className="generate" onClick={generate} disabled={busy}>
            {busy ? "GENERANDO EN ZEROGPU…" : "CREAR VIDEO"} <b>{busy ? "…" : "↗"}</b>
          </button>
          <p className="notice">
            Motor LTX-2.5 en Hugging Face ZeroGPU. Puedes elegir entre 1 y 5 segundos y tres niveles de calidad.
            Los clips más largos y la calidad alta consumen más de tu cuota gratuita. No se usa fal.ai ni se compran créditos.
          </p>
          {status && <p className="notice" aria-live="polite">{status}</p>}
          {error && <div className="error" role="alert">{error}</div>}
        </div>
        <div className="preview">
          <div className="preview-head"><span>VISTA PREVIA</span><span className="live-dot">● HUGGING FACE ZEROGPU</span></div>
          {videoUrl ? (
            <div className="result">
              <video src={videoUrl} controls playsInline />
              <a className="download" href={videoUrl} target="_blank" rel="noreferrer" download>DESCARGAR VIDEO ↗</a>
            </div>
          ) : (
            <div className="empty">
              <div className="orb"><span>✦</span></div>
              <h3>{busy ? "LTX-2.5 está creando tu escena" : "Tu próxima creación empieza aquí"}</h3>
              <p>{busy ? "Hugging Face está asignando una GPU gratuita. Puede haber cola; no cierres esta página." : "Tu video aparecerá aquí cuando termine la generación."}{busy && <span className="loader"><i /></span>}</p>
            </div>
          )}
          <div className="preview-foot"><span>EVOLUTION AI</span><span>CREATIVIDAD SIN LÍMITES</span></div>
        </div>
      </section>
      <LongVideoBuilder />
      <footer><span>EVOLUTION AI © 2026</span><span>CREA · PREVISUALIZA · DESCARGA</span></footer>
    </main>
  );
}
