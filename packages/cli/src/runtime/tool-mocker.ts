export interface ToolCall {
  name: string;
  input: Record<string, unknown>;
}

export function mockToolResponse(tool: ToolCall): string {
  return JSON.stringify({
    mock: true,
    tool: tool.name,
    result: `Mock response for ${tool.name}. In production, this would connect to the real tool.`,
  });
}
