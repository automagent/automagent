import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { stringify } from 'yaml';

interface DefinitionViewerProps {
  definition: Record<string, unknown>;
}

export default function DefinitionViewer({ definition }: DefinitionViewerProps) {
  const [copied, setCopied] = useState(false);
  const yamlString = stringify(definition, { lineWidth: 120 });

  async function handleCopy() {
    await navigator.clipboard.writeText(yamlString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative rounded-lg overflow-hidden border border-gray-700">
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 z-10 rounded-md bg-gray-700 px-3 py-1 text-xs text-gray-200 hover:bg-gray-600 transition-colors"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <SyntaxHighlighter
        language="yaml"
        style={oneDark}
        customStyle={{ margin: 0, borderRadius: '0.5rem', padding: '1.25rem' }}
      >
        {yamlString}
      </SyntaxHighlighter>
    </div>
  );
}
