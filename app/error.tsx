"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="login">
      <h1>No pudimos cargar el espacio</h1>
      <p>Comprueba la configuración y tu conexión.</p>
      <button onClick={reset}>Volver a intentar</button>
    </main>
  );
}
