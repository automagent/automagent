import type { AgentDefinition } from '@automagent/schema';

export interface RenderOptions {
  /** Include prohibited_actions section. Default: true. */
  includeProhibited?: boolean;
  /** Include file references (e.g., `See: <file>`). Default: false. */
  includeFileRefs?: boolean;
  /**
   * How persona fields are joined with the system text.
   * - 'lines': persona fields appear as consecutive lines after an empty line separator (claude-code / copilot style)
   * - 'paragraphs': persona fields are joined with double newlines (cursor style)
   * Default: 'lines'.
   */
  personaStyle?: 'lines' | 'paragraphs';
}

/**
 * Render the instructions body (without guardrails) from an AgentDefinition.
 * Returns a string suitable for embedding in markdown.
 */
export function renderInstructionsBody(def: AgentDefinition, opts: RenderOptions = {}): string {
  const { includeFileRefs = false, personaStyle = 'lines' } = opts;
  const instructions = def.instructions;

  if (!instructions) return '';
  if (typeof instructions === 'string') return instructions;

  if (personaStyle === 'paragraphs') {
    // Cursor style: parts joined by double newlines
    const parts: string[] = [];

    if (typeof instructions.system === 'string') {
      parts.push(instructions.system);
    }

    if (instructions.persona && typeof instructions.persona === 'object') {
      const persona = instructions.persona;
      if (persona.role) parts.push(`**Role:** ${persona.role}`);
      if (persona.tone) parts.push(`**Tone:** ${persona.tone}`);
      if (Array.isArray(persona.expertise)) {
        parts.push(`**Expertise:** ${persona.expertise.join(', ')}`);
      }
    }

    return parts.join('\n\n');
  }

  // Lines style (claude-code / copilot): lines pushed sequentially
  const lines: string[] = [];

  if (typeof instructions.system === 'string') {
    lines.push(instructions.system);
  } else if (includeFileRefs && instructions.system && typeof instructions.system === 'object') {
    const sys = instructions.system as { file?: string };
    if (typeof sys.file === 'string') {
      lines.push(`See: ${sys.file}`);
    }
  }

  if (instructions.persona && typeof instructions.persona === 'object') {
    const persona = instructions.persona;
    lines.push('');
    if (persona.role) lines.push(`**Role:** ${persona.role}`);
    if (persona.tone) lines.push(`**Tone:** ${persona.tone}`);
    if (Array.isArray(persona.expertise)) {
      lines.push(`**Expertise:** ${persona.expertise.join(', ')}`);
    }
  }

  return lines.join('\n');
}

/**
 * Render guardrails (behavioral rules and prohibited actions) as markdown lines.
 * Returns an array of lines (without trailing newline).
 */
export function renderGuardrailsLines(def: AgentDefinition, opts: RenderOptions = {}): string[] {
  const { includeProhibited = true } = opts;
  const guardrails = def.guardrails;
  if (!guardrails) return [];

  const behavioral = guardrails.behavioral;
  const prohibited = includeProhibited ? guardrails.prohibited_actions : undefined;

  if ((!behavioral || behavioral.length === 0) && (!prohibited || prohibited.length === 0)) {
    return [];
  }

  const lines: string[] = [];
  lines.push('');
  lines.push('## Rules');

  if (behavioral) {
    for (const rule of behavioral) {
      lines.push(`- ${rule}`);
    }
  }

  if (prohibited && prohibited.length > 0) {
    lines.push('');
    lines.push('## Prohibited Actions');
    for (const action of prohibited) {
      lines.push(`- NEVER: ${action}`);
    }
  }

  return lines;
}

/**
 * Render a complete instructions + guardrails markdown block from an AgentDefinition.
 * Combines renderInstructionsBody and renderGuardrailsLines.
 */
export function renderInstructionsMarkdown(def: AgentDefinition, opts: RenderOptions = {}): string {
  const body = renderInstructionsBody(def, opts);
  const guardrailLines = renderGuardrailsLines(def, opts);

  const parts: string[] = [];
  if (body) parts.push(body);
  if (guardrailLines.length > 0) parts.push(guardrailLines.join('\n'));

  return parts.join('\n');
}
