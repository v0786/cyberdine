import { useCallback, useEffect, useState, type ReactNode } from "react";
import QRCode from "qrcode";
import {
  age,
  money,
  type AdminData,
  type Bill,
  type Category,
  type Dish,
  type Group,
  type Membership,
  type Option,
  type Profile,
  type Role,
  useQuery,
} from "./data";
import { staffRPC, type StaffRPC } from "./server";
import { ErrorNote, Modal, StatusLabel, submit, useAction } from "./ui";

function editorKey<T>(value: T) {
  return JSON.stringify(value);
}
const str = (p: FormData, k: string) => String(p.get(k) ?? "").trim();
const number = (p: FormData, k: string) => Number(p.get(k));
const minor = (p: FormData, k: string) => Math.round(number(p, k) * 100);
type AdminTab = "Menu" | "Tables & QR" | "Staff" | "Settings" | "Reports";
export function Admin({ member }: { member: Membership }) {
  const call = useCallback<StaffRPC>(
    (a, p = {}) => staffRPC(member)(a, p),
    [member],
  );
  const load = useCallback(() => call<AdminData>("admin"), [call]);
  const q = useQuery(load, member.id);
  const [tab, setTab] = useState<AdminTab>("Menu"),
    [archived, showArchived] = useState(false);
  const action = useAction(q.refresh);
  const [edit, setEdit] = useState<Dish>();
  const [adding, setAdding] = useState(false);
  const { data } = q;
  if (member.role !== "manager")
    return <ErrorNote>Manager access required.</ErrorNote>;
  if (!data)
    return (
      <>
        <h1>Restaurant admin</h1>
        <ErrorNote>{q.error}</ErrorNote>
        {q.loading ? (
          <p>Loading settings…</p>
        ) : (
          <button onClick={q.refresh}>Retry</button>
        )}
      </>
    );
  const currency = data.restaurant.currency;
  return (
    <>
      <h1>Restaurant admin</h1>
      <nav className="tabs" aria-label="Admin navigation">
        {(["Menu", "Tables & QR", "Staff", "Settings", "Reports"] as const).map(
          (t) => (
            <button
              className={tab === t ? "" : "secondary"}
              aria-pressed={tab === t}
              onClick={() => setTab(t)}
              key={t}
            >
              {t}
            </button>
          ),
        )}
      </nav>
      <ErrorNote>{q.error || action.error}</ErrorNote>
      {tab === "Menu" && (
        <div className="stack">
          <details className="panel">
            <summary>Categories</summary>
            <CategoryEditor call={call} reload={q.refresh} />
            {data.categories.map((c) => (
              <CategoryEditor
                key={editorKey(c)}
                value={c}
                call={call}
                reload={q.refresh}
              />
            ))}
          </details>
          <div className="row">
            <h2>Dishes</h2>
            <div className="actions">
              <button
                className="secondary"
                onClick={() => showArchived(!archived)}
              >
                {archived ? "Hide archived" : "Show archived"}
              </button>
              <button
                onClick={() => {
                  setEdit(undefined);
                  setAdding(true);
                }}
                disabled={!data.categories.length}
              >
                Add dish
              </button>
            </div>
          </div>
          {adding && (
            <DishEditor
              key={edit?.id ?? "new"}
              dish={edit}
              categories={data.categories}
              currency={currency}
              call={call}
              close={() => {
                setAdding(false);
                q.refresh();
              }}
            />
          )}
          <div className="floor">
            {[...data.menu, ...(archived ? (data.archived ?? []) : [])].map(
              (d) => (
                <article className="panel" key={d.id}>
                  <div className="row">
                    <h3>{d.name}</h3>
                    <StatusLabel
                      value={
                        (data.archived ?? []).some((x) => x.id === d.id)
                          ? "archived"
                          : d.available
                            ? "available"
                            : "unavailable"
                      }
                    />
                  </div>
                  <p>
                    {money(d.price, currency)} · {d.diet} · {d.station}
                  </p>
                  <div className="actions">
                    <button
                      className="secondary"
                      onClick={() => {
                        setEdit(d);
                        setAdding(true);
                      }}
                    >
                      Edit
                    </button>
                    {(data.archived ?? []).some((x) => x.id === d.id) ? (
                      <button
                        className="secondary"
                        disabled={action.busy}
                        onClick={() =>
                          void action.run(() =>
                            call("menu", {
                              id: d.id,
                              data: { ...d, archived: false },
                            }),
                          )
                        }
                      >
                        Restore
                      </button>
                    ) : (
                      <>
                        <button
                          className="secondary"
                          disabled={action.busy}
                          onClick={() =>
                            void action.run(() =>
                              call("menu", {
                                id: d.id,
                                data: { ...d, available: !d.available },
                              }),
                            )
                          }
                        >
                          {d.available ? "Mark unavailable" : "Mark available"}
                        </button>
                        <button
                          className="quiet"
                          disabled={action.busy}
                          onClick={() => {
                            if (window.confirm("Archive " + d.name + "?"))
                              void action.run(() =>
                                call("menu", {
                                  id: d.id,
                                  data: { ...d, archived: true },
                                }),
                              );
                          }}
                        >
                          Archive
                        </button>
                      </>
                    )}
                  </div>
                </article>
              ),
            )}
          </div>
        </div>
      )}
      {tab === "Tables & QR" && (
        <div className="stack">
          <details className="panel">
            <summary>Add a table</summary>
            <TableEditor data={data} call={call} reload={q.refresh} />
          </details>
          <div className="floor">
            {data.tables.map((t) => (
              <TableEditor
                key={t.id}
                table={t}
                data={data}
                call={call}
                reload={q.refresh}
              />
            ))}
          </div>
        </div>
      )}
      {tab === "Staff" && (
        <div className="stack">
          <p>
            Create or invite staff in Supabase Auth, then grant their restaurant
            role here.
          </p>
          <section className="panel">
            <h2>Add staff membership</h2>
            <StaffEditor call={call} reload={q.refresh} />
          </section>
          {data.staff.map((p) => (
            <section className="panel" key={editorKey(p)}>
              <h3>{p.email}</h3>
              <StaffEditor call={call} reload={q.refresh} profile={p} />
            </section>
          ))}
        </div>
      )}
      {tab === "Settings" && (
        <form
          className="panel stack"
          key={editorKey(data.restaurant)}
          onSubmit={submit(
            (p) =>
              void action.run(() =>
                call("settings", {
                  data: {
                    name: str(p, "name"),
                    tax: minor(p, "tax"),
                    hours: number(p, "hours"),
                    currency: str(p, "currency").toUpperCase(),
                    timezone: str(p, "timezone"),
                  },
                }),
              ),
          )}
        >
          <h2>Restaurant settings</h2>
          <p className="notice">
            The seeded rate is for demonstration. Confirm your applicable tax
            rules before use.
          </p>
          <label>
            Name
            <input
              name="name"
              required
              maxLength={100}
              defaultValue={data.restaurant.name}
            />
          </label>
          <label>
            Currency code
            <input
              name="currency"
              pattern="[A-Za-z]{3}"
              required
              defaultValue={data.restaurant.currency}
            />
          </label>
          <label>
            Restaurant time zone
            <input
              name="timezone"
              required
              defaultValue={data.restaurant.timezone}
            />
          </label>
          <label>
            Tax (%)
            <input
              name="tax"
              type="number"
              required
              min={0}
              max={100}
              step="0.01"
              defaultValue={data.restaurant.tax / 100}
            />
          </label>
          <label>
            Maximum PIN validity (hours)
            <input
              name="hours"
              type="number"
              required
              min={1}
              max={24}
              defaultValue={data.restaurant.hours}
            />
          </label>
          <button disabled={action.busy}>Save settings</button>
        </form>
      )}
      {tab === "Reports" && (
        <Reports call={call} member={member} currency={currency} />
      )}
    </>
  );
}
function CategoryEditor({
  value,
  call,
  reload,
}: {
  value?: Category;
  call: StaffRPC;
  reload: () => void;
}) {
  const a = useAction(reload);
  return (
    <form
      className="compact"
      onSubmit={submit(
        (p) =>
          void a.run(() =>
            call("category", {
              id: value?.id,
              data: { name: str(p, "name"), position: number(p, "position") },
            }),
          ),
      )}
    >
      <label>
        Category name
        <input name="name" required maxLength={80} defaultValue={value?.name} />
      </label>
      <label>
        Display order
        <input
          name="position"
          type="number"
          min={0}
          defaultValue={value?.position ?? 0}
        />
      </label>
      <button disabled={a.busy}>{value ? "Save" : "Add category"}</button>
      <ErrorNote>{a.error}</ErrorNote>
    </form>
  );
}
function OptionFields({
  options,
  change,
  label,
}: {
  options: Option[];
  change: (x: Option[]) => void;
  label: string;
}) {
  return (
    <div className="stack">
      {options.map((v, i) => (
        <div className="compact" key={i}>
          <label>
            Name
            <input
              required
              maxLength={80}
              value={v.name}
              onChange={(e) =>
                change(
                  options.map((o, n) =>
                    n === i ? { ...o, name: e.target.value } : o,
                  ),
                )
              }
            />
          </label>
          <label>
            Price increase
            <input
              type="number"
              required
              min={0}
              max={10000}
              step="0.01"
              value={v.delta / 100}
              onChange={(e) =>
                change(
                  options.map((o, n) =>
                    n === i
                      ? {
                          ...o,
                          delta: Math.round(Number(e.target.value) * 100),
                        }
                      : o,
                  ),
                )
              }
            />
          </label>
          <button
            className="quiet"
            type="button"
            onClick={() => change(options.filter((_, n) => n !== i))}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        className="secondary"
        type="button"
        disabled={options.length >= 20}
        onClick={() => change([...options, { name: "", delta: 0 }])}
      >
        {label}
      </button>
    </div>
  );
}
function DishEditor({
  dish,
  categories,
  currency,
  call,
  close,
}: {
  dish?: Dish;
  categories: Category[];
  currency: string;
  call: StaffRPC;
  close: () => void;
}) {
  const [variants, setVariants] = useState(dish?.variants ?? []),
    [groups, setGroups] = useState<Group[]>(dish?.groups ?? []);
  const a = useAction();
  const updateGroup = (i: number, change: Partial<Group>) =>
    setGroups(groups.map((g, n) => (n === i ? { ...g, ...change } : g)));
  return (
    <Modal title={dish ? "Edit dish" : "Add dish"} onClose={close}>
      <ErrorNote>{a.error}</ErrorNote>
      <form
        onSubmit={submit(
          (p) =>
            void a.run(
              () =>
                call("menu", {
                  id: dish?.id,
                  data: {
                    name: str(p, "name"),
                    description: str(p, "description"),
                    category: str(p, "category"),
                    diet: str(p, "diet"),
                    station: str(p, "station"),
                    price: minor(p, "price"),
                    image: str(p, "image"),
                    available: p.has("available"),
                    archived: dish?.archived ?? false,
                    variants,
                    groups,
                  },
                }),
              close,
            ),
        )}
      >
        <label>
          Dish name
          <input
            name="name"
            required
            maxLength={100}
            defaultValue={dish?.name}
          />
        </label>
        <label>
          Description
          <textarea
            name="description"
            maxLength={500}
            defaultValue={dish?.description}
          />
        </label>
        <label>
          Category
          <select name="category" defaultValue={dish?.category}>
            {categories.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Diet
          <select name="diet" defaultValue={dish?.diet}>
            <option value="veg">Vegetarian</option>
            <option value="non-veg">Non-vegetarian</option>
          </select>
        </label>
        <label>
          Station
          <input
            name="station"
            required
            maxLength={40}
            defaultValue={dish?.station ?? "Kitchen"}
          />
        </label>
        <label>
          Base price ({currency})
          <input
            name="price"
            type="number"
            min={0}
            max={100000}
            step="0.01"
            required
            defaultValue={dish ? dish.price / 100 : undefined}
          />
        </label>
        <label>
          Image URL
          <input name="image" maxLength={500} defaultValue={dish?.image} />
        </label>
        <label className="check">
          <input
            type="checkbox"
            name="available"
            defaultChecked={dish?.available ?? true}
          />
          Available to order
        </label>
        <fieldset>
          <legend>Variants</legend>
          <OptionFields
            options={variants}
            change={setVariants}
            label="Add variant"
          />
        </fieldset>
        <fieldset>
          <legend>Modifier groups</legend>
          {groups.map((g, i) => (
            <section className="subpanel" key={i}>
              <label>
                Group name
                <input
                  required
                  maxLength={80}
                  value={g.name}
                  onChange={(e) => updateGroup(i, { name: e.target.value })}
                />
              </label>
              <div className="compact">
                <label>
                  Minimum
                  <input
                    type="number"
                    required
                    min={0}
                    max={g.options.length}
                    value={g.min}
                    onChange={(e) =>
                      updateGroup(i, { min: Number(e.target.value) })
                    }
                  />
                </label>
                <label>
                  Maximum
                  <input
                    type="number"
                    required
                    min={g.min}
                    max={g.options.length}
                    value={g.max}
                    onChange={(e) =>
                      updateGroup(i, { max: Number(e.target.value) })
                    }
                  />
                </label>
              </div>
              <OptionFields
                options={g.options}
                change={(options) => updateGroup(i, { options })}
                label="Add modifier"
              />
              <button
                className="quiet"
                type="button"
                onClick={() => setGroups(groups.filter((_, n) => n !== i))}
              >
                Remove group
              </button>
            </section>
          ))}
          <button
            className="secondary"
            type="button"
            disabled={groups.length >= 10}
            onClick={() =>
              setGroups([...groups, { name: "", min: 0, max: 0, options: [] }])
            }
          >
            Add group
          </button>
        </fieldset>
        <button disabled={a.busy}>Save dish</button>
      </form>
    </Modal>
  );
}
function TableEditor({
  table,
  data,
  call,
  reload,
}: {
  table?: AdminData["tables"][number];
  data: AdminData;
  call: StaffRPC;
  reload: () => void;
}) {
  const a = useAction(reload),
    [url, setUrl] = useState(""),
    [img, setImg] = useState("");
  useEffect(() => {
    let live = true;
    if (url)
      void QRCode.toDataURL(url, { width: 320, margin: 3 }).then((x) => {
        if (live) setImg(x);
      });
    return () => {
      live = false;
    };
  }, [url]);
  return (
    <section className={table ? "panel" : ""}>
      {table && <h3>{table.label}</h3>}
      <form
        key={editorKey(table)}
        onSubmit={submit(
          (p) =>
            void a.run(() =>
              call("table", {
                id: table?.id,
                data: {
                  label: str(p, "label"),
                  capacity: number(p, "capacity"),
                  waiter: str(p, "waiter") || null,
                  active: p.has("active"),
                },
              }),
            ),
        )}
      >
        <label>
          Table label
          <input
            name="label"
            required
            maxLength={40}
            defaultValue={table?.label}
          />
        </label>
        <label>
          Seats
          <input
            name="capacity"
            type="number"
            min={1}
            max={100}
            defaultValue={table?.capacity ?? 4}
            required
          />
        </label>
        <label>
          Assigned waiter
          <select name="waiter" defaultValue={table?.waiter ?? ""}>
            <option value="">Anyone on duty</option>
            {data.staff
              .filter((s) => s.role === "waiter" && s.active)
              .map((s) => (
                <option key={s.user_id} value={s.user_id}>
                  {s.email}
                </option>
              ))}
          </select>
        </label>
        <label className="check">
          <input
            type="checkbox"
            name="active"
            defaultChecked={table?.active ?? true}
          />
          Active table
        </label>
        <button disabled={a.busy}>
          {table ? "Save table" : "Create table"}
        </button>
      </form>
      <ErrorNote>{a.error}</ErrorNote>
      {table && (
        <>
          <div className="actions">
            <button
              className="secondary"
              disabled={a.busy}
              onClick={() => {
                if (
                  !table.has_qr ||
                  window.confirm(
                    "This will invalidate the printed QR. Generate a replacement?",
                  )
                )
                  void a.run(
                    () => call<{ qr: string }>("qr", { id: table.id }),
                    (x) => {
                      setImg("");
                      setUrl(location.origin + "/menu/" + x.qr);
                    },
                  );
              }}
            >
              {table.has_qr ? "Replace QR" : "Generate QR"}
            </button>
            {table.has_qr && (
              <button
                className="danger"
                disabled={a.busy}
                onClick={() => {
                  if (window.confirm("Revoke this table QR?"))
                    void a.run(
                      () => call("revoke_qr", { id: table.id }),
                      () => {
                        setUrl("");
                        setImg("");
                      },
                    );
                }}
              >
                Revoke QR
              </button>
            )}
          </div>
          {url && img && (
            <div className="print-card">
              <h2>
                {data.restaurant.name} · {table.label}
              </h2>
              <img src={img} alt={"QR menu for " + table.label} />
              <p>Scan to open the menu</p>
              <div className="actions">
                <a href={url} target="_blank" rel="noreferrer">
                  Open menu
                </a>
                <a href={img} download={"menu-" + table.label + ".png"}>
                  Download QR
                </a>
                <button
                  className="secondary"
                  onClick={() => {
                    const printable = document.createElement("section");
                    printable.className = "print-only";
                    const heading = document.createElement("h1");
                    heading.textContent =
                      data.restaurant.name + " · " + table.label;
                    const code = document.createElement("img");
                    code.src = img;
                    code.alt = "Table QR";
                    printable.append(heading, code);
                    document.body.append(printable);
                    try {
                      window.print();
                    } finally {
                      printable.remove();
                    }
                  }}
                >
                  Print QR
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
function StaffEditor({
  profile,
  call,
  reload,
}: {
  profile?: Profile;
  call: StaffRPC;
  reload: () => void;
}) {
  const a = useAction(reload);
  return (
    <form
      className="compact"
      onSubmit={submit((p) => {
        if (
          !p.has("active") &&
          !window.confirm("Remove this staff member’s access?")
        )
          return;
        void a.run(() =>
          call("staff", {
            data: {
              email: str(p, "email"),
              role: str(p, "role") as Role,
              active: p.has("active"),
            },
          }),
        );
      })}
    >
      <label>
        Email
        <input
          type="email"
          required
          name="email"
          readOnly={!!profile}
          defaultValue={profile?.email}
        />
      </label>
      <label>
        Role
        <select name="role" defaultValue={profile?.role ?? "waiter"}>
          <option value="waiter">Waiter</option>
          <option value="kitchen">Kitchen</option>
          <option value="manager">Manager</option>
        </select>
      </label>
      <label className="check">
        <input
          name="active"
          type="checkbox"
          defaultChecked={profile?.active ?? true}
        />
        Active
      </label>
      <button disabled={a.busy}>Save access</button>
      <ErrorNote>{a.error}</ErrorNote>
    </form>
  );
}
type History = {
  sales: { date: string; total: number; bills: number }[];
  bills: Bill[];
  visits: {
    id: string;
    status: string;
    guests: number;
    opened_at: string;
    closed_at?: string;
  }[];
  items: { name: string; ordered: number; cancelled: number }[];
  timing: { id: string; created_at: string; approved_at: string }[];
  audit: {
    id: string;
    action: string;
    entity: string;
    created_at: string;
    actor: string;
    details: { reason?: string };
  }[];
};
function ReportTable({
  title,
  heads,
  rows,
}: {
  title: string;
  heads: string[];
  rows: ReactNode[][];
}) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {rows.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {heads.map((h) => (
                  <th key={h} scope="col">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  {r.map((d, j) => (
                    <td key={j}>{d}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="empty">No records yet.</p>
      )}
    </section>
  );
}
function Reports({
  call,
  member,
  currency,
}: {
  call: StaffRPC;
  member: Membership;
  currency: string;
}) {
  const load = useCallback(() => call<History>("history"), [call]),
    q = useQuery(load, member.id);
  const h = q.data;
  const date = (x: string) => new Date(x).toLocaleString("en-IN");
  const time = (a: string, b: string) =>
    Math.max(0, Math.round((Date.parse(b) - Date.parse(a)) / 60000)) + " min";
  return (
    <div className="stack">
      <ErrorNote>{q.error}</ErrorNote>
      {q.loading && <p>Loading reports…</p>}
      {h && (
        <>
          <ReportTable
            title="Daily sales"
            heads={["Date", "Paid bills", "Total"]}
            rows={h.sales.map((d) => [
              d.date,
              d.bills,
              money(d.total, currency),
            ])}
          />
          <ReportTable
            title="Recent bills"
            heads={["Finalized", "Total", "Payment"]}
            rows={h.bills.map((b) => [
              date(b.finalized_at),
              money(b.totals.total, currency),
              b.method ?? "Unpaid",
            ])}
          />
          <ReportTable
            title="Items · last 30 days"
            heads={["Dish", "Approved", "Cancelled"]}
            rows={h.items.map((x) => [x.name, x.ordered, x.cancelled])}
          />
          <ReportTable
            title="Table turnover"
            heads={["Opened", "Guests", "Status", "Duration"]}
            rows={h.visits.map((v) => [
              date(v.opened_at),
              v.guests,
              v.status,
              v.closed_at ? time(v.opened_at, v.closed_at) : age(v.opened_at),
            ])}
          />
          <ReportTable
            title="Approval times"
            heads={["Order", "Submitted", "Time to approval"]}
            rows={h.timing.map((o) => [
              o.id.slice(0, 8),
              date(o.created_at),
              time(o.created_at, o.approved_at),
            ])}
          />
          <ReportTable
            title="Audit log"
            heads={["When", "Action", "Actor", "Reason"]}
            rows={h.audit.map((e) => [
              date(e.created_at),
              e.action,
              e.actor?.slice(0, 8) ?? "Guest",
              e.details.reason ?? "",
            ])}
          />
        </>
      )}
    </div>
  );
}
