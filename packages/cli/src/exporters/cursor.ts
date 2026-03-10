interface AgentInput {
  name: string;
  description: string;
  model?: string | Record<string, unknown>;
  instructions?: string | Record<string, unknown>;
  context?: Array<Record<string, unknown>>;
  guardrails?: Record<string, unknown>;
  scope?: string;
  [key: string]: unknown;
}

export function exportCursor(data: AgentInput): Record<string, string> {
  const files: Record<string, string> = {};

  // Collect file globs from context
  const globs: string[] = [];
  if (data.context) {
    for (const ctx of data.context) {
      if (typeof ctx.file === 'string') {
        globs.push(ctx.file);
      }
    }
  }

  const lines: string[] = [];

  // Frontmatter
  lines.push('---');
  lines.push(`description: ${data.description}`);
  if (globs.length > 0) {
    lines.push(`globs: ${globs.join(', ')}`);
    lines.push('alwaysApply: false');
  } else {
    lines.push('alwaysApply: true');
  }
  lines.push('---');
  lines.push('');

  // Body: instructions
  lines.push(resolveInstructionsBody(data.instructions));

  // Guardrails
  const guardrails = data.guardrails as Record<string, unknown> | undefined;
  if (guardrails) {
    const behavioral = guardrails.behavioral as string[] | undefined;
    if (behavioral && behavioral.length > 0) {
      lines.push('');
      lines.push('## Rules');
      for (const rule of behavioral) {
        lines.push(`- ${rule}`);
      }
    }
  }

  files[`.cursor/rules/${data.name}.mdc`] = lines.join('\n') + '\n';
  return files;
}

function resolveInstructionsBody(instructions: string | Record<string, unknown> | undefined): string {
  if (!instructions) return '';
  if (typeof instructions === 'string') return instructions;

  const parts: string[] = [];
  const instr = instructions as Record<string, unknown>;

  if (typeof instr.system === 'string') {
    parts.push(instr.system);
  }

  if (instr.persona && typeof instr.persona === 'object') {
    const persona = instr.persona as Record<string, unknown>;
    if (persona.role) parts.push(`**Role:** ${persona.role}`);
    if (persona.tone) parts.push(`**Tone:** ${persona.tone}`);
    if (Array.isArray(persona.expertise)) {
      parts.push(`**Expertise:** ${persona.expertise.join(', ')}`);
    }
  }

  return parts.join('\n\n');
}
