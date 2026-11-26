import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

function isAllowedVideoHost(hostname: string): boolean {
  return hostname === "agnes-ai.com" || hostname.endsWith(".agnes-ai.com") || hostname === "video.lichuanyang.top" || hostname === "videos.magichour.ai";
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url") || "";
  let target: URL;
  try { target = new URL(rawUrl); }
  catch { return NextResponse.json({ error: "Dirección de video inválida." }, { status: 400 }); }

  if (
    target.protocol !== "https:" ||
    !isAllowedVideoHost(target.hostname)
  ) {
    return NextResponse.json({ error: "Solo se permite descargar videos desde los servidores oficiales de Agnes AI y Magic Hour." }, { status: 400 });
  }

  try {
    const upstream = await fetch(target.toString(), {
      cache: "no-store",
      signal: AbortSignal.timeout(55_000)
    });
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: "El proveedor no permitió descargar la escena. Inténtalo de nuevo." }, { status: upstream.status || 502 });
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
