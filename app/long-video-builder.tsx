"use client";

import { useEffect, useState } from "react";

type LongScene = { index: number; blob: Blob };
type LongProject = {
  prompt: string;
  targetSeconds: number;
  aspectRatio: string;
  quality: string;
  engine: string;
  seed: number;
  segments: LongScene[];
  finalBlob?: Blob;
  updatedAt: number;
};

const DB_NAME = "evolution-ai-long-projects";
const STORE_NAME = "projects";
const PROJECT_KEY = "active-magichour-4s";
const SCENE_SECONDS = 4;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("No se pudo abrir el almacenamiento local."));
  });
}

async function readProject(): Promise<LongProject | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(PROJECT_KEY);
    request.onsuccess = () => { db.close(); resolve((request.result as LongProject | undefined) || null); };
    request.onerror = () => { db.close(); reject(request.error || new Error("No se pudo recuperar el proyecto guardado.")); };
  });
}

async function saveProject(project: LongProject): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(project, PROJECT_KEY);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error || new Error("No se pudo guardar el avance del video largo.")); };
    tx.onabort = () => { db.close(); reject(tx.error || new Error("El navegador no pudo guardar los segmentos.")); };
  });
}

async function deleteProject(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(PROJECT_KEY);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error || new Error("No se pudo borrar el proyecto guardado.")); };
  });
}

function scenePrompt(base: string, index: number, count: number): string {
  const mainScene = Math.floor(index / 4) + 1;
  const segmentInScene = (index % 4) + 1;
  const direction = index === 0
    ? "Opening segment: establish the place, main characters, clothing, visual style and mood."
    : index === count - 1
      ? "Closing segment: continue the action and bring the story to a natural conclusion."
      : segmentInScene === 1
        ? "Begin the next 16-second story chapter, continuing from the previous chapter."
        : "Continuation segment: show the next moment without restarting the story.";
  return base.trim() +
    "\n\nThis is segment " + (index + 1) + " of " + count + ", within main story scene " + mainScene + " (segment " + segmentInScene + " of 4), in one continuous film. " + direction +
    " Preserve the same characters, faces, clothing, location, props, lighting, color grade, camera style and atmosphere. Do not introduce unrelated protagonists. Make it feel like the next moment in the same film. No captions, titles, logos or watermarks.";
}

async function generateScene(prompt: string, duration: number, aspectRatio: string, _quality: string, seed: number, _engine: string): Promise<string> {
  const requestBody = { prompt, duration, aspectRatio, seed };

  const send = async () => {
    const response = await fetch("/api/magichour/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      cache: "no-store"
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const upstreamError = typeof data.error === "string" ? data.error : "";
      throw new Error(upstreamError || "No se pudo generar esta escena en Magic Hour.");
    }
    if (typeof data.videoUrl !== "string") throw new Error("El motor no devolvió el archivo de video.");
    return data.videoUrl as string;
  };

  return send();
}

async function downloadScene(videoUrl: string): Promise<Blob> {
  const response = await fetch("/api/video-proxy?url=" + encodeURIComponent(videoUrl), { cache: "no-store" });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "No se pudo guardar el segmento generado.");
  }
  const blob = await response.blob();
  if (!blob.size) throw new Error("Magic Hour devolvió un archivo de video vacío.");
  return blob;
}

async function mergeScenes(scenes: LongScene[], targetSeconds: number, report: (message: string) => void): Promise<Blob> {
  const { FFmpeg } = await import("@ffmpeg/ffmpeg");
  const { toBlobURL } = await import("@ffmpeg/util");
  const ffmpeg = new FFmpeg();
  const baseUrl = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd";

  try {
    report("Preparando el editor MP4 del navegador…");
    await ffmpeg.load({
      coreURL: await toBlobURL(baseUrl + "/ffmpeg-core.js", "text/javascript"),
      wasmURL: await toBlobURL(baseUrl + "/ffmpeg-core.wasm", "application/wasm")
    });

    const ordered = [...scenes].sort((a, b) => a.index - b.index);
    const list: string[] = [];
    for (const scene of ordered) {
      const name = "scene-" + String(scene.index + 1).padStart(2, "0") + ".mp4";
      report("Preparando escena " + (scene.index + 1) + " de " + ordered.length + "…");
      await ffmpeg.writeFile(name, new Uint8Array(await scene.blob.arrayBuffer()));
      list.push("file '" + name + "'");
    }

    await ffmpeg.writeFile("concat-list.txt", new TextEncoder().encode(list.join("\n")));
    report("Uniendo las escenas y su audio en un solo archivo MP4…");
    report("Recortando el video unido a " + targetSeconds + " segundos…");
    let exitCode = await ffmpeg.exec([
      "-f", "concat", "-safe", "0", "-i", "concat-list.txt",
      "-t", String(targetSeconds), "-c:v", "libx264", "-preset", "ultrafast", "-crf", "23",
      "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", "evolution-final.mp4"
    ]);
    if (exitCode !== 0) throw new Error("No se pudieron unir las escenas. Las escenas siguen guardadas para volver a intentar.");

    const result = await ffmpeg.readFile("evolution-final.mp4");
    if (typeof result === "string") throw new Error("El editor devolvió un archivo MP4 inválido.");
    const bytes = new Uint8Array(result);
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    return new Blob([buffer], { type: "video/mp4" });
  } finally {
    ffmpeg.terminate();
  }
}

