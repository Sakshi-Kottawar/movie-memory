# Movie Memory

A full-stack movie trivia application built with **Next.js, TypeScript, PostgreSQL, and Prisma**. Users sign in with Google, select their favorite movie, and receive AI-generated fun facts.

**Selected extension: Variant A — Backend-Focused (Caching & Correctness)**

### Detailed Technical Documentation

For a deeper explanation of the system architecture, authentication flow, PostgreSQL caching, single-flight concurrency, failure recovery, and design tradeoffs, see the [**Detailed Architecture & Design**](docs/ARCHITECTURE.md).

## Features

- Google OAuth authentication with database-backed sessions
- First-time onboarding with inline validation errors and server-side input validation
- Personalized dashboard with Google profile, favorite movie, and logout
- OpenAI-powered fact generation with PostgreSQL persistence
- 60-second server-side caching to reduce redundant API calls
- Single-flight concurrency protection for simultaneous requests
- Stale-fact fallback when OpenAI is unavailable
- User-scoped authorization and automated backend tests

## Tech Stack

**Frontend:** Next.js App Router, React, TypeScript, Tailwind CSS  
**Backend:** Next.js Route Handlers and Server Actions  
**Database:** PostgreSQL, Prisma ORM  
**Authentication:** Auth.js (NextAuth), Google OAuth  
**AI:** OpenAI API  
**Testing:** Vitest

## Quick Start

### Prerequisites

Node.js compatible with the installed Next.js version, PostgreSQL, and Google OAuth credentials.

### 1. Install dependencies

```bash
npm ci
```

### 2. Configure the database and environment

Create a PostgreSQL database:

```bash
createdb movie_memory
```

Copy the environment template:

```bash
cp .env.example .env
```

Configure `.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/movie_memory?schema=public"
AUTH_SECRET="your-auth-secret"
AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"
OPENAI_API_KEY="your-openai-api-key"
MOCK_OPENAI="true"
```

Generate an Auth.js secret with `npx auth secret`.

**Google OAuth:** Create a Web application OAuth client in [Google Cloud Console](https://console.cloud.google.com/), with:

- Authorized origin: `http://localhost:3000`
- Redirect URI: `http://localhost:3000/api/auth/callback/google`

Add your Google account as a test user if the OAuth app is in Testing mode.

### 3. Generate Prisma Client and apply migrations

```bash
npx prisma generate --config ./prisma7.config.ts
npx prisma migrate deploy --config ./prisma7.config.ts
```

### 4. Run the application

```bash
npm run dev
```

Open http://localhost:3000.

**OpenAI modes:** Set `MOCK_OPENAI=true` for local mock generation, `error` to simulate API failures, or `false` to call the real OpenAI API using a key with available credits. Mock modes are development-only.

## Architecture Overview

### Authentication and Data Model

Auth.js manages Google OAuth and database-backed sessions through the Prisma adapter. Protected routes resolve the session server-side, and database queries use the authenticated user's identity rather than trusting client-provided user IDs.

The PostgreSQL schema contains four models:

| Model       | Responsibility                                        |
| ----------- | ----------------------------------------------------- |
| `User`      | Google profile and favorite movie                     |
| `Account`   | OAuth provider linkage                                |
| `Session`   | Authentication sessions                               |
| `MovieFact` | Generated facts, associated user/movie, and timestamp |

An index on `(userId, movie, createdAt)` supports efficient fact retrieval.

### Fact Generation and Caching

The core logic resides in `lib/facts.ts`.

```text
GET /api/fact
      |
      v
Authenticate and resolve user
      |
      v
Check latest fact in PostgreSQL
      |
      +-- Age < 60 seconds --> Return cached fact
      |
      +-- Expired / missing
               |
               v
       Single-flight coordination
               |
               v
          Generate via OpenAI
               |
           +---+---+
           |       |
        Success   Failure
           |       |
       Save fact   Return last stored fact
           |       (or error if unavailable)
           v
       Return fact
```

**60-second cache:** Previously generated facts are reused while their age is less than 60 seconds. PostgreSQL acts as the persistent cache and retains facts for failure recovery.

**Concurrency:** An in-memory Promise map keyed by `(userId, movie)` coordinates overlapping requests within a single Node.js process. The shared operation includes the cache lookup and generation, preventing duplicate concurrent calls within that process.

**Failure handling:** If OpenAI fails, the service returns the latest saved fact, even if expired. Without a saved fact, the API returns a user-friendly error.

**Authorization:** `/api/fact` derives user identity from the server-validated Auth.js session. Requests cannot select another user's facts through a client-supplied user ID.

## Why Variant A?

I chose Variant A to focus on the most important backend challenges in this application: caching correctness, concurrent requests, data isolation, and external API failures.

The implementation keeps these responsibilities server-side, making the behavior predictable and independently testable without relying on browser state.

## Testing

```bash
npm test
npx tsc --noEmit
npm run build
```

Vitest covers:

- Cache hits and expiration at the 60-second boundary
- Concurrent requests sharing one generation
- Stale-fact fallback and failure without a cached fact
- Authentication and user-scoped fact retrieval

Prisma and OpenAI are mocked in unit tests to keep tests deterministic and avoid external API costs.

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

## AI Usage

AI assistance was used for initial implementation scaffolding, Prisma/Auth.js configuration, TypeScript and Next.js troubleshooting, test development, and README refinement. The implementation was reviewed and tested during development.

## Verification Note

The application was tested locally using mock OpenAI responses. Live OpenAI generation was blocked by insufficient API credits; the real API integration remains implemented and can be enabled with a funded API account.
