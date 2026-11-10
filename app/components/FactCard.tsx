"use client";

import { useState } from "react";

type FactResponse = {
  movie: string;
  fact: string;
  createdAt: string;
};

export default function FactCard() {
  const [data, setData] = useState<FactResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerateFact() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/fact", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to generate movie fact");
      }

      const result: FactResponse = await response.json();
      setData(result);
    } catch {
      setError("Unable to generate a fact. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-6 rounded-xl border p-6">
      <h2 className="mb-3 text-xl font-semibold">Movie Fun Fact</h2>

      {data && (
        <div className="mb-4">
          <p className="font-medium">{data.movie}</p>
          <p className="mt-2 text-gray-600">{data.fact}</p>
        </div>
      )}

      {error && (
        <p role="alert" className="mb-4 text-red-600">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleGenerateFact}
        disabled={loading}
        className="rounded-lg bg-blue-600 px-5 py-3 text-white disabled:opacity-50"
      >
        {loading ? "Generating..." : "Generate Fun Fact"}
      </button>
    </section>
  );
}
