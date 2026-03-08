import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { listAgents, searchAgents } from '../api';
import type { AgentSummary } from '../api';
import AgentCard from '../components/AgentCard';
import SearchBar from '../components/SearchBar';

const PAGE_SIZE = 20;

export default function HomePage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';

  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reset offset when query changes
  useEffect(() => {
    setOffset(0);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const request = query
      ? searchAgents(query, undefined, PAGE_SIZE, offset)
      : listAgents(PAGE_SIZE, offset);

    request
      .then((res) => {
        if (cancelled) return;
        setAgents(res.agents);
        setTotal(res.total);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [query, offset]);

  const hasPrev = offset > 0;
  const hasNext = total !== null && offset + PAGE_SIZE < total;

  return (
    <div>
      <div className="mb-6">
        <SearchBar totalResults={loading ? null : total} />
      </div>

      {loading && (
        <p className="text-sm text-gray-500">Loading...</p>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {!loading && !error && agents.length === 0 && (
        <p className="text-sm text-gray-500">No agents found</p>
      )}

      {!loading && !error && agents.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {agents.map((agent) => (
              <AgentCard key={`${agent.scope ?? '_'}/${agent.name}`} {...agent} />
            ))}
          </div>

          {(hasPrev || hasNext) && (
            <div className="mt-8 flex items-center justify-center gap-4">
              <button
                type="button"
                disabled={!hasPrev}
                onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={!hasNext}
                onClick={() => setOffset((o) => o + PAGE_SIZE)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
