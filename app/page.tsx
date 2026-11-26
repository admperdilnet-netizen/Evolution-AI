"use client";

import LongVideoBuilder from "./long-video-builder";

export default function Home() {
  return (
    <main className="shell">
      <nav className="topbar">
        <a className="brand" href="#"><span className="brand-mark">E</span><span>EVOLUTION <b>AI</b></span></a>
        <span className="top-pill">ESTUDIO DE VIDEO · ACCESO PÚBLICO</span>
      </nav>
      <section className="hero">
        <div className="eyebrow"><span className="spark">✦</span> TU ESTUDIO AUDIOVISUAL</div>
        <h1>Convierte tus ideas en <em>video.</em></h1>
        <p className="intro">Crea historias completas por escenas y únelas automáticamente en un solo video largo.</p>
      </section>
      <LongVideoBuilder />
      <footer><span>EVOLUTION AI © 2026</span><span>CREA · PREVISUALIZA · DESCARGA</span></footer>
    </main>
  );
}
