# Restaurant QR Ordering

A dine-in ordering app with three interfaces in one SPA. Customers use a permanent table QR and temporary four-digit PIN. A waiter confirms the order in person before the transaction that approves it and releases a kitchen ticket. Kitchen Display is part of the Server App. The seeded menu is fictional and the restaurant is named `{ RESTAURANT NAME }`.

## Stack

Node.js 22 for tooling, React, TypeScript, Vite and Tailwind CSS for the SPA, Supabase Auth/PostgreSQL/RLS/Realtime for the backend, and Vercel for hosting. PostgreSQL RPCs implement the backend. A separate always-on Node server is unnecessary for this MVP.

## Set up

1. Run `npm ci` with Node.js 22. Copy `.env.example` to `.env.local` and enter the dedicated Supabase project's URL and publishable key. The frontend never needs a secret or service-role key.
2. Apply the SQL files under `supabase/migrations` in filename order. With a linked Supabase CLI this is `supabase db push`. For a fictional demo only, also apply `supabase/seed.sql`. The seed creates ten tables and six dishes without creating users, PINs or permanent QR credentials.
3. Create or invite staff in Supabase Auth. Bootstrap the first manager using that Auth user's exact UUID in the SQL editor:

   ```sql
   insert into dining.staff (restaurant_id, user_id, role)
   values ('11111111-1111-4111-8111-111111111111', '<auth-user-uuid>'::uuid, 'manager');
   ```

   The UUID shown for the restaurant is the demo restaurant. For a fresh restaurant, first insert a named row in `dining.restaurant` and use its generated UUID. Managers can assign waiter, kitchen and manager access to existing Auth accounts in the Admin Panel. Configure Auth email delivery and set passwords if using invites. Disable public signup when using invitation-only staff provisioning.
4. Run `npm run dev`. Sign in as manager, open Admin → Tables & QR, generate a QR and print or download it. A QR is a bearer locator. For printing later, retain the downloaded image. Replacement and revocation invalidate the previously printed locator.
5. Open the table from the staff floor and give the guest the displayed PIN. The app only displays plaintext PINs on issuance. A refresh requires staff to rotate the PIN to display another code. Keep a waiter and kitchen sign-in available to test the handoff.

## Routes

| Path | Interface |
|---|---|
| `/menu/:tableToken` | Public menu, guest cart, orders and service requests |
| `/login` | Staff sign-in |
| `/server` | Staff floor and optional QR scanner |
| `/server/tables/:id` | Visit, PIN, manual order, amendments and table operations |
| `/server/approvals` | Pending customer orders |
| `/server/kds` | Kitchen and waiter ticket views |
| `/server/bills` | Bill finalization and manual payment recording |
| `/admin` | Menu, tables, QR, roles, settings and reports |

## Data and permissions

Business data lives in the private `dining` schema with RLS enabled and no client grants. Tenant foreign keys protect references. Definer RPCs have pinned search paths and explicit role grants. Staff identity comes from Supabase Auth, with the role and assignments checked against the database. PINs use a restaurant-specific HMAC; QR and guest credentials are stored as SHA-256 digests. Guest credentials expire after up to three hours and become invalid after PIN rotation, transfer, merge or checkout. Each guest order also requires a PIN. PIN attempts are capped per table session and requester. Guest status uses scoped polling. Staff subscribe to tenant-scoped change signals with periodic refetch, and KDS receives approved tickets only.

Menu configuration and immutable order/ticket lines use typed JSON option and pricing snapshots. An amendment is a separate ticket with quantity deltas. The running bill is derived from the sum of approved deltas. Finalization stores immutable financial lines and totals. Discount is fixed minor units for managers, allocated proportionally for tax calculation. Tax rounds to the nearest minor unit; no cash rounding is applied. Payment is recorded manually and an already settled bill cannot be recorded twice. Transfers preserve the active visit, while merging moves orders to a destination visit but keeps original visit references and audit events.

The PWA caches only versioned JS/CSS and icon assets. Credential-bearing requests and application data require a network connection. Vercel keeps the SPA routes available on page reload and sets browser security headers. The CSP permits Supabase's standard hostnames. Change its connect-src if using a custom Supabase hostname.

## Verification

- `npm run lint`
- `npm run typecheck`
- `npm test` runs isolated PostgreSQL tests using PGlite.
- `npx playwright install chromium` then `npm run test:browser`. Set `CHROMIUM_PATH` if using a provisioned Chromium. The browser suite uses real migrations and RPCs through a test-only HTTP/Auth adapter. It exercises mobile guest, waiter, kitchen and manager sessions. This adapter is never included in the SPA or deployed. A hosted Supabase smoke test is also required to verify GoTrue, PostgREST and Realtime.
- `npm run build`

## Deploy

Deploy to a new Vercel project using framework Vite, Node 22 and output directory `dist`. Set both `VITE_*` variables in the Vercel project and redeploy. Set the Supabase Auth site URL and allowed redirects to your intended Vercel host. Enable the Data API containing the public RPCs and ensure `public.dining_updates` is included in `supabase_realtime`. Open a table, scan the deployed QR, submit an order, verify KDS remains empty until waiter approval, move the ticket to served, then settle and check that the guest loses access. Test with the actual pilot phones, kitchen tablet and network before use.

The demo tax is 5% and needs owner confirmation. Branding, menu, images, seat counts, staff provisioning and tax/service charge rules should be set by the restaurant. Reports are basic. Direct printing uses the browser, and ticket printer integration and real payments are outside this MVP. This version records a single settled payment per bill and requires manager authority to cancel items already in preparation. The Admin Panel assigns memberships; email invitations are provisioned through Supabase Auth.

## Hosted demo

The demo uses the dedicated Supabase project `jzynfxigxjqxthknnyqh` and the Vercel project `restaurant-qr-demo`. The [public demo](https://restaurant-qr-demo-khaki.vercel.app/) uses the fictional seed. Provision the first manager in Supabase Auth and grant the membership as described above. The initial database migrations and Vercel environment variables have already been applied to those projects.

## Template branding

The landing page displays `{ RESTAURANT NAME }` and `{ RESTAURANT IMAGE }` until you set the optional `VITE_RESTAURANT_NAME` and `VITE_RESTAURANT_IMAGE_URL` variables and rebuild. Set the customer menu name under Admin → Settings and add each dish image in its menu editor. A dish without a configured photo displays `{ DISH IMAGE }`.
