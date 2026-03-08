import { Link } from 'react-router';
import type { AgentSummary } from '../api';

function relativeTime(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;

  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

export default function AgentCard({ name, scope, description, latestVersion, updatedAt }: AgentSummary) {
  const displayName = scope ? `${scope}/${name}` : name;
  const scopeSegment = scope ? scope.replace(/^@/, '') : '_';
  const linkPath = `/${scopeSegment}/${name}`;

  return (
    <Link
      to={linkPath}
      className="block rounded-lg border border-gray-200 p-5 transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-bold text-gray-900 truncate">
          {displayName}
        </h3>
        <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
          {latestVersion}
        </span>
      </div>

      {description && (
        <p className="mt-2 text-sm text-gray-500 line-clamp-2">
          {description}
        </p>
      )}

      <p className="mt-3 text-xs text-gray-400">
        Updated {relativeTime(updatedAt)}
      </p>
    </Link>
  );
}
