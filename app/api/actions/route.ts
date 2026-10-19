import { z } from "zod";
import {
  body,
  checkOrigin,
  errorResponse,
  HttpError,
  requireUser,
} from "@/lib/auth";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const { supabase } = await requireUser(true);
    const { actionId } = z
      .object({ actionId: z.string().uuid() })
      .strict()
      .parse(await body(request));
    const { data, error } = await supabase.rpc("apply_action", {
      action_id: actionId,
    });
    if (error)
      throw new HttpError(
        409,
        "No se aplicó el cambio: la propuesta venció, contiene datos inválidos o la tarea cambió. Genera una propuesta nueva.",
      );
    return Response.json({ taskId: data });
  } catch (error) {
    return errorResponse(error);
  }
}
