# Movie Memory

Movie Memory is a full-stack web application built with Next.js, TypeScript, React, Prisma, and PostgreSQL. Users can sign in with Google, save their favorite movie, and discover AI-generated trivia about it.

The application implements the required base functionality and **Variant A — Backend-Focused (Caching & Correctness)**, emphasizing secure authentication, data isolation, concurrency control, and resilient fact generation.

## Tech Stack

| Layer          | Technology                                                |
| -------------- | --------------------------------------------------------- |
| Frontend       | React, Next.js App Router, Tailwind CSS                   |
| Language       | TypeScript                                                |
| Backend        | Next.js Server Components, Server Actions, Route Handlers |
| Database       | PostgreSQL                                                |
| ORM            | Prisma                                                    |
| Authentication | Auth.js (NextAuth), Google OAuth                          |
| AI Integration | OpenAI API                                                |
| Testing        | Vitest                                                    |

## Features

- **Google Authentication:** Secure Google OAuth sign-in with database-backed sessions.
- **First-Time Onboarding:** New users enter their favorite movie, with server-side input validation.
- **Personalized Dashboard:** Displays the authenticated user's name, email, profile picture, and favorite movie.
- **Movie Trivia:** Generates and persists movie facts using the OpenAI API.
- **60-Second Server-Side Cache:** Reuses recently generated facts to avoid unnecessary API calls.
- **Concurrency Protection:** Uses single-flight coordination to prevent duplicate generations within one application process.
- **Graceful Failure Handling:** Returns the latest stored fact if OpenAI is unavailable.
- **User Data Isolation:** Restricts movie fact access to the authenticated user.
- **Logout:** Invalidates the user's session without deleting their saved information.
- **Automated Tests:** Covers caching, concurrent generation, failure handling, and authorization.

---

## Variant Selection

### Variant A — Backend-Focused (Caching & Correctness)

I chose Variant A because the most interesting engineering challenges in this application involve backend correctness rather than UI complexity.

In particular:

- Fact generation involves an external API that can introduce latency, failures, and usage costs.
- Concurrent requests must not unnecessarily generate duplicate facts.
- Cached information must be correctly scoped to the authenticated user and movie.
- The system should remain useful when the external API becomes unavailable.

Implementing these behaviors on the backend centralizes the business rules, reduces dependence on client-side state, and makes the logic easier to test.

---

## Architecture Overview

### 1. Application Architecture

The application uses Next.js App Router to implement both frontend and backend functionality in a single TypeScript codebase.

```text
                  Browser / React UI
                          |
                          v
                  Next.js App Router
                          |
             +------------+------------+
             |                         |
             v                         v
      Auth.js / Google OAuth     GET /api/fact
             |                         |
             v                         v
      Prisma Adapter          Session Validation
             |                         |
             v                         v
        PostgreSQL              Fact Service
                                       |
                               Cache Lookup
                                       |
                           +-----------+-----------+
                           |                       |
                       Cache HIT               Cache MISS
                           |                       |
                           v                       v
                    Return Stored Fact      Single-Flight Guard
                                                   |
                                                   v
                                              OpenAI API
                                                   |
                                      +------------+------------+
                                      |                         |
                                   Success                    Failure
                                      |                         |
                                      v                         v
                                 Save Fact              Return Last Fact
                                      |                 (if available)
                                      v
                                  PostgreSQL
```

### 2. Authentication and Authorization

Authentication is implemented using Auth.js with the Google OAuth provider and Prisma adapter.

After successful Google authentication:

1. Auth.js creates or retrieves the associated user account.
2. Authentication records and database sessions are managed through Prisma.
3. First-time users without a favorite movie are redirected to onboarding.
4. Returning users are directed to their personalized dashboard.

Protected pages and API routes resolve the authenticated session server-side using `auth()`.

For movie fact requests, the API identifies the user through the validated session and retrieves the associated database record. It does not accept a client-supplied user ID to determine whose facts to retrieve.

This ensures the application's fact retrieval logic is scoped to the authenticated user.

### 3. Database Design

PostgreSQL is used as the primary persistent data store.

The Prisma schema defines four main models:

