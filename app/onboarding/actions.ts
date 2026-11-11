"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export type OnboardingState = {
  error: string | null;
};

export async function saveFavoriteMovie(
  _previousState: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/");
  }

  const value = formData.get("movie");

  if (typeof value !== "string") {
    return { error: "Please enter a movie name." };
  }

  const movie = value.trim();

  if (movie.length < 2 || movie.length > 100) {
    return {
      error: "Movie name must be between 2 and 100 characters.",
    };
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, favoriteMovie: true },
  });

  if (!user) {
    return { error: "User account not found." };
  }

  if (user.favoriteMovie) {
    redirect("/dashboard");
  }

  await prisma.user.updateMany({
    where: {
      id: user.id,
      favoriteMovie: null,
    },
    data: {
      favoriteMovie: movie,
    },
  });

  redirect("/dashboard");
}
