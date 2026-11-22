# Evolution AI

Evolution AI es un estudio web con inicio de sesión individual y una arquitectura prevista para conectar proveedores de generación mediante autorización delegada.

## Inicio de sesión con Google

La aplicación usa NextAuth v4 con sesión JWT. Configura estas variables en Vercel (Project → Settings → Environment Variables) y vuelve a desplegar:

- `GOOGLE_CLIENT_ID`: ID OAuth 2.0 de tipo Web application de Google Cloud.
- `GOOGLE_CLIENT_SECRET`: secreto OAuth de Google Cloud.
- `NEXTAUTH_SECRET`: secreto aleatorio largo para firmar sesiones.
- `NEXTAUTH_URL`: URL pública de Evolution AI, por ejemplo `https://tu-dominio.vercel.app`.

En Google Cloud Console configura la pantalla de consentimiento y agrega como URI de redirección autorizada:
`https://TU-DOMINIO/api/auth/callback/google`

Para desarrollo local usa `http://localhost:3000/api/auth/callback/google`.

No compartas el secreto de Google ni lo pongas en variables `NEXT_PUBLIC_*`.

## Proveedores de generación

- Renderforest publica un servidor MCP remoto con OAuth 2.1 y alcance para generar videos en la cuenta que autoriza: https://mcp.renderforest.com/docs
- ElevenLabs publica un servidor MCP remoto con OAuth y acceso al espacio de trabajo autorizado: https://elevenlabs.io/docs/eleven-api/resources/mcp-server

**Estado actual:** se retiró el generador público LTX del sitio y se preparó el inicio de sesión Google y el panel de proveedores. El inicio de sesión requiere las variables anteriores. Las conexiones MCP de los proveedores todavía requieren implementar un cliente MCP OAuth y almacenamiento cifrado de tokens por usuario antes de habilitar generación real. No se deben pedir ni guardar contraseñas o API keys en el navegador.

## Desarrollo

```bash
npm install
npm run dev
```

## Importante

Iniciar sesión con Google solo autentica al usuario en Evolution AI. No concede automáticamente acceso a Renderforest ni ElevenLabs: cada proveedor necesita su consentimiento independiente. No anunciar generación activa hasta que las conexiones y una generación real se hayan probado.
