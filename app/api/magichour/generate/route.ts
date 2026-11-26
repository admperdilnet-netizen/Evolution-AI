import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const API_ROOT = "https://api.magichour.ai";
const MODEL = "ltx-2.5";

function messageOf(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const data = value as Record<string, unknown>;
    for (const key of ["message", "detail", "error"]) {
      const nested = data[key];
      if (typeof nested === "string") return nested;
      if (nested && typeof nested === "object" && typeof (nested as Record<string, unknown>).message === "string") {
        return String((nested as Record<string, unknown>).message);
      }
    }
  }
  return "";
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.MAGIC_HOUR_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Falta MAGIC_HOUR_API_KEY. Añade tu clave privada en Vercel → Settings → Environment Variables." }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  const aspectRatio = typeof body?.aspectRatio === "string" ? body.aspectRatio : "9:16";
  const duration = Number(body?.duration ?? 4);

  if (prompt.length < 8 || prompt.length > 4000) {
    return NextResponse.json({ error: "La descripción debe tener entre 8 y 4000 caracteres." }, { status: 400 });
  }
  if (!["9:16", "16:9", "1:1"].includes(aspectRatio)) {
    return NextResponse.json({ error: "Magic Hour admite formato vertical 9:16, horizontal 16:9 o cuadrado 1:1." }, { status: 400 });
  }
  if (!Number.isInteger(duration) || duration < 1 || duration > 60) {
    return NextResponse.json({ error: "La duración de cada escena debe estar entre 1 y 60 segundos." }, { status: 400 });
  }

  try {
    const submit = await fetch(API_ROOT + "/v1/text-to-video", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        end_seconds: duration,
        aspect_ratio: aspectRatio,
        model: MODEL,
        resolution: "480p",
        audio: true,
        style: { prompt }
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(30_000)
    });

    const submitted = await submit.json().catch(() => ({})) as Record<string, unknown>;
    if (!submit.ok) {
      const detail = messageOf(submitted) || "Magic Hour no aceptó la solicitud.";
      const message = submit.status === 401
        ? "Magic Hour rechazó la clave API. Revisa MAGIC_HOUR_API_KEY en Vercel."
        : submit.status === 402
          ? "Magic Hour indica que no hay créditos suficientes o que este ajuste requiere un plan de pago. Revisa tu saldo y los permisos del modelo antes de comprar."
          : submit.status === 429
            ? "Magic Hour está limitando temporalmente las solicitudes. Espera un momento antes de volver a generar."
            : detail;
      return NextResponse.json({ error: message }, { status: submit.status });
    }

    const projectId = typeof submitted.id === "string" ? submitted.id : "";
    if (!projectId) {
      return NextResponse.json({ error: "Magic Hour aceptó la solicitud, pero no devolvió el identificador del proyecto." }, { status: 502 });
    }

    const deadline = Date.now() + 270_000;
    while (Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 4_000));
      const poll = await fetch(API_ROOT + "/v1/video-projects/" + encodeURIComponent(projectId), {
        headers: { Authorization: "Bearer " + apiKey, Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(20_000)
      });
      const result = await poll.json().catch(() => ({})) as Record<string, unknown>;
      if (!poll.ok) {
        return NextResponse.json({ error: messageOf(result) || "No se pudo consultar el estado del video en Magic Hour." }, { status: poll.status });
      }

      const status = String(result.status || "").toLowerCase();
      if (status === "error" || status === "canceled") {
        return NextResponse.json({ error: messageOf(result.error) || "Magic Hour no pudo completar esta escena. Las escenas anteriores siguen guardadas." }, { status: 502 });
      }
      if (status === "complete") {
        const downloads = Array.isArray(result.downloads) ? result.downloads : [];
        const first = downloads.find(item => item && typeof item === "object" && typeof (item as Record<string, unknown>).url === "string") as Record<string, unknown> | undefined;
        const videoUrl = typeof first?.url === "string" ? first.url : "";
        if (!videoUrl || !videoUrl.startsWith("https://videos.magichour.ai/")) {
          return NextResponse.json({ error: "Magic Hour terminó el video, pero no devolvió una descarga válida de su servidor oficial." }, { status: 502 });
        }
        return NextResponse.json({ status: "COMPLETED", videoUrl });
      }
    }

    return NextResponse.json({ error: "Magic Hour está tardando más de lo esperado. Tus escenas anteriores siguen guardadas; puedes continuar más tarde." }, { status: 504 });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Error conectando con Magic Hour.";
    const timedOut = /timeout|timed out|aborted/i.test(detail);
    return NextResponse.json({
      error: timedOut
        ? "Magic Hour tardó demasiado en responder. Tu avance guardado no se ha borrado."
        : "No se pudo conectar con Magic Hour. Inténtalo de nuevo."
    }, { status: timedOut ? 504 : 502 });
  }
}
