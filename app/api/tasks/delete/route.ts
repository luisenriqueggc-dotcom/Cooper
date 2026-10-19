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
    const { taskId, expectedVersion } = z
      .object({
        taskId: z.string().uuid(),
        expectedVersion: z.number().int().positive(),
      })
      .strict()
      .parse(await body(request));
    const { data, error } = await supabase.rpc("delete_task", {
      task_id: taskId,
      expected_version: expectedVersion,
    });
    if (error) {
      if (error.code === "PGRST202")
        throw new HttpError(
          503,
          "Falta aplicar la actualización de eliminación en Supabase.",
        );
      throw new HttpError(
        409,
        "No se pudo eliminar: actualiza el tablero y vuelve a intentarlo.",
      );
    }
    return Response.json({ taskId: data });
  } catch (error) {
    return errorResponse(error);
  }
}
