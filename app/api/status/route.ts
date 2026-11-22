import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
const ENDPOINT = "minimax/h3-max/text-to-video";

export async function GET(request: NextRequest) {
  const key = process.env.FAL_KEY;
  if (!key) return NextResponse.json({ error: "FAL_KEY no está configurada en el servidor." }, { status: 503 });
  const requestId = request.nextUrl.searchParams.get("requestId");
  if (!requestId || !/^[a-zA-Z0-9_-]{8,128}$/.test(requestId)) {
    return NextResponse.json({ error: "Identificador de generación no válido." }, { status: 400 });
  }

  try {
    const base = `https://queue.fal.run/${ENDPOINT}/requests/${encodeURIComponent(requestId)}`;
    const statusResponse = await fetch(`${base}/status`, {
      headers: { "Authorization": `Key ${key}` }, cache: "no-store"
    });
    const statusData = await statusResponse.json();
    if (!statusResponse.ok) {
      console.error("fal status error", statusResponse.status, statusData);
      return NextResponse.json({ error: "No se pudo consultar el estado de la generación." }, { status: 502 });
    }
    if (statusData.status !== "COMPLETED") {
      return NextResponse.json({ status: statusData.status, queuePosition: statusData.queue_position ?? null });
    }

    const resultResponse = await fetch(base, {
      headers: { "Authorization": `Key ${key}` }, cache: "no-store"
    });
    const result = await resultResponse.json();
    if (!resultResponse.ok || !result.video?.url) {
      console.error("fal result error", resultResponse.status, result);
      return NextResponse.json({ error: "La generación terminó, pero no se pudo recuperar el video." }, { status: 502 });
    }
    return NextResponse.json({ status: "COMPLETED", videoUrl: result.video.url, expandedPrompt: result.expanded_prompt ?? null });
  } catch (error) {
    console.error("status route error", error);
    return NextResponse.json({ error: "Error consultando el progreso." }, { status: 500 });
  }
}
