import { body, checkOrigin, errorResponse, requireUser } from "@/lib/auth";
import { proposalInput } from "@/lib/domain";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const { supabase } = await requireUser(true);
    const payload = proposalInput.parse(await body(request));
    const session = await supabase
      .from("chat_sessions")
      .insert({ title: "Edición manual" })
      .select("id")
      .single();
    if (session.error) throw session.error;
    const action = await supabase
      .from("ai_actions")
      .insert({ session_id: session.data.id, payload })
      .select("id")
      .single();
    if (action.error) throw action.error;
    const result = await supabase.rpc("apply_action", {
      action_id: action.data.id,
    });
    if (result.error) throw result.error;
    return Response.json({ taskId: result.data }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
