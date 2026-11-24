import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  age,
  money,
  rpc,
  type Floor,
  type Membership,
  type Order,
  type Selection,
  type Table,
  type Ticket,
  useQuery,
} from "./data";
import {
  Cart,
  ErrorNote,
  Lines,
  MenuPicker,
  StatusLabel,
  submit,
  TotalsView,
  useAction,
} from "./ui";

export type StaffRPC = <T = unknown>(a: string, p?: object) => Promise<T>;
export const staffRPC =
  (m: Membership): StaffRPC =>
  (a, p = {}) =>
    rpc("staff", a, { ...p, restaurant: m.id });

function Scanner({ onRead }: { onRead: (qr: string) => void }) {
  const id = useId().replaceAll(":", ""),
    [problem, setProblem] = useState("");
  const callback = useRef(onRead);
  useEffect(() => {
    callback.current = onRead;
  }, [onRead]);
  useEffect(() => {
    let cleanup = false,
      handled = false;
    let scanner: import("html5-qrcode").Html5Qrcode | undefined;
    const start = import("html5-qrcode")
      .then(async ({ Html5Qrcode }) => {
        if (cleanup) return;
        scanner = new Html5Qrcode(id);
        await scanner.start(
          { facingMode: "environment" },
          { fps: 8, qrbox: 200 },
          (result) => {
            if (cleanup || handled) return;
            try {
              const token = new URL(result).pathname.match(
                /^\/menu\/([a-f0-9]{48})\/?$/i,
              )?.[1];
              if (!token) {
                setProblem("Scan a restaurant table QR.");
                return;
              }
              handled = true;
              callback.current(token);
            } catch {
              setProblem("Scan a restaurant table QR.");
            }
          },
          () => {},
        );
      })
      .catch(() => {
        if (!cleanup)
          setProblem("Camera unavailable. Select a table manually below.");
      });
    return () => {
      cleanup = true;
      void start
        .then(async () => {
          if (scanner?.isScanning) await scanner.stop();
          scanner?.clear();
        })
        .catch(() => {});
    };
  }, [id]);
  return (
    <>
      <div id={id} />
      <ErrorNote>{problem}</ErrorNote>
    </>
  );
}

