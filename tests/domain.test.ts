import test from "node:test";
import assert from "node:assert/strict";
import { metrics, proposalInput, sameOrigin, taskInput } from "../lib/domain";
import { demo } from "../lib/demo";
test("métricas excluyen finalizadas vencidas y vencimiento hoy", () => {
  const m = metrics(demo.tasks, "2026-10-19");
  assert.deepEqual(m, { total: 6, active: 5, overdue: 1, done: 1 });
  assert.equal(
    metrics([{ ...demo.tasks[0], due_date: "2026-10-19" }], "2026-10-19")
      .overdue,
    0,
  );
});
test("rechaza fechas inexistentes y claves de privilegios", () => {
  const { id, version, ...task } = demo.tasks[0];
  void id;
  void version;
  const clean = {
    ...task,
    area_id: null,
    project_id: null,
    business_line_id: null,
    requester_id: null,
    assignee_ids: [],
  };
  assert.equal(taskInput.safeParse(clean).success, true);
  assert.equal(
    taskInput.safeParse({ ...clean, due_date: "2026-02-30" }).success,
    false,
  );
  assert.equal(taskInput.safeParse({ ...clean, role: "admin" }).success, false);
  assert.equal(
    proposalInput.safeParse({ kind: "delete", task: clean }).success,
    false,
  );
});
test("exige mismo origen configurado", () => {
  assert.equal(
    sameOrigin("https://planner.example", "https://planner.example"),
    true,
  );
  for (const origin of [
    null,
    "https://evil.example",
    "https://planner.example.evil",
  ])
    assert.equal(sameOrigin(origin, "https://planner.example"), false);
  assert.equal(sameOrigin("https://planner.example", undefined), false);
});
