import { Suspense } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import OnboardingForm from "@/app/components/OnboardingForm";

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

  if (user.favoriteMovie) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white px-7 py-10 shadow-sm sm:px-10">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-2xl">
          🎞️
        </div>

        <div className="mb-8">
          <span className="mb-3 inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            GETTING STARTED
          </span>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            One movie, endless stories.
          </h1>

          <p className="mt-3 leading-7 text-slate-500">
            Tell us your favorite movie and discover a fun fact about it.
          </p>
        </div>

        <OnboardingForm />

        <p className="mt-7 text-center text-xs text-slate-400">
          You can get started in just a few seconds.
        </p>
      </div>
    </main>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-50">
          <p className="text-sm text-slate-500">Loading onboarding...</p>
        </main>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
