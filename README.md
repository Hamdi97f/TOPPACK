# TOPPACK

E-commerce website for selling **corrugated cardboard boxes** — single-wall, double-wall,
mailer and custom-printed packaging — with a public storefront and a private admin
dashboard for managing orders, products and categories.

## Tech stack

- **Next.js 14** (App Router) + TypeScript
- **NextAuth** (credentials provider, JWT sessions, role-based access)
- **api-gateway webapp** (`https://hycvkzijiwnmcwejvugj.supabase.co/functions/v1/api-gateway`)
  for all persistent data — products, categories, orders, users and file storage
- **Tailwind CSS** for styling
- **Zod** for input validation

There is **no local database**. Every server-side data fetch is performed against the
remote api-gateway via `lib/api-client.ts`. NextAuth is kept only as the session/cookie
layer; the credentials provider authenticates against the webapp's `POST /login` and
stores the issued bearer token inside the JWT for all subsequent per-user calls.

## Features

### Public storefront
- Home page with hero, value props, featured categories and products
- Catalog with search and category / wall-type / price filters
- Category and product detail pages (with dimension table)
- Persistent cart (localStorage)
- Checkout with customer details and payment method (Cash on Delivery, Bank Transfer)
- Order confirmation
- Customer account: registration, login, order history

### Private admin (`/admin`, role = `ADMIN`)
- Dashboard with KPIs (orders, 30-day revenue, active products, low-stock items)
- **Products**: list, create, edit, delete, image upload, activate/deactivate, feature
- **Categories**: full CRUD
- **Orders**: filter by status, view details, update status, print-friendly invoice

> Admin must be granted `is_admin = true` in the api-gateway webapp. The previous
> `ADMIN_EMAIL` / `ADMIN_PASSWORD` environment-variable bypass has been removed.

### Security
- Server-side authorization on every admin page and API route (middleware + `requireAdmin` helper)
- Order pricing **always recomputed on the server** (by the api-gateway, from product prices) — never trusted from the client
- File uploads restricted to images, capped at 5 MB
- Input validation on every endpoint with Zod
- The `TOPPACK_API_KEY` is only ever read server-side and never exposed to the browser

## Schema shims

The api-gateway has a leaner data model than TOPPACK originally used. A few fields are
preserved by packing them into existing string columns; helpers in
`lib/api-client.ts` handle the encoding/decoding:

| TOPPACK field                                      | Storage on the api-gateway                          |
| -------------------------------------------------- | --------------------------------------------------- |
| `Product.slug`                                     | Derived from `name` via slugify; also packed in `description` extras |
| `Product.sku`, `lengthCm`, `widthCm`, `heightCm`, `wallType`, `isFeatured` | JSON tail appended to `description` (sentinel-delimited) |
| `Category.slug`                                    | Derived from `name` via slugify                     |
| `Order.reference`                                  | Use the api-gateway's returned `id` as the reference |
| `Order.customerPhone`, multi-line address          | Concatenated into `shipping_address`; parsed best-effort for display |
| `Order.paymentMethod` (COD vs bank transfer)       | Encoded as a leading `PAYMENT: …` line in `notes`   |
| `OrderItem.name`                                   | Looked up from the product on display               |

There is no list-users endpoint on the api-gateway, so the previous `/admin/customers`
page has been removed.

## Getting started

### Prerequisites
- Node.js 20+
- npm 10+
- An api-gateway project with an issued API key, plus a "service" non-admin user
  whose credentials can be used for anonymous catalog browsing on the storefront

### Install and run

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env and fill in:
#   - TOPPACK_API_KEY: your api-gateway project key
#   - TOPPACK_SERVICE_EMAIL / TOPPACK_SERVICE_PASSWORD: a regular (non-admin) user
#       used to fetch the public catalog for anonymous visitors
#   - NEXTAUTH_SECRET: a long random string (e.g. `openssl rand -base64 32`)

# 3. Start the dev server
npm run dev
```

Visit <http://localhost:3000>.

### Creating an admin user

Create a user in your api-gateway webapp and set `is_admin = true` for that account.
Sign in to TOPPACK with those credentials to access `/admin`.

## Project structure

```
app/
  (site)/        public storefront routes (layout shared with header + footer)
  admin/         protected admin dashboard (requires role=ADMIN)
  api/           Next.js Route Handlers
    auth/        NextAuth endpoint
    register/    customer registration (proxies POST /register)
    orders/      order placement (proxies POST /orders)
    admin/       admin-only proxies to the api-gateway (products, categories, orders, upload)
components/      shared UI components
  admin/         admin-specific components
lib/
  api-client.ts  typed wrapper around the api-gateway (auth, products, orders, upload, shims)
  auth.ts        NextAuth options (credentials → POST /login)
  api-auth.ts    requireAdmin/requireUser helpers for route handlers
  utils.ts       formatting + status helpers
  validators.ts  Zod schemas
middleware.ts    admin route protection
types/           NextAuth augmentations + api-gateway types
```

## Deploying to Netlify

The repo ships with `netlify.toml` and is compatible with the official
**`@netlify/plugin-nextjs`** runtime (auto-detected).

In Netlify → Site settings → Environment variables, set:

| Variable                  | Value                                                                |
| ------------------------- | -------------------------------------------------------------------- |
| `TOPPACK_API_KEY`         | Your api-gateway project key (server-side only, safe to store here)  |
| `TOPPACK_API_BASE_URL`    | (optional) override of the default api-gateway URL                   |
| `TOPPACK_SERVICE_EMAIL`   | Email of a non-admin webapp user used for anonymous catalog reads    |
| `TOPPACK_SERVICE_PASSWORD`| Password of that service user                                         |
| `NEXTAUTH_SECRET`         | Long random string (`openssl rand -base64 32`)                       |
| `NEXTAUTH_URL`            | Your public site URL, e.g. `https://your-site.netlify.app`           |

No database provisioning step is required.