export default function LongVideoBuilder() {
  const [prompt, setPrompt] = useState("");
  const [targetSeconds, setTargetSeconds] = useState("15");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const quality = "480p";
  const engine = "magic-hour";
  const [project, setProject] = useState<LongProject | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    readProject()
      .then(saved => {
        if (!active || !saved) return;
        setProject(saved);
        setPrompt(saved.prompt);
        setTargetSeconds(String(saved.targetSeconds));
        setAspectRatio(saved.aspectRatio);
        if (saved.finalBlob) setVideoUrl(URL.createObjectURL(saved.finalBlob));
      })
      .catch(() => {
        if (active) setError("Este navegador no permitió recuperar el avance local del video largo.");
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!videoUrl.startsWith("blob:")) return;
    return () => URL.revokeObjectURL(videoUrl);
  }, [videoUrl]);

  const target = Number(targetSeconds);
  const sceneCount = Math.ceil(target / SCENE_SECONDS);
  const completed = project?.segments.length || 0;
  const progress = project ? Math.min(100, Math.round(completed / Math.ceil(project.targetSeconds / SCENE_SECONDS) * 100)) : 0;

  async function createLongVideo() {
    const text = prompt.trim();
    if (text.length < 8) {
      setError("Describe lo que quieres ver antes de generar el video largo.");
      return;
    }
    if (text.length > 1250) {
      setError("Reduce la descripción a 1250 caracteres para añadir instrucciones de continuidad a cada escena.");
      return;
    }

    setBusy(true);
    setError("");
    setStatus("Comprobando si ya hay escenas guardadas…");
    let activeProject: LongProject | null = null;

    try {
      activeProject = await readProject();
      const matches = activeProject &&
        activeProject.prompt === text &&
        activeProject.targetSeconds === target &&
        activeProject.aspectRatio === aspectRatio &&
        activeProject.quality === quality &&
        activeProject.engine === engine;

      if (activeProject && !matches) {
        throw new Error("Hay otro proyecto largo guardado. Bórralo con el botón de abajo antes de iniciar otro, para no perder escenas anteriores.");
      }

      if (!activeProject) {
        activeProject = {
          prompt: text,
          targetSeconds: target,
          aspectRatio,
          quality,
          engine,
          seed: Math.floor(Math.random() * 2_000_000_000),
          segments: [],
          updatedAt: Date.now()
        };
        if (navigator.storage?.persist) await navigator.storage.persist().catch(() => false);
        await saveProject(activeProject);
      }

      if (activeProject.finalBlob) {
        setProject(activeProject);
        setVideoUrl(URL.createObjectURL(activeProject.finalBlob));
        setStatus("El MP4 final ya estaba guardado en este navegador.");
        return;
      }

      const completedIndexes = new Set(activeProject.segments.map(item => item.index));
      for (let index = 0; index < sceneCount; index++) {
        if (completedIndexes.has(index)) continue;

        setStatus("Generando escena " + (index + 1) + " de " + sceneCount + " · " + SCENE_SECONDS + " segundos…");
        const remoteVideoUrl = await generateScene(
          scenePrompt(text, index, sceneCount),
          SCENE_SECONDS,
          activeProject.aspectRatio,
          activeProject.quality,
          activeProject.seed,
          activeProject.engine || engine
        );

        setStatus("Descargando y guardando escena " + (index + 1) + " de " + sceneCount + "…");
        const blob = await downloadScene(remoteVideoUrl);
        activeProject.segments.push({ index, blob });
        activeProject.segments.sort((a, b) => a.index - b.index);
        activeProject.updatedAt = Date.now();
        await saveProject(activeProject);
        setProject({ ...activeProject, segments: [...activeProject.segments] });
      }

      if (activeProject.segments.length !== sceneCount) {
        throw new Error("Todavía faltan escenas. El avance está guardado; vuelve a continuar cuando haya cuota gratuita.");
      }

      const finalBlob = await mergeScenes(activeProject.segments, target, setStatus);
      activeProject.finalBlob = finalBlob;
      activeProject.updatedAt = Date.now();
      await saveProject(activeProject);
      setProject({ ...activeProject, segments: [...activeProject.segments] });
      setVideoUrl(URL.createObjectURL(finalBlob));
      setStatus("¡Video largo terminado! Se unieron " + sceneCount + " escenas en un solo MP4 de aproximadamente " + target + " segundos.");
    } catch (e) {
      if (activeProject) {
        setProject({ ...activeProject, segments: [...activeProject.segments] });
        setStatus("Progreso guardado: " + activeProject.segments.length + " de " + sceneCount + " escenas. Puedes regresar más tarde y continuar sin perder las escenas generadas.");
      } else {
        setStatus("");
      }
      setError(e instanceof Error ? e.message : "No se pudo completar el video largo.");
    } finally {
      setBusy(false);
    }
  }

  async function clearSavedProject() {
    if (!window.confirm("¿Borrar el proyecto largo y todas sus escenas guardadas en este navegador?")) return;
    try {
      await deleteProject();
      setProject(null);
      setVideoUrl("");
      setStatus("Proyecto borrado. Ya puedes empezar otro video largo.");
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo borrar el proyecto guardado.");
    }
  }

  return (
    <section className="long-builder">
      <div className="long-builder-heading">
        <div>
          <div className="eyebrow">VIDEO AI</div>
          <h2>Crear un video de <em>{targetSeconds} segundos</em></h2>
          <p>Generación por clips y montaje automático.</p>
        </div>
        <span className="long-builder-mark">30s+</span>
      </div>

      <div className="long-builder-grid">
        <div className="long-builder-form">
          <label htmlFor="long-prompt">Describe la historia completa</label>
          <textarea
            id="long-prompt"
            value={prompt}
            onChange={event => setPrompt(event.target.value)}
            maxLength={1250}
            disabled={busy}
            placeholder="Ejemplo: Un superhéroe dominicano salva su barrio de una tormenta, con acción cinematográfica y un final emocionante…"
          />
          <div className="counter">{prompt.length}/1250</div>

          <div className="long-builder-settings">
            <div>
              <label htmlFor="long-target">Duración final</label>
              <select id="long-target" value={targetSeconds} onChange={event => setTargetSeconds(event.target.value)} disabled={busy}>
                <option value="15">15 segundos · escenas de 4s</option>
                <option value="30">30 segundos · escenas de 4s</option>
                <option value="45">45 segundos · escenas de 4s</option>
                <option value="60">60 segundos · escenas de 4s</option>
              </select>
            </div>
            <div>
              <label htmlFor="long-ratio">Formato</label>
              <select id="long-ratio" value={aspectRatio} onChange={event => setAspectRatio(event.target.value)} disabled={busy}>
                <option value="9:16">Vertical 9:16</option>
                <option value="16:9">Horizontal 16:9</option>
                <option value="1:1">Cuadrado 1:1</option>
                
              </select>
            </div>
            <div><label>Calidad</label><div className="quality-fixed">480p · Magic Hour LTX-2.5</div></div>
          </div>

          <div className="long-builder-note">Escenas de 4 segundos en 480p · Magic Hour · avance guardado automáticamente.</div>

          <button className="generate" type="button" onClick={createLongVideo} disabled={busy}>
            {busy ? "CREANDO ESCENAS…" : "CREAR VIDEO"} <b>{busy ? "…" : "↗"}</b>
          </button>

          {project && (
            <div className="long-builder-progress">
              <div className="long-builder-progress-head">
                <strong>Proyecto guardado</strong>
                <span>{completed}/{Math.ceil(project.targetSeconds / SCENE_SECONDS)} escenas</span>
              </div>
              <div className="progress-track"><span style={{ width: progress + "%" }} /></div>
              <button className="clear-project" type="button" onClick={clearSavedProject} disabled={busy}>Borrar proyecto guardado</button>
            </div>
          )}

          {status && <p className="notice" aria-live="polite">{status}</p>}
          {error && <div className="error" role="alert">{error}</div>}
          <p className="notice">
            La continuidad se guía con un prompt repetido y una semilla fija; al generarse cada escena por separado, los personajes pueden variar ligeramente.
            No borres los datos del sitio ni cambies de navegador hasta descargar el MP4 final.
          </p>
        </div>

        <div className="long-builder-preview">
          <div className="preview-head"><span>VIDEO FINAL</span><span className="live-dot">● EVOLUTION AI</span></div>
          {videoUrl ? (
            <>
              <video src={videoUrl} controls playsInline />
              <a className="download" href={videoUrl} download="evolution-ai-video-largo.mp4">DESCARGAR MP4 COMPLETO ↗</a>
            </>
          ) : (
            <div className="empty">
              <div className="orb"><span>✦</span></div>
              <h3>{busy ? "Preparando tu película" : "Tu video aparecerá aquí"}</h3>
              <p>{busy ? "Creando y ensamblando tu video." : "Tu video terminado aparecerá aquí."}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
