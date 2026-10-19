import Link from "next/link";
export default function Home() {
  return (
    <main className="welcome">
      <span className="brand">
        skandia<span>●</span>
      </span>
      <p className="eyebrow">PLANNER / PUNTO DE PARTIDA</p>
      <h1>
        Menos pendientes sueltos.
        <br />
        Más trabajo en equipo.
      </h1>
      <p>
        Un espacio para organizar tareas, compartir contexto y avanzar con ayuda
        de IA.
      </p>
      <div className="actions">
        <Link className="button" href="/login">
          Entrar a mi espacio →
        </Link>
        <Link className="button secondary" href="/demo">
          Explorar demo
        </Link>
      </div>
      <small>
        La demo utiliza datos ficticios. El espacio de trabajo requiere acceso.
      </small>
    </main>
  );
}
