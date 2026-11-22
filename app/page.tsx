import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/auth";
import SignOutButton from "./signout-button";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const name = session.user?.name || session.user?.email || "Usuario";
  return (
    <main className="shell">
      <nav className="topbar">
        <a className="brand" href="#"><span className="brand-mark">E</span><span>EVOLUTION <b>AI</b></span></a>
        <div className="account-area">
          {session.user?.image && <img className="avatar" src={session.user.image} alt="" />}
          <span>{name}</span>
          <SignOutButton />
        </div>
      </nav>
      <section className="hero">
        <div className="eyebrow">✦ TU ESTUDIO AUDIOVISUAL</div>
        <h1>Bienvenido a <em>Evolution AI.</em></h1>
        <p className="intro">Conecta tus propias cuentas para crear contenido desde un solo lugar.</p>
      </section>
      <section className="provider-grid">
        <article className="provider-card">
          <div className="provider-icon renderforest">R</div>
          <div className="provider-label">MOTOR DE VIDEO</div>
          <h2>Renderforest</h2>
          <p>Su servidor MCP documenta autorización OAuth 2.1 para generar videos utilizando los créditos de la cuenta que autoriza.</p>
          <span className="provider-status">Integración en preparación</span>
          <a href="https://mcp.renderforest.com/docs" target="_blank" rel="noreferrer">Ver documentación oficial ↗</a>
        </article>
        <article className="provider-card">
          <div className="provider-icon eleven">11</div>
          <div className="provider-label">VIDEO · AUDIO · VOZ</div>
          <h2>ElevenLabs</h2>
          <p>Su servidor MCP ofrece autorización OAuth para trabajar con el espacio de trabajo y sus créditos autorizados.</p>
          <span className="provider-status">Integración en preparación</span>
          <a href="https://elevenlabs.io/docs/eleven-api/resources/mcp-server" target="_blank" rel="noreferrer">Ver documentación oficial ↗</a>
        </article>
      </section>
      <p className="account-note">Sesión iniciada con Google: <strong>{session.user?.email}</strong>. Cada motor requerirá su propia autorización. Todavía no se ejecutan generaciones hasta completar y probar esas conexiones.</p>
      <footer><span>EVOLUTION AI © 2026</span><span>TUS CUENTAS · TUS PERMISOS · TUS CRÉDITOS</span></footer>
    </main>
  );
}