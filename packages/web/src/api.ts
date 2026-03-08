// Typed API client for the automagent registry

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentSummary {
  name: string;
  scope: string | null;
  description: string;
  latestVersion: string;
  updatedAt: string;
}

export interface AgentDetail {
  name: string;
  scope: string | null;
  version: string;
  definition: Record<string, unknown>;
  readme: string | null;
  createdAt: string;
}

export interface VersionInfo {
  version: string;
  createdAt: string;
}

export interface PaginatedResponse {
  agents: AgentSummary[];
  total: number;
  limit: number;
  offset: number;
}

export interface VersionsResponse {
  name: string;
  scope: string | null;
  versions: VersionInfo[];
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export const BASE_URL = "";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    throw new Error(`API request failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export function listAgents(limit?: number, offset?: number): Promise<PaginatedResponse> {
  const params = new URLSearchParams();
  if (limit !== undefined) params.set("limit", String(limit));
  if (offset !== undefined) params.set("offset", String(offset));
  const qs = params.toString();
  return request<PaginatedResponse>(`/v1/agents${qs ? `?${qs}` : ""}`);
}

export function searchAgents(
  q?: string,
  tags?: string[],
  limit?: number,
  offset?: number,
): Promise<PaginatedResponse> {
  const params = new URLSearchParams();
  if (q !== undefined) params.set("q", q);
  if (tags !== undefined && tags.length > 0) params.set("tags", tags.join(","));
  if (limit !== undefined) params.set("limit", String(limit));
  if (offset !== undefined) params.set("offset", String(offset));
  const qs = params.toString();
  return request<PaginatedResponse>(`/v1/search${qs ? `?${qs}` : ""}`);
}

export function getAgent(
  scope: string,
  name: string,
  version?: string,
): Promise<AgentDetail> {
  const params = new URLSearchParams();
  if (version !== undefined) params.set("version", version);
  const qs = params.toString();
  return request<AgentDetail>(`/v1/agents/${scope}/${name}${qs ? `?${qs}` : ""}`);
}

export function getVersions(scope: string, name: string): Promise<VersionsResponse> {
  return request<VersionsResponse>(`/v1/agents/${scope}/${name}/versions`);
}
