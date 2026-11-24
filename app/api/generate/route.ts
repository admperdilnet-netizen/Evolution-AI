import { NextRequest, NextResponse } from "next/server";

const ENDPOINT = "minimax/h3-max-turbo/text-to-video";
const recentRequests = new Map<string, number>();

export async function POST(request: NextRequest) {
  const key = process.env.FAL_KEY;
  if (!key) return NextResponse.json({ error: "Falta configurar FAL_KEY en Vercel: Settings → Environment Variables. Después vuelve a desplegar." }, { status: 503 });

  const forwarded = request.headers.get("x-forwarded-for") || "unknown";
  const ip = forwarded.split(",")[0].trim();
  const now = Date.now();
  const last = recentRequests.get(ip) || 0;
  if (now - last < 60_000) return NextResponse.json({ error: "Espera un minuto antes de iniciar otra generación." }, { status: 429 });

  const body = await request.json().catch(() => null);
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  const duration = Number(body?.duration);
  const aspectRatio = body?.aspectRatio;
  const resolution = body?.resolution;
  if (prompt.length < 8 || prompt.length > 5000) return NextResponse.json({ error: "La descripción debe tener entre 8 y 5000 caracteres." }, { status: 400 });
  if (![6, 10, 15].includes(duration)) return NextResponse.json({ error: "Duración no permitida." }, { status: 400 });
  if (!["9:16", "16:9", "1:1", "4:3"].includes(aspectRatio)) return NextResponse.json({ error: "Formato no permitido." }, { status: 400 });
  if (!["480P", "768P", "1080P"].includes(resolution)) return NextResponse.json({ error: "Resolución no permitida." }, { status: 400 });

  const response = await fetch("https://queue.fal.run/" + ENDPOINT, {
    method: "POST",
    headers: { Authorization: "Key " + key, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, prompt_expansion_mode: "balanced", duration, aspect_ratio: aspectRatio, resolution, enable_safety_checker: true }),
    cache: "no-store"
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return NextResponse.json({ error: data.detail || data.error || "fal.ai rechazó la solicitud. Revisa la configuración y los créditos de la cuenta." }, { status: response.status });
  recentRequests.set(ip, now);
  return NextResponse.json({ request_id: data.request_id });
}
