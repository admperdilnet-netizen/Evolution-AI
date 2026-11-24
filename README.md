# Evolution AI

Evolution AI es un estudio web público de texto a video. No requiere inicio de sesión de Google ni servicios de generación de pago.

## Motor gratuito

La generación se conecta al Space oficial **Lightricks/LTX-2.5** en Hugging Face ZeroGPU:

- API pública del Space: `https://huggingface.co/spaces/Lightricks/LTX-2.5`
- Modelo: LTX-2.5 (texto a video con audio).
- Aplicación web: Next.js en Vercel.
- No usa fal.ai ni requiere `FAL_KEY`.

La cuota publicada para una cuenta gratuita autenticada de Hugging Face es de **5 minutos de GPU al día**. Sin autenticar, la cuota publicada es de 2 minutos diarios. La cuota es limitada, se comparte por token y puede haber cola o indisponibilidad. No son generaciones ilimitadas. El Space reserva tiempo de GPU antes de ejecutar; con la configuración inicial de resolución contenida y 2 segundos por clip, el número de clips diarios será pequeño.

## Configuración de Vercel

1. Crea una cuenta gratuita en Hugging Face y verifica el correo.
2. Crea un token personal en https://huggingface.co/settings/tokens. Un token de lectura es suficiente para invocar el Space público.
3. En Vercel abre el proyecto Evolution AI → Settings → Environment Variables.
4. Añade `HF_TOKEN` con el token como valor privado para Production (y Preview si lo usas).
5. Guarda y crea un nuevo despliegue de Production.

No pongas el token en el código, en GitHub, en variables `NEXT_PUBLIC_*` ni en el navegador. El token solo se lee desde la ruta de servidor `/api/generate`.

## Generación actual

- Texto a video.
- LTX-2.5 a través de Hugging Face ZeroGPU.
- Clips iniciales de 2 segundos.
- Formatos vertical 9:16, horizontal 16:9, cuadrado 1:1 y clásico 4:3.
- Resolución reducida para limitar el tiempo de GPU.
- La mejora automática del prompt está desactivada para no consumir una segunda cuota de GPU.

El enlace del video lo entrega el Space y puede ser temporal; descarga el resultado para conservarlo.

## Desarrollo

```bash
npm install
npm run dev
```
