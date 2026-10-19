import "server-only";
import { taskInput, type Data, type Task } from "./domain";
import { requireUser } from "./auth";
export async function loadData(admin = false): Promise<Data> {
  const { supabase } = await requireUser(admin);
  const results = await Promise.all([
    supabase
      .from("tasks")
      .select("*,task_assignees(user_id)")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("areas").select("id,name"),
    supabase.from("business_lines").select("id,name"),
    supabase.from("projects").select("id,name"),
    supabase.from("profiles").select("id,display_name").eq("active", true),
  ]);
  if (results.some((r) => r.error))
    throw new Error("No se pudieron cargar los datos.");
  const [tasks, areas, lines, projects, people] = results;
  return {
    tasks: (tasks.data ?? []).map((t) => ({
      ...taskInput
        .strip()
        .parse({
          ...t,
          assignee_ids: (t.task_assignees ?? []).map(
            (a: { user_id: string }) => a.user_id,
          ),
        }),
      id: t.id,
      version: t.version,
    })) as Task[],
    areas: areas.data ?? [],
    business_lines: lines.data ?? [],
    projects: projects.data ?? [],
    people: (people.data ?? []).map((p) => ({
      id: p.id,
      name: p.display_name,
    })),
  };
}
