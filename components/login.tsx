"use client";
import { useState } from "react";
import Link from "next/link";
export function Login({ configured }: { configured: boolean }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <main className="login">
      <Link className="brand" href="/">
        skandia<span>●</span>
      </Link>
      <h1>Bienvenido a tu espacio</h1>
      <p>Ingresa con tu cuenta habilitada por el administrador.</p>
      {!configured ? (
        <p className="notice">
          La conexión está pendiente. Puedes explorar la{" "}
          <Link href="/demo">demo con datos ficticios</Link>.
        </p>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const f = new FormData(e.currentTarget);
            try {
              const r = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: f.get("email"),
                  password: f.get("password"),
                }),
              });
              const d = await r.json();
              if (!r.ok) throw new Error(d.error);
              window.location.href = "/board";
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Correo
            <input required type="email" name="email" autoComplete="username" />
          </label>
          <label>
            Contraseña
            <input
              required
              type="password"
              name="password"
              autoComplete="current-password"
            />
          </label>
          <button disabled={busy}>{busy ? "Entrando…" : "Entrar →"}</button>
          <p role="alert">{error}</p>
        </form>
      )}
    </main>
  );
}
