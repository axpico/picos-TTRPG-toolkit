import clsx from "clsx";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Shared markdown renderer. There is no tailwind-typography plugin in this
 * project, so element styling is mapped explicitly to ink/accent tokens to
 * match the dark theme. Links open in a new tab.
 */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={clsx("text-sm leading-relaxed text-ink-200", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, ...props }) => (
            <h1 className="display mb-2 mt-3 text-lg font-semibold text-ink-50 first:mt-0" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="display mb-2 mt-3 text-base font-semibold text-ink-50 first:mt-0" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="mb-1 mt-3 text-sm font-semibold uppercase tracking-wide text-ink-100 first:mt-0" {...props} />
          ),
          p: ({ node, ...props }) => <p className="my-2 first:mt-0 last:mb-0" {...props} />,
          ul: ({ node, ...props }) => <ul className="my-2 list-disc space-y-0.5 pl-5" {...props} />,
          ol: ({ node, ...props }) => <ol className="my-2 list-decimal space-y-0.5 pl-5" {...props} />,
          li: ({ node, ...props }) => <li className="marker:text-ink-500" {...props} />,
          a: ({ node, ...props }) => (
            <a
              className="text-accent-500 underline-offset-2 hover:text-accent-400 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          strong: ({ node, ...props }) => <strong className="font-semibold text-ink-50" {...props} />,
          em: ({ node, ...props }) => <em className="italic" {...props} />,
          code: ({ node, ...props }) => (
            <code className="rounded bg-ink-800 px-1 py-0.5 font-mono text-xs text-accent-400" {...props} />
          ),
          pre: ({ node, ...props }) => (
            <pre className="my-2 overflow-auto rounded-md border border-ink-700 bg-ink-900 p-2 text-xs" {...props} />
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote className="my-2 border-l-2 border-ink-600 pl-3 text-ink-400" {...props} />
          ),
          hr: () => <hr className="my-3 border-ink-700" />,
          table: ({ node, ...props }) => (
            <table className="my-2 w-full border-collapse text-xs" {...props} />
          ),
          th: ({ node, ...props }) => (
            <th className="border border-ink-700 bg-ink-800 px-2 py-1 text-left font-medium" {...props} />
          ),
          td: ({ node, ...props }) => <td className="border border-ink-700 px-2 py-1" {...props} />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
