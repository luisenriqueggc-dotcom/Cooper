import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const admin = "00000000-0000-4000-8000-000000000001";
const viewer = "00000000-0000-4000-8000-000000000002";
const other = "00000000-0000-4000-8000-000000000003";
const task = {
  title: "Prueba de permisos",
  context: "Contexto compartido",
  status: "todo",
  priority: "normal",
  due_date: null,
  area_id: null,
  business_line_id: null,
  project_id: null,
  requester_id: admin,
  assignee_ids: [viewer],
};
test("migración, RLS, auditoría, atomicidad, versiones e idempotencia", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema public,auth,storage to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;
 grant select,insert,update,delete on storage.objects to authenticated;`);
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/202610190001_initial.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec(
      `insert into auth.users values('${admin}'),('${viewer}'),('${other}');insert into public.profiles(id,display_name,role,active) values('${admin}','Admin','admin',true),('${viewer}','Viewer','viewer',true),('${other}','Other','admin',true);`,
    );
    async function as(id: string) {
      await db.exec(
        `reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id}',false);`,
      );
    }
    async function count(table: string) {
      return Number(
        (await db.query<{ n: number }>(`select count(*) as n from ${table}`))
          .rows[0].n,
      );
    }
    await as(admin);
    const session = (
      await db.query<{ id: string }>(
        `insert into chat_sessions default values returning id`,
      )
    ).rows[0].id;
    async function propose(payload: unknown) {
      return (
        await db.query<{ id: string }>(
          "insert into ai_actions(session_id,payload) values($1,$2) returning id",
          [session, JSON.stringify(payload)],
        )
      ).rows[0].id;
    }
    async function apply(id: string) {
      return (
        await db.query<{ id: string }>("select apply_action($1) as id", [id])
      ).rows[0].id;
    }
    const action = await propose({ kind: "create", task });
    const id = await apply(action);
    assert.equal(await apply(action), id);
    assert.equal(await count("tasks"), 1);
    assert.equal(await count("task_history"), 2);
    const edit = await propose({
      kind: "update",
      task_id: id,
      expected_version: 1,
      task: { ...task, status: "done" },
    });
    await apply(edit);
    assert.equal(
      (await db.query<{ version: number }>("select version from tasks")).rows[0]
        .version,
      2,
    );
    const stale = await propose({
      kind: "update",
      task_id: id,
      expected_version: 1,
      task,
    });
    await assert.rejects(apply(stale), /changed/);
    const bad = await propose({
      kind: "create",
      task: { ...task, assignee_ids: ["00000000-0000-4000-8000-999999999999"] },
    });
    await assert.rejects(apply(bad), /Inactive/);
    assert.equal(await count("tasks"), 1);
    await db.exec("reset role;");
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/202610190002_task_deletion.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await as(admin);
    const pendingDeleteUpdate = await propose({
      kind: "update",
      task_id: id,
      expected_version: 2,
      task,
    });
    await assert.rejects(db.query("select delete_task($1,1)", [id]), /changed/);
    await as(viewer);
    await assert.rejects(
      db.query("select delete_task($1,2)", [id]),
      /Forbidden/,
    );
    await as(admin);
    const historyBefore = await count("task_history");
    await db.query("select delete_task($1,2)", [id]);
    await db.query("select delete_task($1,2)", [id]);
    assert.equal(await count("tasks"), 0);
    assert.equal(await count("task_assignees"), 0);
    assert.equal(await count("task_history"), historyBefore + 1);
    await assert.rejects(apply(pendingDeleteUpdate), /changed|deleted/);
    // Even a proposal crafted with the new version cannot update a deleted task.
    const deletedEdit = await propose({
      kind: "update",
      task_id: id,
      expected_version: 3,
      task,
    });
    await assert.rejects(apply(deletedEdit), /deleted/);
    await as(viewer);
    assert.equal(await count("tasks"), 0);
    await db.exec("reset role;");
    const deleted = await db.query<{ deleted_by: string; version: number }>(
      "select deleted_by,version from tasks where id=$1",
      [id],
    );
    assert.equal(deleted.rows[0].deleted_by, admin);
    assert.equal(deleted.rows[0].version, 3);
    // Operator recovery preserves task, assignments and audit records.
    await db.query(
      "update tasks set deleted_at=null,deleted_by=null,version=version+1 where id=$1",
      [id],
    );
    await as(admin);
    assert.equal(await count("tasks"), 1);
    assert.equal(await count("task_assignees"), 1);
    await db.exec(
      `insert into comments(task_id,body) values('${id}','Privado');insert into storage.objects(bucket_id,name) values('task-files','private.pdf');`,
    );
    for (let i = 0; i < 10; i++)
      assert.equal(
        (await db.query<{ ok: boolean }>("select consume_ai_quota() as ok"))
          .rows[0].ok,
        true,
      );
    assert.equal(
      (await db.query<{ ok: boolean }>("select consume_ai_quota() as ok"))
        .rows[0].ok,
      false,
    );
    await as(other);
    assert.equal(await count("chat_sessions"), 0);
    assert.equal(await count("ai_actions"), 0);
    await assert.rejects(apply(action), /not found/);
    await as(viewer);
    assert.equal(await count("tasks"), 1);
    assert.equal(await count("comments"), 0);
    assert.equal(await count("storage.objects"), 0);
    assert.equal(await count("task_history"), 0);
    assert.equal(await count("chat_sessions"), 0);
    await assert.rejects(
      db.exec("update profiles set role='admin'"),
      /permission/,
    );
    await assert.rejects(
      db.exec("update tasks set title='Hack'"),
      /permission/,
    );
    await assert.rejects(apply(action), /Forbidden/);
    await assert.rejects(db.exec("select consume_ai_quota()"), /Forbidden/);
    await db.exec(
      `reset role;update profiles set active=false where id='${viewer}';`,
    );
    await as(viewer);
    assert.equal(await count("tasks"), 0);
    await db.exec("reset role;set role anon;");
    await assert.rejects(db.exec("select * from tasks"), /permission/);
  } finally {
    await db.close();
  }
});
