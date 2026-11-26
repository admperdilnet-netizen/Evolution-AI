import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_HOSTS = ["lightricks-ltx-2-5.hf.space", "zai-org-cogvideox-2b-space.hf.space"];

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url") || "";
  let target: URL;
  try { target = new URL(rawUrl); }
  catch { return NextResponse.json({ error: "Dirección de video inválida." }, { status: 400 }); }

  if (
    target.protocol !== "https:" ||
    !ALLOWED_HOSTS.includes(target.hostname) ||
    !target.pathname.startsWith("/gradio_api/file=")
  ) {
    return NextResponse.json({ error: "Solo se permite descargar archivos de los Spaces oficiales conectados." }, { status: 400 });
  }

  const token = process.env.HF_TOKEN;
  if (!token) return NextResponse.json({ error: "Falta HF_TOKEN en Vercel." }, { status: 503 });

  try {
    const upstream = await fetch(target.toString(), {
      headers: { Authorization: "Bearer " + token },
      cache: "no-store",
      signal: AbortSignal.timeout(55_000)
    });
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: "Hugging Face no permitió descargar la escena. Inténtalo de nuevo." }, { status: upstream.status || 502 });
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": "inline",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo descargar el video.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
