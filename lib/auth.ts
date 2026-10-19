import "server-only";
import { db } from "./supabase/server";
import { sameOrigin } from "./domain";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function requireUser(admin = false) {
  const supabase = await db();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new HttpError(401, "Inicia sesión para continuar.");
  const { data: profile } = await supabase
    .from("profiles")
    .select("id,display_name,role,active")
    .eq("id", user.id)
    .single();
  if (!profile?.active)
    throw new HttpError(403, "Tu acceso todavía no está habilitado.");
  if (admin && profile.role !== "admin")
    throw new HttpError(403, "Esta acción requiere acceso administrador.");
  return { supabase, user, profile };
}
export function checkOrigin(request: Request) {
  if (!sameOrigin(request.headers.get("origin"), process.env.APP_ORIGIN))
    throw new HttpError(403, "Origen no permitido.");
}
export async function body(request: Request) {
  const text = await request.text();
  if (text.length > 20000)
    throw new HttpError(413, "Solicitud demasiado grande.");
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "JSON inválido.");
  }
}
export function errorResponse(error: unknown) {
  if (error instanceof HttpError)
    return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof Error && error.name === "ZodError")
    return Response.json(
      { error: "Revisa los datos de la solicitud." },
      { status: 400 },
    );
  console.error(
    "request_failed",
    error instanceof Error ? error.name : "unknown",
  );
  return Response.json(
    { error: "No pudimos completar la solicitud. Vuelve a intentarlo." },
    { status: 500 },
  );
}
