import { useCallback, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  AccessExpired,
  guest,
  money,
  type Catalog,
  type Order,
  type Selection,
  type Totals,
  useQuery,
} from "./data";
import {
  Cart,
  cartTotals,
  ErrorNote,
  Lines,
  MenuPicker,
  StatusLabel,
  submit,
  TotalsView,
  useAction,
} from "./ui";

type GuestView = { orders: Order[]; bill: Totals };
export function Customer() {
  const { tableToken: qr = "" } = useParams();
  return <MenuPage key={qr} qr={qr} />;
}
function MenuPage({ qr }: { qr: string }) {
  const [token, setToken] = useState(
    () => sessionStorage.getItem("dining:" + qr) ?? "",
  );
  const [items, setItems] = useState<Selection[]>([]);
  const [tab, setTab] = useState<"menu" | "cart" | "orders">("menu");
  const [notice, setNotice] = useState("");
  const request = useRef(crypto.randomUUID());
  const save = (value: string) => {
    sessionStorage.setItem("dining:" + qr, value);
    setToken(value);
  };
  const forget = useCallback(() => {
    sessionStorage.removeItem("dining:" + qr);
    setToken("");
  }, [qr]);
  const loadMenu = useCallback(
    () => guest<Catalog & { table: string }>("menu", { qr }),
    [qr],
  );
  const menu = useQuery(loadMenu, undefined, 30000);
  const status = useCallback(async () => {
    if (!token) return null;
    try {
      return await guest<GuestView>("status", { token });
    } catch (e) {
      if (e instanceof AccessExpired) {
        forget();
        setNotice(e.message);
        return null;
      }
      throw e;
    }
  }, [token, forget]);
  const view = useQuery(status);
  const action = useAction(view.refresh);
  const catalog = menu.data;
  const update = (rows: Selection[]) => {
    request.current = crypto.randomUUID();
    setItems(rows);
  };
  if (!catalog)
    return (
      <main className="shell">
        <h1>Dine-in menu</h1>
        <ErrorNote>{menu.error}</ErrorNote>
        {menu.loading ? (
          <p>Loading menu…</p>
        ) : (
          <button onClick={menu.refresh}>Retry</button>
        )}
      </main>
    );
  const currency = catalog.restaurant.currency;
  const total = cartTotals(catalog, items);
  const orders = token ? (view.data?.orders ?? []) : [];
  return (
    <>
      <header className="hero">
        <div className="shell">
          <p className="eyebrow">{catalog.table}</p>
          <h1>{catalog.restaurant.name}</h1>
          <p>Browse the menu and tell your waiter when you’re ready.</p>
        </div>
      </header>
      <main className="shell guest">
        <nav className="tabs" aria-label="Menu navigation">
          {(["menu", "cart", "orders"] as const).map((x) => (
            <button
              className={tab === x ? "" : "secondary"}
              aria-pressed={tab === x}
              onClick={() => setTab(x)}
              key={x}
            >
              {x === "orders"
                ? "My orders"
                : x === "cart"
                  ? "Cart (" + items.length + ")"
                  : "Menu"}
            </button>
          ))}
        </nav>
        <ErrorNote>{action.error || view.error || menu.error}</ErrorNote>
        {notice && (
          <p role="status" className="notice">
            {notice}
          </p>
        )}
        {tab === "menu" && (
          <>
            <MenuPicker
              catalog={catalog}
              onAdd={(row) => update([...items, row])}
            />
            {items.length > 0 && (
              <div className="sticky-cart">
                <span>
                  {items.reduce((n, row) => n + row.quantity, 0)} items
                </span>
                <button onClick={() => setTab("cart")}>
                  View cart · {money(total.total, currency)}
                </button>
              </div>
            )}
          </>
        )}
        {tab === "cart" && (
          <section className="panel">
            <h2>Your cart</h2>
            <Cart catalog={catalog} items={items} set={update} />
            {items.length > 0 && (
              <>
                <TotalsView value={total} currency={currency} />
                <p>
                  Estimated total. Your waiter confirms every order at the
                  table.
                </p>
                <form
                  onSubmit={submit((data) => {
                    setNotice("");
                    void action.run(
                      async () => {
                        // Establish a credential before submitting so a lost response can be retried safely.
                        const pin = String(data.get("pin"));
                        const access =
                          token ||
                          (await guest<{ token: string }>("join", {
                            qr,
                            pin,
                          }).then((x) => {
                            save(x.token);
                            return x.token;
                          }));
                        return guest<{ token: string; order: string }>(
                          "submit",
                          {
                            qr,
                            pin,
                            token: access,
                            items,
                            request: request.current,
                          },
                        );
                      },
                      (result) => {
                        save(result.token);
                        update([]);
                        setNotice("Order sent to your waiter for approval.");
                        setTab("orders");
                      },
                    );
                  })}
                >
                  <label>
                    4-digit table PIN
                    <input
                      name="pin"
                      type="password"
                      required
                      pattern="[0-9]{4}"
                      inputMode="numeric"
                      maxLength={4}
                      autoComplete="off"
                    />
                  </label>
                  <button disabled={action.busy}>Send to waiter</button>
                </form>
              </>
            )}
          </section>
        )}
        {tab === "orders" && (
          <section className="stack">
            <h2>My orders</h2>
            {!token ? (
              <form
                className="panel"
                onSubmit={submit(
                  (data) =>
                    void action.run(
                      () =>
                        guest<{ token: string }>("join", {
                          qr,
                          pin: data.get("pin"),
                        }),
                      (r) => {
                        save(r.token);
                        setNotice("Table access confirmed.");
                      },
                    ),
                )}
              >
                <label>
                  4-digit table PIN
                  <input
                    name="pin"
                    type="password"
                    required
                    pattern="[0-9]{4}"
                    inputMode="numeric"
                    maxLength={4}
                  />
                </label>
                <button disabled={action.busy}>Confirm table access</button>
              </form>
            ) : (
              <>
                <div className="panel">
                  <h3>Table total</h3>
                  {view.data && (
                    <TotalsView value={view.data.bill} currency={currency} />
                  )}
                  <div className="actions">
                    {(["waiter", "bill"] as const).map((kind) => (
                      <button
                        key={kind}
                        disabled={action.busy}
                        className="secondary"
                        onClick={() =>
                          void action.run(
                            () => guest("request", { token, kind }),
                            () =>
                              setNotice(
                                kind === "bill"
                                  ? "Bill requested."
                                  : "Your waiter was notified.",
                              ),
                          )
                        }
                      >
                        {kind === "bill" ? "Request bill" : "Call waiter"}
                      </button>
                    ))}
                  </div>
                </div>
                {!orders.length && (
                  <p className="empty">
                    Your submitted orders will appear here.
                  </p>
                )}
                {orders.map((order) => (
                  <article className="panel" key={order.id}>
                    <div className="row">
                      <h3>
                        Order ·{" "}
                        {new Date(order.created_at).toLocaleTimeString(
                          "en-IN",
                          { hour: "2-digit", minute: "2-digit" },
                        )}
                      </h3>
                      <StatusLabel
                        value={
                          order.status === "pending"
                            ? "pending waiter approval"
                            : order.status
                        }
                      />
                    </div>
                    <Lines items={order.items} currency={currency} />
                    {order.reason && <p>{order.reason}</p>}
                    {order.status === "pending" &&
                      order.version !== order.confirmed && (
                        <button
                          disabled={action.busy}
                          onClick={() =>
                            void action.run(
                              () =>
                                guest("confirm", {
                                  token,
                                  id: order.id,
                                  version: order.version,
                                }),
                              () =>
                                setNotice(
                                  "Revision confirmed. Your waiter will approve it at the table.",
                                ),
                            )
                          }
                        >
                          Confirm revised order
                        </button>
                      )}
                    {order.tickets.map((t) => (
                      <div key={t.id} className="ticket-guest">
                        <strong>
                          {t.kind === "original" ? "Kitchen progress" : t.kind}
                        </strong>
                        {t.items.map((x) => (
                          <div className="row" key={x.line}>
                            {x.quantity} × {x.name}
                            <StatusLabel
                              value={
                                t.kind === "cancellation"
                                  ? "cancelled"
                                  : (t.states[x.line] ?? "new")
                              }
                            />
                          </div>
                        ))}
                      </div>
                    ))}
                  </article>
                ))}
              </>
            )}
          </section>
        )}
      </main>
    </>
  );
}
