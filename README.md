# BookLeaf Author Support & Communication Portal

A React/Vite author portal and Express/MongoDB admin portal with Gemini-assisted ticket classification, priority suggestions, and response drafting.

## Official assignment dataset

The official `backend/data/bookleaf_sample_data.json` is included and validated by the seed script. It contains exactly 10 authors and 18 books, including two books in production and books with zero or pending royalties. Seeded author accounts use the same password for convenient local evaluation; see credentials below.

**Warning:** `npm run seed` deletes all existing users, books, and tickets in the configured MongoDB database before importing the dataset. Use only a disposable development database.

## Stack

- Frontend: React 19, Vite, Axios, Tailwind CSS v4 Vite plugin.
- Backend: Node.js, Express, Mongoose/MongoDB, JWT, bcrypt.
- AI: Google Gemini API via `@google/genai`; `gemini-2.5-flash` by default. The model can be changed with `GEMINI_MODEL`.
- Updates: Author ticket view polls every 5 seconds (near-real-time, no WebSocket dependency).

## Local setup

1. Install Node.js (current LTS) and MongoDB.
2. In `backend`, copy `.env.example` to `.env`, then set `MONGO_URI`, a long random `JWT_SECRET`, and `GEMINI_API_KEY`. AI calls fall back gracefully when the key/service is unavailable.
3. Run `npm install`, then `npm run seed` (development database only), then `npm run dev` or `npm start`.
4. In `frontend`, create `.env` with `VITE_API_BASE_URL=http://localhost:5000/api` (optional for local development), run `npm install`, then `npm run dev`.
5. Health check: `GET http://localhost:5000/api/health`.

## Demo credentials (only after running seed)

- Admin: `admin@bookleaf.com` / `admin123`
- Author: `priya.sharma@email.com` / `password123` (all 10 sample authors use this password)

Change demo credentials and secrets before any shared deployment. Never expose `.env` or commit API keys. Public registration always creates author accounts; admins must be provisioned through a trusted/private process.

## API overview

All protected endpoints require `Authorization: Bearer <JWT>`.

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Create author account; name, email, password (min 8 chars) |
| POST | `/api/auth/login` | Public | Return JWT and user profile |
| GET | `/api/books` | Author/Admin | Author sees own books; admin sees all books |
| GET | `/api/tickets` | Author/Admin | Author sees own tickets; admin can filter with `status`, `category`, `priority`, `from`, `to` |
| POST | `/api/tickets` | Author | Create ticket; optional own `bookId`, `subject`, `description`; AI classification safely defaults if unavailable |
| GET | `/api/tickets/:id/ai-draft` | Admin | Generate policy-grounded draft |
| PATCH | `/api/tickets/:id` | Admin | Update `status`, `category`, `priority`, or `{ "assignToMe": true }` |
| POST | `/api/tickets/:id/messages` | Author/Admin | Add public message to ticket thread |
| POST | `/api/tickets/:id/notes` | Admin | Add internal-only note |

Invalid values receive 4xx responses. Internal notes are excluded from author ticket responses. Authors can only create book-linked tickets for their own books.

## AI approach, reliability and cost

Classification asks the model to return constrained JSON and validates returned category/priority against allowlists. When the model is unavailable or its response cannot be parsed, ticket creation continues with `General Inquiry` / `Medium`. Draft generation includes the relevant policy knowledge base, ticket and book facts, and only the last four messages to reduce token use; a manual-response starter is returned if AI fails. Admins should review/edit drafts before sending. Do not invent dates or account facts in generated replies.

## Security notes

- Passwords are hashed with bcrypt; JWT secret must be configured through environment variables.
- API keys stay on the backend; do not use `VITE_` prefixes for secrets.
- Configure `FRONTEND_ORIGIN` for deployment CORS.
- This is an assignment/demo baseline, not a fully hardened production service. Add rate limiting, audit logging, stronger admin provisioning, request-size limits, automated tests, and monitoring before production.

## Remaining assignment deliverables

- Deploy both services and provide a live URL; this repository does not establish a deployed demo.
- Write the requested one-page approach/trade-offs/production evolution note before submission.
- Complete end-to-end testing with MongoDB and a configured Gemini API key; automated test coverage is still limited.
