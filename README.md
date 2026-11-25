# Evolution AI

Evolution AI es un estudio web público de texto a video. No requiere inicio de sesión de Google ni servicios de generación de pago.

## Motor gratuito

La generación se conecta al Space oficial **Lightricks/LTX-2.5** en Hugging Face ZeroGPU:

- API pública del Space: `https://huggingface.co/spaces/Lightricks/LTX-2.5`
- Modelo: LTX-2.5 (texto a video con audio).
- Aplicación web: Next.js en Vercel.
- No usa fal.ai ni requiere `FAL_KEY`.

La cuota gratuita de Hugging Face es limitada, se comparte por token y puede haber cola o indisponibilidad. No son generaciones ilimitadas. LTX-2.5 reserva GPU xlarge y las solicitudes más largas o grandes consumen más cuota.

## Configuración de Vercel

1. Crea una cuenta gratuita en Hugging Face y verifica el correo.
2. Crea un token personal en https://huggingface.co/settings/tokens. Un token de lectura es suficiente para invocar el Space público.
3. En Vercel abre el proyecto Evolution AI → Settings → Environment Variables.
4. Añade `HF_TOKEN` con el token como valor privado para Production (y Preview si lo usas).
5. Guarda y crea un nuevo despliegue de Production.

No pongas el token en el código, en GitHub, en variables `NEXT_PUBLIC_*` ni en el navegador. El token solo se lee desde la ruta de servidor `/api/generate`.

## Opciones de generación

- Texto a video con LTX-2.5 a través de Hugging Face ZeroGPU.
- Duración seleccionable: 1, 2, 3, 4 o 5 segundos (24 fps).
- Formatos: vertical 9:16, horizontal 16:9, cuadrado 1:1 y clásico 4:3.
- Calidad seleccionable: Ahorro, Estándar y Alta definición. Cada preset usa dimensiones compatibles con el Space (múltiplos de 64, entre 512 y 1536 píxeles).
- La mejora automática del prompt está desactivada para no consumir cuota de una segunda GPU.

Los clips más largos y los niveles de calidad altos consumen más cuota. El enlace del video lo entrega el Space y puede ser temporal; descarga el resultado para conservarlo.

## Desarrollo

```bash
npm install
npm run dev
```


## Videos largos

La modalidad de proyecto largo genera escenas de 5 segundos y las une en un MP4 final:

- 30 segundos: 6 escenas; 45 segundos: 9 escenas; 60 segundos: 12 escenas.
- El prompt y la semilla se mantienen para orientar la continuidad, pero las escenas pueden variar porque no se usa una imagen de referencia entre segmentos.
- Los videos se guardan en IndexedDB del navegador y el MP4 final se une localmente con ffmpeg.wasm.
- El progreso se puede continuar en el mismo navegador. No borres los datos del sitio antes de descargar el video final.
- La cuota de ZeroGPU es limitada; un proyecto largo puede necesitar varios días.
