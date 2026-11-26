import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const API_ROOT = "https://apihub.agnes-ai.com";
const MODEL = "agnes-video-2.5-flash";

function detailOf(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const data = value as Record<string, unknown>;
    for (const key of ["message", "error", "detail"]) {
      if (typeof data[key] === "string") return data[key] as string;
    }
  }
  return "";
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.AGNES_API_KEY;
  if (!apiKey) return NextResponse.json({
    error: "Falta AGNES_API_KEY. Añade tu clave privada de Agnes AI en Vercel → Settings → Environment Variables."
  }, { status: 503 });

  const body = await request.json().catch(() => null);
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  const aspectRatio = typeof body?.aspectRatio === "string" ? body.aspectRatio : "9:16";
  const seed = Number.isSafeInteger(body?.seed) ? Math.max(0, Math.min(2_147_483_647, Number(body.seed))) : 42;

  if (prompt.length < 8 || prompt.length > 1800) return NextResponse.json({ error: "La descripción debe tener entre 8 y 1800 caracteres." }, { status: 400 });
  if (!["9:16", "16:9", "1:1", "4:3"].includes(aspectRatio)) return NextResponse.json({ error: "Formato de video no permitido." }, { status: 400 });

  try {
    const submit = await fetch(API_ROOT + "/v1/videos", {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, prompt, mode: "text", seconds: "4", size: "720P", aspect_ratio: aspectRatio, seed, n: 1 }),
      cache: "no-store",
      signal: AbortSignal.timeout(30_000)
    });
    const submitted = await submit.json().catch(() => ({})) as Record<string, unknown>;
    if (!submit.ok) {
      const detail = detailOf(submitted.error) || detailOf(submitted.message) || "Agnes AI no aceptó la solicitud.";
      const message = submit.status === 401
        ? "Agnes AI rechazó la clave. Revisa AGNES_API_KEY en Vercel."
        : submit.status === 429
          ? "Agnes AI alcanzó su límite gratuito de solicitudes. Espera antes de volver a generar."
          : submit.status === 503
            ? "La cola gratuita de Agnes AI está ocupada. Inténtalo más tarde."
            : detail;
      return NextResponse.json({ error: message }, { status: submit.status });
    }

    const videoId = [submitted.video_id, submitted.id, submitted.task_id].find(value => typeof value === "string" && value.length > 0) as string | undefined;
    if (!videoId) return NextResponse.json({ error: "Agnes AI aceptó la solicitud, pero no devolvió un identificador de video." }, { status: 502 });

    const deadline = Date.now() + 270_000;
    while (Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 5_000));
      const poll = await fetch(API_ROOT + "/agnesapi?video_id=" + encodeURIComponent(videoId) + "&model_name=" + encodeURIComponent(MODEL), {
        headers: { Authorization: "Bearer " + apiKey },
        cache: "no-store",
        signal: AbortSignal.timeout(20_000)
      });
      const result = await poll.json().catch(() => ({})) as Record<string, unknown>;
      if (!poll.ok) return NextResponse.json({ error: detailOf(result.error) || "No se pudo consultar el resultado de Agnes AI." }, { status: poll.status });

      const status = String(result.status || "").toLowerCase();
      if (status === "failed" || status === "error") {
        return NextResponse.json({ error: detailOf(result.error) || detailOf(result.message) || "Agnes AI no pudo generar esta escena." }, { status: 502 });
      }
      if (status === "completed" || status === "complete" || status === "succeeded") {
        const videoUrl = [result.url, result.video_url, result.videoUrl].find(value => typeof value === "string" && /^https:\/\//i.test(value)) as string | undefined;
        if (!videoUrl) return NextResponse.json({ error: "Agnes AI terminó, pero no devolvió una dirección de video válida." }, { status: 502 });
        return NextResponse.json({ status: "COMPLETED", videoUrl });
      }
    }
    return NextResponse.json({ error: "Agnes AI tardó demasiado. Tus escenas anteriores siguen guardadas; puedes continuar más tarde." }, { status: 504 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error conectando con Agnes AI.";
    const timedOut = /timeout|timed out|aborted/i.test(message);
    return NextResponse.json({ error: timedOut ? "Agnes AI tardó demasiado en responder. Tu avance guardado no se ha borrado." : message }, { status: timedOut ? 504 : 502 });
  }
}
