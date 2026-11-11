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
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="movie" className="mb-2 block font-medium">
          Favorite Movie
        </label>

        <input
          id="movie"
          name="movie"
          type="text"
          required
          minLength={2}
          maxLength={100}
          placeholder="e.g. Inception"
          className="w-full rounded-lg border p-3 text-gray-900"
        />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 text-white disabled:opacity-50"
      >
        {pending ? "Saving..." : "Continue to Dashboard"}
      </button>
    </form>
  );
}
