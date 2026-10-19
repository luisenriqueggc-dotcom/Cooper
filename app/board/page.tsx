import { redirect } from "next/navigation";
import { requireUser, HttpError } from "@/lib/auth";
import { configured } from "@/lib/supabase/server";
import { loadData } from "@/lib/data";
import { Workspace } from "@/components/workspace";
export const dynamic = "force-dynamic";
export default async function Page() {
  if (!configured()) redirect("/login");
  let canAdmin = false;
  try {
    const { profile } = await requireUser();
    canAdmin = profile.role === "admin";
  } catch (e) {
    if (e instanceof HttpError) redirect("/login");
    throw e;
  }
  return (
    <Workspace initial={await loadData()} admin={false} canAdmin={canAdmin} />
  );
}
