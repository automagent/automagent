import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { getAgent, getVersions } from '../api';
import type { AgentDetail, VersionInfo } from '../api';
import DefinitionViewer from '../components/DefinitionViewer';
import ReadmeViewer from '../components/ReadmeViewer';

type Tab = 'definition' | 'readme';

export default function AgentDetailPage() {
  const { scope: rawScope, name } = useParams<{ scope: string; name: string }>();
  const scope = rawScope?.startsWith('@') ? rawScope : `@${rawScope}`;
  const [searchParams, setSearchParams] = useSearchParams();
  const versionParam = searchParams.get('version') ?? undefined;

  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('definition');
  const [installCopied, setInstallCopied] = useState(false);

  useEffect(() => {
    if (!rawScope || !name) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([getAgent(scope, name, versionParam), getVersions(scope, name)])
      .then(([agentData, versionsData]) => {
        if (cancelled) return;
        setAgent(agentData);
        setVersions(versionsData.versions);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load agent');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [rawScope, scope, name, versionParam]);

  // Reset to definition tab when agent changes (in case readme disappears)
  useEffect(() => {
    if (agent && !agent.readme && activeTab === 'readme') {
      setActiveTab('definition');
    }
  }, [agent, activeTab]);

  function handleVersionChange(newVersion: string) {
    setSearchParams(newVersion ? { version: newVersion } : {});
  }

  async function handleCopyInstall() {
    if (!agent) return;
    const cmd = `automagent pull ${scope}/${name}:${agent.version}`;
    await navigator.clipboard.writeText(cmd);
    setInstallCopied(true);
    setTimeout(() => setInstallCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-400 text-sm">Loading agent...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="rounded-lg bg-red-50 border border-red-200 px-6 py-4 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!agent) return null;

  const description =
    typeof agent.definition['description'] === 'string'
      ? agent.definition['description']
      : null;

  const installCommand = `automagent pull ${scope}/${name}:${agent.version}`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">
            {scope}/{name}
          </h1>
          <span className="shrink-0 rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
            v{agent.version}
          </span>
        </div>
        {description && (
          <p className="text-gray-500 text-base">{description}</p>
        )}
      </div>

      {/* Version dropdown + versions link */}
      <div className="flex items-center gap-4">
        <label htmlFor="version-select" className="text-sm font-medium text-gray-600">
          Version
        </label>
        <select
          id="version-select"
          value={agent.version}
          onChange={(e) => handleVersionChange(e.target.value)}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-gray-400"
        >
          {versions.map((v) => (
            <option key={v.version} value={v.version}>
              {v.version}
            </option>
          ))}
        </select>
        <Link
          to={`/${rawScope}/${name}/versions`}
          className="text-sm text-blue-600 hover:underline"
        >
          View all versions
        </Link>
      </div>

      {/* Install command */}
      <div className="relative rounded-lg bg-gray-900 px-4 py-3 flex items-center justify-between gap-3">
        <code className="text-sm text-gray-100 overflow-x-auto">
          {installCommand}
        </code>
        <button
          onClick={handleCopyInstall}
          className="shrink-0 rounded-md bg-gray-700 px-3 py-1 text-xs text-gray-200 hover:bg-gray-600 transition-colors"
        >
          {installCopied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-0">
          <button
            onClick={() => setActiveTab('definition')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'definition'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Definition
          </button>
          {agent.readme && (
            <button
              onClick={() => setActiveTab('readme')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'readme'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Readme
            </button>
          )}
        </div>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'definition' && (
          <DefinitionViewer definition={agent.definition} />
        )}
        {activeTab === 'readme' && agent.readme && (
          <ReadmeViewer content={agent.readme} />
        )}
      </div>
    </div>
  );
}
