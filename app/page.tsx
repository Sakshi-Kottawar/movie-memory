import { signIn } from "@/auth";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold">Movie Memory</h1>

      <p className="mt-4 text-gray-600">
        Discover interesting facts about your favorite movies.
      </p>

      <form
        action={async () => {
          "use server";
          await signIn("google", {
            redirectTo: "/dashboard",
          });
        }}
      >
        <button
          type="submit"
          className="mt-6 rounded-lg bg-blue-600 px-6 py-3 text-white"
        >
          Sign in with Google
        </button>
      </form>
    </main>
  );
}
