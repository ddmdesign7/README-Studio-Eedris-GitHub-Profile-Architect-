import React, { useState } from "react";
import { Check, Copy, Download } from "lucide-react";

interface MarkdownCodeViewProps {
  markdown: string;
  filename?: string;
  onDownload: () => void;
}

export const MarkdownCodeView: React.FC<MarkdownCodeViewProps> = ({
  markdown,
  filename = "README.md",
  onDownload,
}) => {
  const [copied, setCopied] = useState(false);
  const lines = markdown.split("\n");
  const byteCount = new Blob([markdown]).size;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3 text-xs text-slate-600 tabular-nums">
          <span className="font-mono font-semibold text-slate-900">{filename}</span>
          <span aria-hidden="true">·</span>
          <span>{lines.length} lines</span>
          <span aria-hidden="true">·</span>
          <span>{(byteCount / 1024).toFixed(2)} KB</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                Copied to Clipboard
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy Raw Markdown
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Download README.md
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-[#0d1117] text-[#e6edf3] p-5 font-mono text-[13px] leading-6">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx} className="hover:bg-[#161b22]">
                <td className="select-none pr-4 text-right text-[#6e7681] w-10 align-top tabular-nums">
                  {idx + 1}
                </td>
                <td className="whitespace-pre-wrap break-all align-top">{line || " "}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
