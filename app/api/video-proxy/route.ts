import { NextResponse } from "next/server";

// Esta ruta solo servía al generador de video retirado de la migración.
export async function GET() {
  return NextResponse.json(
    { error: "La descarga por proxy de videos no está disponible en Vínculo." },
    { status: 410 }
  );
}
