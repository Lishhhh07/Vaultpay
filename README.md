# VAULTPAY: Customer Wallet + Merchant Dashboard

A full-stack, Paytm-style payments project built as a **Turborepo monorepo**. Customers hold a wallet, send money to friends and pay merchants by QR code or link. Merchants sign up, complete KYC, link bank accounts, collect payments and settle their balance to the bank.

> **Learning project.** KYC verification, banks and payouts are simulated. No real money is ever moved.

## Live demo
for demo: 

          USER: phno: 1111111111 pwd: alice

          MERCHANT: merchant@demo.com, pwd: merchant123
| App | Who it's for | URL |
|---|---|---|
| **Customer app** | Wallet, P2P, pay merchants | https://paytm2-tau.vercel.app/ |
| **Merchant app** | Collect payments, KYC, settlements | https://paytm2-cqvz.vercel.app/ |

### Try it in about 3 minutes

1. **Merchant app:** sign up, then open **KYC** and submit (use any valid-format PAN, e.g. `ABCPE1234F`). Verification is mocked and completes automatically in about 30 seconds.
2. Still in the merchant app, add a bank account under **Bank accounts**, then open **QR code** and copy the payment link.
3. **Customer app:** sign up (new accounts start with a welcome balance), then set a transaction PIN under **Security**.
4. In the customer app open **Pay merchant**, paste the link, enter an amount and pay with your PIN.
5. Back in the merchant app, the payment appears under **Transactions** and in today's collection. Use **Settlements** to send the balance to your bank account.

> PAN ending in `Z` is rejected on purpose, to demo the rejection flow.

## Features

