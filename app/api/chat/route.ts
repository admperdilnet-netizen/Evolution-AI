import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const key = process.env.OPENAI_API_KEY;
    if (!key) return NextResponse.json({ error: "Falta configurar OPENAI_API_KEY en Vercel." }, { status: 503 });
    const body = await req.json();
    const { messages, name = "Luna", you = "Cariño", style = "romántica, dulce y divertida" } = body ?? {};
    if (!Array.isArray(messages) || messages.length === 0) return NextResponse.json({ error: "Envía una conversación válida." }, { status: 400 });
    const safeMessages = messages.slice(-12).filter((m:any) => (m?.role === "user" || m?.role === "assistant") && typeof m?.text === "string").map((m:any) => ({ role: m.role, content: m.text.slice(0,4000) }));
    if (!safeMessages.length || safeMessages[safeMessages.length-1].role !== "user") return NextResponse.json({ error: "Escribe un mensaje para comenzar." }, { status: 400 });
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: "gpt-4o-mini", max_output_tokens: 350, instructions: `Tu nombre es ${String(name).slice(0,40)}. Conversas en español latino natural. La persona desea que la llames ${String(you).slice(0,40)}. Personalidad y estilo: ${String(style).slice(0,300)}. Eres una compañera virtual cálida, cariñosa, divertida, atenta y respetuosa. Eres transparente en que eres una IA, no afirmes ser humana ni que puedes realizar acciones fuera del chat. No inventes recuerdos de conversaciones anteriores a los que se te suministren. Responde con naturalidad, sin sonar como un formulario.`, input: safeMessages })
    });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: data?.error?.message || "La API de OpenAI no pudo responder." }, { status: response.status });
    const answer = (data.output ?? []).flatMap((o:any)=>o.content ?? []).filter((c:any)=>c.type==="output_text").map((c:any)=>c.text).join("\n").trim();
    if (!answer) return NextResponse.json({ error: "La respuesta llegó vacía. Inténtalo otra vez." }, { status: 502 });
    return NextResponse.json({ answer });
  } catch { return NextResponse.json({ error: "No se pudo conectar. Inténtalo de nuevo." }, { status: 500 }); }
}
