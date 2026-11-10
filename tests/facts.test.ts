import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server-only because this is a Node test environment
vi.mock("server-only", () => ({}));

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    movieFact: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Mock OpenAI
vi.mock("@/lib/openai", () => ({
  generateMovieFact: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { generateMovieFact } from "@/lib/openai";
import { createMovieFact } from "@/lib/facts";

const mockFindUser = vi.mocked(prisma.user.findUnique);
const mockFindFact = vi.mocked(prisma.movieFact.findFirst);
const mockCreateFact = vi.mocked(prisma.movieFact.create);
const mockGenerateFact = vi.mocked(generateMovieFact);

const user = {
  id: "user-1",
  name: "Test User",
  email: "test@example.com",
  emailVerified: null,
  image: null,
  favoriteMovie: "Inception",
  createdAt: new Date("2026-11-10T00:00:00.000Z"),
  updatedAt: new Date("2026-11-10T00:00:00.000Z"),
};

function makeFact(createdAt: Date) {
  return {
    id: "fact-1",
    userId: user.id,
    movie: user.favoriteMovie,
    fact: "Test movie fact",
    createdAt,
  };
}

describe("Movie fact caching", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-10T12:00:00.000Z"));

    vi.resetAllMocks();
    mockFindUser.mockResolvedValue(user);
  });

  it("returns a cached fact when it is less than 60 seconds old", async () => {
    const now = Date.now();

    const cachedFact = makeFact(new Date(now - 30_000));

    mockFindFact.mockResolvedValue(cachedFact);

    const result = await createMovieFact(user.id);

    expect(result).toEqual(cachedFact);

    // OpenAI must not be called
    expect(mockGenerateFact).not.toHaveBeenCalled();

    // No new database record
    expect(mockCreateFact).not.toHaveBeenCalled();
  });

  it("generates a new fact when cache is 60 seconds old", async () => {
    vi.setSystemTime(new Date("2026-11-10T12:00:00.000Z"));

    const now = Date.now();
    const expiredFact = makeFact(new Date(now - 60_000));
    const newFact = makeFact(new Date(now));

    mockFindFact.mockResolvedValue(expiredFact);
    mockGenerateFact.mockResolvedValue("New movie fact");
    mockCreateFact.mockResolvedValue(newFact);

    const result = await createMovieFact(user.id);

    expect(mockGenerateFact).toHaveBeenCalledOnce();
    expect(mockCreateFact).toHaveBeenCalledOnce();
    expect(result).toEqual(newFact);
  });

  it("generates only one fact for concurrent requests", async () => {
    const now = Date.now();

    // Simulate an expired cache
    mockFindFact.mockResolvedValue(makeFact(new Date(now - 90_000)));

    // Control when OpenAI finishes
    let completeGeneration!: (fact: string) => void;

    const pendingGeneration = new Promise<string>((resolve) => {
      completeGeneration = resolve;
    });

    mockGenerateFact.mockReturnValue(pendingGeneration);

    const newFact = {
      ...makeFact(new Date(now)),
      id: "new-fact",
      fact: "New generated movie fact",
    };

    mockCreateFact.mockResolvedValue(newFact);

    // Launch five requests without awaiting individually
    const requests = Array.from({ length: 5 }, () => createMovieFact(user.id));

    // Let pending asynchronous database lookups complete
    await vi.waitFor(() => {
      expect(mockGenerateFact).toHaveBeenCalledOnce();
    });

    // Release the simulated OpenAI request
    completeGeneration("New generated movie fact");

    const results = await Promise.all(requests);

    expect(mockGenerateFact).toHaveBeenCalledOnce();
    expect(mockCreateFact).toHaveBeenCalledOnce();

    // All requests share the same generated fact
    for (const result of results) {
      expect(result).toEqual(newFact);
    }
  });

  it("returns a stale fact when OpenAI fails", async () => {
    const now = Date.now();

    const staleFact = makeFact(new Date(now - 120_000));

    mockFindFact.mockResolvedValue(staleFact);

    mockGenerateFact.mockRejectedValue(new Error("OpenAI unavailable"));

    const result = await createMovieFact(user.id);

    expect(result).toEqual(staleFact);
    expect(mockGenerateFact).toHaveBeenCalledOnce();
    expect(mockCreateFact).not.toHaveBeenCalled();
  });

  it("throws when OpenAI fails and no cached fact exists", async () => {
    mockFindFact.mockResolvedValue(null);

    mockGenerateFact.mockRejectedValue(new Error("OpenAI unavailable"));

    await expect(createMovieFact(user.id)).rejects.toThrow(
      "Unable to generate a movie fact right now",
    );

    expect(mockCreateFact).not.toHaveBeenCalled();
  });
});
