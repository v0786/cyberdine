# CYBERDINE Setup Guide

## Prerequisites
1. Node.js 18+ installed on your system
2. A Supabase account (free tier available at [supabase.com](https://supabase.com))

---

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and click "Start your project"
2. Sign in with your GitHub account or create a new account
3. Click "New Project"
4. Fill in the details:
   - Name your project: `CYBERDINE`
   - Set a strong database password (save this password!)
   - Select a region closest to you
5. Click "Create new project" and wait for it to finish (takes about 2 minutes)

---

## Step 2: Set Up the Database Schema

### Option A: Use the SQL Editor (Recommended)
1. Once your project is ready, go to the **SQL Editor** in your Supabase dashboard
2. Click "New Query"
3. Copy and paste the SQL from `supabase/migrations/0001_initial_schema.sql`
4. Click "Run"

### Option B: Use Supabase Migrations (CLI)
1. Install the Supabase CLI:
   ```powershell
   # Windows (using Scoop)
   scoop install supabase

   # Or download from https://github.com/supabase/cli/releases
   ```
2. Login to Supabase:
   ```powershell
   supabase login
   ```
3. Link your project:
   ```powershell
   supabase link --project-ref YOUR_PROJECT_ID
   ```
4. Apply migrations:
   ```powershell
   supabase db push
   ```

---

## Step 3: Enable Supabase Auth Providers

### Email/Password Auth
1. In your Supabase dashboard, go to **Authentication > Providers**
2. Find "Email" and make sure it's **Enabled**

### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Go to **APIs & Services > Credentials**
4. Click "Create Credentials" > "OAuth client ID"
5. Select "Web application" as the application type
6. Add your Supabase URL to authorized JavaScript origins:
   ```
   https://YOUR_PROJECT_ID.supabase.co
   ```
7. Add authorized redirect URI:
   ```
   https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback
   ```
8. Click "Create" and copy the Client ID and Client Secret
9. Back in Supabase, go to **Authentication > Providers > Google**
10. Enable it and paste your Client ID and Client Secret
11. Click "Save"

### GitHub OAuth
1. Go to [GitHub Settings > Developer Settings > OAuth Apps](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in details:
   - Application name: `CYBERDINE`
   - Homepage URL: Your app URL or `http://localhost:3000` for development
   - Authorization callback URL: `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`
4. Click "Register application"
5. Click "Generate a new client secret" and copy both Client ID and Client Secret
6. Back in Supabase, go to **Authentication > Providers > GitHub**
7. Enable it and paste your Client ID and Client Secret
8. Click "Save"

### Apple OAuth (Requires Apple Developer Account)
1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Create an App ID with "Sign in with Apple" capability
3. Create a Services ID and configure the callback URL
4. Generate a private key
5. Back in Supabase, go to **Authentication > Providers > Apple**
6. Enable it and fill in the required details
7. Click "Save"

### Microsoft OAuth (Azure AD)
1. Go to [Azure Portal](https://portal.azure.com/)
2. Go to **Microsoft Entra ID > App registrations**
3. Click "New registration"
4. Fill in details:
   - Name: `CYBERDINE`
   - Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
   - Redirect URI: Web, `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`
5. Click "Register"
6. Copy the "Application (client) ID"
7. Go to "Certificates & secrets" > "New client secret"
8. Copy the client secret
9. Back in Supabase, go to **Authentication > Providers > Microsoft**
10. Enable it and paste your Client ID and Client Secret
11. Click "Save"

### Stream OAuth (Optional - requires Stream Chat account)
1. If you want to use Stream authentication (for chat features), you can set up a custom OAuth provider in Supabase
2. Note: Stream integration is optional for core features; skip if not needed

---

## Step 4: Configure Environment Variables

1. Copy `.env.local.example` to `.env.local`
2. In your Supabase dashboard, go to **Project Settings > API**
3. Copy the `Project URL` and `anon public` key
4. Update your `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
   ```

---

## Step 5: Install Dependencies and Run the App

1. Open a terminal in the project folder
2. Install dependencies:
   ```powershell
   npm install
   ```
3. Start the development server:
   ```powershell
   npm run dev
   ```
4. Open your browser and go to `http://localhost:3000`

---

## Step 6: Create an Admin User

1. Go to `http://localhost:3000/login`
2. Click "Don't have an account? Sign up"
3. Enter your email and password
4. After signing up, go back to your Supabase dashboard
5. Go to **Table Editor > public > users**
6. Click "Insert row" and create a new user linked to your auth user ID
7. Set the role to "admin"

---

## Step 7: Enable Supabase Realtime

1. In your Supabase dashboard, go to **Database > Replication**
2. Click "Realtime" and enable it for your tables:
   - `zones`
   - `stations`
   - `reservations`
   - `sessions`
   - `menu_items`
   - `orders`
3. Save changes

---

## Project Structure

```
CYBERDINE-Restuarent/
├── src/
│   ├── app/
│   │   ├── dashboard/
│   │   ├── landing/
│   │   ├── login/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/
│   │   └── SocialLoginButton.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   ├── auth-utils.ts
│   │   └── utils.ts
│   ├── types/
│   └── stores/
├── supabase/
└── package.json
```
