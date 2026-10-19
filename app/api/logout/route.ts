import { db } from "@/lib/supabase/server";
import { checkOrigin, errorResponse } from "@/lib/auth";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const supabase = await db();
    await supabase.auth.signOut();
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
