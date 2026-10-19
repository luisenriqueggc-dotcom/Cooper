import { z } from "zod";
import { db } from "@/lib/supabase/server";
import { body, checkOrigin, errorResponse, HttpError } from "@/lib/auth";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const { email, password } = z
      .object({
        email: z.string().email(),
        password: z.string().min(1).max(200),
      })
      .strict()
      .parse(await body(request));
    const supabase = await db();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error)
      throw new HttpError(401, "No pudimos iniciar sesión con esos datos.");
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
