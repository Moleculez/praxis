"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownProps {
  content: string;
  className?: string;
}

export function Markdown({ content, className = "" }: MarkdownProps) {
  if (!content) return null;

  return (
    <div className={`prose prose-sm dark:prose-invert max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
              {children}
            </a>
          ),
          code: ({ children, className: codeClassName }) => {
            const isInline = !codeClassName;
            if (isInline) {
              return <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono">{children}</code>;
            }
            return (
              <pre className="rounded-lg bg-muted p-4 overflow-x-auto">
                <code className="text-sm font-mono">{children}</code>
              </pre>
            );
          },
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-sm">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
