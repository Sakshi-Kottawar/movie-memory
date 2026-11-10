import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createMovieFact } from "@/lib/facts";

export async function GET() {
  try {
    // 1. Authenticate the request
    const session = await auth();

    if (!session?.user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Find the authenticated user
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

    // 3. Require onboarding
    if (!user.favoriteMovie) {
      return Response.json(
        { error: "Complete onboarding first" },
        { status: 400 },
      );
    }

    // 4. Generate and save movie fact
    const fact = await createMovieFact(user.id);

    // 5. Return the result
    return Response.json({
      movie: fact.movie,
      fact: fact.fact,
      createdAt: fact.createdAt,
    });
  } catch (error) {
    console.error("Movie fact generation failed:", error);

    return Response.json(
      { error: "Unable to generate a movie fact right now" },
      { status: 500 },
    );
  }
}
