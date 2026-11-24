import { Welcome } from "./welcome";
import { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { Admin } from "./admin";
import { Customer } from "./customer";
import { db, rpc, type Membership, useQuery } from "./data";
import { FloorPage, KDS } from "./server";
import { ErrorNote, submit, useAction } from "./ui";
import "./style.css";

function Login({ session }: { session: Session | null }) {
  const a = useAction(),
    navigate = useNavigate();
  if (session) return <Navigate to="/server" replace />;
  return (
    <main className="shell center">
      <section className="panel login">
        <Link to="/" className="brand">
          Restaurant QR
        </Link>
        <h1>Staff sign in</h1>
        <ErrorNote>
          {a.error ||
            (!db
              ? "Supabase connection is missing. Set the app environment variables."
              : "")}
        </ErrorNote>
        <form
          onSubmit={submit(
            (p) =>
              void a.run(
                async () => {
                  if (!db) return;
                  const { error } = await db.auth.signInWithPassword({
                    email: String(p.get("email")).trim(),
                    password: String(p.get("password")),
                  });
                  if (error) throw error;
                },
                () => navigate("/server"),
              ),
          )}
        >
          <label>
            Email
            <input name="email" type="email" required autoComplete="username" />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </label>
          <button disabled={a.busy || !db}>Sign in</button>
        </form>
      </section>
    </main>
  );
}
function StaffApp() {
  const location = useLocation();
  const [session, setSession] = useState<Session | null | undefined>(
    db ? undefined : null,
  );
  useEffect(() => {
    const subscription = db?.auth.onAuthStateChange((_, s) => setSession(s));
    return () => subscription?.data.subscription.unsubscribe();
  }, []);
  if (
    !["/login", "/admin", "/server"].includes(location.pathname) &&
    !location.pathname.startsWith("/server/")
  ) {
    return (
      <main className="shell">
        <h1>Page unavailable</h1>
        <Link to="/">Return home</Link>
      </main>
    );
  }
  if (session === undefined)
    return (
      <main className="shell">
        <p>Checking staff sign-in…</p>
      </main>
    );
  if (location.pathname === "/login") return <Login session={session} />;
  if (!session) return <Navigate to="/login" replace />;
  return <Workspace key={session.user.id} />;
}
function Workspace() {
  const load = useCallback(() => rpc<Membership[]>("staff", "memberships"), []);
  const q = useQuery(load, undefined, 15000);
  const [tenant, setTenant] = useState("");
  const location = useLocation(),
    signOut = useAction();
  const selected = q.data?.find((m) => m.id === tenant) ?? q.data?.[0];
  return (
    <>
      <header className="staff-header">
        <div className="shell row">
          <Link className="brand" to="/server">
            {selected?.name ?? "Restaurant QR"}
          </Link>
          <div className="actions">
            {(q.data?.length ?? 0) > 1 && (
              <select
                aria-label="Restaurant"
                value={selected?.id}
                onChange={(e) => setTenant(e.target.value)}
              >
                {q.data?.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            )}
            {selected && <span className="role">{selected.role}</span>}
            <button
              className="secondary"
              disabled={signOut.busy}
              onClick={() =>
                void signOut.run(async () => {
                  const error = (await db?.auth.signOut())?.error;
                  if (error) throw error;
                })
              }
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="shell workspace">
        <ErrorNote>{q.error || signOut.error}</ErrorNote>
        {q.loading && <p>Loading restaurant access…</p>}
        {!q.loading && !selected && (
          <p className="empty">
            This account has no active restaurant membership. Ask your manager
            to grant access.
          </p>
        )}
        {selected && (
          <div key={selected.id + selected.role}>
            <nav className="staff-nav" aria-label="Staff navigation">
              {selected.role !== "kitchen" && (
                <>
                  <NavLink end to="/server">
                    Floor
                  </NavLink>
                  <NavLink to="/server/approvals">Approvals</NavLink>
                  <NavLink to="/server/bills">Bills</NavLink>
                </>
              )}
              <NavLink to="/server/kds">KDS</NavLink>
              {selected.role === "manager" && (
                <NavLink to="/admin">Admin</NavLink>
              )}
            </nav>
            {selected.role === "kitchen" &&
            location.pathname !== "/server/kds" ? (
              <Navigate to="/server/kds" replace />
            ) : (
              <Routes>
                <Route
                  path="/server"
                  element={<FloorPage member={selected} mode="floor" />}
                />
                <Route
                  path="/server/tables/:id"
                  element={<FloorPage member={selected} mode="table" />}
                />
                <Route
                  path="/server/approvals"
                  element={<FloorPage member={selected} mode="approvals" />}
                />
                <Route path="/server/kds" element={<KDS member={selected} />} />
                <Route
                  path="/server/bills"
                  element={<FloorPage member={selected} mode="bills" />}
                />
                <Route path="/admin" element={<Admin member={selected} />} />
                <Route
                  path="*"
                  element={
                    <p className="empty">
                      Page unavailable. Choose a section above.
                    </p>
                  }
                />
              </Routes>
            )}
          </div>
        )}
      </main>
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Welcome />} />
      <Route path="/menu/:tableToken" element={<Customer />} />
      <Route path="/*" element={<StaffApp />} />
    </Routes>
  </BrowserRouter>,
);
if (import.meta.env.PROD && "serviceWorker" in navigator)
  window.addEventListener(
    "load",
    () => void navigator.serviceWorker.register("/sw.js").catch(() => {}),
  );
