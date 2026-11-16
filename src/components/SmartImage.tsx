import React, { useEffect, useState } from "react";

interface SmartImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
  fallbackSubtitle?: string;
  darkSurface?: boolean;
  compact?: boolean;
}

export const SmartImage: React.FC<SmartImageProps> = ({
  src,
  alt,
  className = "",
  fallbackTitle,
  fallbackSubtitle,
  darkSurface = true,
  compact = false,
}) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (failed) {
    if (compact) {
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium rounded border ${
            darkSurface
              ? "bg-[#161b22] border-[#30363d] text-[#e6edf3]"
              : "bg-slate-100 border-slate-300 text-slate-800"
          }`}
        >
          {fallbackTitle || alt}
        </span>
      );
    }

    return (
      <div
        className={`w-full rounded-md border px-4 py-3 text-left ${
          darkSurface
            ? "bg-[#161b22] border-[#30363d] text-[#e6edf3]"
            : "bg-slate-50 border-slate-200 text-slate-800"
        } ${className}`}
      >
        <div className="text-xs font-semibold">{fallbackTitle || alt}</div>
        {fallbackSubtitle && (
          <div
            className={`text-xs mt-0.5 font-mono ${
              darkSurface ? "text-[#8b949e]" : "text-slate-500"
            }`}
          >
            {fallbackSubtitle}
          </div>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};
