# TOPPACK

E-commerce website for selling **corrugated cardboard boxes** — single-wall, double-wall,
mailer and custom-printed packaging — with a public storefront and a private admin
dashboard for managing orders, products, categories and customers.

## Tech stack

- **Next.js 14** (App Router) + TypeScript
- **Prisma ORM** with **PostgreSQL** (works locally and on serverless platforms like Netlify/Vercel)
- **NextAuth** (credentials provider, JWT sessions, role-based access)
- **Tailwind CSS** for styling
- **Zod** for input validation
- **bcryptjs** for password hashing

## Features

### Public storefront
- Home page with hero, value props, featured categories and products
- Catalog with search and category / wall-type / price filters
- Category and product detail pages (with dimension table)
- Persistent cart (localStorage)
- Checkout with customer details and payment method (Cash on Delivery, Bank Transfer)
- Order confirmation with reference number
- Customer account: registration, login, profile, order history

### Private admin (`/admin`, role = `ADMIN`)
- Dashboard with KPIs (orders, 30-day revenue, new customers, low-stock items)
- **Products**: list, create, edit, delete, image upload, activate/deactivate, feature
- **Categories**: full CRUD
- **Orders**: filter by status, view details, update status, print-friendly invoice
- **Customers**: list, view profile and order history, enable/disable accounts

### Security
- Server-side authorization on every admin page and API route (middleware + `requireAdmin` helper)
- Passwords hashed with bcrypt, never returned in responses
- Order pricing **always recomputed on the server** from the database — never trusted from the client
- Stock decremented atomically inside a transaction
- File uploads restricted to images, capped at 5 MB, with server-generated random filenames
- Input validation on every endpoint with Zod

## Getting started

### Prerequisites
- Node.js 20+
- npm 10+
- A PostgreSQL database (local Docker, Neon, Supabase, Vercel Postgres, RDS, …)

### Install and run

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env:
#   - DATABASE_URL: your Postgres connection string
#   - NEXTAUTH_SECRET: a long random string (e.g. `openssl rand -base64 32`)

# 3. Create the schema in your database and generate the Prisma client
npx prisma migrate dev --name init

# 4. Seed sample data (admin user, categories, ~10 products)
npm run db:seed

# 5. Start the dev server
npm run dev
```

Visit <http://localhost:3000>.

> **Need a quick local Postgres?** Run:
> ```bash
> docker run --name toppack-pg -e POSTGRES_PASSWORD=toppack -e POSTGRES_DB=toppack -p 5432:5432 -d postgres:16
> ```
> Then set `DATABASE_URL="postgresql://postgres:toppack@localhost:5432/toppack?schema=public"`.

### Default admin credentials (created by the seed)

| Email                 | Password    |
| --------------------- | ----------- |
| `admin@toppack.local` | `admin1234` |

> **Change these immediately** in any non-development environment by setting `ADMIN_EMAIL`
> and `ADMIN_PASSWORD` in `.env` before running `npm run db:seed`, or by updating the
> credentials in the admin UI.

### Admin login without seeding the database

The values of `ADMIN_EMAIL` and `ADMIN_PASSWORD` are also accepted by NextAuth at runtime
as a valid `ADMIN` login, **even if the database has not been seeded** (or is temporarily
unreachable). This means that on a fresh deployment you can sign in to `/admin` immediately
after setting these two environment variables in your hosting provider (e.g. Netlify →
Site configuration → Environment variables) — no `npm run db:seed` step required for the
admin account itself.

Customer accounts (created via `/register`) are still stored in the database as usual and
require `DATABASE_URL` to be configured.

> ⚠️ **Never commit real values for `ADMIN_EMAIL` / `ADMIN_PASSWORD` to git.** Set them only
> in your hosting provider's environment-variable UI (or in a local, git-ignored `.env`
> file).

## Project structure

```
app/
  (site)/        public storefront routes (layout shared with header + footer)
  admin/         protected admin dashboard (requires role=ADMIN)
  api/           Next.js Route Handlers
    auth/        NextAuth endpoint
    register/    customer registration
    orders/      order placement (public)
    admin/       admin-only APIs (products, categories, orders, users, upload)
components/      shared UI components
  admin/         admin-specific components
lib/             prisma client, auth options, validators, utilities
prisma/          schema, migrations, seed
public/uploads/  uploaded product images
middleware.ts    admin route protection
types/           type augmentations (NextAuth)
```

## Switching to PostgreSQL

The schema already uses PostgreSQL (`prisma/schema.prisma`). To target a different
database in production:

1. Set `DATABASE_URL` to your Postgres connection string (use the **pooled / serverless**
   URL when deploying on Lambda-based platforms like Netlify or Vercel).
2. Run `npx prisma migrate deploy` (or `npx prisma db push` in early stages) against
   the target database.
3. (Optional) Re-seed with `npm run db:seed`.

## Deploying to Netlify

The repo ships with `netlify.toml` and is compatible with the official
**`@netlify/plugin-nextjs`** runtime (auto-detected).

1. **Provision a Postgres database** (Neon, Supabase, Vercel Postgres, etc.). Copy the
   pooled connection URL.
2. **Run the migration** from your machine pointing at the production DB:
   ```bash
   DATABASE_URL="<your-postgres-url>" npx prisma migrate deploy
   DATABASE_URL="<your-postgres-url>" npm run db:seed   # optional, creates admin + sample data
   ```
   > The `npm run build` step also runs `prisma db push` automatically on every
   > Netlify build (best-effort — it logs and continues if `DATABASE_URL` is
   > missing or unreachable), so a freshly-provisioned Postgres will get its
   > tables created on the first deploy without any manual step.
3. **In Netlify → Site settings → Environment variables**, set:
   | Variable          | Value                                                |
   | ----------------- | ---------------------------------------------------- |
   | `DATABASE_URL`    | The pooled Postgres connection string                |
   | `NEXTAUTH_SECRET` | A long random string (`openssl rand -base64 32`)     |
   | `NEXTAUTH_URL`    | Your public site URL, e.g. `https://your-site.netlify.app` |
4. Trigger a **Clear cache and deploy site** so Prisma Client is regenerated against
   the production schema.

> **Why not SQLite?** Netlify (and any AWS Lambda based runtime) provides a read-only,
> ephemeral filesystem. A `file:./dev.db` database cannot be packaged with the function
> and writes would be lost on every cold start, which is why the previous SQLite-based
> deploy crashed every server-rendered page with a generic "Application error" digest.

## Useful scripts

| Script              | Purpose                              |
| ------------------- | ------------------------------------ |
| `npm run dev`       | Start the Next.js dev server         |
| `npm run build`     | Generate Prisma client + build       |
| `npm run start`     | Run the production build             |
| `npm run lint`      | Run ESLint                           |
| `npm run db:migrate`| `prisma migrate dev`                 |
| `npm run db:push`   | `prisma db push` (schema sync)       |
| `npm run db:seed`   | Seed initial data                    |

## Extending

- **Payments**: a Stripe integration can be added by creating a new Route Handler
  (e.g. `app/api/checkout/stripe/route.ts`), passing the cart there from the checkout
  page, and recording the resulting payment intent on the order.
- **Image storage**: the upload endpoint writes to `/public/uploads`. Swap with S3 /
  Cloudinary by replacing the body of `app/api/admin/upload/route.ts`.
- **Email**: hook a provider (Resend, SendGrid, etc.) into the order-creation handler
  in `app/api/orders/route.ts` to send confirmation emails.

## License

Proprietary — © TOPPACK.
