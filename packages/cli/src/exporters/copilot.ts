import type { AgentDefinition } from '@automagent/schema';
import { renderInstructionsMarkdown } from '../utils/render-instructions.js';

export function exportCopilot(data: AgentDefinition): Record<string, string> {
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

function buildCopilotBody(data: AgentDefinition): string {
  return renderInstructionsMarkdown(data, { includeProhibited: true, personaStyle: 'lines' }) + '\n';
}