### Customer app
- Sign up and sign in with phone number and password ((Google sign-in also supported)
- Wallet balance with a configurable welcome bonus
- Peer-to-peer transfers
- Pay merchants by scanning their QR code or opening a payment link, with a review and confirm step and a receipt
- 4 to 6 digit **transaction PIN** required for payments (set with your password, locks for 30 minutes after 5 wrong attempts)
- Recent activity and transaction history

### Merchant app
- Sign up and sign in with email or phone and password (Google sign-in also supported)
- **KYC** with PAN and GSTIN format validation, plus a mocked review (verified, rejected and resubmit flows)
- **Bank accounts** with encrypted account numbers (only the last 4 digits are ever shown)
- Static **QR code** and payment links with a prefilled amount, plus WhatsApp sharing
- Transactions list with date filters and pagination, plus today's collection on the dashboard
- **Settlements** from merchant balance to a linked bank account (₹100 to ₹5,00,000 per settlement)
- Audit log of sensitive actions (KYC, bank changes, settlements)


## Tech stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · NextAuth v4 · Prisma 5 · PostgreSQL (Neon) · Turborepo · zod · bcrypt · Vercel

## Architecture

```
  Customer app  (apps/user-app, :3001)        Merchant app (apps/merchant-app, :3002)
  NextAuth "User" sessions                    NextAuth "Merchant" sessions
          │                                              ▲
          │  payMerchant() ─────────────┐                │  QR code / link points to
          ▼                             ▼                │  customer app /pay/<merchant>
     ┌──────────────────────────────────────────┐        │
     │  Shared PostgreSQL (Neon) via Prisma     │ ◄──────┘
     └──────────────────────────────────────────┘
          ▲
          │  POST /api/webhooks/bank  (HMAC-signed bank callback)
```

- **One database.** The apps never call each other. A customer payment writes rows that the merchant app reads.
- **One money package.** `packages/payments-core` is the only place that moves money, so the rules are written and tested once.
- **Two separate apps.** Customers and merchants are different identities with separate sessions, cookies and secrets. A customer session cannot open a merchant page.

### Project structure

```
apps/
  user-app/            Customer app (Next.js)
    app/api/webhooks/bank/   Signed bank callback that credits the wallet
    scripts/send-webhook.mjs Simulates the bank calling the webhook
  merchant-app/        Merchant dashboard (Next.js)
packages/
  db/                  Prisma schema, migrations, seed
  payments-core/       payMerchant(), settleToBank(), money helpers, concurrency tests
  ui/                  Shared React components
  store/               Shared client state
  eslint-config/ typescript-config/
```

## Security and correctness

- **Money is stored as integer paise**, never floats. Amounts are parsed from strings server-side.
- **Row-level locking:** a payment locks the customer wallet, then the merchant balance, always in that order. This prevents double-spend and deadlocks.
- **Idempotency keys** on payments and settlements, so a double-click or a retry can never charge or withdraw twice.
- **Database `CHECK` constraints** make negative balances and non-positive amounts impossible, even if application code has a bug.
- **Signed webhooks:** HMAC-SHA256 over the raw body with a timestamp (5 minute replay window). The credited amount and user come from the database row, never from the request, and the credit happens exactly once.
- **Passwords** are hashed with bcrypt. Unknown accounts cost the same time as known ones, so login timing does not reveal who has an account.
- **Transaction PIN** is hashed, and the attempt counter is incremented atomically before checking, so parallel guesses can't beat the lockout.
- **Sensitive data at rest:** PAN and bank account numbers are encrypted with AES-256-GCM and bound to their owner, so a copied ciphertext can't be decrypted in another row. Keyed hashes detect duplicate accounts without storing anything guessable.
- **Session isolation:** each app has its own secret and cookie names.
- **Ownership checks in every query.** Merchant ids always come from the session, and customer-facing merchant links use random UUIDs, not sequential ids.
- **Merchant login and signup rate limiting**, a verified-only gate for QR codes, payments and settlements, and an audit log written in the same transaction as the money movement.

Known limits: the rate limiter is in memory (swap for Redis or Upstash on serverless), and email or phone ownership is not verified at signup.

## Run it locally

**Prerequisites:** Node.js 20 or newer, and a PostgreSQL database (a free [Neon](https://neon.tech) project works well).

```bash
git clone <your-repo-url>
cd <repo-folder>
npm install
```

### 1. Environment variables

Generate random secrets with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```
Use a **different** value for each secret.

**`packages/db/.env`**
```
DATABASE_URL="postgresql://..."
```

**`apps/user-app/.env`**
```
DATABASE_URL="postgresql://..."
NEXTAUTH_URL="http://localhost:3001"
NEXTAUTH_SECRET="<32+ random chars>"
BANK_WEBHOOK_SECRET="<32+ random chars>"
WELCOME_BONUS_RUPEES="1000"          # optional, 0 or unset = no bonus
```

**`apps/merchant-app/.env`**
```
DATABASE_URL="postgresql://..."
NEXTAUTH_URL="http://localhost:3002"
NEXTAUTH_SECRET="<a different 32+ random chars>"
DATA_ENCRYPTION_KEY="<32 random bytes, base64>"   # keep it safe: losing it makes stored PAN and bank data unreadable
USER_APP_URL="http://localhost:3001"
GOOGLE_CLIENT_ID=""                  # optional, only for Google sign-in
GOOGLE_CLIENT_SECRET=""
```

### 2. Database

```bash
cd packages/db
npx prisma migrate dev     # create tables
npx prisma db seed         # demo data (local only)
cd ../..
```

### 3. Start everything

```bash
npm run dev
```

| App | URL |
|---|---|
| Customer app | http://localhost:3001 |
| Merchant app | http://localhost:3002 |

### Seeded demo accounts (local only)

| Role | Login | Password |
|---|---|---|
| Customer | `1111111111` | `alice` |
| Customer | `2222222222` | `bob` |
| Merchant | `merchant@demo.com` | `merchant123` |

> **Never run the seed against a real or public database.** It creates these known credentials.

## Useful commands

```bash
# Simulate the bank crediting a pending add-money transaction (amount in paise)
cd apps/user-app
node --env-file=.env scripts/send-webhook.mjs <token> <amountInPaise>

# Money-correctness tests: parallel payments and settlements must never overdraw or double-charge
# (they overwrite the demo balances, so use dev data only)
npx tsx packages/payments-core/scripts/concurrency-test.ts
npx tsx packages/payments-core/scripts/settlement-test.ts

# Production build of all apps
npm run build
```

## Deployment

Two Vercel projects from this one repository, plus a Neon database.

| Setting | Customer app | Merchant app |
|---|---|---|
| Root Directory | `apps/user-app` | `apps/merchant-app` |
| Framework | Next.js | Next.js |
| Build Command | `npx prisma generate --schema=../../packages/db/prisma/schema.prisma && next build` | same |

- Set the environment variables above on each project, with `NEXTAUTH_URL` set to that app's own `https://` URL and `USER_APP_URL` set to the customer app's URL.
- Use the **pooled** Neon connection string (host contains `-pooler`) for the deployed apps.
- Run migrations from your machine against the direct (non-pooled) URL: `npx prisma migrate deploy`.
- Redeploy after changing environment variables.
- Don't run the seed in production.

## License

For learning and portfolio use.