| Model       | Responsibility                                                         |
| ----------- | ---------------------------------------------------------------------- |
| `User`      | Google profile information and favorite movie                          |
| `Account`   | Links OAuth provider accounts to application users                     |
| `Session`   | Maintains database-backed authentication sessions                      |
| `MovieFact` | Stores generated facts, associated movie, user, and creation timestamp |

**Key relationships:**

- One user can have multiple linked OAuth accounts.
- One user can have multiple sessions.
- One user can have multiple generated movie facts.
- Every movie fact belongs to a specific user.

The `MovieFact` model includes an index on `(userId, movie, createdAt)` to support efficient retrieval of the latest fact for a particular user and movie.

The `createdAt` timestamp is used to determine cache freshness.

### 4. Fact Generation and Caching

The core business logic is implemented in `lib/facts.ts`.

When an authenticated user requests a movie fact:

1. Retrieve the user's favorite movie from PostgreSQL.
2. Look up the most recently generated fact for that user and movie.
3. Calculate the age of the existing fact.
4. Return the stored fact when its age is less than 60 seconds.
5. Otherwise, generate a new fact through the OpenAI integration.
6. Persist the new fact and return it.

The cache duration is:

```typescript
const CACHE_TTL_MS = 60_000;
```

A fact is considered fresh when:

```typescript
ageMs >= 0 && ageMs < CACHE_TTL_MS;
```

At 60 seconds or later, a new generation is attempted.

**Why PostgreSQL instead of Redis?**

The application already requires PostgreSQL to persist generated facts. Reusing these records as a time-based cache avoids introducing another dependency solely for a small take-home application.

This keeps the architecture simple while retaining previously generated facts for failure recovery.

### 5. Concurrency and Single-Flight Protection

A potential race condition occurs when multiple requests arrive after the cached fact expires.

Without coordination, all requests could observe a cache miss and independently invoke OpenAI.

To prevent this, the application uses an in-memory Promise map keyed by the combination of user ID and movie title.

```typescript
const inFlight = new Map<string, Promise<MovieFactResult>>();
```

When a request arrives:

- If an operation is already running for that user and movie, the request reuses the existing Promise.
- Otherwise, the application starts a new cache-check-and-generation operation.
- Once the operation completes or fails, its map entry is removed.

This coordinates overlapping requests within a single Node.js process.

**Limitation:** The in-memory map is process-local. Multiple application instances do not share the same map and could independently generate facts.

For the scope of this exercise, the lightweight approach avoids unnecessary infrastructure. A multi-instance production deployment would benefit from database-backed coordination or a distributed locking mechanism.

### 6. Failure Handling

The fact service handles OpenAI generation failures gracefully.

If OpenAI fails:

- **An existing fact is available:** Return the most recently stored fact, even if its cache window has expired.
- **No existing fact is available:** Raise an application error that the API converts into a user-friendly HTTP 500 response.

This allows the application to provide useful information during temporary API failures without exposing internal error details to the user.

Database persistence failures are handled separately rather than being treated as OpenAI generation failures.

### 7. API Design

The primary movie fact endpoint is:

`GET /api/fact`

The route:

1. Validates the authenticated session.
2. Retrieves the associated user from PostgreSQL.
3. Verifies onboarding is complete.
4. Invokes the backend fact service.
5. Returns the movie, fact, and creation timestamp.

Example response:

```json
{
  "movie": "Inception",
  "fact": "A generated movie fact appears here.",
  "createdAt": "2026-11-10T12:00:00.000Z"
}
```

Error handling includes:

| Condition                               | HTTP Status |
| --------------------------------------- | ----------- |
| Missing or invalid session              | 401         |
| User record not found                   | 404         |
| Onboarding incomplete                   | 400         |
| Generation unavailable without fallback | 500         |

The endpoint uses `Cache-Control: private, no-store` for its successful response to prevent HTTP caching of user-specific data.

The 60-second application cache is managed separately through PostgreSQL.

---

## Local Development Setup

### Prerequisites

- Node.js compatible with the installed Next.js version
- npm
- PostgreSQL
- Google Cloud OAuth credentials
- OpenAI API key and available API credits for live generation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd movie-memory
```

### 2. Install Dependencies

```bash
npm ci
```

Using `npm ci` ensures dependencies are installed according to the committed `package-lock.json`.

### 3. Set Up PostgreSQL

Create a local database:

```bash
createdb movie_memory
```

Ensure PostgreSQL is running and that your database user has the required permissions.

### 4. Configure Environment Variables

Copy the environment template:

```bash
cp .env.example .env
```

Configure the following variables:

```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/movie_memory?schema=public"

