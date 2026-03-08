import { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import { getVersions, type VersionInfo } from "../api";

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function VersionsPage() {
  const { scope: rawScope, name } = useParams<{ scope: string; name: string }>();
  const scope = rawScope?.startsWith('@') ? rawScope : `@${rawScope}`;
  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!rawScope || !name) return;

    setLoading(true);
    setError(null);

    getVersions(scope, name)
      .then((res) => {
        setVersions(res.versions);
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [rawScope, scope, name]);

  if (!rawScope || !name) {
    return <div className="p-8 text-red-600">Missing scope or name parameter</div>;
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <Link
        to={`/${rawScope}/${name}`}
        className="mb-4 inline-block text-sm text-blue-600 hover:text-blue-800 hover:underline"
      >
        &larr; Back to {scope}/{name}
      </Link>

      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        Versions of {scope}/{name}
      </h1>

      {loading && <p className="text-gray-500">Loading...</p>}

      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && versions.length === 0 && (
        <p className="text-gray-500">No versions found</p>
      )}

      {!loading && !error && versions.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 font-semibold text-gray-700">Version</th>
                <th className="px-4 py-3 font-semibold text-gray-700">Published</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((v, i) => (
                <tr
                  key={v.version}
                  className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                >
                  <td className="px-4 py-3">
                    <Link
                      to={`/${rawScope}/${name}?version=${v.version}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {v.version}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatDate(v.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
