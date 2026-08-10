# Deploying Immo DZ to a Vercel Preview

Immo DZ is a Next.js 16 App Router application deployed on Vercel and backed
by Supabase. This guide prepares a non-production Preview deployment without a
Supabase service-role key.

## 1. Prerequisites

- Node.js 24.x and npm.
- A GitHub repository that does not contain real `.env` files or credentials.
- A Vercel project connected to that repository.
- The existing Supabase project with migrations `001` through `007` applied.
- A stable Vercel branch URL to use as the Preview's canonical public origin.

The `property-photos` bucket intentionally remains public for the current MVP.
Object writes remain restricted to authenticated property owners using the
strict path `{property-uuid}/{image-uuid}.{jpg|png|webp}`. A known raw object URL
is therefore public even when its parent property is a draft; a private-bucket
cutover remains a future production hardening item.

## 2. Supabase migrations

The current database must already contain these migrations, applied manually in
this exact order:

1. `supabase/001_schema_sync.sql`
2. `supabase/002_rpc_and_triggers.sql`
3. `supabase/003_rls_security.sql`
4. `supabase/004_storage_policies.sql`
5. `supabase/005_security_constraints_and_helpers.sql`
6. `supabase/006_rls_and_privileges_hardening.sql`
7. `supabase/007_storage_write_hardening.sql`

Do not reapply or edit these migrations for a Vercel deployment. No additional
database migration is required.

## 3. Required environment variables

Create `.env.local` only for local development. Configure all three variables
in Vercel under **Project > Settings > Environment Variables**, scoped to
**Preview**:

| Variable | Required value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The project's public anon/publishable key |
| `NEXT_PUBLIC_SITE_URL` | The exact stable HTTPS Preview origin, without a trailing slash |

`NEXT_PUBLIC_SITE_URL` is the single source of truth for metadata, canonical
URLs, Open Graph, Twitter cards, JSON-LD, sitemap, robots, sharing and QR codes.
It is mandatory outside local development. Because `NEXT_PUBLIC_*` values are
embedded during `next build`, redeploy after changing any of them.

Do not configure `SUPABASE_SERVICE_ROLE_KEY`, a database password, a JWT secret,
or any private key. The application uses the public Supabase key together with
the authenticated session, server-side ownership checks, RLS and Storage
policies.

## 4. GitHub preparation

Run the local verification and secret scan before creating a commit. Review the
complete staged summary before continuing:

```bash
npx tsc --noEmit
npm run lint
npm run build
git add -A
git status --short
git diff --cached --stat
git diff --cached --name-status
git ls-files ".env*" "*.pem" "*.key" "*.p12"
```

The staged set must include the complete `app`, `components`, `lib`, `public`
and `supabase` trees, `proxy.ts`, configuration files, lockfile and deployment
documentation. It must not include `.env`, `.env.local`, `.env.*.local`,
`.vercel`, `node_modules`, credentials, secret keys or temporary verification
scripts.

After the staged set is explicitly approved, create the commit and connect the
repository. Replace the placeholders with the approved branch and repository:

```bash
git switch -c vercel-preview
git commit -m "Prepare Immo DZ Vercel preview"
git remote add origin https://github.com/<owner>/<repository>.git
git push -u origin vercel-preview
```

If the branch or `origin` already exists, use it instead of recreating it.

## 5. Vercel project settings

Import the GitHub repository in Vercel and use these settings:

| Setting | Value |
| --- | --- |
| Framework Preset | Next.js |
| Root Directory | `.` |
| Node.js Version | `24.x` |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | Leave blank (Next.js default) |
| Development Command | `npm run dev` |
| Environment scope | Preview only |

The project has no `vercel.json` requirement. Vercel should detect the Next.js
App Router, Node Route Handler and root `proxy.ts` automatically.

### Establishing the stable Preview origin

A branch-specific Preview URL is stable while commit-specific URLs change. If
the branch URL is not known during the first import:

1. Use a syntactically valid temporary HTTPS origin for the bootstrap build.
2. Do not share or validate that bootstrap deployment.
3. Copy the stable branch-specific URL from the completed Vercel deployment.
4. Set `NEXT_PUBLIC_SITE_URL` to that exact origin without a trailing slash.
5. Redeploy the same commit and treat only the rebuilt deployment as the
   Preview candidate.

Do not add `NEXT_PUBLIC_VERCEL_URL` or construct absolute URLs from Vercel system
variables. `NEXT_PUBLIC_SITE_URL` remains the only public-origin variable.

