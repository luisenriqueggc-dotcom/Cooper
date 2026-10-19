"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { labels, metrics, statuses, type Data, type Task } from "@/lib/domain";
const priorities: Record<string, string> = {
  low: "Baja",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
};
const blank: Task = {
  id: "",
  title: "",
  context: "",
  status: "todo",
  priority: "normal",
  due_date: null,
  area_id: null,
  business_line_id: null,
  project_id: null,
  requester_id: null,
  assignee_ids: [],
  version: 1,
};
type Proposal = {
  id: string;
  payload: { kind: "create" | "update"; task: Task; task_id?: string };
};
type Message = { role: "user" | "assistant"; text: string };
export function Workspace({
  initial,
  admin,
  demo = false,
  canAdmin = false,
}: {
  initial: Data;
  admin: boolean;
  demo?: boolean;
  canAdmin?: boolean;
}) {
  const router = useRouter();
  const [local, setLocal] = useState(initial);
  const data = demo ? local : initial;
  const [readonly, setReadonly] = useState(!admin);
  const [tab, setTab] = useState(admin ? "dashboard" : "board");
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("");
  const [person, setPerson] = useState("");
  const [editing, setEditing] = useState<Task | null>(null);
  const [chatOpen, setChatOpen] = useState(admin);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Hola. Puedo ayudarte a crear tareas, actualizar responsables y preparar cambios de estado. ¿Qué necesitas organizar?",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [sessionId, setSessionId] = useState<string>();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const count = metrics(data.tasks, demo ? "2026-10-19" : undefined);
  const tasks = data.tasks.filter(
    (t) =>
      t.title.toLowerCase().includes(query.toLowerCase()) &&
      (!area || t.area_id === area) &&
      (!person || t.assignee_ids.includes(person)),
  );
  const name = (items: { id: string; name: string }[], id: string | null) =>
    items.find((p) => p.id === id)?.name ?? "Sin asignar";
  async function post(path: string, payload: unknown) {
    const r = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    return d;
  }
  async function send() {
    if (!draft.trim() || busy) return;
    const message = draft;
    setDraft("");
    setMessages((m) => [...m, { role: "user", text: message }]);
    setBusy(true);
    setNotice("");
    try {
      if (demo) {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            text: "Esta es una demostración visual: aquí no se consulta la IA. En el espacio conectado, buscaré tareas y prepararé propuestas para que las revises. Puedes probar la creación y edición manual con “Nueva tarea”.",
          },
        ]);
      } else {
        const result = await post("/api/chat", { message, sessionId });
        setSessionId(result.sessionId);
        setMessages((m) => [...m, { role: "assistant", text: result.text }]);
        setProposals((p) => [...p, ...result.proposals]);
      }
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save(task: Task) {
    setBusy(true);
    setNotice("");
    try {
      if (demo) {
        setLocal((d) => ({
          ...d,
          tasks: task.id
            ? d.tasks.map((t) =>
                t.id === task.id ? { ...task, version: t.version + 1 } : t,
              )
            : [{ ...task, id: `DEMO-${Date.now()}` }, ...d.tasks],
        }));
      } else {
        const { id, version, created_at, ...input } = task;
        void created_at;
        await post(
          "/api/tasks",
          id
            ? {
                kind: "update",
                task_id: id,
                expected_version: version,
                task: input,
              }
            : { kind: "create", task: input },
        );
        router.refresh();
      }
      setEditing(null);
      setNotice(
        demo
          ? "Cambio de demostración aplicado en esta pestaña."
          : "Tarea guardada.",
      );
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="shell">
      <aside className="sidebar">
        <Link className="brand" href="/">
          skandia<span>●</span>
        </Link>
        <div className="workspace-label">ESPACIO DE TRABAJO</div>
        <div className="workspace-name">
          <span className="workspace-icon">S</span>
          <div>
            Equipo Skandia<small>Planner inteligente</small>
          </div>
        </div>
        <nav>
          {!readonly && (
            <button
              className={tab === "dashboard" ? "nav-active" : ""}
              onClick={() => setTab("dashboard")}
            >
              ◫ <span>Resumen</span>
            </button>
          )}
          <button
            className={tab === "board" ? "nav-active" : ""}
            onClick={() => setTab("board")}
          >
            ▤ <span>Tablero de tareas</span>
            <small>{data.tasks.length}</small>
          </button>
          {!readonly && (
            <button onClick={() => setChatOpen((v) => !v)}>
              ✧ <span>Asistente IA</span>
            </button>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="access-badge">
            {readonly ? "◉ Solo lectura" : "◈ Administrador"}
          </div>
          <p>
            {readonly
              ? "Visibilidad para avanzar juntos."
              : "Todo lo que tu equipo necesita, en un solo lugar."}
          </p>
          {demo ? (
            <button
              className="text-button"
              onClick={() => {
                setReadonly((v) => !v);
                setTab("board");
                setChatOpen(false);
              }}
            >
              Probar vista {readonly ? "admin" : "de consulta"} →
            </button>
          ) : (
            <>
              <Link href={readonly && canAdmin ? "/admin" : "/board"}>
                {readonly && canAdmin
                  ? "Ir a administración"
                  : "Vista de consulta"}
              </Link>
              <button
                className="text-button"
                onClick={async () => {
                  try {
                    await post("/api/logout", {});
                    window.location.href = "/login";
                  } catch {
                    setNotice(
                      "No pudimos cerrar sesión. Inténtalo nuevamente.",
                    );
                  }
                }}
              >
                Cerrar sesión
              </button>
            </>
          )}
        </div>
      </aside>
      <div className="workspace-main">
        <header className="topbar">
          <span>
            Equipo Skandia{" "}
            <span className="muted">
              / {tab === "dashboard" ? "Resumen" : "Tablero"}
            </span>
          </span>
          <div className="header-right">
            {demo && <span className="demo-badge">DEMO · DATOS FICTICIOS</span>}
            <span className="avatar">SK</span>
          </div>
        </header>
        <main className="content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">CADA TAREA CUENTA</p>
              <h1>
                {tab === "dashboard"
                  ? "Una mirada a lo importante."
                  : "Tu equipo, en la misma página."}
              </h1>
              <p>
                {readonly
                  ? "Consulta el avance, los responsables y las próximas entregas."
                  : "Organiza el trabajo. Dale contexto. Haz que avance."}
              </p>
            </div>
            {!readonly && (
              <button onClick={() => setEditing({ ...blank })}>
                ＋ Nueva tarea
              </button>
            )}
          </div>
          {notice && (
            <div role="status" className="notice">
              {notice}
              <button aria-label="Cerrar aviso" onClick={() => setNotice("")}>
                ×
              </button>
            </div>
          )}
          {tab === "dashboard" && !readonly && (
            <>
              <section className="stats">
                {[
                  ["Tareas totales", count.total, "Panorama del equipo"],
                  ["En curso", count.active, "Trabajo pendiente"],
                  ["Vencidas", count.overdue, "Necesitan atención"],
                  ["Finalizadas", count.done, "Objetivos alcanzados"],
                ].map(([title, n, sub], i) => (
                  <article
                    className={i === 2 ? "stat warning" : "stat"}
                    key={title}
                  >
                    <span>{title}</span>
                    <strong>{n}</strong>
                    <small>{sub}</small>
                  </article>
                ))}
              </section>
              <div className="overview">
                <article className="progress-panel">
                  <div className="section-heading">
                    <h2>Así vamos</h2>
                    <span>
                      {count.total
                        ? Math.round((count.done / count.total) * 100)
                        : 0}
                      % completado
                    </span>
                  </div>
                  <div className="progress-track">
                    {statuses.map((s) => (
                      <div
                        title={labels[s]}
                        key={s}
                        className={`segment ${s}`}
                        style={{
                          flex: data.tasks.filter((t) => t.status === s).length,
                        }}
                      />
                    ))}
                  </div>
                  <div className="legend">
                    {statuses.map((s) => (
                      <span key={s}>
                        <i className={s} />
                        {labels[s]}{" "}
                        <b>{data.tasks.filter((t) => t.status === s).length}</b>
                      </span>
                    ))}
                  </div>
                </article>
                <article className="ai-callout">
                  <span>✧</span>
                  <div>
                    <h2>Un poco de ayuda, mucho avance.</h2>
                    <p>
                      Transforma una petición en una tarea con contexto y
                      responsables.
                    </p>
                    <button onClick={() => setChatOpen(true)}>
                      Conversar con el asistente →
                    </button>
                  </div>
                </article>
              </div>
            </>
          )}
          <div className="section-heading">
            <h2>
              {tab === "dashboard"
                ? "El trabajo del equipo"
                : "Tablero de tareas"}
            </h2>
            <span>{tasks.length} tareas visibles · hasta 500 recientes</span>
          </div>
          <div className="filters">
            <input
              aria-label="Buscar tarea"
              placeholder="Buscar una tarea…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              aria-label="Filtrar por área"
              value={area}
              onChange={(e) => setArea(e.target.value)}
            >
              <option value="">Todas las áreas</option>
              {data.areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Filtrar por responsable"
              value={person}
              onChange={(e) => setPerson(e.target.value)}
            >
              <option value="">Todos los responsables</option>
              {data.people.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <section className="board" aria-label="Tablero Kanban">
            {statuses.map((status) => (
              <div className="column" key={status}>
                <div className="column-title">
                  <i className={status} />
                  <h3>{labels[status]}</h3>
                  <span>{tasks.filter((t) => t.status === status).length}</span>
                </div>
                {tasks
                  .filter((t) => t.status === status)
                  .map((task) => (
                    <button
                      className="task-card"
                      key={task.id}
                      onClick={() => setEditing(task)}
                    >
                      <div className="card-meta">
                        <span>{name(data.areas, task.area_id)}</span>
                        <span className={`priority ${task.priority}`}>
                          {priorities[task.priority]}
                        </span>
                      </div>
                      <h4>{task.title}</h4>
                      <p>{name(data.projects, task.project_id)}</p>
                      <div className="card-footer">
                        <span>
                          ◷{" "}
                          {task.due_date
                            ? task.due_date.split("-").reverse().join("/")
                            : "Sin fecha"}
                        </span>
                        <span
                          className="person"
                          title={task.assignee_ids
                            .map((id) => name(data.people, id))
                            .join(", ")}
                        >
                          {task.assignee_ids.length
                            ? name(data.people, task.assignee_ids[0])
                                .split(" ")
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join("")
                            : "—"}
                          {task.assignee_ids.length > 1
                            ? ` +${task.assignee_ids.length - 1}`
                            : ""}
                        </span>
                      </div>
                    </button>
                  ))}
                {!tasks.some((t) => t.status === status) && (
                  <p className="empty">Sin tareas por ahora</p>
                )}
              </div>
            ))}
          </section>
          <p className="footnote">
            {demo
              ? "Demo local · fecha de referencia: 19 de octubre de 2026 · los cambios se pierden al recargar"
              : "Fechas en horario de Ciudad de México · actualiza la página para consultar cambios del equipo"}
          </p>
        </main>
      </div>
      {!readonly && chatOpen && (
        <aside className="chat">
          <div className="chat-heading">
            <span className="spark">✧</span>
            <div>
              <h2>Tu asistente</h2>
              <small>
                {demo
                  ? "Vista de demostración"
                  : "Organiza con lenguaje natural"}
              </small>
            </div>
            <button
              aria-label="Cerrar chat"
              className="close"
              onClick={() => setChatOpen(false)}
            >
              ×
            </button>
          </div>
          <div className="chat-messages" aria-live="polite">
            {messages.map((m, i) => (
              <div key={i} className={`message ${m.role}`}>
                {m.text}
              </div>
            ))}
            {proposals.map((p) => (
              <div className="proposal" key={p.id}>
                <small>
                  PROPUESTA ·{" "}
                  {p.payload.kind === "create"
                    ? "NUEVA TAREA"
                    : "ACTUALIZACIÓN"}
                </small>
                <h3>{p.payload.task.title}</h3>
                <p>
                  {labels[p.payload.task.status]} · Prioridad{" "}
                  {priorities[p.payload.task.priority]}
                </p>
                <p>Entrega: {p.payload.task.due_date ?? "Sin fecha"}</p>
                <p>
                  Responsables:{" "}
                  {p.payload.task.assignee_ids
                    .map((id) => name(data.people, id))
                    .join(", ") || "Sin asignar"}
                </p>
                <p>
                  Solicita: {name(data.people, p.payload.task.requester_id)}
                </p>
                <p>
                  Área: {name(data.areas, p.payload.task.area_id)} · Línea:{" "}
                  {name(data.business_lines, p.payload.task.business_line_id)} ·
                  Proyecto: {name(data.projects, p.payload.task.project_id)}
                </p>
                <details>
                  <summary>Revisar contexto propuesto</summary>
                  <p>{p.payload.task.context || "Sin contexto"}</p>
                </details>
                {p.payload.kind === "update" && (
                  <details>
                    <summary>Ver tarea actual antes de aplicar</summary>
                    {(() => {
                      const t = data.tasks.find(
                        (t) => t.id === p.payload.task_id,
                      );
                      return t ? (
                        <div>
                          <p>
                            {t.title} · {labels[t.status]} · Prioridad{" "}
                            {priorities[t.priority]}
                          </p>
                          <p>Entrega: {t.due_date ?? "Sin fecha"}</p>
                          <p>
                            Responsables:{" "}
                            {t.assignee_ids
                              .map((id) => name(data.people, id))
                              .join(", ") || "Sin asignar"}
                          </p>
                          <p>Solicita: {name(data.people, t.requester_id)}</p>
                          <p>
                            Área: {name(data.areas, t.area_id)} · Línea:{" "}
                            {name(data.business_lines, t.business_line_id)} ·
                            Proyecto: {name(data.projects, t.project_id)}
                          </p>
                          <p>{t.context || "Sin contexto"}</p>
                        </div>
                      ) : (
                        <p>Actualiza el tablero para consultar esta tarea.</p>
                      );
                    })()}
                  </details>
                )}
                <button
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await post("/api/actions", { actionId: p.id });
                      setProposals((v) => v.filter((x) => x.id !== p.id));
                      setNotice(
                        "Cambio aplicado y registrado en el historial.",
                      );
                      router.refresh();
                    } catch (e) {
                      setNotice((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Confirmar cambio
                </button>
                <button
                  className="text-button"
                  onClick={() =>
                    setProposals((v) => v.filter((x) => x.id !== p.id))
                  }
                >
                  Descartar de esta vista
                </button>
              </div>
            ))}
            {busy && <p role="status">Procesando…</p>}
          </div>
          <form
            className="chat-input"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <label htmlFor="chat-draft">¿Qué necesitas organizar?</label>
            <textarea
              id="chat-draft"
              maxLength={4000}
              placeholder="Crea una tarea para preparar el newsletter…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button disabled={busy || !draft.trim()}>Enviar ↑</button>
            <small>Revisa las propuestas antes de aplicarlas.</small>
          </form>
        </aside>
      )}
      {editing && (
        <div className="modal-backdrop">
          <section
            className="editor"
            role="dialog"
            aria-modal="true"
            aria-label={readonly ? "Detalle de tarea" : "Editar tarea"}
          >
            <div className="section-heading">
              <h2>
                {readonly
                  ? "Detalle de tarea"
                  : editing.id
                    ? "Editar tarea"
                    : "Nueva tarea"}
              </h2>
              <button
                className="close"
                aria-label="Cerrar detalle"
                onClick={() => setEditing(null)}
              >
                ×
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void save(editing);
              }}
            >
              <fieldset disabled={readonly || busy}>
                <label>
                  Título
                  <input
                    autoFocus
                    required
                    minLength={3}
                    maxLength={180}
                    value={editing.title}
                    onChange={(e) =>
                      setEditing({ ...editing, title: e.target.value })
                    }
                  />
                </label>
                <div className="form-grid">
                  <label>
                    Estado
                    <select
                      value={editing.status}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          status: e.target.value as Task["status"],
                        })
                      }
                    >
                      {statuses.map((s) => (
                        <option key={s} value={s}>
                          {labels[s]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Prioridad
                    <select
                      value={editing.priority}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          priority: e.target.value as Task["priority"],
                        })
                      }
                    >
                      {Object.entries(priorities).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Fecha de entrega
                    <input
                      type="date"
                      value={editing.due_date ?? ""}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          due_date: e.target.value || null,
                        })
                      }
                    />
                  </label>
                  {(
                    [
                      ["area_id", "Área", data.areas],
                      [
                        "business_line_id",
                        "Línea de negocio",
                        data.business_lines,
                      ],
                      ["project_id", "Proyecto", data.projects],
                      ["requester_id", "Solicitante", data.people],
                    ] as const
                  ).map(([key, title, items]) => (
                    <label key={key}>
                      {title}
                      <select
                        value={editing[key] ?? ""}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            [key]: e.target.value || null,
                          })
                        }
                      >
                        <option value="">Sin asignar</option>
                        {items.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
                <label>
                  Responsables <small>Selecciona una o varias personas</small>
                </label>
                <div className="assignees">
                  {data.people.map((p) => (
                    <label key={p.id}>
                      <input
                        type="checkbox"
                        checked={editing.assignee_ids.includes(p.id)}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            assignee_ids: e.target.checked
                              ? [...editing.assignee_ids, p.id]
                              : editing.assignee_ids.filter(
                                  (id) => id !== p.id,
                                ),
                          })
                        }
                      />
                      {p.name}
                    </label>
                  ))}
                </div>
                <label>
                  Contexto para continuar el trabajo
                  <textarea
                    rows={5}
                    maxLength={12000}
                    value={editing.context}
                    placeholder="Objetivo, entregable, decisiones y criterio de aceptación…"
                    onChange={(e) =>
                      setEditing({ ...editing, context: e.target.value })
                    }
                  />
                </label>
              </fieldset>
              {!readonly && (
                <button disabled={busy}>
                  {busy ? "Guardando…" : "Guardar tarea"}
                </button>
              )}
              <p className="footnote">
                Comentarios, archivos e historial: modelo de datos preparado;
                interfaz pendiente.
              </p>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
