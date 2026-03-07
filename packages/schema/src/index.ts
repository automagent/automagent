// @automagent/schema - Agent definition schema, types, and validator

import { Ajv, type ErrorObject } from 'ajv';
import agentSchema from './v1.schema.json' with { type: 'json' };
import composeSchema from './compose.schema.json' with { type: 'json' };

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Model configuration when using the object form.
 * Simple form: just a string like "claude-sonnet".
 */
export interface ModelConfig {
  /** Model identifier, e.g. "claude-sonnet-4-20250514" */
  id: string;
  /** Model provider, e.g. "anthropic", "openai" */
  provider?: string;
  /** Model-specific settings */
  settings?: {
    temperature?: number;
    max_tokens?: number;
    [key: string]: unknown;
  };
  /** Fallback model if primary is unavailable */
  fallback?: {
    id: string;
    provider?: string;
    [key: string]: unknown;
  };
  /** Compatible models with compatibility scores */
  compatible?: Array<{
    id: string;
    score?: number;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

/**
 * Structured instructions configuration.
 * Simple form: just a string with the system prompt.
 */
export interface InstructionsConfig {
  /** System prompt — string or file reference */
  system?: string | { file: string; [key: string]: unknown };
  /** Agent persona configuration */
  persona?: {
    role?: string;
    tone?: string;
    expertise?: string[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Inline tool definition following MCP's Tool interface.
 */
export interface ToolDefinition {
  /** Tool name */
  name: string;
  /** Human-readable description */
  description?: string;
  /** JSON Schema for tool parameters */
  inputSchema?: Record<string, unknown>;
  /** MCP tool annotations */
  annotations?: {
    readOnlyHint?: boolean;
    idempotentHint?: boolean;
    destructiveHint?: boolean;
    openWorldHint?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * MCP server reference for tool discovery.
 */
export interface McpServerConfig {
  /** MCP server name */
  name: string;
  /** Transport type */
  transport: 'stdio' | 'streamable-http';
  /** URL for streamable-http transport */
  url?: string;
  /** Command for stdio transport */
  command?: string;
  /** Arguments for stdio transport */
  args?: string[];
  /** Authentication configuration */
  auth?: {
    type?: string;
    scope?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * A static knowledge source for the agent.
 */
export interface ContextSource {
  /** Path to a local file or glob pattern */
  file?: string;
  /** URL to fetch content from */
  url?: string;
  /** Agent reference for dynamic context */
  agent?: string;
  [key: string]: unknown;
}

/**
 * Guardrail rule for input or output validation.
 */
export interface GuardrailRule {
  /** Guardrail name */
  name?: string;
  /** Human-readable description */
  description?: string;
  /** Action to take when triggered */
  action?: 'block' | 'warn' | 'transform' | 'log';
  [key: string]: unknown;
}

/**
 * Guardrails configuration — input/output validation, behavioral rules, prohibited actions.
 */
export interface Guardrails {
  /** Input guardrails applied before processing */
  input?: GuardrailRule[];
  /** Output guardrails applied after processing */
  output?: GuardrailRule[];
  /** Behavioral rules as natural language strings */
  behavioral?: string[];
  /** Actions the agent must never take */
  prohibited_actions?: string[];
  /** Actions requiring human approval */
  require_approval?: Array<{
    pattern?: string;
    approvers?: string[];
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

/**
 * Governance configuration — data classification, PII handling, compliance.
 */
export interface Governance {
  /** Data classification level */
  data_classification?: string;
  /** How PII is handled */
  pii_handling?: string;
  /** Types of PII the agent processes */
  pii_types?: string[];
  /** Allowed data residency regions */
  data_residency?: string[];
  /** Compliance frameworks */
  compliance_frameworks?: string[];
  /** Risk level assessment */
  risk_level?: string;
  /** Authorized use constraints */
  authorized_use?: {
    departments?: string[];
    environments?: string[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Trigger that activates the agent — event-based or scheduled.
 */
export interface Trigger {
  /** Event name */
  event?: string;
  /** Cron expression for scheduled execution */
  schedule?: string;
  /** Human-readable description */
  description?: string;
  /** Event filter conditions */
  filter?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Agent dependency declaration.
 */
export interface AgentDependency {
  /** Agent reference (e.g., "@acme/fact-checker:^1.2.0") */
  ref: string;
  /** Role this dependency plays */
  role?: string;
  /** Whether this dependency is required */
  required?: boolean;
  /** Interaction mode */
  interaction?: string;
  [key: string]: unknown;
}

/**
 * Organizational metadata.
 */
export interface Metadata {
  /** Team or individual who owns this agent */
  owner?: string;
  /** Tags for discovery and categorization */
  tags?: string[];
  /** Structured categories */
  categories?: {
    domain?: string;
    function?: string;
    maturity?: string;
    [key: string]: unknown;
  };
  /** License identifier */
  license?: string;
  /** Author information */
  author?: {
    name?: string;
    email?: string;
    [key: string]: unknown;
  };
  /** Source repository URL */
  repository?: string;
  /** Inline changelog */
  changelog?: string;
  [key: string]: unknown;
}

/**
 * The full agent definition — the core type for agent.yaml files.
 *
 * Only `name`, `description`, and `model` are required.
 * All other fields are optional and support progressive disclosure.
 */
export interface AgentDefinition {
  /** Machine-readable slug. Pattern: ^[a-z0-9][a-z0-9-]*$ */
  name: string;
  /** Human-readable description of what the agent does */
  description: string;
  /** Model identifier (string) or full model configuration (object) */
  model: string | ModelConfig;
  /** Schema version. Defaults to "v1". */
  apiVersion?: string;
  /** Definition type: "agent" or "team" */
  kind?: 'agent' | 'team';
  /** Semver of this agent definition */
  version?: string;
  /** System prompt (string) or structured instructions (object) */
  instructions?: string | InstructionsConfig;
  /** Inline tool definitions */
  tools?: ToolDefinition[];
  /** MCP server references */
  mcp?: McpServerConfig[];
  /** Static knowledge sources */
  context?: ContextSource[];
  /** Structured input schema */
  inputs?: { schema?: Record<string, unknown>; [key: string]: unknown };
  /** Structured output schema */
  outputs?: { schema?: Record<string, unknown>; [key: string]: unknown };
  /** Input/output validation, behavioral rules, prohibited actions */
  guardrails?: Guardrails;
  /** Data classification, PII handling, compliance */
  governance?: Governance;
  /** Test datasets, minimum scores, behavioral assertions */
  evaluation?: {
    dataset?: string;
    minimum_score?: number;
    assertions?: Array<{ input?: string; expected?: string; [key: string]: unknown }>;
    [key: string]: unknown;
  };
  /** Events and schedules that activate the agent */
  triggers?: Trigger[];
  /** Per-environment overrides */
  environments?: Record<string, Record<string, unknown>>;
  /** Agent and tool dependency declarations */
  dependencies?: {
    agents?: AgentDependency[];
    [key: string]: unknown;
  };
  /** Framework-specific config under namespaced keys */
  extensions?: Record<string, unknown>;
  /** Organizational metadata */
  metadata?: Metadata;
  /** Open-ended: any additional or x- prefixed fields */
  [key: string]: unknown;
}

// =============================================================================
// Compose Types
// =============================================================================

/**
 * Agent reference in a composition.
 */
export interface AgentRef {
  /** Agent reference (e.g., "@acme/legal-reviewer:^2.1.0") */
  ref: string;
  /** Role this agent plays in the composition */
  role: string;
  /** Human-readable description of this agent's role */
  description?: string;
  [key: string]: unknown;
}

/**
 * Workflow step in a composition.
 */
export interface WorkflowStep {
  /** Role name of the agent to execute */
  agent?: string;
  /** Input source — a string reference or array of references */
  input_from?: string | string[];
  [key: string]: unknown;
}

/**
 * Workflow orchestration configuration.
 */
export interface Workflow {
  /** Workflow type */
  type?: 'sequential' | 'parallel' | 'router' | 'hierarchical' | 'dynamic';
  /** Workflow steps */
  steps?: WorkflowStep[];
  [key: string]: unknown;
}

/**
 * The agent-compose definition — multi-agent composition.
 *
 * Required: `name`, `description`, `agents`.
 */
export interface ComposeDefinition {
  /** Machine-readable slug */
  name: string;
  /** Human-readable description */
  description: string;
  /** Agent references participating in this composition */
  agents: AgentRef[];
  /** Schema version */
  apiVersion?: string;
  /** Must be "compose" */
  kind?: 'compose';
  /** Semver of this composition */
  version?: string;
  /** Workflow orchestration */
  workflow?: Workflow;
  /** Governance configuration */
  governance?: {
    data_classification?: string;
    inherits_from?: string;
    [key: string]: unknown;
  };
  /** Organizational metadata */
  metadata?: {
    owner?: string;
    tags?: string[];
    license?: string;
    [key: string]: unknown;
  };
  /** Open-ended: any additional fields */
  [key: string]: unknown;
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Result of a schema validation.
 */
export interface ValidationResult {
  /** Whether the data is valid */
  valid: boolean;
  /** Array of validation errors (empty if valid) */
  errors: ValidationError[];
}

/**
 * A single validation error.
 */
export interface ValidationError {
  /** JSON pointer to the field with the error */
  instancePath: string;
  /** Error message */
  message?: string;
  /** Schema path that triggered the error */
  schemaPath: string;
  /** Additional error parameters */
  params: Record<string, unknown>;
  [key: string]: unknown;
}

const ajv = new Ajv({ allErrors: true, strict: false });
const validateAgentFn = ajv.compile(agentSchema);
const validateComposeFn = ajv.compile(composeSchema);

function mapErrors(errors: ErrorObject[] | null | undefined): ValidationError[] {
  return (errors ?? []).map((e) => ({
    instancePath: e.instancePath,
    message: e.message,
    schemaPath: e.schemaPath,
    params: e.params as Record<string, unknown>,
  }));
}

/**
 * Validate data against the agent definition schema (v1).
 *
 * @param data - A parsed object (not raw YAML string) to validate
 * @returns Validation result with `valid` boolean and `errors` array
 *
 * @example
 * ```ts
 * import { validate } from '@automagent/schema';
 *
 * const result = validate({
 *   name: 'my-agent',
 *   description: 'A helpful agent',
 *   model: 'claude-sonnet',
 * });
 * console.log(result.valid); // true
 * ```
 */
export function validate(data: unknown): ValidationResult {
  const valid = validateAgentFn(data);
  return {
    valid: !!valid,
    errors: mapErrors(validateAgentFn.errors),
  };
}

/**
 * Validate data against the agent-compose schema.
 *
 * @param data - A parsed object to validate
 * @returns Validation result with `valid` boolean and `errors` array
 */
export function validateCompose(data: unknown): ValidationResult {
  const valid = validateComposeFn(data);
  return {
    valid: !!valid,
    errors: mapErrors(validateComposeFn.errors),
  };
}

// Re-export schemas for direct access
export { agentSchema, composeSchema };