AUTH_SECRET="your-generated-auth-secret"
AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"

OPENAI_API_KEY="your-openai-api-key"

MOCK_OPENAI="true"
```

Replace the placeholder values with your own credentials.

For local PostgreSQL installations configured without password authentication, adjust `DATABASE_URL` accordingly.

Generate an Auth.js secret using:

```bash
npx auth secret
```

Keep `.env` private and never commit actual credentials.

### 5. Configure Google OAuth

1. Open Google Cloud Console.
2. Create or select a Google Cloud project.
3. Configure the Google Auth Platform consent screen.
4. Choose an External audience for personal Google account access.
5. Create an OAuth client with application type **Web application**.

Configure the authorized JavaScript origin:

```text
http://localhost:3000
```

Configure the authorized redirect URI:

```text
http://localhost:3000/api/auth/callback/google
```

Copy the generated Client ID and Client Secret into `.env`.

If the OAuth application is in Testing mode, add the Google accounts used for testing to the test-user list.

### 6. Generate the Prisma Client

The project uses a custom Prisma configuration file named `prisma7.config.ts`.

Run:

```bash
npx prisma generate --config ./prisma7.config.ts
```

The generated Prisma Client is excluded from Git and must be regenerated during setup.

### 7. Apply Database Migrations

Apply the existing committed migrations:

```bash
npx prisma migrate deploy --config ./prisma7.config.ts
```

To create new migrations during future schema development:

```bash
npx prisma migrate dev --name <migration_name> --config ./prisma7.config.ts
```

### 8. Start the Application

```bash
npm run dev
```

Open:

http://localhost:3000

Sign in with Google, complete onboarding, and generate a movie fact.

---

## OpenAI Integration and Mock Mode

The application supports real OpenAI generation and a development-only mock mode.

| Configuration         | Behavior                                  |
| --------------------- | ----------------------------------------- |
| `MOCK_OPENAI="true"`  | Returns a mock fact for local development |
| `MOCK_OPENAI="error"` | Simulates an OpenAI failure               |
| `MOCK_OPENAI="false"` | Uses the real OpenAI API                  |

Mock modes are available only outside production.

The mock generator allows testing caching, persistence, concurrency, and failure recovery without consuming API credits.

**Live API verification status:** The OpenAI integration is implemented using the official SDK. However, a successful live generation has not been verified because the development API account had insufficient credits. Local behavior was tested using mock responses.

For real fact generation, set:

```dotenv
MOCK_OPENAI="false"
```

And provide a valid `OPENAI_API_KEY` with available API credits.

Production execution uses the real integration rather than the development mock.

---

## Testing

The project uses Vitest for backend unit tests.

Run all automated tests:

```bash
npm test
```

Run the TypeScript checker:

```bash
npx tsc --noEmit
```

Run the production build:

```bash
npm run build
```

The build process regenerates the Prisma Client through the `prebuild` script.

### Test Coverage

| Test Scenario                        | Expected Behavior                                                     |
| ------------------------------------ | --------------------------------------------------------------------- |
| Cache younger than 60 seconds        | Return stored fact without generating                                 |
| Cache exactly 60 seconds old         | Generate and persist a new fact                                       |
| Multiple concurrent requests         | Reuse one generation operation                                        |
| OpenAI failure with a stored fact    | Return the most recent stored fact                                    |
| OpenAI failure without a stored fact | Return an application error                                           |
| Unauthenticated API request          | Reject with HTTP 401                                                  |
| Authenticated fact request           | Use the authenticated user's identity                                 |
| Cross-user access attempt            | Do not use a client-supplied identity to retrieve another user's fact |

Prisma and OpenAI dependencies are mocked during unit tests to avoid external API calls and make results repeatable.

---

## Project Structure

```text
movie-memory/
├── app/
│   ├── page.tsx
│   ├── dashboard/
│   │   └── page.tsx
│   ├── onboarding/
│   │   └── page.tsx
│   └── api/
│       ├── auth/
│       │   └── [...nextauth]/
│       │       └── route.ts
│       └── fact/
│           └── route.ts
├── components/
│   └── FactCard.tsx
├── lib/
│   ├── prisma.ts
│   ├── openai.ts
│   └── facts.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── tests/
│   ├── facts.test.ts
│   └── authorization.test.ts
├── auth.ts
├── prisma7.config.ts
├── vitest.config.ts
├── next.config.ts
├── .env.example
├── package.json
└── README.md
```

### Key Responsibilities

- `auth.ts`: Google OAuth configuration and session management.
- `lib/prisma.ts`: Reusable Prisma client.
- `lib/openai.ts`: OpenAI integration and development mock behavior.
- `lib/facts.ts`: Fact caching, generation, concurrency coordination, and failure fallback.
- `app/api/fact/route.ts`: Authenticated fact API.
- `components/FactCard.tsx`: Client-side movie fact presentation and request handling.
- `prisma/schema.prisma`: Data models and relationships.
- `tests/`: Backend correctness and authorization tests.

---

## Design Tradeoffs

### 1. PostgreSQL as a Persistent Cache

**Decision:** Reuse persisted movie facts with a timestamp-based 60-second freshness window.

**Benefit:** Avoids an additional caching dependency and preserves historical facts for failure recovery.

**Tradeoff:** Cache lookups require a database query.

For a larger application, a dedicated cache such as Redis could reduce database reads.

### 2. In-Memory Concurrency Coordination

**Decision:** Use a Promise map to coordinate simultaneous requests for the same user and movie.

**Benefit:** Simple, lightweight, and effective within one application process.

**Tradeoff:** It does not provide coordination across multiple server instances or processes.

A distributed deployment would need a shared coordination mechanism.

### 3. Database-Backed Sessions

**Decision:** Use Auth.js with a Prisma adapter and database sessions.

**Benefit:** Centralized session persistence and server-side control over authentication records.

**Tradeoff:** Session retrieval introduces database access compared with a purely stateless session approach.

### 4. Server-Side Validation and Authorization

**Decision:** Validate movie input and determine user identity on the server.

**Benefit:** Prevents reliance on browser-side validation or untrusted user identifiers.

**Tradeoff:** Server interactions are required for validation and protected data access.

### 5. Mock OpenAI Integration for Development

**Decision:** Support a local mock that can simulate successful generation and failures.

**Benefit:** Enables deterministic testing without external API costs.

**Tradeoff:** Mock tests do not replace live integration testing for credentials, network behavior, quotas, and actual model responses.

---

## What I Would Improve With Two More Hours

Given additional time, I would prioritize:

1. **Multi-instance concurrency guarantees:** Introduce database-backed generation coordination or a distributed lock to prevent duplicate generation across server instances.

2. **Expanded integration tests:** Test authenticated API routes, database persistence, onboarding validation, and cross-user isolation more comprehensively.

3. **Onboarding user experience:** Return inline validation messages instead of displaying generic Server Action errors.

4. **Observability:** Add structured logging and metrics for cache hit rate, OpenAI latency, generation failures, and stale-fact fallback frequency.

5. **Live OpenAI verification:** Validate the real API integration against an account with available credits, including timeout and error scenarios.

These improvements would strengthen production readiness while keeping the take-home implementation intentionally focused.

---

## AI Usage Disclosure

AI tools were used as development assistance for:

- Understanding and configuring Next.js, Prisma, and Auth.js integration patterns.
- Generating initial implementation examples and code scaffolding.
- Debugging dependency, TypeScript, and Prisma configuration issues.
- Investigating Next.js prerendering and authentication-related build behavior.
- Developing and refining backend tests for caching, concurrency, and authorization.
- Reviewing technical tradeoffs and drafting project documentation.

Implementation decisions were reviewed and adjusted during development, with functionality validated through local testing.

---

## Verification and Submission

The project includes automated backend tests, TypeScript validation, and a Next.js production-build workflow.

Verification commands:

```bash
npm test
npx tsc --noEmit
npm run build
```

The repository contains the application source, Prisma schema and migrations, test suite, configuration, and reproducible local setup instructions.

Actual environment secrets and generated Prisma Client files are excluded from version control.

The implementation intentionally favors **correctness, clarity, security, and explainable tradeoffs over unnecessary complexity**.
