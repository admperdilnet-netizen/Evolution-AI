import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
const ENDPOINT = "minimax/h3-max/text-to-video";

export async function POST(request: NextRequest) {
  const key = process.env.FAL_KEY;
  if (!key) return NextResponse.json({ error: "El servidor aún no tiene configurada la clave FAL_KEY." }, { status: 503 });

  try {
    const body = await request.json();
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const duration = Number(body.duration);
    const aspectRatio = typeof body.aspectRatio === "string" ? body.aspectRatio : "16:9";
    const resolution = typeof body.resolution === "string" ? body.resolution : "768P";

    if (prompt.length < 8 || prompt.length > 4000) {
      return NextResponse.json({ error: "Describe tu video con al menos 8 caracteres (máximo 4,000)." }, { status: 400 });
    }
    if (![5, 10, 15].includes(duration)) {
      return NextResponse.json({ error: "La duración debe ser de 5, 10 o 15 segundos." }, { status: 400 });
    }
    if (!["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"].includes(aspectRatio)) {
      return NextResponse.json({ error: "Formato de video no válido." }, { status: 400 });
    }
    if (!["480P", "768P", "1080P"].includes(resolution)) {
      return NextResponse.json({ error: "Resolución no válida." }, { status: 400 });
    }

    const response = await fetch(`https://queue.fal.run/${ENDPOINT}`, {
      method: "POST",
      headers: { "Authorization": `Key ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        duration,
        aspect_ratio: aspectRatio,
        resolution,
        prompt_expansion_mode: "balanced",
        enable_safety_checker: true,
        sync_mode: false
      }),
      cache: "no-store"
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("fal submit error", response.status, data);
      return NextResponse.json({ error: "fal.ai no pudo iniciar la generación. Revisa tu cuenta y vuelve a intentarlo." }, { status: 502 });
    }
    return NextResponse.json({ requestId: data.request_id, statusUrl: data.status_url }, { status: 202 });
  } catch (error) {
    console.error("generate route error", error);
    return NextResponse.json({ error: "No se pudo iniciar el trabajo. Inténtalo de nuevo." }, { status: 500 });
  }
}
