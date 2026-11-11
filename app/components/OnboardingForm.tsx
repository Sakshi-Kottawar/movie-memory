"use client";

import { useActionState } from "react";
import {
  saveFavoriteMovie,
  type OnboardingState,
} from "@/app/onboarding/actions";

const initialState: OnboardingState = {
  error: null,
};

export default function OnboardingForm() {
  const [state, formAction, pending] = useActionState(
    saveFavoriteMovie,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label
          htmlFor="movie"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          Favorite movie
        </label>

        <input
          id="movie"
          name="movie"
          type="text"
          required
          minLength={2}
          maxLength={100}
          placeholder="e.g. Inception"
          aria-describedby={state.error ? "movie-error" : "movie-hint"}
          aria-invalid={Boolean(state.error)}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
        />

        <p id="movie-hint" className="mt-2 text-xs text-slate-400">
          Enter a movie title between 2 and 100 characters.
        </p>
      </div>

      {state.error && (
        <div
          id="movie-error"
          role="alert"
          className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Saving your movie...
          </>
        ) : (
          "Continue to Dashboard"
        )}
      </button>
    </form>
  );
}
