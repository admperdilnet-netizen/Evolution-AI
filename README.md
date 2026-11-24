# Evolution AI

Evolution AI es un estudio web público para crear videos a partir de texto. No requiere registro ni inicio de sesión.

## Generación de video

La aplicación usa el endpoint `minimax/h3-max-turbo/text-to-video` de fal.ai desde rutas de servidor de Next.js.

Configura en Vercel → Project → Settings → Environment Variables:

- `FAL_KEY`: clave privada de fal.ai. Debe estar disponible para Production (y Preview si corresponde).

Después de agregar o cambiar la variable, crea un nuevo despliegue. Nunca uses un prefijo `NEXT_PUBLIC_` para esta clave ni la compartas en el navegador.

La interfaz permite crear clips de 6, 10 o 15 segundos, en 9:16, 16:9, 1:1 o 4:3 y 480P, 768P o 1080P. El resultado se consulta mediante la cola de fal.ai y se muestra en el reproductor.

La generación consume créditos de la cuenta fal.ai asociada a `FAL_KEY`. El coste depende de duración, resolución y tarifa vigente; confirma los precios en fal.ai antes de usar la plataforma. La limitación por IP incluida en la ruta es solo una protección básica y no sustituye un sistema robusto de cuotas o control de abuso para un servicio público.

## Desarrollo

```bash
npm install
npm run dev
```

## Seguridad

- La clave de fal.ai solo se lee en el servidor.
- Las rutas validan el texto, duración, formato y resolución.
- No expongas secretos en el código, en variables `NEXT_PUBLIC_*` ni en el navegador.
