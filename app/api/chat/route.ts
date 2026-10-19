import { z } from "zod";
import {
  body,
  checkOrigin,
  errorResponse,
  HttpError,
  requireUser,
} from "@/lib/auth";
import { runChat } from "@/lib/ai";
export const maxDuration = 120;
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const { supabase } = await requireUser(true);
    if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_MODEL)
      throw new HttpError(
        503,
        "La conexión de IA todavía no está configurada.",
      );
    const { message, sessionId } = z
      .object({
        message: z.string().trim().min(1).max(4000),
        sessionId: z.string().uuid().optional(),
      })
      .strict()
      .parse(await body(request));
    const quota = await supabase.rpc("consume_ai_quota");
    if (quota.error) throw quota.error;
    if (!quota.data)
      throw new HttpError(
        429,
        "Límite de 10 mensajes por minuto. Espera un momento.",
      );
    let id = sessionId;
    if (id) {
      const result = await supabase
        .from("chat_sessions")
        .select("id")
        .eq("id", id)
        .single();
      if (result.error) throw new HttpError(404, "Conversación no encontrada.");
    } else {
      const result = await supabase
        .from("chat_sessions")
        .insert({ title: message.slice(0, 100) })
        .select("id")
        .single();
      if (result.error) throw result.error;
      id = result.data.id;
    }
    return Response.json(await runChat(supabase, id!, message));
  } catch (error) {
    return errorResponse(error);
  }
}