export function FloorPage({
  member,
  mode,
}: {
  member: Membership;
  mode: "floor" | "table" | "approvals" | "bills";
}) {
  const { id } = useParams(),
    navigate = useNavigate();
  const call = useCallback<StaffRPC>(
    (a, p = {}) => staffRPC(member)(a, p),
    [member],
  );
  const load = useCallback(() => call<Floor>("floor"), [call]);
  const q = useQuery(load, member.id);
  const action = useAction(q.refresh);
  const [scan, setScan] = useState(false);
  const [pin, showPin] = useState<{ id: string; code: string }>();
  const data = q.data;
  if (!data)
    return (
      <>
        <ErrorNote>{q.error}</ErrorNote>
        <p>{q.loading ? "Loading floor…" : "Floor unavailable."}</p>
        <button onClick={q.refresh}>Refresh</button>
      </>
    );
  const table = data.tables.find((x) => x.id === id);
  const currency = data.restaurant.currency;
  return (
    <>
      <ErrorNote>{q.error || action.error}</ErrorNote>
      {mode === "floor" && (
        <>
          <div className="row">
            <div>
              <h1>Dining floor</h1>
              <p>
                {data.tables.filter((x) => x.session).length} occupied of{" "}
                {data.tables.length} tables
              </p>
            </div>
            <button className="secondary" onClick={() => setScan(!scan)}>
              {scan ? "Close camera" : "Scan a table"}
            </button>
          </div>
          {scan && (
            <Scanner
              onRead={(qr) =>
                void action.run(
                  () => call<{ id: string }>("scan", { qr }),
                  (x) => {
                    setScan(false);
                    navigate("/server/tables/" + x.id);
                  },
                )
              }
            />
          )}
          <div className="floor">
            {data.tables.map((x) => (
              <Link
                className="panel table-card"
                to={"/server/tables/" + x.id}
                key={x.id}
              >
                <div className="row">
                  <strong>{x.label}</strong>
                  <StatusLabel
                    value={
                      x.requests.some((r) => r.kind === "bill")
                        ? "bill requested"
                        : (x.session?.status ?? "vacant")
                    }
                  />
                </div>
                <span>
                  {x.session
                    ? x.session.guests + " guests · " + age(x.session.opened_at)
                    : x.capacity + " seats"}
                </span>
                <span>
                  {x.orders.filter((o) => o.status === "pending").length}{" "}
                  pending · {money(x.totals.total, currency)}
                </span>
              </Link>
            ))}
          </div>
          {!data.tables.length && (
            <p className="empty">No tables in your assigned area.</p>
          )}
        </>
      )}
      {mode === "table" &&
        (table ? (
          <TableDetail
            key={table.id}
            table={table}
            floor={data}
            member={member}
            call={call}
            reload={q.refresh}
            pin={pin?.id === table.id ? pin.code : undefined}
            setPin={(id, code) => showPin({ id, code })}
          />
        ) : (
          <p className="empty">Table unavailable for this account.</p>
        ))}
      {mode === "approvals" && (
        <>
          <h1>Waiter approvals</h1>
          {data.tables.flatMap((x) =>
            x.orders
              .filter((o) => o.status === "pending")
              .map((o) => (
                <section className="panel" key={o.id}>
                  <Link to={"/server/tables/" + x.id}>{x.label}</Link>
                  <OrderCard
                    order={o}
                    table={x}
                    floor={data}
                    call={call}
                    reload={q.refresh}
                  />
                </section>
              )),
          )}
          {!data.tables.some((x) =>
            x.orders.some((o) => o.status === "pending"),
          ) && <p className="empty">No pending orders.</p>}
        </>
      )}
      {mode === "bills" && (
        <>
          <h1>Bills</h1>
          {data.tables
            .filter((x) => x.session)
            .map((x) => (
              <section className="panel" key={x.id}>
                <Link to={"/server/tables/" + x.id}>{x.label}</Link>
                <BillPanel
                  table={x}
                  currency={currency}
                  member={member}
                  call={call}
                  reload={q.refresh}
                />
              </section>
            ))}
          {!data.tables.some((x) => x.session) && (
            <p className="empty">No open tables.</p>
          )}
        </>
      )}
    </>
  );
}
function TableDetail({
  table,
  floor,
  member,
  call,
  reload,
  pin,
  setPin,
}: {
  table: Table;
  floor: Floor;
  member: Membership;
  call: StaffRPC;
  reload: () => void;
  pin?: string;
  setPin: (id: string, p: string) => void;
}) {
  const action = useAction(reload),
    navigate = useNavigate();
  const s = table.session,
    currency = floor.restaurant.currency;
  return (
    <div className="stack">
      <Link to="/server">← Dining floor</Link>
      <div className="row">
        <h1>{table.label}</h1>
        <StatusLabel value={s?.status ?? "vacant"} />
      </div>
      <ErrorNote>{action.error}</ErrorNote>
      {!s ? (
        <form
          className="panel"
          onSubmit={submit(
            (p) =>
              void action.run(
                () =>
                  call<{ pin: string }>("open", {
                    id: table.id,
                    guests: Number(p.get("guests")),
                  }),
                (x) => setPin(table.id, x.pin),
              ),
          )}
        >
          <label>
            Guests
            <input
              type="number"
              name="guests"
              min={1}
              max={table.capacity}
              defaultValue={2 > table.capacity ? 1 : 2}
              required
            />
          </label>
          <button disabled={action.busy}>Open table</button>
        </form>
      ) : (
        <>
          <section className="panel">
            <div className="row">
              <h2>{s.guests} guests</h2>
              <span>{age(s.opened_at)} since seating</span>
            </div>
            {s.status === "active" && (
              <>
                <p>
                  {pin ? (
                    <>
                      Table PIN <strong className="pin">{pin}</strong>
                    </>
                  ) : (
                    "Rotate the PIN to display a fresh code."
                  )}
                </p>
                <button
                  className="secondary"
                  disabled={action.busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Rotate the PIN and invalidate guest access?",
                      )
                    )
                      void action.run(
                        () =>
                          call<{ pin: string }>("rotate", { session: s.id }),
                        (x) => setPin(table.id, x.pin),
                      );
                  }}
                >
                  Rotate PIN
                </button>
              </>
            )}
          </section>
          {table.requests.length > 0 && (
            <section className="panel">
              <h2>Service requests</h2>
              {table.requests.map((r) => (
                <div className="row" key={r.id}>
                  <span>
                    {r.kind === "bill" ? "Bill requested" : "Waiter requested"}
                  </span>
                  <button
                    disabled={action.busy}
                    onClick={() =>
                      void action.run(() =>
                        call("resolve", { session: s.id, id: r.id }),
                      )
                    }
                  >
                    Mark handled
                  </button>
                </div>
              ))}
            </section>
          )}
          {s.status === "active" && (
            <Ordering
              floor={floor}
              label="Manual order"
              save={(items, request) =>
                call("manual", {
                  session: s.id,
                  physical: true,
                  items,
                  request,
                })
              }
              reload={reload}
            />
          )}
          <section className="panel">
            <h2>Order history</h2>
            {table.orders.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                table={table}
                floor={floor}
                call={call}
                reload={reload}
              />
            ))}
            {!table.orders.length && (
              <p className="empty">No orders for this visit.</p>
            )}
          </section>
          <section className="panel">
            <h2>Billing</h2>
            <BillPanel
              table={table}
              currency={currency}
              member={member}
              call={call}
              reload={reload}
            />
          </section>
          {s.status === "active" && (
            <details className="panel">
              <summary>Table operations</summary>
              <form
                onSubmit={submit((p) => {
                  if (
                    !window.confirm(
                      "Move this visit and invalidate current guest access?",
                    )
                  )
                    return;
                  const id = String(p.get("destination")),
                    act = String(p.get("operation"));
                  void action.run(
                    () =>
                      call<{ pin: string }>(act, {
                        session: s.id,
                        id,
                        reason: p.get("reason"),
                      }),
                    (x) => {
                      setPin(id, x.pin);
                      navigate("/server/tables/" + id);
                    },
                  );
                })}
              >
                <label>
                  Destination
                  <select name="destination" required defaultValue="">
                    <option value="" disabled>
                      Choose a table
                    </option>
                    {floor.tables
                      .filter((x) => x.id !== table.id)
                      .map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.label} ({x.session?.status ?? "vacant"})
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Operation
                  <select name="operation">
                    <option value="transfer">Transfer to vacant table</option>
                    {member.role === "manager" && (
                      <option value="merge">Merge into an active visit</option>
                    )}
                  </select>
                </label>
                <label>
                  Reason (required for merge)
                  <input name="reason" maxLength={250} />
                </label>
                <button disabled={action.busy}>Apply table change</button>
              </form>
              {member.role === "manager" &&
                !table.orders.some((o) => o.status !== "rejected") && (
                  <form
                    onSubmit={submit((p) => {
                      if (window.confirm("Close this visit?"))
                        void action.run(
                          () =>
                            call("close", {
                              session: s.id,
                              reason: p.get("reason"),
                            }),
                          () => setPin(table.id, ""),
                        );
                    })}
                  >
                    <label>
                      Reason for closing without a bill
                      <input name="reason" required maxLength={250} />
                    </label>
                    <button disabled={action.busy} className="danger">
                      Close visit
                    </button>
                  </form>
                )}
            </details>
          )}
        </>
      )}
    </div>
  );
}
function Ordering({
  floor,
  label,
  initial = [],
  save,
  reload,
  reason = false,
  physical = true,
}: {
  floor: Floor;
  label: string;
  initial?: Selection[];
  save: (items: Selection[], id: string, reason: string) => Promise<unknown>;
  reload: () => void;
  reason?: boolean;
  physical?: boolean;
}) {
  const [items, setItems] = useState(initial),
    [note, setNote] = useState(""),
    [check, setCheck] = useState(false),
    [success, setSuccess] = useState("");
  const [request, setRequest] = useState(() => crypto.randomUUID());
  const action = useAction(reload);
  const update = (rows: Selection[]) => {
    setItems(rows);
    setRequest(crypto.randomUUID());
    setSuccess("");
  };
  return (
    <details className="panel">
      <summary>{label}</summary>
      <ErrorNote>{action.error}</ErrorNote>
      {success && <p role="status">{success}</p>}
      <MenuPicker catalog={floor} onAdd={(row) => update([...items, row])} />
      <Cart catalog={floor} items={items} set={update} />
      {reason && (
        <label>
          Reason
          <input
            required
            maxLength={250}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
      )}
      {physical && (
        <label className="check">
          <input
            type="checkbox"
            checked={check}
            onChange={(e) => setCheck(e.target.checked)}
          />
          I confirmed this order with the diners in person
        </label>
      )}
      <button
        disabled={
          !items.length ||
          action.busy ||
          (physical && !check) ||
          (reason && !note.trim())
        }
        onClick={() =>
          void action.run(
            () => save(items, request, note),
            () => {
              update([]);
              setCheck(false);
              setNote("");
              setSuccess("Order saved.");
            },
          )
        }
      >
        {label}
      </button>
    </details>
  );
}
function OrderCard({
  order: o,
  table,
  floor,
  call,
  reload,
}: {
  order: Order;
  table: Table;
  floor: Floor;
  call: StaffRPC;
  reload: () => void;
}) {
  const action = useAction(reload),
    [confirmedVersion, setConfirmedVersion] = useState<number>();
  const session = table.session?.id,
    currency = floor.restaurant.currency;
  const run = (a: string, p: object = {}) =>
    call(a, { ...p, id: o.id, version: o.version, session });
  return (
    <article className="order">
      <div className="row">
        <strong>Order {o.id.slice(0, 8)}</strong>
        <StatusLabel value={o.status} />
      </div>
      <Lines items={o.items} currency={currency} />
      {o.reason && <p>{o.reason}</p>}
      <ErrorNote>{action.error}</ErrorNote>
      {o.status === "pending" && (
        <>
          <Ordering
            key={o.version}
            floor={floor}
            label="Save revised order"
            initial={o.items.map((x) => x.selection)}
            save={(items) => run("edit", { items })}
            reload={reload}
            physical={false}
          />
          {o.confirmed !== o.version ? (
            <p>Waiting for diner to confirm the revision.</p>
          ) : (
            <label className="check">
              <input
                type="checkbox"
                checked={confirmedVersion === o.version}
                onChange={(e) =>
                  setConfirmedVersion(e.target.checked ? o.version : undefined)
                }
              />
              I confirmed this order with the diners in person
            </label>
          )}
          <button
            disabled={
              action.busy ||
              confirmedVersion !== o.version ||
              o.confirmed !== o.version
            }
            onClick={() =>
              void action.run(
                () => run("approve", { physical: true }),
                () => setConfirmedVersion(undefined),
              )
            }
          >
            Approve and send to kitchen
          </button>
          <form
            className="compact"
            onSubmit={submit((p) => {
              if (window.confirm("Reject this order?"))
                void action.run(() =>
                  run("reject", { reason: p.get("reason") }),
                );
            })}
          >
            <label>
              Rejection reason
              <input name="reason" required maxLength={250} />
            </label>
            <button className="danger" disabled={action.busy}>
              Reject order
            </button>
          </form>
        </>
      )}
      {o.status === "approved" && (
        <>
          {o.tickets.map((t) => (
            <div key={t.id}>
              <p>
                KOT #{t.number} · {t.kind} {t.reason ? " · " + t.reason : ""}
              </p>
              {t.kind !== "original" && (
                <Lines items={t.items} currency={currency} />
              )}
            </div>
          ))}
          {table.session?.status === "active" && (
            <>
              <Ordering
                floor={floor}
                label="Send addition"
                save={(items, _, reason) =>
                  run("amend", {
                    kind: "addition",
                    items,
                    reason,
                    physical: true,
                  })
                }
                reason
                reload={reload}
              />
              <details>
                <summary>Cancel quantity</summary>
                <form
                  onSubmit={submit((p) => {
                    if (
                      window.confirm("Send this cancellation to the kitchen?")
                    )
                      void action.run(() =>
                        run("amend", {
                          kind: "cancellation",
                          line: p.get("line"),
                          quantity: Number(p.get("quantity")),
                          reason: p.get("reason"),
                        }),
                      );
                  })}
                >
                  <label>
                    Ticket item
                    <select name="line" required>
                      {o.tickets
                        .filter((t) => t.kind !== "cancellation")
                        .flatMap((t) =>
                          t.items.map((x) => (
                            <option key={x.line} value={x.line}>
                              #{t.number} · {x.name}
                            </option>
                          )),
                        )}
                    </select>
                  </label>
                  <label>
                    Quantity
                    <input
                      name="quantity"
                      type="number"
                      min={1}
                      max={20}
                      required
                    />
                  </label>
                  <label>
                    Reason
                    <input name="reason" maxLength={250} required />
                  </label>
                  <button className="danger" disabled={action.busy}>
                    Send cancellation
                  </button>
                </form>
              </details>
            </>
          )}
        </>
      )}
    </article>
  );
}
function BillPanel({
  table,
  currency,
  member,
  call,
  reload,
}: {
  table: Table;
  currency: string;
  member: Membership;
  call: StaffRPC;
  reload: () => void;
}) {
  const action = useAction(reload),
    session = table.session?.id,
    bill = table.bill;
  return (
    <>
      <ErrorNote>{action.error}</ErrorNote>
      {bill && <Lines items={bill.lines} currency={currency} />}
      <TotalsView value={bill?.totals ?? table.totals} currency={currency} />
      {bill ? (
        <form
          onSubmit={submit(
            (p) =>
              void action.run(() =>
                call("settle", {
                  session,
                  method: p.get("method"),
                  physical: p.has("received"),
                }),
              ),
          )}
        >
          <label>
            Payment method
            <select name="method">
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
            </select>
          </label>
          <label className="check">
            <input type="checkbox" name="received" required />
            Payment received outside this app
          </label>
          <button disabled={action.busy}>Record payment and close</button>
        </form>
      ) : (
        <form
          onSubmit={submit((p) => {
            if (window.confirm("Finalize the bill and stop further ordering?"))
              void action.run(() =>
                call("finalize", {
                  session,
                  discount: Math.round(Number(p.get("discount") || 0) * 100),
                }),
              );
          })}
        >
          {member.role === "manager" && (
            <label>
              Discount ({currency})
              <input
                name="discount"
                type="number"
                min={0}
                step="0.01"
                defaultValue={0}
              />
            </label>
          )}
          <button disabled={action.busy}>Finalize bill</button>
        </form>
      )}
    </>
  );
}
export function KDS({ member }: { member: Membership }) {
  const call = useCallback<StaffRPC>(
    (a, p = {}) => staffRPC(member)(a, p),
    [member],
  );
  const load = useCallback(() => call<Ticket[]>("kds"), [call]),
    q = useQuery(load, member.id),
    action = useAction(q.refresh);
  const [station, setStation] = useState("");
  const tickets = q.data ?? [];
  const cancelled = new Map<string, number>();
  for (const ticket of tickets) {
    if (ticket.kind !== "cancellation") continue;
    for (const line of ticket.items) {
      cancelled.set(line.line, (cancelled.get(line.line) ?? 0) - line.quantity);
    }
  }
  const stations = [
    ...new Set(tickets.flatMap((x) => x.items.map((l) => l.station))),
  ].sort();
  return (
    <>
      <div className="row">
        <div>
          <h1>Kitchen display</h1>
          <p>{member.role === "kitchen" ? "Kitchen mode" : "Service view"}</p>
        </div>
        <label>
          Station
          <select value={station} onChange={(e) => setStation(e.target.value)}>
            <option value="">All stations</option>
            {stations.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      <ErrorNote>{q.error || action.error}</ErrorNote>
      {q.loading && <p>Loading tickets…</p>}
      <div className="floor">
        {[...tickets]
          .sort((a, b) => a.table.localeCompare(b.table) || a.number - b.number)
          .filter((t) => !station || t.items.some((x) => x.station === station))
          .map((t) => {
            const states = t.items
              .filter((x) => x.quantity > (cancelled.get(x.line) ?? 0))
              .map((x) => t.states[x.line] ?? "new");
            const status =
              t.kind === "cancellation"
                ? "cancellation"
                : states.length === 0
                  ? "cancelled"
                  : states.every((x) => x === "served")
                    ? "served"
                    : states.every((x) => x === "ready" || x === "served")
                      ? "ready"
                      : states.some((x) => x !== "new")
                        ? "preparing"
                        : "new";
            return (
              <article className={"panel kot " + t.kind} key={t.id}>
                <div className="row">
                  <h2>
                    {t.table} · #{t.number}
                  </h2>
                  <StatusLabel
                    value={t.kind === "addition" ? "addition" : status}
                  />
                </div>
                <p>
                  {age(t.created_at)} ·{" "}
                  {new Date(t.created_at).toLocaleTimeString()}
                  {t.reason ? " · " + t.reason : ""}
                </p>
                {t.items
                  .filter((x) => !station || x.station === station)
                  .map((x) => {
                    const removed = cancelled.get(x.line) ?? 0;
                    const remaining = x.quantity - removed;
                    const isCancellation = t.kind === "cancellation";
                    const state = t.states[x.line] ?? "new";
                    const next =
                      state === "new"
                        ? "preparing"
                        : state === "preparing"
                          ? "ready"
                          : state === "ready"
                            ? "served"
                            : null;
                    const can =
                      next &&
                      (member.role === "manager" ||
                        (next === "served"
                          ? member.role === "waiter"
                          : member.role === "kitchen"));
                    return (
                      <div className="kot-line" key={x.line}>
                        <div className="row">
                          <strong>
                            {isCancellation ? Math.abs(x.quantity) : remaining}{" "}
                            × {x.name}
                          </strong>
                          <StatusLabel
                            value={
                              isCancellation || remaining === 0
                                ? "cancelled"
                                : state
                            }
                          />
                        </div>
                        <small>
                          {[
                            x.station,
                            x.variant,
                            ...x.modifiers.map((m) => m.name),
                            x.notes,
                            !isCancellation && removed > 0
                              ? removed + " cancelled"
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </small>
                        {!isCancellation && remaining > 0 && can && (
                          <button
                            className="secondary"
                            disabled={action.busy}
                            onClick={() =>
                              void action.run(() =>
                                call("ticket", {
                                  id: t.id,
                                  line: x.line,
                                  step: next,
                                }),
                              )
                            }
                          >
                            Mark {next}
                          </button>
                        )}
                      </div>
                    );
                  })}
                {t.kind !== "original" &&
                  (t.acknowledged ? (
                    <p>Acknowledged</p>
                  ) : (
                    member.role !== "waiter" && (
                      <button
                        disabled={action.busy}
                        onClick={() =>
                          void action.run(() =>
                            call("ticket", { id: t.id, step: "acknowledge" }),
                          )
                        }
                      >
                        Acknowledge {t.kind}
                      </button>
                    )
                  ))}
              </article>
            );
          })}
      </div>
      {!q.loading && !tickets.length && (
        <p className="empty">No approved tickets right now.</p>
      )}
    </>
  );
}