## 6. Upload behavior on Vercel

Vercel Functions limit the complete request body to 4.5 MB. Immo DZ therefore
accepts at most **3.5 MiB per image** and rejects multipart requests above
**4 MiB**, leaving room for multipart/form-data overhead.

The authenticated `/api/upload` Route Handler remains on the Node.js runtime so
Sharp can decode and normalize JPG, PNG and WEBP files before uploading them to
Supabase Storage. The limit remains eight images per property. No service-role
or direct unauthenticated browser upload is used.

## 7. Supabase Auth URL configuration

Open **Supabase Dashboard > Authentication > URL Configuration**.

For a Preview-only Supabase project, configure:

```text
Site URL
https://<stable-preview-domain>.vercel.app

Redirect URLs
https://<stable-preview-domain>.vercel.app/auth/callback
https://<stable-preview-domain>.vercel.app/**
https://*-<team-or-account-slug>.vercel.app/**
http://localhost:3000/auth/callback
http://localhost:3000/**
```

Use the exact stable Preview origin for the first redirect entry. The wildcard
entry allows Vercel-generated Preview URLs for the same team/account. Keep the
localhost entry only for local development.

Password recovery sends users to the exact `/auth/callback` URL, where the
server exchanges the one-time PKCE code before opening `/reset-password`.
Registration currently relies on Supabase's Site URL for email confirmation.
If this Supabase project already serves a production application, do not replace
its production Site URL without a separate decision; use a separate Preview
Supabase project or approve an explicit auth redirect strategy first.

Supabase's default email sender is intended for testing and is rate-limited.
Configure a production SMTP provider under **Authentication > SMTP Settings**
before relying on registration confirmation or password recovery during the
agency pilot.

## 8. Preview verification

After the final redeploy, verify all of the following against the stable Preview
origin:

- The build uses Node.js 24.x and finishes without TypeScript or ESLint output.
- `/`, `/biens`, `/carte`, a transaction/wilaya page and agency page resolve.
- `/robots.txt` and `/sitemap.xml` resolve and contain only the Preview origin.
- Canonical, Open Graph, Twitter and JSON-LD URLs use the Preview origin.
- `/opengraph-image` and a property `/api/og/property` request return images.
- Registration confirmation returns to the configured Preview origin.
- Password recovery returns through `/auth/callback`, opens `/reset-password`,
  updates the password and returns to login without exposing auth tokens.
- Login, logout, refreshed auth cookies and dashboard protection work over HTTPS.
- Draft creation, editing, publishing and public visibility still work.
- A JPG, PNG and WEBP below 3.5 MiB upload and are normalized by Sharp.
- A file above 3.5 MiB is rejected with the Arabic validation message.
- The ninth property image remains rejected.
- Cover selection and deletion/promotion continue to work.
- Sharing, copy link, WhatsApp, Facebook, Telegram, email and QR use the Preview
  origin.
- Lead creation and CRM access continue to respect agency ownership.
- A second agency cannot read or mutate private resources belonging to the
  first agency.
- Vercel Function logs contain no credentials, lead personal data or swallowed
  upload errors.

Do not promote the deployment to Production until the complete checklist passes.

## 9. Internal AI Property Marketing Assistant (P1)

The AI assistant is an authenticated dashboard enhancement only. It is not a
public chatbot, CRM assistant, image generator, or social publishing system.

Configure these variables server-side in Vercel under the appropriate Preview or
Production environment scope:

```text
AI_ENABLED=false
AI_PROVIDER=openai
AI_API_KEY=<server-only OpenAI API key>
AI_MODEL=gpt-5.4-mini-2026-03-17
AI_REQUEST_TIMEOUT_MS=15000
AI_DAILY_GENERATION_LIMIT=20
```

Never prefix these variables with `NEXT_PUBLIC_`. The assistant sends only
sanitized factual property fields to the provider. It excludes exact address,
coordinates, agency-private data, CRM data, credentials and internal IDs.

The daily limit is enforced by the authenticated Supabase quota RPC and is
derived from the current agency session. Provider failures release their short-
lived reservation; only usable generated content counts against the daily
completed-generation total. Generated social and SEO copy remains ephemeral in
P1 and is not persisted or published automatically.

Before enabling `AI_ENABLED`, apply `supabase/008_ai_usage.sql` manually in the
Supabase SQL editor and verify the quota RPCs. Do not place the OpenAI key in
the repository, `.env.example`, browser code, or client-visible environment
variables.
