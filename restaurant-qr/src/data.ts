import { createClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const db = url && key ? createClient(url, key) : null;
export type Role = "waiter" | "kitchen" | "manager";
export type Membership = { id: string; name: string; role: Role };
export type Restaurant = {
  id: string;
  name: string;
  tax: number;
  currency: string;
  timezone: string;
  hours: number;
};
export type Category = { id: string; name: string; position: number };
export type Option = { name: string; delta: number };
export type Group = {
  name: string;
  min: number;
  max: number;
  options: Option[];
};
export type Dish = {
  id: string;
  category: string;
  name: string;
  description: string;
  image: string;
  station: string;
  diet: "veg" | "non-veg";
  price: number;
  revision: number;
  available: boolean;
  archived?: boolean;
  variants: Option[];
  groups: Group[];
};
export type Catalog = {
  restaurant: Restaurant;
  categories: Category[];
  menu: Dish[];
};
export type Selection = {
  id: string;
  revision: number;
  tax: number;
  quantity: number;
  notes: string;
  variant: string;
  choices: Record<string, string[]>;
};
export type Line = {
  line: string;
  name: string;
  unit: number;
  tax: number;
  quantity: number;
  station: string;
  notes: string;
  variant?: string;
  modifiers: Option[];
  selection: Selection;
};
export type Status = "new" | "preparing" | "ready" | "served";
export type Ticket = {
  id: string;
  number: number;
  table: string;
  kind: "original" | "addition" | "cancellation";
  created_at: string;
  reason?: string;
  acknowledged: boolean;
  items: Line[];
  states: Record<string, Status>;
};
export type Order = {
  id: string;
  version: number;
  confirmed: number;
  status: "pending" | "approved" | "rejected";
  items: Line[];
  created_at: string;
  reason?: string;
  tickets: Ticket[];
};
export type Totals = {
  subtotal: number;
  tax: number;
  discount: number;
  rounding: number;
  total: number;
};
export type Bill = {
  session_id: string;
  lines: Line[];
  totals: Totals;
  method?: string;
  paid_at?: string;
  finalized_at: string;
};
export type Visit = {
  id: string;
  guests: number;
  waiter: string;
  opened_at: string;
  expires: string;
  status: "active" | "billing";
};
export type Request = { id: string; kind: "waiter" | "bill" };
export type Table = {
  id: string;
  label: string;
  capacity: number;
  assigned?: string;
  session?: Visit;
  orders: Order[];
  requests: Request[];
  bill?: Bill;
  totals: Totals;
};
export type Floor = Catalog & { tables: Table[] };
export type Profile = {
  user_id: string;
  email: string;
  role: Role;
  active: boolean;
};
export type AdminData = Catalog & {
  archived?: Dish[];
  tables: (Pick<Table, "id" | "label" | "capacity"> & {
    active: boolean;
    has_qr: boolean;
    waiter?: string;
  })[];
  staff: Profile[];
};
export const money = (n: number, currency = "INR") =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(
    n / 100,
  );
export const age = (since: string) =>
  Math.max(0, Math.floor((Date.now() - Date.parse(since)) / 60000)) + " min";
export function unit(dish: Dish, row: Selection) {
  return (
    dish.price +
    (dish.variants.find((x) => x.name === row.variant)?.delta ?? 0) +
    dish.groups.reduce(
      (sum, g) =>
        sum +
        g.options
          .filter((o) => row.choices[g.name]?.includes(o.name))
          .reduce((n, o) => n + o.delta, 0),
      0,
    )
  );
}
export class AccessExpired extends Error {}
class AccessDenied extends Error {}
export async function rpc<T>(
  scope: "customer" | "staff",
  action: string,
  payload: object = {},
): Promise<T> {
  if (!db) throw new Error("Connect a Supabase project to use Restaurant QR.");
  const { data, error } = await db.rpc("dining_" + scope, { action, payload });
  if (error?.code === "42501") throw new AccessDenied(error.message);
  if (error)
    throw new Error(
      error.code === "22P02" ? "Check the submitted values." : error.message,
    );
  if (data?.expired) throw new AccessExpired(data.error);
  if (data?.error) throw new Error(data.error);
  return data;
}
export const guest = <T>(a: string, p: object) => rpc<T>("customer", a, p);
export function useQuery<T>(
  load: () => Promise<T>,
  tenant?: string,
  period = 5000,
) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [version, reload] = useState(0);
  const refresh = useCallback(() => reload((x) => x + 1), []);
  useEffect(() => {
    let active = true,
      sequence = 0;
    const update = async () => {
      const current = ++sequence;
      try {
        const value = await load();
        if (active && current === sequence) {
          setData(value);
          setError("");
        }
      } catch (e) {
        if (active && current === sequence) {
          setError(message(e));
          if (e instanceof AccessDenied) setData(undefined);
        }
      } finally {
        if (active && current === sequence) setLoading(false);
      }
    };
    void update();
    const timer = window.setInterval(update, period);
    window.addEventListener("online", update);
    const client = db;
    const channel =
      tenant && client
        ? client
            .channel("dining-" + crypto.randomUUID())
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "dining_updates",
                filter: "restaurant_id=eq." + tenant,
              },
              update,
            )
            .subscribe((s) => {
              if (s === "SUBSCRIBED") void update();
            })
        : null;
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("online", update);
      if (channel && client) void client.removeChannel(channel);
    };
  }, [load, tenant, period, version]);
  return { data, error, loading, refresh };
}
export const message = (error: unknown) =>
  error instanceof Error ? error.message : "Request failed. Try again.";
