import { Suspense } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

async function saveFavoriteMovie(formData: FormData) {
  "use server";

  // 1. Authenticate the user
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/");
  }

  // 2. Read and validate the submitted movie
  const value = formData.get("movie");

  if (typeof value !== "string") {
    throw new Error("Movie name is required");
  }

  const movie = value.trim();

  if (movie.length < 2 || movie.length > 100) {
    throw new Error("Movie name must be between 2 and 100 characters");
  }

  // 3. Update the authenticated user's record
  await prisma.user.update({
    where: {
      email: session.user.email,
      favoriteMovie: null,
    },
    data: {
      favoriteMovie: movie,
    },
  });

  // 4. Redirect after successful save
  redirect("/dashboard");
}

async function OnboardingContent() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { favoriteMovie: true },
  });

  if (!user) {
    redirect("/");
  }

  // Returning users should not repeat onboarding
  if (user.favoriteMovie) {
    redirect("/dashboard");
  }

  return (
    <div className="w-full max-w-md rounded-xl border p-8">
      <h1 className="mb-3 text-3xl font-bold">Welcome to Movie Memory!</h1>

      <p className="mb-6 text-gray-600">What's your favorite movie?</p>

      <form action={saveFavoriteMovie}>
        <label htmlFor="movie" className="mb-2 block font-medium">
          Favorite Movie
        </label>

        <input
          id="movie"
          name="movie"
          type="text"
          required
          minLength={2}
          maxLength={100}
          placeholder="e.g. Inception"
          className="w-full rounded-lg border p-3 text-black"
        />

        <button
          type="submit"
          className="mt-5 w-full rounded-lg bg-blue-600 px-4 py-3 text-white"
        >
          Continue to Dashboard
        </button>
      </form>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Suspense fallback={<p>Loading onboarding...</p>}>
        <OnboardingContent />
      </Suspense>
    </main>
  );
}
