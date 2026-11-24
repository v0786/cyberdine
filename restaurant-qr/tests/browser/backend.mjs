// Test transport only. Browser requests execute the real migrations and RPCs in PostgreSQL.
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readFile, readdir } from "node:fs/promises";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

const db = new PGlite({ extensions: { pgcrypto } });
await db.exec(`create role anon; create role authenticated; create schema auth;
 create table auth.users(id uuid primary key,email text);
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;`);
for (const name of (await readdir("supabase/migrations")).sort()) {
  await db.exec(await readFile("supabase/migrations/" + name, "utf8"));
}
await db.exec(await readFile("supabase/seed.sql", "utf8"));
const id = "11111111-1111-4111-8111-111111111111";
const people = new Map();
for (const role of ["manager", "waiter", "kitchen"]) {
  const email = role + "@example.test",
    uid = randomUUID();
  people.set(email, {
    id: uid,
    email,
    aud: "authenticated",
    role: "authenticated",
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
  });
  await db.query("insert into auth.users values($1,$2)", [uid, email]);
  await db.query("insert into dining.staff values($1,$2,$3)", [id, uid, role]);
}
let queue = Promise.resolve();
createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Content-Type", "application/json");
  const reply = (body, status = 200) => {
    res.statusCode = status;
    res.end(JSON.stringify(body));
  };
  if (req.method === "OPTIONS") return reply({});
  const path = new URL(req.url, "http://localhost").pathname;
  if (path === "/health") return reply({ ok: true });
  let raw = "";
  for await (const piece of req) raw += piece;
  const body = raw ? JSON.parse(raw) : {};
  if (path === "/auth/v1/token") {
    const user = people.get(body.email);
    if (!user || body.password !== "test-password")
      return reply({ message: "Invalid credentials" }, 400);
    const header = Buffer.from(
      JSON.stringify({ alg: "HS256", typ: "JWT" }),
    ).toString("base64url");
    const claims = Buffer.from(
      JSON.stringify({
        sub: user.id,
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).toString("base64url");
    return reply({
      user,
      access_token: header + "." + claims + ".test",
      refresh_token: "test",
      token_type: "bearer",
      expires_in: 3600,
    });
  }
  if (path === "/auth/v1/logout") return reply({});
  const scope = path.match(/^\/rest\/v1\/rpc\/dining_(staff|customer)$/)?.[1];
  if (!scope) return reply({ message: "Endpoint unavailable" }, 404);
  const token = req.headers.authorization?.split(" ")[1]?.split(".")[1];
  const uid = token ? JSON.parse(Buffer.from(token, "base64url")).sub : "";
  const operation = queue.then(async () => {
    try {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        uid,
      ]);
      await db.exec(uid ? "set role authenticated" : "set role anon");
      const result = await db.query(
        "select public.dining_" + scope + "($1,$2::jsonb) as result",
        [body.action, JSON.stringify(body.payload ?? {})],
      );
      reply(result.rows[0].result);
    } catch (error) {
      reply({ message: error.message, code: error.code }, 400);
    }
  });
  queue = operation.catch(() => {});
}).listen(4321, "127.0.0.1");
