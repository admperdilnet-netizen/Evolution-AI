# Evolution AI

Plataforma web independiente para crear videos a partir de texto.

## Motor de generación

- Motor principal: LTX Video Fast de Lightricks mediante el Space público de Hugging Face.
- La generación se solicita directamente desde el navegador para que Hugging Face aplique sus límites por visitante.
- No requiere FAL_KEY ni saldo de fal.ai.
- El servicio gratuito es comunitario y está sujeto a disponibilidad, colas y cuotas diarias. No es ilimitado ni garantiza disponibilidad permanente.

## Stack

- Next.js App Router + TypeScript
- Gradio Spaces API de Hugging Face
- LTX Video Fast (Space público)

## Desarrollo local

1. Instala Node.js 20.9 o superior.
2. Ejecuta `npm install`.
3. Ejecuta `npm run dev`.
4. Abre http://localhost:3000.

No se necesita configurar FAL_KEY ni otro secreto para el motor comunitario.

## Despliegue en Vercel

1. Importa este repositorio en Vercel.
2. Usa la rama `main`.
3. No agregues FAL_KEY: la nueva generación no la utiliza.
4. Espera a que termine el despliegue y abre el dominio asignado.

## Límites actuales

- Duración solicitada: 3, 5 u 8 segundos por generación.
- Formatos: horizontal, vertical, cuadrado y otros formatos de aspecto.
- La resolución y la velocidad final dependen del Space y del modelo disponibles.
- Hugging Face aplica límites de uso gratuitos y puede poner solicitudes en cola o rechazarlas temporalmente.
- La generación necesita que la página permanezca abierta mientras se completa. Si se cierra o se pierde la conexión, puede ser necesario volver a solicitar el video.
- No se debe anunciar como generación ilimitada ni como videos de 60 segundos hasta implementar y probar un flujo de escenas y ensamblaje.

## Seguridad

No coloques claves privadas en variables `NEXT_PUBLIC_*` ni en el navegador. Este modo comunitario no requiere claves.
