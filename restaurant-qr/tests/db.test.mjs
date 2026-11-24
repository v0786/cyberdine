import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { test } from "node:test";

test("QR to settlement with role and tenant boundaries", async (t) => {
  const db = new PGlite({ extensions: { pgcrypto } });
  t.after(() => db.close());
  await db.exec(`create role anon; create role authenticated; create schema auth;
 create table auth.users(id uuid primary key,email text);
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;`);
  for (const f of (await readdir("supabase/migrations")).sort())
    await db.exec(await readFile("supabase/migrations/" + f, "utf8"));
  await db.exec(await readFile("supabase/seed.sql", "utf8"));
  const r = "11111111-1111-4111-8111-111111111111",
    manager = randomUUID(),
    waiter = randomUUID(),
    kitchen = randomUUID(),
    outsider = randomUUID();
  for (const [id, role] of [
    [manager, "manager"],
    [waiter, "waiter"],
    [kitchen, "kitchen"],
    [outsider, null],
  ]) {
    await db.query("insert into auth.users values($1,$2)", [
      id,
      id + "@example.test",
    ]);
    if (role)
      await db.query("insert into dining.staff values($1,$2,$3)", [
        r,
        id,
        role,
      ]);
  }
  const role = async (id) => {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      id || "",
    ]);
    await db.exec("set role " + (id ? "authenticated" : "anon"));
  };
  const rpc = async (type, action, data) =>
    (
      await db.query(
        "select public.dining_" + type + "($1,$2::jsonb) as result",
        [action, JSON.stringify(data)],
      )
    ).rows[0].result;
  const staff = (a, p = {}) => rpc("staff", a, { restaurant: r, ...p });
  const guest = (a, p = {}) => rpc("customer", a, p);
  await role(outsider);
  await assert.rejects(staff("floor"), /Staff access/);
  await role(manager);
  const admin = await staff("admin"),
    table = admin.tables[0],
    destination = admin.tables[1];
  const { qr } = await staff("qr", { id: table.id });
  const nextQr = (await staff("qr", { id: destination.id })).qr;
  await role(waiter);
  const { pin } = await staff("open", { id: table.id, guests: 2 });
  const session = (await staff("floor")).tables[0].session.id;
  await role(null);
  await assert.rejects(
    db.query("select * from dining.orders"),
    /permission denied/,
  );
  assert.match((await guest("menu", { qr: "invalid" })).error, /invalid/);
  const menu = await guest("menu", { qr });
  assert.equal(menu.table, table.label);
  const dish = menu.menu.find((x) => x.name === "Paneer Tikka");
  const items = [
    { id: dish.id, revision: dish.revision, tax: 500, quantity: 2 },
  ];
  const request = randomUUID();
  assert.match(
    (await guest("join", { qr, pin: pin === "0000" ? "1111" : "0000" })).error,
    /Incorrect/,
  );
  await assert.rejects(
    guest("submit", {
      qr,
      pin,
      request,
      items: [{ ...items[0], revision: 0 }],
    }),
    /Prices/,
  );
  const { token, order } = await guest("submit", { qr, pin, request, items });
  assert.equal(
    (await guest("submit", { qr, pin, request, items, token })).order,
    order,
  );
  await role(kitchen);
  assert.deepEqual(await staff("kds"), []);
  await assert.rejects(staff("floor"), /limited/);
  await role(waiter);
  await staff("edit", { session, id: order, version: 1, items });
  await assert.rejects(
    staff("approve", { session, id: order, version: 2, physical: true }),
    /diner/,
  );
  await role(null);
  await guest("confirm", { token, id: order, version: 2 });
  await role(waiter);
  await assert.rejects(
    staff("approve", { session, id: order, version: 2 }),
    /in person/,
  );
  await Promise.all([
    staff("approve", { session, id: order, version: 2, physical: true }),
    staff("approve", { session, id: order, version: 2, physical: true }),
  ]);
  let tickets = await staff("kds");
  assert.equal(tickets.length, 1);
  const ticket = tickets[0],
    line = ticket.items[0].line;
  await assert.rejects(
    staff("ticket", { id: ticket.id, line, step: "preparing" }),
    /transition/,
  );
  await role(kitchen);
  await staff("ticket", { id: ticket.id, line, step: "preparing" });
  await staff("ticket", { id: ticket.id, line, step: "ready" });
  await assert.rejects(
    staff("ticket", { id: ticket.id, line, step: "served" }),
    /transition/,
  );
  await role(waiter);
  await staff("ticket", { id: ticket.id, line, step: "served" });
  await assert.rejects(
    staff("amend", {
      session,
      id: order,
      version: 2,
      kind: "cancellation",
      line,
      quantity: 1,
      reason: "Pilot test",
    }),
    /Manager/,
  );
  await role(manager);
  await staff("amend", {
    session,
    id: order,
    version: 2,
    kind: "cancellation",
    line,
    quantity: 1,
    reason: "Pilot test",
  });
  await staff("amend", {
    session,
    id: order,
    version: 3,
    kind: "addition",
    items: [{ ...items[0], quantity: 1 }],
    physical: true,
    reason: "One more",
  });
  await staff("manual", {
    session,
    items: [{ ...items[0], quantity: 1 }],
    request: randomUUID(),
    physical: true,
  });
  const transfer = await staff("transfer", { session, id: destination.id });
  assert.equal((await staff("kds"))[0].table, destination.label);
  await role(null);
  assert.equal((await guest("status", { token })).expired, true);
  const later = await guest("submit", {
    qr: nextQr,
    pin: transfer.pin,
    request: randomUUID(),
    items,
  });
  await role(waiter);
  await staff("reject", {
    session,
    id: later.order,
    version: 1,
    reason: "No diner present",
  });
  await staff("finalize", { session });
  const bill = (await staff("floor")).tables[1].bill;
  assert.equal(bill.totals.total, 78435);
  await staff("settle", { session, method: "upi", physical: true });
  await staff("settle", { session, method: "upi", physical: true });
  await role(null);
  assert.equal((await guest("status", { token: later.token })).expired, true);
  await role(manager);
  await staff("revoke_qr", { id: table.id });
  assert.match((await guest("menu", { qr })).error, /revoked/);
  await t.test(
    "merge preserves original visit and invalidates both guest tokens",
    async () => {
      const source = admin.tables[2],
        target = admin.tables[7];
      const sourceQr = (await staff("qr", { id: source.id })).qr,
        targetQr = (await staff("qr", { id: target.id })).qr;
      const sourcePin = (await staff("open", { id: source.id, guests: 2 })).pin;
      const targetPin = (await staff("open", { id: target.id, guests: 2 })).pin;
      const current = (await staff("floor")).tables;
      const sourceSession = current.find((x) => x.id === source.id).session.id;
      const targetSession = current.find((x) => x.id === target.id).session.id;
      await role(null);
      const g1 = await guest("join", { qr: sourceQr, pin: sourcePin }),
        g2 = await guest("join", { qr: targetQr, pin: targetPin });
      await role(manager);
      await staff("manual", {
        session: sourceSession,
        items,
        request: randomUUID(),
        physical: true,
      });
      await staff("merge", {
        session: sourceSession,
        id: target.id,
        reason: "Join same party",
      });
      const merged = (await staff("floor")).tables.find(
        (x) => x.id === target.id,
      );
      assert.equal(merged.session.id, targetSession);
      assert.equal(merged.session.guests, 4);
      assert.equal(merged.orders[0].origin_session, sourceSession);
      assert.equal(merged.totals.total, 52290);
      await role(null);
      assert.equal((await guest("status", { token: g1.token })).expired, true);
      assert.equal((await guest("status", { token: g2.token })).expired, true);
      await role(manager);
    },
  );
  await t.test("wrong PIN attempts persist and PIN expires", async () => {
    const target = admin.tables[4],
      qr2 = (await staff("qr", { id: target.id })).qr;
    const pin2 = (await staff("open", { id: target.id, guests: 1 })).pin;
    const session2 = (await staff("floor")).tables.find(
      (x) => x.id === target.id,
    ).session.id;
    const wrong = pin2 === "0000" ? "1111" : "0000";
    await role(null);
    for (let i = 0; i < 8; i++)
      assert.match(
        (await guest("join", { qr: qr2, pin: wrong })).error,
        /Incorrect/,
      );
    assert.match(
      (await guest("join", { qr: qr2, pin: pin2 })).error,
      /Too many/,
    );
    await db.exec("reset role");
    await db.query(
      "update dining.sessions set expires=now()-interval '1 second' where id=$1",
      [session2],
    );
    await role(null);
    assert.match(
      (await guest("join", { qr: qr2, pin: pin2 })).error,
      /open this table/,
    );
    await role(manager);
  });
  await t.test(
    "tenant membership gates updates and admin actions",
    async () => {
      await db.exec("reset role");
      const other = (
        await db.query(
          "insert into dining.restaurant(name) values('Other kitchen') returning id",
        )
      ).rows[0].id;
      await db.query("insert into dining.staff values($1,$2,'manager')", [
        other,
        outsider,
      ]);
      await role(outsider);
      await assert.rejects(staff("admin"), /Staff access/);
      await assert.rejects(
        staff("revoke_qr", { id: destination.id }),
        /Staff access/,
      );
      assert.deepEqual(
        (await db.query("select restaurant_id from public.dining_updates"))
          .rows,
        [{ restaurant_id: other }],
      );
      await role(manager);
      assert.deepEqual(
        (await db.query("select restaurant_id from public.dining_updates"))
          .rows,
        [{ restaurant_id: r }],
      );
    },
  );
  await t.test(
    "combines modifiers and rounds integer tax after a discount",
    async () => {
      const variant = menu.menu.find((x) => x.name === "Chicken Biryani");
      const d = menu.menu.find((x) => x.name === "Dal Tadka");
      await db.exec("reset role");
      const quote = async (rows) =>
        (
          await db.query("select dining.quote($1,$2::jsonb) as quote", [
            r,
            JSON.stringify(rows),
          ])
        ).rows[0].quote;
      const mixed = [
        {
          id: variant.id,
          revision: 1,
          tax: 500,
          quantity: 1,
          variant: "Large",
        },
        {
          id: d.id,
          revision: 1,
          tax: 500,
          quantity: 1,
          choices: { Sides: ["Jeera rice"] },
        },
      ];
      const lines = await quote(mixed);
      assert.deepEqual(
        lines.map((l) => l.unit),
        [44900, 31800],
      );
      await assert.rejects(
        quote([
          mixed[0],
          { ...mixed[1], choices: { Sides: ["Jeera rice", "Jeera rice"] } },
        ]),
        /Check selections/,
      );
      const totals = (
        await db.query("select dining.totals($1::jsonb,2001) as totals", [
          JSON.stringify(lines),
        ])
      ).rows[0].totals;
      assert.deepEqual(totals, {
        subtotal: 76700,
        discount: 2001,
        tax: 3735,
        total: 78434,
        rounding: 0,
      });
      await role(manager);
    },
  );
  const report = await staff("history");
  assert.equal(report.sales[0].total, 78435);
});
