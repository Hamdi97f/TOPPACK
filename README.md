# TOPPACK

E-commerce website for selling **corrugated cardboard boxes** — single-wall, double-wall,
mailer and custom-printed packaging — with a public storefront and a private admin
dashboard for managing orders, products, categories and customers.

## Tech stack

- **Next.js 14** (App Router) + TypeScript
- **Prisma ORM** (SQLite for development; portable to PostgreSQL)
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

### Install and run

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env and set NEXTAUTH_SECRET to a long random string.

# 3. Initialise the database (creates dev.db) and generate the Prisma client
npx prisma migrate dev --name init

# 4. Seed sample data (admin user, categories, ~10 products)
npm run db:seed

# 5. Start the dev server
npm run dev
```

Visit <http://localhost:3000>.

### Default admin credentials (created by the seed)

| Email                 | Password    |
| --------------------- | ----------- |
| `admin@toppack.local` | `admin1234` |

> **Change these immediately** in any non-development environment by setting `ADMIN_EMAIL`
> and `ADMIN_PASSWORD` in `.env` before running `npm run db:seed`, or by updating the
> credentials in the admin UI.

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

1. In `prisma/schema.prisma`, change the `datasource` provider to `"postgresql"`.
2. Set `DATABASE_URL` to your Postgres connection string.
3. Run `npx prisma migrate dev --name init` to create the schema in Postgres.
4. (Optional) Re-seed with `npm run db:seed`.

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
