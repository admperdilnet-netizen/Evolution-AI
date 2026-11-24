export default function Home() {
  return (
    <main className="shell">
      <nav className="topbar">
        <a className="brand" href="#"><span className="brand-mark">E</span><span>EVOLUTION <b>AI</b></span></a>
        <div className="account-area"><span>Acceso público · Sin registro</span></div>
      </nav>
      <section className="hero">
        <div className="eyebrow">✦ TU ESTUDIO AUDIOVISUAL</div>
        <h1>Bienvenido a <em>Evolution AI.</em></h1>
        <p className="intro">Entra y explora las herramientas de creación audiovisual sin iniciar sesión.</p>
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
      <p className="account-note">Puedes explorar Evolution AI sin crear una cuenta. Cuando conectes un motor externo, ese proveedor podrá solicitar su propia autorización.</p>
      <footer><span>EVOLUTION AI © 2026</span><span>TUS CUENTAS · TUS PERMISOS · TUS CRÉDITOS</span></footer>
    </main>
  );
}
