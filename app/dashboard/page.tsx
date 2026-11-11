import { Suspense } from "react";
import Image from "next/image";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import FactCard from "@/app/components/FactCard";

async function DashboardContent() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
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

  if (!user.favoriteMovie) {
    redirect("/onboarding");
  }

  const displayName = user.name || "Movie Explorer";

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-xl">
              🎬
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">
              Movie Memory
            </span>
          </div>

          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-6 px-5 py-10 sm:px-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Your movie dashboard
          </h1>
          <p className="mt-2 text-slate-500">
            A little movie trivia, just for you.
          </p>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex items-center gap-4">
            {user.image ? (
              <Image
                src={user.image}
                alt={`${displayName}'s profile`}
                width={56}
                height={56}
                className="h-14 w-14 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-xl font-bold text-indigo-700">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-slate-900">
                {displayName}
              </h2>
              <p className="break-all text-sm text-slate-500">{user.email}</p>
            </div>
          </div>

          <div className="my-6 border-t border-slate-100" />

          <div className="rounded-xl bg-indigo-50 px-5 py-4">
            <div className="mb-2 flex items-center gap-2">
              <span aria-hidden="true">🎞️</span>
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                Your favorite movie
              </p>
            </div>

            <p className="text-xl font-bold text-slate-900">
              {user.favoriteMovie}
            </p>
          </div>
        </section>

        <FactCard />

        <p className="text-center text-xs text-slate-400">
          Made for movie lovers, powered by curiosity.
        </p>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-50">
          <p className="text-sm text-slate-500">Loading your dashboard...</p>
        </main>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
