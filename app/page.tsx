"use client";
import { useEffect, useState } from "react";

type Profile = { gender: string; name: string; personality: string; language: string };
type Message = { role: "assistant" | "user"; text: string };
type ResearchResult = { title?: string; url?: string; content?: string };
const personalities = ["Cariñosa", "Romántica", "Divertida", "Coqueta", "Tranquila", "Personalizada"];

function safeWrite(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* almacenamiento local no disponible */ }
}

export default function Home() {
  const [stage, setStage] = useState(0);
  const [gender, setGender] = useState("Mujer");
  const [name, setName] = useState("");
  const [personality, setPersonality] = useState("Cariñosa");
  const [language, setLanguage] = useState("Auto");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [memories, setMemories] = useState<string[]>([]);
  const [memory, setMemory] = useState("");
  const [tasks, setTasks] = useState<string[]>([]);
  const [task, setTask] = useState("");
  const [research, setResearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [researchBusy, setResearchBusy] = useState(false);
  const [researchResults, setResearchResults] = useState<ResearchResult[]>([]);
  const [researchSummary, setResearchSummary] = useState("");
  const [researchNote, setResearchNote] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem("vinculo-profile");
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile) as Profile;
        if (parsed && typeof parsed.name === "string" && typeof parsed.gender === "string" &&
            typeof parsed.personality === "string" && typeof parsed.language === "string") {
          setProfile(parsed);
          setStage(3);
        }
      }
    } catch { /* se ignora el perfil corrupto */ }
    try {
      const savedMessages = localStorage.getItem("vinculo-messages");
      if (savedMessages) {
        const parsed = JSON.parse(savedMessages);
        if (Array.isArray(parsed)) {
          setMessages(parsed.filter((item): item is Message =>
            item && (item.role === "user" || item.role === "assistant") && typeof item.text === "string"
          ).slice(-100));
        }
      }
    } catch { /* se ignora el historial corrupto */ }
    try {
      const savedMemories = localStorage.getItem("vinculo-memories");
      if (savedMemories) {
        const parsed = JSON.parse(savedMemories);
        if (Array.isArray(parsed)) setMemories(parsed.filter((item): item is string => typeof item === "string").slice(-50));
      }
    } catch { /* se ignoran memorias corruptas */ }
    try {
      const savedTasks = localStorage.getItem("vinculo-tasks");
      if (savedTasks) {
        const parsed = JSON.parse(savedTasks);
        if (Array.isArray(parsed)) setTasks(parsed.filter((item): item is string => typeof item === "string").slice(-50));
      }
    } catch { /* se ignoran tareas corruptas */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) safeWrite("vinculo-messages", JSON.stringify(messages.slice(-100)));
  }, [messages, hydrated]);
  useEffect(() => {
    if (hydrated) safeWrite("vinculo-memories", JSON.stringify(memories.slice(-50)));
  }, [memories, hydrated]);
  useEffect(() => {
    if (hydrated) safeWrite("vinculo-tasks", JSON.stringify(tasks.slice(-50)));
  }, [tasks, hydrated]);

  function finish() {
    const nextProfile: Profile = { gender, name: name.trim() || "Alex", personality, language };
    setProfile(nextProfile);
    safeWrite("vinculo-profile", JSON.stringify(nextProfile));
    setStage(3);
    setMessages([{ role: "assistant", text: "Hola ❤️ Soy " + nextProfile.name + ". Este es nuestro espacio. Podemos conversar, organizar ideas, aprender, planificar e investigar juntos." }]);
  }

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const history = [...messages, { role: "user" as const, text }];
    setMessages(history);
    setInput("");
    setBusy(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.slice(-20).map(message => ({ role: message.role, content: message.text })),
          profile,
          memories: memories.slice(-10)
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Error de conexión");
      if (typeof data.reply !== "string") throw new Error("El servidor no devolvió una respuesta válida.");
      setMessages(previous => [...previous, { role: "assistant", text: data.reply }]);
    } catch (error: unknown) {
      setMessages(previous => [...previous, {
        role: "assistant",
        text: "No pude conectar: " + (error instanceof Error ? error.message : "error") + ". Revisa la configuración del servidor."
      }]);
    } finally {
      setBusy(false);
    }
  }

  async function searchWeb() {
    const query = research.trim();
    if (!query || researchBusy) return;
    setResearchNote("Buscando…");
    setResearchResults([]);
    setResearchSummary("");
    setResearchBusy(true);
    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Error al buscar");
      if (data.configured) {
        setResearchResults(Array.isArray(data.results) ? data.results : []);
        setResearchSummary(typeof data.summary === "string" ? data.summary : "");
        setResearchNote("Resultados de búsqueda");
      } else {
        setResearchResults(Array.isArray(data.links) ? data.links : []);
        setResearchNote("Motor no configurado; puedes abrir estos enlaces de búsqueda.");
      }
    } catch (error: unknown) {
      setResearchNote(error instanceof Error ? error.message : "Error al buscar");
    } finally {
      setResearchBusy(false);
    }
  }

  function reset() {
    try { localStorage.removeItem("vinculo-profile"); } catch { /* no-op */ }
    try { localStorage.removeItem("vinculo-messages"); } catch { /* no-op */ }
    setProfile(null);
    setMessages([]);
    setStage(0);
  }

  return (
    <main className="v-shell">
      <header className="v-header">
        <div className="v-logo" aria-hidden="true">♡</div>
        <div><b>VÍNCULO</b><small>Un espacio para conectar</small></div>
        {stage === 3 && <button className="v-reset" type="button" onClick={reset}>Configuración</button>}
      </header>
      {stage < 3 ? (
        <section className="v-card">
          <div className="v-step">CREANDO TU COMPAÑÍA · {stage + 1}/3</div>
          <div className="v-progress"><i style={{ width: ((stage + 1) / 3 * 100) + "%" }} /></div>
          {stage === 0 && <>
            <h1>¿Qué compañía<br /><em>quieres crear?</em></h1>
            <p>Elige cómo será tu compañero virtual.</p>
            <div className="v-options">{["Mujer", "Hombre", "Otro"].map(option =>
              <button type="button" className={gender === option ? "selected" : ""} onClick={() => setGender(option)} key={option}>
                {option === "Mujer" ? "♀" : option === "Hombre" ? "♂" : "✧"}<span>{option}</span>
              </button>
            )}</div>
          </>}
          {stage === 1 && <>
            <h1>¿Cómo se<br /><em>llamará?</em></h1>
            <p>El nombre que elijas será su identidad en Vínculo.</p>
            <input className="v-input" aria-label="Nombre de tu compañía" value={name} onChange={event => setName(event.target.value)} placeholder="Escribe un nombre" maxLength={30} />
          </>}
          {stage === 2 && <>
            <h1>Elige su<br /><em>personalidad</em></h1>
            <p>Podrás cambiarla más adelante.</p>
            <div className="v-personas">{personalities.map(option =>
              <button type="button" className={personality === option ? "selected" : ""} key={option} onClick={() => setPersonality(option)}>{option}</button>
            )}</div>
            <label className="v-label" htmlFor="v-language">Idioma</label>
            <select id="v-language" className="v-input" value={language} onChange={event => setLanguage(event.target.value)}>
              <option>Auto</option><option>Español</option><option>English</option><option>Português</option><option>Français</option>
            </select>
          </>}
          <button className="v-next" type="button" onClick={() => stage === 2 ? finish() : setStage(stage + 1)} disabled={stage === 1 && !name.trim()}>
            {stage === 2 ? "Crear Vínculo" : "Continuar"} →
          </button>
        </section>
      ) : (
        <section className="v-chat-layout">
          <aside className="v-side">
            <div className="v-avatar" aria-hidden="true">{profile?.gender === "Hombre" ? "♂" : profile?.gender === "Otro" ? "✧" : "♀"}</div>
            <h2>{profile?.name}</h2><p>{profile?.personality}</p>
            <div className="v-side-links"><span>♡ Conversación</span><span>✧ Memorias</span><span>✓ Planes y tareas</span><span>⌕ Investigación</span></div>
          </aside>
          <div className="v-chat">
            <div className="v-chat-top"><div><b>Conversación</b><small>Tu espacio personal</small></div><span className="v-status">● PROTOTIPO</span></div>
            <div className="v-messages" aria-live="polite" aria-busy={busy}>
              {messages.map((message, index) => <div className={"v-msg " + message.role} key={index}>{message.text}</div>)}
              {busy && <div className="v-msg assistant">Pensando…</div>}
            </div>
            <div className="v-compose">
              <input aria-label="Mensaje" value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => event.key === "Enter" && send()} placeholder="Escribe algo…" maxLength={2000} />
              <button type="button" onClick={send} disabled={busy || !input.trim()} aria-label="Enviar mensaje">{busy ? "Pensando…" : "Enviar ↑"}</button>
            </div>
            <div className="v-memory-box">
              <h3>Memorias</h3>
              <div className="v-add-memory"><input aria-label="Nuevo recuerdo" value={memory} onChange={event => setMemory(event.target.value)} placeholder="Añadir un recuerdo" maxLength={500} /><button type="button" aria-label="Añadir recuerdo" onClick={() => { if (memory.trim()) { setMemories(previous => [...previous, memory.trim()].slice(-50)); setMemory(""); } }}>+</button></div>
              {memories.map((item, index) => <div className="v-memory" key={index}>{item}<button type="button" aria-label="Eliminar recuerdo" onClick={() => setMemories(previous => previous.filter((_, itemIndex) => itemIndex !== index))}>×</button></div>)}
            </div>
            <div className="v-memory-box">
              <h3>Planes y tareas</h3>
              <div className="v-add-memory"><input aria-label="Nueva tarea" value={task} onChange={event => setTask(event.target.value)} placeholder="Añadir tarea" maxLength={500} /><button type="button" aria-label="Añadir tarea" onClick={() => { if (task.trim()) { setTasks(previous => [...previous, task.trim()].slice(-50)); setTask(""); } }}>+</button></div>
              {tasks.map((item, index) => <div className="v-memory" key={index}>{item}<button type="button" aria-label="Eliminar tarea" onClick={() => setTasks(previous => previous.filter((_, itemIndex) => itemIndex !== index))}>×</button></div>)}
            </div>
            <div className="v-memory-box">
              <h3>Investigación web</h3>
              <div className="v-add-memory"><input aria-label="Buscar en la web" value={research} onChange={event => setResearch(event.target.value)} placeholder="Buscar tema en la web" maxLength={500} /><button type="button" onClick={searchWeb} disabled={researchBusy || !research.trim()} aria-label="Buscar">{researchBusy ? "…" : "⌕"}</button></div>
              {researchNote && <small aria-live="polite">{researchNote}</small>}
              {researchSummary && <div className="v-memory">{researchSummary}</div>}
              {researchResults.map((result, index) => <div className="v-memory" key={index}>
                {result.url ? <a href={result.url} target="_blank" rel="noopener noreferrer">{result.title || result.url}</a> : result.title}
                {result.content && <small>{result.content}</small>}
              </div>)}
            </div>
          </div>
        </section>
      )}
      <footer className="v-footer">VÍNCULO · Chat IA y búsqueda requieren configurar claves API en el servidor.</footer>
    </main>
  );
}
