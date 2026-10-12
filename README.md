# BookLeaf Author Support & Communication Portal

A full-stack support portal for BookLeaf Publishing with separate author and admin experiences. Authors can review their book and royalty information, raise support tickets, and exchange messages with the support team. Admins can triage tickets, edit AI-suggested classifications and priorities, assign tickets, add private notes, and generate editable response drafts grounded in BookLeaf's policy knowledge base.

> **Assignment confidentiality:** Keep this project and repository private. Do not publish the assignment or solution in a public repository.

## Current implementation status

| Assignment requirement | Implementation in this repository |
|---|---|
| Author email/password login and role separation | Implemented with JWT authentication and hashed passwords |
| Authors only see their own books and tickets | Enforced in backend routes |
| Book details and royalty figures | Shown in the author dashboard |
| Create tickets with book/general selection | Implemented |
| Optional attachment | UI-only placeholder; no file is uploaded, as permitted by the assignment |
| Ticket status and message thread | Implemented |
| Near-real-time author updates | Ticket list polls every 5 seconds |
| Admin queue and filters | Status, category, priority, and date filters; unresolved/urgent tickets are prioritised in the queue |
| AI classification and priority suggestion | Gemini API; constrained output values are validated; fallback defaults are used if AI fails |
| Admin override of category/priority/status | Implemented |
| AI response draft based on BookLeaf policies | Implemented as a policy-grounded prompt; admin can edit the draft before sending |
| Private internal notes and assignment | Implemented |
| REST API and validation | Implemented; endpoint summary below |
| Exact assignment sample dataset | Included and checked by the seed script for 10 authors and 18 books |
| Live deployment | **Not included in this ZIP; deploy and test before submitting** |
| One-page approach write-up | Included as `APPROACH.md`; review it so you can explain it yourself |

### Important accuracy note about “RAG”

The current AI service puts a fixed BookLeaf knowledge-base text into the prompt. It does **not** implement a vector database, embeddings, document chunking, or semantic retrieval. Describe it as *knowledge-base-grounded prompting* rather than claiming a full retrieval-augmented generation (RAG) pipeline. A true retrieval layer is a possible future improvement.

## Technology stack

- **Frontend:** React, Vite, Axios
- **Backend:** Node.js, Express
- **Database:** MongoDB with Mongoose
- **Authentication:** JWT and bcrypt password hashing
- **AI:** Google Gemini via `@google/genai`
- **Near-real-time updates:** Client polling every five seconds

The AI model is configured by `GEMINI_MODEL`. `backend/.env.example` currently specifies `gemini-2.5-flash`; keep the service's default and deployment environment consistent, and verify that the selected model is available for your Gemini API key before the demo.

## Requirements

- A supported Node.js LTS version
- MongoDB running locally or a MongoDB connection string
- A Google Gemini API key for live AI classification/draft generation (the app should still allow ticket creation and manual responses when AI is unavailable)

## Run locally

### 1. Configure the backend

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and set at least:

```dotenv
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/bookleaf-support
JWT_SECRET=replace_with_a_long_random_secret
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
```

Use a long, random JWT secret. Do not commit `.env`, API keys, or production credentials. If the frontend is deployed on a separate domain, set `FRONTEND_ORIGIN` to its exact origin (or comma-separated allowed origins).

### 2. Install dependencies and seed the database

```bash
npm install
npm run seed
npm run dev
```

The backend defaults to `http://localhost:5000`. Check `GET http://localhost:5000/api/health`.

**Seed warning:** `npm run seed` deletes all users, books, and tickets in the configured database before importing the sample dataset. Run it only against a disposable development/demo database. It creates 10 sample authors, 18 books, one admin account, and a demo ticket.

### 3. Configure and run the frontend

In a second terminal:

```bash
cd frontend
npm install
```

Create `frontend/.env` (optional for local development; this is the default URL):

```dotenv
VITE_API_BASE_URL=http://localhost:5000/api
```

Then run:

```bash
npm run dev
```

Open the local URL printed by Vite. The `VITE_` prefix is only for public frontend configuration; **never put API keys or other secrets in frontend environment variables**.

## Demo credentials

These credentials work only after running the seed script, unless you change the seed environment variables.

- **Admin:** `admin@bookleaf.com` / `admin123`
- **Sample author:** `priya.sharma@email.com` / `password123`
- **Other sample authors:** use the email addresses in `backend/data/bookleaf_sample_data.json`; seeded sample authors share the same password.

