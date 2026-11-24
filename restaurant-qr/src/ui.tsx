import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  type Catalog,
  type Dish,
  type Line,
  type Selection,
  type Totals,
  money,
  unit,
  message,
} from "./data";

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="dialog"
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="row">
        <h2>{title}</h2>
        <button type="button" className="secondary" onClick={onClose}>
          Close
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function ErrorNote({ children }: { children?: ReactNode }) {
  return children ? (
    <p role="alert" className="notice error">
      {children}
    </p>
  ) : null;
}
export function useAction(refresh?: () => void) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function run<T>(task: () => Promise<T>, after?: (result: T) => void) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await task();
      after?.(result);
      refresh?.();
    } catch (e) {
      setError(message(e));
      refresh?.();
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, run };
}
export const submit =
  (cb: (data: FormData) => void) => (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    cb(new FormData(e.currentTarget));
  };
export function StatusLabel({ value }: { value: string }) {
  return (
    <span className={"status " + value}>{value.replaceAll("_", " ")}</span>
  );
}
export function TotalsView({
  value,
  currency,
}: {
  value: Totals;
  currency: string;
}) {
  return (
    <dl className="totals">
      {(
        [
          ["Subtotal", value.subtotal],
          ["Tax", value.tax],
          ["Discount", -value.discount],
          ["Rounding", value.rounding],
          ["Total", value.total],
        ] as const
      )
        .filter(([label, n]) => n !== 0 || label === "Total" || label === "Tax")
        .map(([label, n]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{money(n, currency)}</dd>
          </div>
        ))}
    </dl>
  );
}
export function Lines({
  items,
  currency,
}: {
  items: Line[];
  currency: string;
}) {
  return (
    <ul className="lines">
      {items.map((x, i) => (
        <li key={x.line + "-" + i}>
          <strong>
            {x.quantity} × {x.name}
          </strong>
          <span>{money(x.unit * x.quantity, currency)}</span>
          <small>
            {[x.variant, ...x.modifiers.map((m) => m.name), x.notes]
              .filter(Boolean)
              .join(" · ")}
          </small>
        </li>
      ))}
    </ul>
  );
}
function Configure({
  dish,
  row,
  tax,
  currency,
  onSave,
  onClose,
}: {
  dish: Dish;
  row?: Selection;
  tax: number;
  currency: string;
  onSave: (s: Selection) => void;
  onClose: () => void;
}) {
  const [value, set] = useState<Selection>(
    row ?? {
      id: dish.id,
      revision: dish.revision,
      tax,
      quantity: 1,
      notes: "",
      variant: dish.variants[0]?.name ?? "",
      choices: {},
    },
  );
  const valid = dish.groups.every((g) => {
    const n = value.choices[g.name]?.length ?? 0;
    return n >= g.min && n <= g.max;
  });
  return (
    <Modal title={dish.name} onClose={onClose}>
      <form
        onSubmit={submit(() =>
          onSave({ ...value, revision: dish.revision, tax }),
        )}
      >
        {dish.variants.length > 0 && (
          <label>
            Portion
            <select
              autoFocus
              value={value.variant}
              onChange={(e) => set({ ...value, variant: e.target.value })}
            >
              {dish.variants.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name} · {money(dish.price + v.delta, currency)}
                </option>
              ))}
            </select>
          </label>
        )}
        {dish.groups.map((g) => (
          <fieldset key={g.name}>
            <legend>
              {g.name} · choose {g.min} to {g.max}
            </legend>
            {g.options.map((o) => {
              const choices = value.choices[g.name] ?? [],
                checked = choices.includes(o.name);
              return (
                <label className="check" key={o.name}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      set({
                        ...value,
                        choices: {
                          ...value.choices,
                          [g.name]: checked
                            ? choices.filter((x) => x !== o.name)
                            : [...choices, o.name],
                        },
                      })
                    }
                  />
                  {o.name} +{money(o.delta, currency)}
                </label>
              );
            })}
          </fieldset>
        ))}
        <label>
          Quantity
          <input
            type="number"
            required
            min={1}
            max={20}
            value={value.quantity || ""}
            onChange={(e) =>
              set({ ...value, quantity: Number(e.target.value) })
            }
          />
        </label>
        <label>
          Cooking notes
          <textarea
            maxLength={250}
            value={value.notes}
            onChange={(e) => set({ ...value, notes: e.target.value })}
          />
        </label>
        <button disabled={!valid}>
          Save · {money(unit(dish, value) * value.quantity, currency)}
        </button>
      </form>
    </Modal>
  );
}
export function MenuPicker({
  catalog,
  onAdd,
}: {
  catalog: Catalog;
  onAdd: (row: Selection) => void;
}) {
  const [search, setSearch] = useState(""),
    [cat, setCat] = useState(""),
    [diet, setDiet] = useState(""),
    [selected, pick] = useState<Dish>();
  const currency = catalog.restaurant.currency;
  const matches = catalog.menu.filter(
    (x) =>
      (!cat || x.category === cat) &&
      (!diet || x.diet === diet) &&
      (x.name + " " + x.description)
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <div className="filters">
        <input
          aria-label="Search dishes"
          placeholder="Search the menu"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label="Dietary filter"
          value={diet}
          onChange={(e) => setDiet(e.target.value)}
        >
          <option value="">All diets</option>
          <option value="veg">Vegetarian</option>
          <option value="non-veg">Non-vegetarian</option>
        </select>
      </div>
      <div className="tabs" aria-label="Categories">
        {[{ id: "", name: "All dishes" }, ...catalog.categories].map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={cat === c.id}
            className={cat === c.id ? "" : "secondary"}
            onClick={() => setCat(c.id)}
          >
            {c.name}
          </button>
        ))}
      </div>
      <div className="menu-grid">
        {matches.map((x) => (
          <article className="panel dish" key={x.id}>
            {x.image ? (
              <img
                loading="lazy"
                src={x.image}
                alt=""
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="image-placeholder dish-image-placeholder">
                <span className="image-placeholder-mark" aria-hidden="true" />
                <span>{"{ DISH IMAGE }"}</span>
              </div>
            )}
            <div>
              <small className={x.diet}>
                {x.diet === "veg" ? "Vegetarian" : "Non-vegetarian"}
              </small>
              <h3>{x.name}</h3>
              <p>{x.description}</p>
              <div className="row">
                <strong>
                  {x.variants.length ? "From " : ""}
                  {money(
                    x.price +
                      Math.min(
                        ...(x.variants.length
                          ? x.variants.map((v) => v.delta)
                          : [0]),
                      ),
                    currency,
                  )}
                </strong>
                <button
                  type="button"
                  className="secondary"
                  disabled={!x.available}
                  onClick={() => pick(x)}
                >
                  {x.available ? "Add" : "Unavailable"}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {!matches.length && (
        <p className="empty">No dishes match your filters.</p>
      )}
      {selected && (
        <Configure
          dish={selected}
          tax={catalog.restaurant.tax}
          currency={currency}
          onClose={() => pick(undefined)}
          onSave={(row) => {
            onAdd(row);
            pick(undefined);
          }}
        />
      )}
    </>
  );
}
export function Cart({
  catalog,
  items,
  set,
}: {
  catalog: Catalog;
  items: Selection[];
  set: (x: Selection[]) => void;
}) {
  const [edit, setEdit] = useState<number>();
  const dish =
    edit === undefined
      ? undefined
      : catalog.menu.find((x) => x.id === items[edit]?.id);
  const update = (i: number, value: Selection) =>
    set(items.map((x, n) => (n === i ? value : x)));
  return (
    <>
      {items.length === 0 && (
        <p className="empty">Add dishes to start an order.</p>
      )}
      <ul className="lines">
        {items.map((item, i) => {
          const x = catalog.menu.find((d) => d.id === item.id);
          return (
            <li key={i}>
              <div>
                <strong>
                  {item.quantity} × {x?.name ?? "Unavailable dish"}
                </strong>
                <small>
                  {[
                    item.variant,
                    ...Object.values(item.choices).flat(),
                    item.notes,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </small>
              </div>
              <div className="actions">
                {x && (
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setEdit(i)}
                  >
                    Edit
                  </button>
                )}
                <button
                  type="button"
                  className="quiet"
                  onClick={() => set(items.filter((_, n) => n !== i))}
                >
                  Remove
                </button>
              </div>
              {(!x?.available ||
                x.revision !== item.revision ||
                item.tax !== catalog.restaurant.tax) && (
                <small>Menu changed. Review or remove this dish.</small>
              )}
            </li>
          );
        })}
      </ul>
      {edit !== undefined && dish && (
        <Configure
          dish={dish}
          row={items[edit]}
          tax={catalog.restaurant.tax}
          currency={catalog.restaurant.currency}
          onClose={() => setEdit(undefined)}
          onSave={(row) => {
            update(edit, row);
            setEdit(undefined);
          }}
        />
      )}
    </>
  );
}
export function cartTotals(catalog: Catalog, items: Selection[]): Totals {
  const subtotal = items.reduce((n, row) => {
    const d = catalog.menu.find((x) => x.id === row.id);
    return n + (d ? unit(d, row) * row.quantity : 0);
  }, 0);
  const tax = Math.round((subtotal * catalog.restaurant.tax) / 10000);
  return { subtotal, tax, total: subtotal + tax, rounding: 0, discount: 0 };
}
