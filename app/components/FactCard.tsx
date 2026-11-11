"use client";

import { useState } from "react";

type MovieFact = {
  movie: string;
  fact: string;
  createdAt: string;
};

export default function FactCard() {
  const [data, setData] = useState<MovieFact | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generateFact() {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/fact", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to generate a movie fact.");
      }

      setData(result as MovieFact);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  const isMock = data?.fact.startsWith("Mock fact:");

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-xl">
          ✨
        </div>

        <div>
          <h2 className="text-lg font-bold text-slate-900">Movie fun fact</h2>
          <p className="text-sm text-slate-500">
            Discover something behind the scenes.
          </p>
        </div>
      </div>

      {data ? (
        <div className="mb-5 rounded-xl bg-slate-50 p-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
              {data.movie}
            </span>

            {isMock && (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                Demo response
              </span>
            )}
          </div>

          <p className="leading-7 text-slate-700">{data.fact}</p>
        </div>
      ) : (
        <div className="mb-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-7 text-center">
          <div className="mb-2 text-3xl">🎥</div>
          <p className="font-medium text-slate-700">
            Ready for a movie surprise?
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Generate your first fun fact below.
          </p>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={generateFact}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {loading ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Generating...
          </>
        ) : (
          <>
            <span aria-hidden="true">✨</span>
            {data ? "Generate another fact" : "Generate fun fact"}
          </>
        )}
      </button>
    </section>
  );
}
