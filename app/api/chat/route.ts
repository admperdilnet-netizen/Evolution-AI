import { NextResponse } from "next/server";
export async function POST(req:Request){
 try{
  const {messages,profile,memories}=await req.json();
  const key=process.env.OPENAI_API_KEY;
  if(!key)return NextResponse.json({error:"Falta configurar OPENAI_API_KEY en el servidor."},{status:503});
  const system=`Eres Vínculo, un compañero virtual conversacional, amable, respetuoso y útil. Personalidad: ${profile?.personality||"cálida"}. Nombre: ${profile?.name||"Vínculo"}. Idioma: ${profile?.language||"Auto"}. Usa los recuerdos del usuario como contexto, sin afirmar que sabes cosas que no se te han contado. Recuerdos: ${(memories||[]).join("; ")||"ninguno"}`;
  const r=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{Authorization:"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify({model:process.env.VINCULO_MODEL||"gpt-4o-mini",messages:[{role:"system",content:system},...messages],temperature:0.8})});
  const data=await r.json();if(!r.ok)return NextResponse.json({error:data?.error?.message||"Error del proveedor IA"},{status:r.status});
  return NextResponse.json({reply:data.choices?.[0]?.message?.content||"No recibí una respuesta."});
 }catch{return NextResponse.json({error:"Solicitud inválida."},{status:400})}
}