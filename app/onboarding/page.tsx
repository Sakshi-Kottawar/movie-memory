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

  // Returning users should not repeat onboarding
  if (user.favoriteMovie) {
    redirect("/dashboard");
  }

  return (
    <div className="w-full max-w-md rounded-xl border p-8">
      <h1 className="mb-3 text-3xl font-bold">Welcome to Movie Memory!</h1>

      <p className="mb-6 text-gray-600">What's your favorite movie?</p>

      <OnboardingForm />
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
