import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createMovieFact } from "@/lib/facts";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Authenticate the request
    const session = await auth();

    if (!session?.user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Retrieve the authenticated user
    const user = await prisma.user.findUnique({
      where: {
        email: session.user.email,
      },
      select: {
        id: true,
        favoriteMovie: true,
      },
    });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // 3. Ensure onboarding is completed
    if (!user.favoriteMovie) {
      return Response.json(
        { error: "Complete onboarding first" },
        { status: 400 },
      );
    }

    // 4. Generate or retrieve cached fact
    // Variant A caching and concurrency logic
    // is implemented inside createMovieFact()
    const fact = await createMovieFact(user.id);

    // 5. Return the movie fact
    return Response.json(
      {
        movie: fact.movie,
        fact: fact.fact,
        createdAt: fact.createdAt,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error) {
    console.error("Movie fact generation failed:", error);

    return Response.json(
      {
        error: "Unable to generate a movie fact right now",
      },
      { status: 500 },
    );
  }
}
