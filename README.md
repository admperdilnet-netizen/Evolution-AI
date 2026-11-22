# Evolution AI

Plataforma web independiente para crear videos a partir de texto usando fal.ai.

## Stack
- Next.js App Router + TypeScript
- API routes de servidor para mantener FAL_KEY privada
- fal.ai Queue API con MiniMax H3 Max Text-to-Video

## Requisitos
- Node.js 20.9 o superior
- Una cuenta fal.ai con créditos
- La variable de entorno FAL_KEY

## Desarrollo local
1. Instala dependencias: `npm install`
2. Crea `.env.local` y agrega `FAL_KEY=tu_clave_fal`
3. Ejecuta `npm run dev`
4. Abre http://localhost:3000

Nunca pongas FAL_KEY en variables NEXT_PUBLIC_* ni en el navegador.

## Despliegue recomendado: Vercel
1. Importa este repositorio en Vercel.
2. En Project Settings → Environment Variables agrega `FAL_KEY` con el valor de tu clave.
3. Selecciona Production (y Preview si lo deseas), guarda y vuelve a desplegar.
4. Abre el dominio asignado por Vercel.

## Estado actual y límites
La primera versión funcional permite generar un clip de 5, 10 o 15 segundos, con formatos horizontal, vertical y panorámico, mediante MiniMax H3 Max. El modelo admite hasta 15 segundos por generación. La creación de videos finales de hasta 60 segundos requiere una fase adicional de escenas múltiples, ensamblaje y almacenamiento; no se debe presentar como disponible hasta implementar y probar ese flujo.

Las generaciones pueden consumir créditos de fal.ai. La API key solo se usa en las rutas del servidor y nunca se envía al navegador.
