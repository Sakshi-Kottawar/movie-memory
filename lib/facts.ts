import "server-only";

import { prisma } from "@/lib/prisma";
import { generateMovieFact } from "@/lib/openai";

const CACHE_TTL_MS = 60_000;

type MovieFactResult = Awaited<ReturnType<typeof prisma.movieFact.create>>;

const inFlight = new Map<string, Promise<MovieFactResult>>();

async function getOrGenerateFact(
  userId: string,
  movie: string,
): Promise<MovieFactResult> {
  // Check the cache inside the shared operation
  const latestFact = await prisma.movieFact.findFirst({
    where: {
      userId,
      movie,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (latestFact) {
    const ageMs = Date.now() - latestFact.createdAt.getTime();

    if (ageMs >= 0 && ageMs < CACHE_TTL_MS) {
      console.log("Cache HIT");
      return latestFact;
    }
  }

  console.log("Cache MISS: Generating new fact");

  let fact: string;

  try {
    // Request a fresh fact from OpenAI
    fact = await generateMovieFact(movie);
  } catch (error) {
    console.error("OpenAI generation failed:", error);

    // Return the last stored fact if one exists,
    // even if it is older than 60 seconds.
    if (latestFact) {
      console.log("Returning stale fact as fallback");
      return latestFact;
    }

    // No previous fact exists
    throw new Error(
      "Unable to generate a movie fact right now. Please try again later.",
    );
  }

  // Persist the successfully generated fact
  return prisma.movieFact.create({
    data: {
      userId,
      movie,
      fact,
    },
  });
}

export async function createMovieFact(userId: string) {
  // Retrieve the authenticated user's favorite movie
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      favoriteMovie: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (!user.favoriteMovie) {
    throw new Error("User has not completed onboarding");
  }

  // Unique key for user + movie
  const key = JSON.stringify([user.id, user.favoriteMovie]);

  // Reuse an existing in-progress operation
  const existing = inFlight.get(key);

  if (existing) {
    console.log("Single-flight: Reusing existing operation");
    return existing;
  }

  // This function starts the cache check and generation
  const operation = getOrGenerateFact(user.id, user.favoriteMovie);

  // Register the Promise synchronously
  inFlight.set(key, operation);

  try {
    return await operation;
  } finally {
    if (inFlight.get(key) === operation) {
      inFlight.delete(key);
    }
  }
}
