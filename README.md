# CYBERDINE

Time is Malleable. Shape It Wisely.

A time-based entertainment and food service platform.

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, Shadcn UI, Zustand
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **Charts**: Recharts
- **Icons**: Lucide React

## Getting Started

### 1. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and paste the schema from `supabase/migrations/0001_initial_schema.sql`
3. Run the SQL to create tables and seed data

### 2. Configure Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Features

- ✅ Authentication
- ✅ Dashboard (realtime stats)
- ✅ Zone & Station management
- ✅ Session timer & billing
- 🚧 Reservations
- 🚧 Menu & Orders
- 🚧 Customer management
- 🚧 Reports

## Database Schema

- **users**: Admin/manager/staff users
- **customers**: Customer profiles with stats
- **zones**: Gaming, Movie Pods, Internet
- **stations**: Individual stations with status
- **sessions**: Active/completed sessions with time tracking
- **session_logs**: Pause/resume/end logs
- **reservations**: Booking system
- **menu_categories/menu_items**: Food & drinks
- **orders**: Order management
- **payments**: Payment records
