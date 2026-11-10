import "server-only";
import { prisma } from "@/lib/prisma";
import { generateMovieFact } from "@/lib/openai";

export async function createMovieFact(userId: string) {
  // Step 1: Look up the authenticated user
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

  // Step 2: Generate a fact using OpenAI
  const fact = await generateMovieFact(user.favoriteMovie);

  // Step 3: Save the generated fact to PostgreSQL
  const savedFact = await prisma.movieFact.create({
    data: {
      userId: user.id,
      movie: user.favoriteMovie,
      fact,
    },
  });

  // Step 4: Return the saved record
  return savedFact;
}
