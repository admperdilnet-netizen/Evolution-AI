import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const SPACE_URL = "https://lightricks-ltx-2-5.hf.space";
const API_NAME = "run";
const recentRequests = new Map<string, number>();

type GradioFile = { url?: string; path?: string; video?: GradioFile | string };
type GradioResult = unknown[];

function authHeaders(): HeadersInit {
  const token = process.env.HF_TOKEN;
  if (!token) throw new Error("Falta HF_TOKEN en Vercel. Crea un token gratuito de Hugging Face y guárdalo como variable privada HF_TOKEN en Settings → Environment Variables.");
  return { Authorization: `Bearer ${token}` };
}

function parseSse(raw: string): unknown {
  const blocks = raw.split(/\r?\n\r?\n/);
  let lastError = "";
  for (const block of blocks) {
    const event = block.match(/^event:\s*(.+)$/m)?.[1]?.trim();
    const dataText = block.split(/\r?\n/).filter(line => line.startsWith("data:")).map(line => line.slice(5).trim()).join("\n");
    if (!dataText) continue;
    if (event === "error") {
      lastError = dataText;
      continue;
    }
    if (event === "complete") {
      try { return JSON.parse(dataText); }
      catch { throw new Error("Hugging Face devolvió una respuesta de video ilegible."); }
    }
  }
  throw new Error(lastError || "La cola de Hugging Face terminó sin devolver el video. Inténtalo de nuevo cuando se restablezca la cuota.");
}

function extractVideoUrl(result: unknown): string | null {
  const first = Array.isArray(result) ? result[0] : result;
  const item = (first && typeof first === "object" && "video" in first)
    ? (first as { video: GradioFile | string }).video
    : first;
  if (typeof item === "string") {
    if (/^https?:\/\//i.test(item)) return item;
    if (item.startsWith("/")) return SPACE_URL + "/gradio_api/file=" + item;
    return null;
  }
  if (!item || typeof item !== "object") return null;
  const file = item as GradioFile;
  if (typeof file.url === "string") return file.url.startsWith("/") ? SPACE_URL + file.url : file.url;
  if (typeof file.path === "string") return SPACE_URL + "/gradio_api/file=" + file.path;
  return null;
}

export async function POST(request: NextRequest) {
  const token = process.env.HF_TOKEN;
  if (!token) {
    return NextResponse.json({
      error: "Evolution AI necesita un token gratuito de Hugging Face para usar tu cuota personal de ZeroGPU. No cuesta dinero ni requiere tarjeta. Créalo en huggingface.co/settings/tokens y añádelo en Vercel → Project → Settings → Environment Variables con el nombre HF_TOKEN."
    }, { status: 503 });
  }

  const forwarded = request.headers.get("x-forwarded-for") || "unknown";
  const ip = forwarded.split(",")[0].trim();
  const now = Date.now();
  const last = recentRequests.get(ip) || 0;
  if (now - last < 120_000) {
    return NextResponse.json({ error: "Espera dos minutos antes de iniciar otra generación. ZeroGPU tiene una cuota diaria limitada." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  const aspectRatio = body?.aspectRatio;
  if (prompt.length < 8 || prompt.length > 1800) {
    return NextResponse.json({ error: "La descripción debe tener entre 8 y 1800 caracteres." }, { status: 400 });
  }
  if (!["9:16", "16:9", "1:1", "4:3"].includes(aspectRatio)) {
    return NextResponse.json({ error: "Formato no permitido." }, { status: 400 });
  }

  let headers: HeadersInit;
  try { headers = { ...authHeaders(), "Content-Type": "application/json" }; }
  catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falta configurar HF_TOKEN." }, { status: 503 });
  }

  const dimensions: Record<string, { height: number; width: number }> = {
    "9:16": { height: 1024, width: 576 },
    "16:9": { height: 576, width: 1024 },
    "1:1": { height: 768, width: 768 },
    "4:3": { height: 1024, width: 768 }
  };
  const { height, width } = dimensions[aspectRatio as string];

  try {
    // LTX-2.5 official ZeroGPU Space. Keep prompt enhancement off to avoid a second GPU Space/quota.
    const submit = await fetch(`${SPACE_URL}/gradio_api/call/${API_NAME}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        data: [prompt, null, height, width, 2.0, 42, "conv", false, true, false]
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(25_000)
    });
    const submitData = await submit.json().catch(() => ({}));
    if (!submit.ok) {
      const detail = (submitData as { error?: string; detail?: string }).error ||
        (submitData as { detail?: string }).detail || "Hugging Face no aceptó la solicitud.";
      return NextResponse.json({ error: detail }, { status: submit.status });
    }
    const eventId = (submitData as { event_id?: string }).event_id;
    if (!eventId || !/^[a-zA-Z0-9_-]{6,200}$/.test(eventId)) {
      return NextResponse.json({ error: "Hugging Face no devolvió un identificador de trabajo válido." }, { status: 502 });
    }
    // Start the cooldown as soon as the job is accepted, not after it finishes.
    recentRequests.set(ip, Date.now());

    const resultResponse = await fetch(`${SPACE_URL}/gradio_api/call/${API_NAME}/${encodeURIComponent(eventId)}`, {
      headers: authHeaders(),
      cache: "no-store",
      signal: AbortSignal.timeout(285_000)
    });
    const streamText = await resultResponse.text();
    if (!resultResponse.ok) {
      return NextResponse.json({ error: "No se pudo recuperar el resultado desde Hugging Face. " + streamText.slice(0, 300) }, { status: resultResponse.status });
    }

    const result = parseSse(streamText) as GradioResult;
    const videoUrl = extractVideoUrl(result);
    if (!videoUrl || !/^https:\/\//i.test(videoUrl)) {
      return NextResponse.json({ error: "LTX-2.5 terminó, pero no devolvió una URL de video reconocida." }, { status: 502 });
    }

    return NextResponse.json({ status: "COMPLETED", videoUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error conectando con Hugging Face ZeroGPU.";
    const timedOut = /timed out|timeout|aborted/i.test(message);
    return NextResponse.json({
      error: timedOut
        ? "La generación tardó más de lo permitido por la conexión de Vercel. La cuota de ZeroGPU puede haberse consumido; revisa Hugging Face antes de intentarlo otra vez."
        : message
    }, { status: timedOut ? 504 : 502 });
  }
}
