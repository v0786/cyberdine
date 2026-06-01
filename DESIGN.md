
# CYBERDINE System Design Document

## Table of Contents
1. Project Overview
2. Design System
3. Phase Planning
4. Architecture
5. Database Schema
6. UI/UX Guidelines
7. Development Workflow
8. Deployment Checklist

---

## 1. Project Overview

### Vision
CYBERDINE is a modern SaaS platform for time‑based entertainment centers (gaming, movies, internet) and restaurant management.
It offers seamless booking, order management, and customer experience tracking.

### Core Values
- **Time is Malleable**: Flexible time‑based booking & session management.
- **Modern & Sleek**: Dark theme with premium gold/yellow accents, fully responsive.
- **Secure & Compliant**: Encrypted data, audit logging, role‑based access.

---

## 2. Design System

### 2.1 Colors

#### Primary Colors
| Name | Hex | Usage |
|------|-----|-------|
| CYBERDINE Gold | `#f59e0b` / `#fbbf24` | CTAs, highlights, logo |
| Dark Background | `#0a0a0a` / `#111827` | Body, cards |
| Light Accent | `#1f2937` / `#374151` | Borders, inputs |
| Text Light | `#f9fafb` | Headings, body text |
| Text Muted | `#9ca3af` | Secondary text |
| Success | `#10b981` | Status indicators |
| Warning | `#f59e0b` | Alerts |
| Error | `#ef4444` | Errors, invalid inputs |

### 2.2 Typography
- **Headings**: Bold, large (2xl‑6xl), tracking‑tight, using system sans‑serif (Inter‑like).
- **Body**: Clean, legible (14‑16px).
- **Mono**: For time/price, using `font-mono`.

### 2.3 Components (ShadCN Based)
- **Button**: Rounded‑md, primary = gold on black, ghost = transparent border.
- **Card**: Dark background, light border, rounded‑lg, subtle shadow.
- **Input/Select**: Dark background, light border, focus with gold outline.
- **Tabs**: Inline, active tab highlighted with gold background.

---

## 3. Phase Planning

### Phase 1: Authentication & Landing Page ✅
- ✅ Landing page with age verification
- ✅ Staff login with social providers (Google, GitHub, Apple, Microsoft)
- ✅ Customer multi‑step verification (DOB → name → password/OTP)
- ✅ Responsive layout

### Phase 2: Dashboard Skeleton (WIP)
- ✅ Sidebar navigation with collapsible menu
- ✅ Top bar with user profile & logout
- ✅ Basic dashboard layout with grid for stats

### Phase 3: Menu Management
- **Features**:
  - Create/Edit/Delete menu categories
  - Menu item CRUD (name, desc, price, image, availability)
  - Drag‑and‑drop reordering
  - Search & filter

### Phase 4: Inventory Management
- **Features**:
  - Stock level tracking
  - Low‑stock alerts
  - Inventory history
  - Supplier management

### Phase 5: Order System
- **Features**:
  - Point‑of‑sale (POS) interface
  - Order status flow: pending → preparing → ready → served
  - Kitchen display view
  - Order history
  - Payment integration (Stripe/PayPal)

### Phase 6: Table Booking & Board Games
- **Features**:
  - Interactive calendar for reservations
  - Time‑slot management (15‑min increments)
  - Board game library (add/remove, track availability)
  - Combine session booking + game rental

### Phase 7: Reports & Analytics
- **Features**:
  - Revenue dashboards (daily, weekly, monthly)
  - Session duration stats
  - Menu item popularity charts
  - Customer visit history
  - Export to CSV/PDF

### Phase 8: Admin & Settings
- **Features**:
  - User management (create/edit/delete staff, assign roles)
  - Restaurant profile (business hours, pricing, contact info)
  - System settings (tax rates, notification preferences)
  - Audit log viewer

### Phase 9: Build & Deploy
- **Steps**:
  - Production build optimization
  - Environment variables configuration
  - Deploy to Vercel/Netlify
  - Supabase production setup
  - CI/CD pipeline

---

## 4. Architecture

### 4.1 Front‑end
- **Framework**: Next.js 15 (App Router, RSC for static content, client components for interactivity)
- **State**: Zustand for global auth/state, React Query for server data
- **Styling**: Tailwind CSS + ShadCN components
- **Realtime**: Supabase Realtime subscriptions

### 4.2 Back‑end
- **Database**: Supabase PostgreSQL
- **Auth**: Supabase Auth (email/password + social providers)
- **Edge Functions**: (Optional, for OTP, payments, complex logic)

### 4.3 Folder Structure
```
CYBERDINE-Restuarent/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (landing)/
│   │   │   └── landing/
│   │   ├── (customer)/
│   │   │   ├── customer/
│   │   │   └── customer/dashboard/
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/
│   │   │   ├── dashboard/zones/
│   │   │   ├── dashboard/reservations/
│   │   │   ├── dashboard/menu/
│   │   │   ├── dashboard/inventory/
│   │   │   ├── dashboard/orders/
│   │   │   ├── dashboard/reports/
│   │   │   └── dashboard/settings/
│   │   ├── globals.css
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/
│   │   └── layout/
│   ├── lib/
│   │   ├── supabase/
│   │   └── utils.ts
│   ├── hooks/
│   ├── types/
│   └── stores/
├── supabase/
└── public/
```

---

## 5. Database Schema (Summary)

**Core Tables**:
- `roles` – admin, manager, staff
- `users` – staff users, linked to `auth.users`
- `customers` – customer data (dob, password_hash, etc.)
- `zones` – Gaming, Movie Pods, Internet
- `stations` – individual stations in each zone
- `reservations` – booking records
- `sessions` – active/historical usage sessions
- `menu_categories`/`menu_items` – food/drinks
- `orders`/`order_items` – customer orders
- `offers_promotions` – deals
- `audit_logs` – security audit trail
- `otps` – one‑time passwords

---

## 6. UI/UX Guidelines

### 6.1 Navigation
- **Staff Dashboard**: Collapsible sidebar with icons; active link highlighted with gold.
- **Customer Portal**: Tab‑based bottom nav (mobile) or top nav (desktop).

### 6.2 Feedback
- **Loading**: Skeletons for async content; button spinners.
- **Errors**: Red outlined alerts with clear message + retry button.
- **Success**: Green checkmark + toast notification.

### 6.3 Responsive Breakpoints
- Mobile: &lt;768px
- Tablet: 768–1024px
- Desktop: 1024px+

---

## 7. Development Workflow

### 7.1 Branching Strategy
- `main` – production‑ready code
- `develop` – integration branch
- `feature/phase‑N‑description` – feature branches

### 7.2 Commit Messages
Follow conventional commits:
- `feat: add menu item categories`
- `fix: resolve type error in dashboard stats`
- `docs: update DESIGN.md phase planning`

### 7.3 Testing
- **Unit**: Vitest for utility functions
- **E2E**: Playwright for user flows (login, booking, ordering)

---

## 8. Deployment Checklist

- [ ] Set production Supabase project
- [ ] Apply migration SQL to production DB
- [ ] Configure all auth providers (Google, GitHub, etc.) in Supabase
- [ ] Set environment variables (Vercel/Netlify)
- [ ] Enable Supabase Realtime on all required tables
- [ ] Run full E2E test suite against staging
- [ ] Deploy to production
- [ ] Set up custom domain
- [ ] Configure SSL (auto‑handled by Vercel/Netlify)
- [ ] Monitor error logs (Sentry/Datadog)

