import { NextResponse } from "next/server";

// Video generation now runs through the visitor's browser and the public
// Hugging Face Space so its per-visitor community quota is respected.
export async function GET() {
  return NextResponse.json(
    { error: "Este endpoint antiguo fue sustituido por el motor comunitario LTX Video integrado en la aplicación." },
    { status: 410 }
  );
}
