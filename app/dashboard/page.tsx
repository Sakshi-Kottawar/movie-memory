import { Suspense } from "react";
import FactCard from "@/app/components/FactCard";
import { auth } from "@/auth";
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
    <div className="rounded-xl border p-8">
      <h1 className="mb-4 text-3xl font-bold">Welcome to Movie Memory!</h1>
      <p>Name: {user.name ?? "Not available"}</p>
      <p>Email: {user.email}</p>
      <p>Favorite Movie: {user.favoriteMovie}</p>
      <FactCard />
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
