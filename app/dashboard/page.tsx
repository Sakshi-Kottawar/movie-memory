import { Suspense } from "react";
import FactCard from "@/app/components/FactCard";
import Image from "next/image";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

async function DashboardContent() {
  // Step 1: Check the authenticated session
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/");
  }

  // Step 2: Retrieve the user from PostgreSQL
  const user = await prisma.user.findUnique({
    where: {
      email: session.user.email,
    },
    select: {
      name: true,
      email: true,
      image: true,
      favoriteMovie: true,
    },
  });

  if (!user) {
    redirect("/");
  }

  // Step 3: Check onboarding status
  if (!user.favoriteMovie) {
    redirect("/onboarding");
  }

  // Step 4: Display dashboard
  return (
    <div className="w-full max-w-xl rounded-xl border p-8 shadow-sm">
      <h1 className="mb-6 text-3xl font-bold">Movie Memory Dashboard</h1>

      {/* Google user profile */}
      <div className="mb-6 flex items-center gap-4">
        {user.image ? (
          <Image
            src={user.image}
            alt="Google profile picture"
            width={64}
            height={64}
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 text-2xl text-gray-700">
            {user.name?.charAt(0).toUpperCase() ?? "U"}
          </div>
        )}

        <div>
          <h2 className="text-xl font-semibold">{user.name ?? "Movie Fan"}</h2>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
      </div>

      {/* Favorite movie */}
      <div className="rounded-lg bg-gray-100 p-4 text-gray-900">
        <p className="text-sm text-gray-500">Your Favorite Movie</p>
        <p className="mt-1 text-xl font-semibold">{user.favoriteMovie}</p>
      </div>

      {/* Existing movie fact component */}
      <FactCard />

      {/* Logout */}
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}
      >
        <button
          type="submit"
          className="mt-6 w-full rounded-lg border border-red-500 px-5 py-3 font-medium text-red-600 hover:bg-red-50"
        >
          Logout
        </button>
      </form>
    </div>
  );
}

export default function Dashboard() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <Suspense fallback={<p>Loading dashboard...</p>}>
        <DashboardContent />
      </Suspense>
    </main>
  );
}
