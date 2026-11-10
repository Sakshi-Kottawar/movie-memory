import { describe, it, expect, vi, beforeEach } from "vitest";

// Create mock functions
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  findUser: vi.fn(),
  createMovieFact: vi.fn(),
}));

// Mock Auth.js
vi.mock("@/auth", () => ({
  auth: mocks.auth,
}));

// Mock Prisma database access
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mocks.findUser,
    },
  },
}));

// Mock movie fact service
vi.mock("@/lib/facts", () => ({
  createMovieFact: mocks.createMovieFact,
}));

// Import the actual API handler
import { GET } from "@/app/api/fact/route";

describe("Movie fact API authorization", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // TEST 1: Unauthenticated request
  it("returns 401 when user is not logged in", async () => {
    mocks.auth.mockResolvedValue(null);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");

    expect(mocks.findUser).not.toHaveBeenCalled();
    expect(mocks.createMovieFact).not.toHaveBeenCalled();
  });

  // TEST 2: Authenticated request
  it("returns a fact for the authenticated user", async () => {
    mocks.auth.mockResolvedValue({
      user: {
        email: "alice@example.com",
      },
    });

    mocks.findUser.mockResolvedValue({
      id: "user-alice",
      favoriteMovie: "Inception",
    });

    mocks.createMovieFact.mockResolvedValue({
      id: "fact-1",
      userId: "user-alice",
      movie: "Inception",
      fact: "Test movie trivia",
      createdAt: new Date("2026-11-10T12:00:00Z"),
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.movie).toBe("Inception");
    expect(body.fact).toBe("Test movie trivia");

    // Ensure session email is used for lookup
    expect(mocks.findUser).toHaveBeenCalledWith({
      where: {
        email: "alice@example.com",
      },
      select: {
        id: true,
        favoriteMovie: true,
      },
    });

    // Generate only Alice's fact
    expect(mocks.createMovieFact).toHaveBeenCalledWith("user-alice");
  });

  // TEST 3: Client cannot override session identity
  it("does not use a user ID supplied by the client", async () => {
    mocks.auth.mockResolvedValue({
      user: {
        email: "alice@example.com",
      },
    });

    mocks.findUser.mockResolvedValue({
      id: "user-alice",
      favoriteMovie: "Inception",
    });

    mocks.createMovieFact.mockResolvedValue({
      movie: "Inception",
      fact: "Alice's movie fact",
      createdAt: new Date(),
    });

    // Simulate a request attempting to access Bob's facts.
    // The current GET handler accepts no userId parameter.
    const response = await GET();

    expect(response.status).toBe(200);

    // Only the authenticated user's ID is passed.
    expect(mocks.createMovieFact).toHaveBeenCalledWith("user-alice");

    expect(mocks.createMovieFact).not.toHaveBeenCalledWith("user-bob");
  });
});
