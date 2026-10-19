import { redirect } from "next/navigation";
import { requireUser, HttpError } from "@/lib/auth";
import { configured } from "@/lib/supabase/server";
import { loadData } from "@/lib/data";
import { Workspace } from "@/components/workspace";
export const dynamic = "force-dynamic";
export default async function Page() {
  if (!configured()) redirect("/login?next=chat");
  try {
    await requireUser(true);
  } catch (e) {
    if (e instanceof HttpError)
      redirect(e.status === 401 ? "/login?next=chat" : "/board");
    throw e;
  }
  return <Workspace initial={await loadData(true)} admin chatOnly />;
}
