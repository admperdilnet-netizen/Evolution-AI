import { NextResponse } from "next/server";
export async function POST(req:Request){
 try{const {query}=await req.json();if(!query?.trim())return NextResponse.json({error:"Escribe un tema."},{status:400});
 const key=process.env.TAVILY_API_KEY;if(!key)return NextResponse.json({configured:false,links:[{title:"Buscar en Google",url:"https://www.google.com/search?q="+encodeURIComponent(query)},{title:"Buscar en Bing",url:"https://www.bing.com/search?q="+encodeURIComponent(query)}]});
 const r=await fetch("https://api.tavily.com/search",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({api_key:key,query,search_depth:"basic",max_results:5})});const d=await r.json();if(!r.ok)return NextResponse.json({error:"Error de búsqueda"},{status:r.status});
 return NextResponse.json({configured:true,results:(d.results||[]).map((x:any)=>({title:x.title,url:x.url,content:x.content}))});
 }catch{return NextResponse.json({error:"No se pudo realizar la búsqueda."},{status:400})}
}