import { z } from "zod";
export const statuses = [
  "backlog",
  "todo",
  "in_progress",
  "review",
  "done",
] as const;
export const labels: Record<string, string> = {
  backlog: "Backlog",
  todo: "Por hacer",
  in_progress: "En proceso",
  review: "En revisión",
  done: "Finalizadas",
};
export const taskInput = z
  .object({
    title: z.string().trim().min(3).max(180),
    context: z.string().max(12000),
    status: z.enum(statuses),
    priority: z.enum(["low", "normal", "high", "urgent"]),
    due_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine(
        (v) =>
          !isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v,
      )
      .nullable(),
    area_id: z.string().uuid().nullable(),
    business_line_id: z.string().uuid().nullable(),
    project_id: z.string().uuid().nullable(),
    requester_id: z.string().uuid().nullable(),
    assignee_ids: z.array(z.string().uuid()).max(20),
  })
  .strict();
export const proposalInput = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("create"), task: taskInput }).strict(),
  z
    .object({
      kind: z.literal("update"),
      task_id: z.string().uuid(),
      expected_version: z.number().int().positive(),
      task: taskInput,
    })
    .strict(),
]);
export type Task = z.infer<typeof taskInput> & {
  id: string;
  version: number;
  created_at?: string;
};
export type Catalog = { id: string; name: string };
export type Data = {
  tasks: Task[];
  areas: Catalog[];
  business_lines: Catalog[];
  projects: Catalog[];
  people: Catalog[];
};
export function todayMexico() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function metrics(tasks: Task[], today = todayMexico()) {
  return {
    total: tasks.length,
    active: tasks.filter((t) => t.status !== "done").length,
    overdue: tasks.filter(
      (t) => t.status !== "done" && t.due_date && t.due_date < today,
    ).length,
    done: tasks.filter((t) => t.status === "done").length,
  };
}
export function sameOrigin(
  origin: string | null,
  expected: string | undefined,
) {
  return Boolean(origin && expected && origin === new URL(expected).origin);
}
