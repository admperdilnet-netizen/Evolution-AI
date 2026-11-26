import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const maxDuration = 300;
const SPACE_URL = "https://zai-org-cogvideox-2b-space.hf.space";
function parseSse(raw: string): unknown {
  for (const block of raw.split(/\r?\n\r?\n/)) {
    const event = block.match(/^event:\\s*(.+)$/m)?.[1]?.trim();
    const data = block.split(/\r?\n/).filter(line => line.startsWith("data:")).map(line => line.slice(5).trim()).join("\n");
    if (!data) continue;
    if (event === "error") throw new Error(data);
    if (event === "complete") return JSON.parse(data);
  }
  throw new Error("CogVideoX terminó sin devolver el video.");
}
function extractVideoUrl(result: unknown): string | null {
  const first = Array.isArray(result) ? result[0] : result;
  const value = first && typeof first === "object" && "video" in first ? (first as any).video : first;
  if (typeof value === "string") return value.startsWith("/") ? SPACE_URL + "/gradio_api/file=" + value : value;
  if (value && typeof value === "object") {
    if (typeof value.url === "string") return value.url.startsWith("/") ? SPACE_URL + value.url : value.url;
    if (typeof value.path === "string") return SPACE_URL + "/gradio_api/file=" + value.path;
  }
  return null;
}
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  if (prompt.length < 8 || prompt.length > 1800) return NextResponse.json({ error: "La descripción debe tener entre 8 y 1800 caracteres." }, { status: 400 });
  try {
    const submit = await fetch(SPACE_URL + "/gradio_api/call/generate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [prompt, 50, 6] }), cache: "no-store", signal: AbortSignal.timeout(25_000)
    });
    const data = await submit.json().catch(() => ({}));
    if (!submit.ok) return NextResponse.json({ error: (data as any).error || "CogVideoX no aceptó la solicitud." }, { status: submit.status });
    const eventId = (data as any).event_id;
    if (!eventId) return NextResponse.json({ error: "CogVideoX no devolvió un identificador de trabajo." }, { status: 502 });
    const resultResponse = await fetch(SPACE_URL + "/gradio_api/call/generate/" + encodeURIComponent(eventId), { cache: "no-store", signal: AbortSignal.timeout(270_000) });
    const raw = await resultResponse.text();
    if (!resultResponse.ok) return NextResponse.json({ error: "No se pudo recuperar el video de CogVideoX." }, { status: resultResponse.status });
    const result = parseSse(raw);
    const url = extractVideoUrl(result);
    if (!url || !/^https:\\/\\//i.test(url)) return NextResponse.json({ error: "CogVideoX terminó, pero no devolvió una URL reconocible." }, { status: 502 });
    return NextResponse.json({ status: "COMPLETED", videoUrl: url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error conectando con CogVideoX.";
    return NextResponse.json({ error: /timeout|timed out|aborted/i.test(message) ? "CogVideoX tardó demasiado. Intenta cuando su GPU gratuita esté disponible." : message }, { status: 502 });
  }
}
