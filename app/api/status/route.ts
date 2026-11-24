import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: "La generación ahora se completa directamente desde /api/generate con Hugging Face ZeroGPU." },
    { status: 410 }
  );
}
