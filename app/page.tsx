import { signIn } from "@/auth";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white px-7 py-12 text-center shadow-sm sm:px-12">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-3xl">
          🎬
        </div>

        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Movie Memory
        </h1>

        <p className="mx-auto mt-4 max-w-sm text-base leading-7 text-slate-500">
          Your favorite movies have stories beyond the screen. Discover
          something new about them.
        </p>

        <form
          className="mt-9"
          action={async () => {
            "use server";
            await signIn("google", {
              redirectTo: "/dashboard",
            });
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-indigo-600 px-6 py-3.5 font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-bold text-blue-600">
              G
            </span>
            Continue with Google
          </button>
        </form>

        <p className="mt-6 text-xs text-slate-400">
          Sign in to start exploring your movie memories.
        </p>
      </div>
    </main>
  );
}
