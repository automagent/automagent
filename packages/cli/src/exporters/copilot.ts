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

export function exportCopilot(data: AgentInput): Record<string, string> {
  const files: Record<string, string> = {};

  // Main instructions file
  const body = buildCopilotBody(data);
  files['.github/copilot-instructions.md'] = body;

  // Path-specific instructions from context globs
  const globs: string[] = [];
  if (data.context) {
    for (const ctx of data.context) {
      if (typeof ctx.file === 'string') {
        globs.push(ctx.file);
      }
    }
  }

  if (globs.length > 0) {
    const pathLines: string[] = [];
    pathLines.push('---');
    pathLines.push(`applyTo: "${globs.join(',')}"`);
    pathLines.push('---');
    pathLines.push('');
    pathLines.push(body);
    files[`.github/instructions/${data.name}.instructions.md`] = pathLines.join('\n');
  }

  return files;
}

function buildCopilotBody(data: AgentInput): string {
  const lines: string[] = [];

  // Instructions
  const instructions = data.instructions;
  if (typeof instructions === 'string') {
    lines.push(instructions);
  } else if (instructions && typeof instructions === 'object') {
    const instr = instructions as Record<string, unknown>;
    if (typeof instr.system === 'string') {
      lines.push(instr.system);
    }
    if (instr.persona && typeof instr.persona === 'object') {
      const persona = instr.persona as Record<string, unknown>;
      lines.push('');
      if (persona.role) lines.push(`**Role:** ${persona.role}`);
      if (persona.tone) lines.push(`**Tone:** ${persona.tone}`);
      if (Array.isArray(persona.expertise)) {
        lines.push(`**Expertise:** ${persona.expertise.join(', ')}`);
      }
    }
  }

  // Guardrails
  const guardrails = data.guardrails as Record<string, unknown> | undefined;
  if (guardrails) {
    const behavioral = guardrails.behavioral as string[] | undefined;
    const prohibited = guardrails.prohibited_actions as string[] | undefined;
    if ((behavioral && behavioral.length > 0) || (prohibited && prohibited.length > 0)) {
      lines.push('');
      lines.push('## Rules');
      if (behavioral) {
        for (const rule of behavioral) {
          lines.push(`- ${rule}`);
        }
      }
      if (prohibited) {
        lines.push('');
        lines.push('## Prohibited Actions');
        for (const action of prohibited) {
          lines.push(`- NEVER: ${action}`);
        }
      }
    }
  }

  return lines.join('\n') + '\n';
}
