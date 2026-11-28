import { NextResponse } from "next/server";

// Vínculo no ofrece generación de video en esta migración. La ruta antigua
// se desactiva para impedir solicitudes públicas que puedan consumir créditos.
export async function POST() {
  return NextResponse.json(
    { error: "La generación de video no está disponible en Vínculo." },
    { status: 410 }
  );
}