These are development/demo credentials. Before exposing a deployed demo, set strong deployment secrets and consider changing demo passwords. Do not use these credentials for a production service.

## API documentation

Protected endpoints require `Authorization: Bearer <JWT>`. Public registration creates author accounts only; admin accounts should be provisioned through a trusted/private process.

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/health` | Public | Backend health check |
| `POST` | `/api/auth/register` | Public | Register an author (`name`, `email`, `password`; minimum password length 8) |
| `POST` | `/api/auth/login` | Public | Login and receive a JWT/profile |
| `GET` | `/api/books` | Author/Admin | Authors receive their own books; admins receive all books |
| `GET` | `/api/tickets` | Author/Admin | Authors receive their own tickets; admins may filter using `status`, `category`, `priority`, `from`, and `to` |
| `POST` | `/api/tickets` | Author | Create a ticket (`subject`, `description`, optional owned `bookId`) |
| `GET` | `/api/tickets/:id/ai-draft` | Admin | Generate an editable policy-grounded response draft |
| `PATCH` | `/api/tickets/:id` | Admin | Update `status`, `category`, `priority`, or assign to self with `{"assignToMe": true}` |
| `POST` | `/api/tickets/:id/messages` | Author/Admin | Add a public message to a ticket thread |
| `POST` | `/api/tickets/:id/notes` | Admin | Add an internal note hidden from authors |

Ticket statuses: `Open`, `In Progress`, `Resolved`, `Closed`.

AI categories: `Royalty & Payments`, `ISBN & Metadata Issues`, `Printing & Quality`, `Distribution & Availability`, `Book Status & Production Updates`, `General Inquiry`.

AI priorities: `Critical`, `High`, `Medium`, `Low`.

The backend validates ticket input and allowlisted status/category/priority values and returns meaningful 4xx errors for common invalid input. Internal notes are removed from author ticket responses.

## AI design, reliability, and cost

- **Classification:** The prompt asks Gemini for JSON containing an allowed category and priority. The backend validates the values against allowlists.
- **Response drafting:** The service includes the BookLeaf policy knowledge base, relevant ticket/book facts, and up to the last four ticket messages. This avoids sending the entire conversation history on each draft request.
- **Human review:** The generated response is placed in the admin reply editor. The admin should verify and edit it before sending.
- **Graceful fallback:** If the API key is absent, the provider fails, or the response cannot be parsed, ticket creation continues with `General Inquiry` / `Medium`, and response drafting returns a manual-response starter.
- **Factuality:** The prompt instructs the model not to invent payout dates, investigation results, or book status not present in the supplied facts.
- **Model choice:** Gemini is used through Google's `@google/genai` SDK. Confirm the chosen model is available to the configured API key and compare latency/cost during testing.

## Before submission: deployment and verification

1. Deploy the backend and frontend and configure production environment variables, database access, CORS (`FRONTEND_ORIGIN`), and the public frontend API URL.
2. Seed the deployment database with the official sample records only if it is a dedicated demo database. The seed command clears existing records.
3. Verify both portals on the deployed URL, not just localhost.
4. Test an author login, book/royalty details, ticket creation, AI fallback, admin filters/overrides, assignment, private notes, edited response sending, and author-side update polling.
5. Confirm internal notes are never visible in author responses and one author cannot access another author's books/tickets.
6. Check the browser console and server logs, and verify AI works with the configured key/model.
7. Add the evaluator's provided email as a collaborator on the **private** Git repository.
8. Include the live URL and test credentials in the submission message/README. Do not submit `.env` or API keys.

## Known limitations and future improvements

- Attachments are a UI placeholder and are not uploaded.
- AI uses a fixed policy text in the prompt rather than a searchable document/vector retrieval system.
- Ticket updates use polling rather than WebSockets or Server-Sent Events.
- The project needs a final end-to-end test pass in the actual deployment environment; automated test coverage is limited.
- Before production, add rate limiting, audit logs, monitoring, more robust admin provisioning, stronger deployment credential management, and automated unit/integration tests.
- A production version could add semantic retrieval over versioned policy documents, citation/source snippets for AI drafts, and evaluation tests for classification and response quality.

## Submission contents

- Private repository containing source code and this README
- Working deployed demo URL, with both roles and sample data
- This README with accurate setup steps and test credentials
- `APPROACH.md` (maximum one page), reviewed and personalised before sending
