"use client";

import LongVideoBuilder from "./long-video-builder";

export default function Home() {
  return (
    <main className="shell">
      <nav className="topbar">
        <a className="brand" href="#"><span className="brand-mark">E</span><span>EVOLUTION <b>AI</b></span></a>
        
      </nav>
      <section className="hero">
        
        <h1><em>Evolution AI</em></h1>
        
      </section>
      <LongVideoBuilder />
      <footer><span>EVOLUTION AI</span></footer>
    </main>
  );
}
