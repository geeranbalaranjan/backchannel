# Backchannel

Live class chat — “Twitch chat for lectures.” Students join via QR, chat with a pseudonym, upvote and react. Instructors see real identities and can pin, hide, mute, and moderate.

## Tech stack

- **Next.js 14+** (App Router) + TypeScript
- **Tailwind** + shadcn-style UI (Button, Input, Card)
- **Supabase**: Auth (Google OAuth), Postgres, Realtime

## Local setup

1. **Clone and install**

   ```bash
   npm install
   ```

2. **Supabase project**

   - Create a project at [supabase.com](https://supabase.com).
   - In **Authentication → Providers**, enable **Google** and set Client ID / Secret (from Google Cloud Console).
   - In **Authentication → URL configuration**, set:
     - **Site URL**: `http://localhost:3000` (or your app URL).
     - **Redirect URLs**: `http://localhost:3000/auth/callback`, plus your production URL if needed.

3. **Env vars**

   Copy `.env.example` to `.env.local` and fill in:

   - `NEXT_PUBLIC_APP_URL` — e.g. `http://localhost:3000`
   - `NEXT_PUBLIC_SUPABASE_URL` — Project URL from Supabase dashboard
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon key from Supabase
   - `SUPABASE_SERVICE_ROLE_KEY` — service role key (Settings → API; **never** expose to client)

4. **Applying the schema**

   - Open **SQL Editor** in the Supabase dashboard.
   - Paste and run the contents of `supabase/schema.sql`.
   - If Realtime fails on `alter publication supabase_realtime add table ...`, enable Realtime for `messages`, `message_votes`, and `message_reactions` in **Database → Replication** (or skip and use polling for MVP).

5. **Run the app**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Env vars reference

| Variable | Where | Purpose |
|----------|--------|--------|
| `NEXT_PUBLIC_APP_URL` | Client + server | Base URL for join links and OAuth redirects |
| `NEXT_PUBLIC_SUPABASE_URL` | Client + server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + server | Supabase anon key (safe for browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** | Service role for session validation and identity; never expose to client |

## Main flows

1. **Instructor**: Sign in → Instructor dashboard → Create course → Start session → QR + join URL → Open teacher view.
2. **Student**: Scan QR (or open join URL with `?token=...`) → Sign in with Google → Choose pseudonym (once per course) → Chat overlay.
3. **Teacher view**: Same chat + reveal identity, Pin, Hide, Mute user, pinned-questions panel.

Security: Students never receive real identity fields; `join_secret` is only validated server-side with the service role. Identity is exposed only via the instructor-only `/api/identity` route.

## MVP checklist

- [ ] Instructor can create a course and start a session (QR + join URL).
- [ ] Student can open join URL, sign in with Google, set alias, and enter chat.
- [ ] Student sees only pseudonyms; no email/name in client or realtime payloads.
- [ ] Teacher view shows identity (name/email) per message and can Pin / Hide / Mute.
- [ ] Messages show relative timestamp (mm:ss since lecture start).
- [ ] Upvotes and reactions update in real time (Realtime or refresh).
- [ ] Lock session prevents new joins (validate returns error when `is_locked`).
- [ ] Pinned questions appear in a dedicated panel/section.

## Project structure

- `app/` — Routes: `/` (landing), `/login`, `/instructor`, `/instructor/courses/[courseId]`, `/instructor/courses/[courseId]/session`, `/join/[sessionId]`, `/onboarding/[sessionId]`, `/s/[sessionId]` (student chat), `/t/[sessionId]` (teacher view), `/auth/callback`, `/api/*`.
- `components/ui/` — Button, Input, Card.
- `lib/` — Supabase client (server + browser + middleware), auth helpers, alias validation, types.
- `supabase/schema.sql` — Tables, indexes, RLS policies; apply once in SQL Editor.
