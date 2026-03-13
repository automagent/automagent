import type { AgentDefinition } from '@automagent/schema';
import { renderInstructionsBody, renderGuardrailsLines } from '../utils/render-instructions.js';

export function exportCursor(data: AgentDefinition): Record<string, string> {
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

  // Body: instructions (cursor uses paragraph style)
  const body = renderInstructionsBody(data, { personaStyle: 'paragraphs' });
  if (body) lines.push(body);

  // Guardrails (cursor only renders behavioral, not prohibited_actions)
  const guardrailLines = renderGuardrailsLines(data, { includeProhibited: false });
  lines.push(...guardrailLines);

  files[`.cursor/rules/${data.name}.mdc`] = lines.join('\n') + '\n';
  return files;
}
