import ReactMarkdown from 'react-markdown';

interface ReadmeViewerProps {
  content: string;
}

export default function ReadmeViewer({ content }: ReadmeViewerProps) {
  return (
    <div className="readme-viewer">
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mt-6 mb-3 pb-2 border-b border-gray-200">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold mt-5 mb-2 pb-1 border-b border-gray-100">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold mt-4 mb-2">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="my-3 leading-relaxed text-gray-700">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="my-3 ml-6 list-disc text-gray-700">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-3 ml-6 list-decimal text-gray-700">{children}</ol>
          ),
          li: ({ children }) => <li className="my-1">{children}</li>,
          code: ({ children, className }) => {
            const isBlock = className?.startsWith('language-');
            if (isBlock) {
              return (
                <code className="block bg-gray-900 text-gray-100 rounded-lg p-4 my-3 overflow-x-auto text-sm">
                  {children}
                </code>
              );
            }
            return (
              <code className="bg-gray-100 text-gray-800 rounded px-1.5 py-0.5 text-sm">
                {children}
              </code>
            );
          },
          pre: ({ children }) => <pre className="my-3">{children}</pre>,
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-blue-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-gray-300 pl-4 my-3 text-gray-600 italic">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-6 border-gray-200" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
