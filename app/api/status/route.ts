import { NextRequest, NextResponse } from "next/server";

const ENDPOINT = "minimax/h3-max-turbo/text-to-video";

export async function GET(request: NextRequest) {
  const key = process.env.FAL_KEY;
  if (!key) return NextResponse.json({ error: "FAL_KEY no está configurada en Vercel." }, { status: 503 });
  const requestId = request.nextUrl.searchParams.get("requestId") || "";
  if (!/^[a-zA-Z0-9_-]{8,200}$/.test(requestId)) return NextResponse.json({ error: "Identificador de generación inválido." }, { status: 400 });

  const base = "https://queue.fal.run/" + ENDPOINT + "/requests/" + encodeURIComponent(requestId);
  const statusResponse = await fetch(base + "/status", { headers: { Authorization: "Key " + key }, cache: "no-store" });
  const statusData = await statusResponse.json().catch(() => ({}));
  if (!statusResponse.ok) return NextResponse.json({ error: statusData.detail || "No se pudo consultar el estado." }, { status: statusResponse.status });
  if (statusData.status !== "COMPLETED") return NextResponse.json({ status: statusData.status || "IN_QUEUE" });

  const resultResponse = await fetch(base, { headers: { Authorization: "Key " + key }, cache: "no-store" });
  const result = await resultResponse.json().catch(() => ({}));
  if (!resultResponse.ok) return NextResponse.json({ error: result.detail || "No se pudo recuperar el video." }, { status: resultResponse.status });
  const videoUrl = result.video?.url || result.video_url || result.output?.video?.url;
  if (!videoUrl) return NextResponse.json({ error: "El motor terminó, pero no devolvió una dirección de video reconocida." }, { status: 502 });
  return NextResponse.json({ status: "COMPLETED", videoUrl });
}
