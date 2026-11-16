import React, { useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  Eye,
  Moon,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Sun,
} from "lucide-react";
import { ProfileConfig } from "../types/readme";
import { fetchJson } from "../utils/apiClient";
import { SmartImage } from "./SmartImage";

export interface AiPreviewResult {
  firstImpression: string;
  executiveHighlights: string[];
  suggestions: Array<{
    section: string;
    observation: string;
    recommendation: string;
  }>;
  rewrittenPreview: {
    heroTitle: string;
    heroSubtitle: string;
    heroQuote: string;
    typingLines: string[];
    aboutIntro: string;
    footerTagline: string;
  };
}

interface AiPreviewProps {
  config: ProfileConfig;
  markdown: string;
  onApplyChanges: (patch: Partial<ProfileConfig>) => void;
  onNavigateView: (view: "split" | "preview" | "markdown") => void;
}

const AUDIENCE_OPTIONS = [
  {
    id: "Technical Recruiter",
    label: "Recruiter",
    hint: "Role fit, clarity in 5 seconds, and tangible project outcomes.",
  },
  {
    id: "Open Source Maintainer",
    label: "Maintainer",
    hint: "Engineering stack depth, tooling fluency, and repo contribution clarity.",
  },
  {
    id: "Startup Founder / Client",
    label: "Client & Founder",
    hint: "Product design sensibility, business impact, and contact pathways.",
  },
  {
    id: "Developer Community",
    label: "Community",
    hint: "Approachable voice, creative exploration, and visual craftsmanship.",
  },
] as const;

const QUICK_DIRECTIONS = [
  {
    label: "Executive Clarity",
    prompt: "Tighten copy for fast 10-second scanning with crisp leadership framing.",
  },
  {
    label: "Design & UX Focus",
    prompt: "Spotlight UX/UI craftsmanship, creative systems, and interactive frontend polish.",
  },
  {
    label: "Automation & Stack",
    prompt: "Emphasize digital workflow automation, analytics, and full-stack execution.",
  },
] as const;

export const AiPreview: React.FC<AiPreviewProps> = ({
  config,
  markdown,
  onApplyChanges,
  onNavigateView,
}) => {
  const [audience, setAudience] = useState<string>(AUDIENCE_OPTIONS[0].id);
  const [focusPrompt, setFocusPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiPreviewResult | null>(null);
  const [generatedFor, setGeneratedFor] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<"ai" | "compare">("ai");
  const [githubCanvas, setGithubCanvas] = useState<"dark" | "light">("dark");
  const [appliedSection, setAppliedSection] = useState<string | null>(null);

  const isDark = githubCanvas === "dark";

  // Real deterministic structural metrics computed from live generated markdown
  const metrics = useMemo(() => {
    const textOnly = markdown
      .replace(/<[^>]+>/g, " ")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/[`#>*|_-]/g, " ");
    const words = textOnly.split(/\s+/).filter(Boolean).length;
    const headings = (markdown.match(/^#{1,4}\s|<h[1-4]\b/gm) || []).length;
    const visuals = (markdown.match(/<img\b|!\[[^\]]*\]\(/g) || []).length;
    const links = (markdown.match(/href="|\]\(https?:/g) || []).length;
    return { words, headings, visuals, links };
  }, [markdown]);

  const handleGenerate = async (overrideDirection?: string) => {
    const directionToUse = overrideDirection ?? focusPrompt;
    if (overrideDirection !== undefined) {
      setFocusPrompt(overrideDirection);
    }

    setLoading(true);
    setError(null);
    setAppliedSection(null);

    try {
      const data = await fetchJson<{ preview: AiPreviewResult; audience: string }>(
        "/api/ai/preview",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audience,
            focusPrompt: directionToUse.trim(),
            profile: config,
            markdown,
          }),
        }
      );
      setResult(data.preview);
      setGeneratedFor(data.audience || audience);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate AI preview.");
    } finally {
      setLoading(false);
    }
  };

  const applyPatch = (label: string, patch: Partial<ProfileConfig>) => {
    onApplyChanges(patch);
    setAppliedSection(label);
    setTimeout(() => {
      setAppliedSection((prev) => (prev === label ? null : prev));
    }, 2600);
  };

  const typingPreviewUrl = (lines: string[]) => {
    const encoded = (lines || [])
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => encodeURIComponent(l).replace(/%20/g, "+"))
      .join(";");
    const color = (config.widgets.typingColor || "9B8CFF").replace("#", "");
    return `/api/widgets/typing?color=${encodeURIComponent(color)}&lines=${encoded || "Developer"}`;
  };

  const enabledSkills = (config.skills || []).filter((s) => s.enabled);

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto">
      {/* Workspace Toolbar */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5">
        <div className="max-w-[1360px] mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <h1 className="text-sm sm:text-base font-semibold text-slate-900 tracking-tight">
                AI Audience Preview
              </h1>
              <span className="text-xs text-slate-500 font-mono tabular-nums">
                {metrics.words} words · {metrics.headings} sections · {metrics.visuals} visuals ·{" "}
                {metrics.links} links
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Preview how your README reads through different visitor lenses and test rewritten copy live before applying.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div
              className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200 overflow-x-auto max-w-full"
              role="group"
              aria-label="Target reader lens"
            >
              {AUDIENCE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setAudience(opt.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    audience === opt.id
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => handleGenerate()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
            >
              {loading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              {loading ? "Analyzing README..." : result ? "Refresh AI Preview" : "Generate AI Preview"}
            </button>
          </div>
        </div>

        {/* Direction Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleGenerate();
          }}
          className="max-w-[1360px] mx-auto mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center gap-2"
        >
          <div className="relative flex-1 min-w-0">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={focusPrompt}
              onChange={(e) => setFocusPrompt(e.target.value)}
              placeholder={`Optional direction for ${audience} (e.g. Emphasize UX leadership & workflow automation)`}
              className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:bg-white focus:border-blue-600"
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 sm:pb-0">
            {QUICK_DIRECTIONS.map((dir) => (
              <button
                key={dir.label}
                type="button"
                onClick={() => handleGenerate(dir.prompt)}
                disabled={loading}
                className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:border-slate-300 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
              >
                {dir.label}
              </button>
            ))}
          </div>
        </form>
      </div>

      {/* Main Content Stage */}
      <div className="flex-1 p-4 sm:p-6">
        <div className="max-w-[1360px] mx-auto space-y-5">
          {error && (
            <div className="p-4 rounded-lg border border-rose-200 bg-rose-50 text-rose-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold">AI Preview Unavailable</div>
                <p className="text-xs text-rose-800">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => handleGenerate()}
                className="px-3 py-1.5 text-xs font-medium text-rose-900 bg-white border border-rose-200 rounded-md hover:bg-rose-100 whitespace-nowrap shrink-0 self-start sm:self-auto"
              >
                Retry Request
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Reader Critique & Actionable Suggestions */}
            <div className="lg:col-span-5 space-y-4">
              {loading && (
                <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                  <div className="space-y-2">
                    <div className="h-4 w-40 bg-slate-200 rounded animate-pulse" />
                    <div className="h-3 w-full bg-slate-100 rounded animate-pulse" />
                    <div className="h-3 w-5/6 bg-slate-100 rounded animate-pulse" />
                  </div>
                  <div className="pt-3 border-t border-slate-100 space-y-2.5">
                    <div className="h-3.5 w-32 bg-slate-200 rounded animate-pulse" />
                    <div className="h-14 w-full bg-slate-100 rounded animate-pulse" />
                    <div className="h-14 w-full bg-slate-100 rounded animate-pulse" />
                    <div className="h-14 w-full bg-slate-100 rounded animate-pulse" />
                  </div>
                </div>
              )}

              {!loading && !result && (
                <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
                  <div className="space-y-1.5">
                    <h2 className="text-sm font-semibold text-slate-900">
                      Reader Lens: {audience}
                    </h2>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {AUDIENCE_OPTIONS.find((a) => a.id === audience)?.hint}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600 leading-relaxed">
                    <p>Running an AI Preview inspects your live configuration and renders:</p>
                    <ul className="space-y-1.5 list-disc pl-4">
                      <li>A 5-second first-impression summary for the chosen audience</li>
                      <li>Section-by-section clarity and hierarchy suggestions</li>
                      <li>A tailored hero, typing tagline, and bio rewrite you can inspect live on a GitHub surface before applying</li>
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleGenerate()}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Preview as {audience}
                  </button>
                </div>
              )}

              {!loading && result && (
                <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
                  <div className="p-5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-xs font-semibold text-slate-900">
                        First Impression · {generatedFor || audience}
                      </h2>
                    </div>
                    <p className="text-xs sm:text-[13px] text-slate-700 leading-relaxed">
                      {result.firstImpression}
                    </p>
                  </div>

                  {result.executiveHighlights?.length > 0 && (
                    <div className="p-5 space-y-2.5">
                      <h3 className="text-xs font-semibold text-slate-900">
                        Key Visitor Takeaways
                      </h3>
                      <ul className="space-y-2">
                        {result.executiveHighlights.map((item, idx) => (
                          <li
                            key={idx}
                            className="text-xs text-slate-700 leading-relaxed flex items-start gap-2"
                          >
                            <span className="font-mono text-slate-400 tabular-nums shrink-0">
                              0{idx + 1}.
                            </span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.suggestions?.length > 0 && (
                    <div className="p-5 space-y-3">
                      <h3 className="text-xs font-semibold text-slate-900">
                        Refinement Notes
                      </h3>
                      <div className="divide-y divide-slate-100">
                        {result.suggestions.map((s, idx) => (
                          <div key={idx} className="py-2.5 first:pt-0 last:pb-0 space-y-1">
                            <div className="text-xs font-semibold text-slate-900">
                              {s.section}
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              {s.observation}
                            </p>
                            <p className="text-xs text-slate-800 leading-relaxed">
                              {s.recommendation}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Column: Live Rendered AI Preview Stage */}
            <div className="lg:col-span-7 space-y-3">
              {/* Preview Controls Bar */}
              <div className="bg-white border border-slate-200 rounded-lg px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className="flex items-center p-0.5 bg-slate-100 rounded-md border border-slate-200"
                    role="group"
                    aria-label="Preview comparison mode"
                  >
                    <button
                      type="button"
                      onClick={() => setPreviewMode("ai")}
                      className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                        previewMode === "ai"
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {result ? "AI Preview" : "Current Copy"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewMode("compare")}
                      className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                        previewMode === "compare"
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Side-by-Side Diff
                    </button>
                  </div>

                  <div
                    className="flex items-center p-0.5 bg-slate-100 rounded-md border border-slate-200"
                    role="group"
                    aria-label="GitHub preview surface"
                  >
                    <button
                      type="button"
                      onClick={() => setGithubCanvas("dark")}
                      aria-label="GitHub Dark surface"
                      className={`p-1.5 rounded transition-colors ${
                        isDark ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setGithubCanvas("light")}
                      aria-label="GitHub Light surface"
                      className={`p-1.5 rounded transition-colors ${
                        !isDark ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {result && (
                  <div className="flex flex-wrap items-center gap-2">
                    {appliedSection && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                        <Check className="w-3.5 h-3.5" />
                        Applied {appliedSection}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        applyPatch("Hero & Taglines", {
                          heroTitle: result.rewrittenPreview.heroTitle,
                          heroSubtitle: result.rewrittenPreview.heroSubtitle,
                          typingLines: result.rewrittenPreview.typingLines,
                        })
                      }
                      className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 whitespace-nowrap shrink-0"
                    >
                      Apply Hero
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        applyPatch("About & Quote", {
                          aboutIntro: result.rewrittenPreview.aboutIntro,
                          heroQuote: result.rewrittenPreview.heroQuote,
                          footerTagline: result.rewrittenPreview.footerTagline,
                        })
                      }
                      className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 whitespace-nowrap shrink-0"
                    >
                      Apply Bio
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        applyPatch("All Suggestions", {
                          heroTitle: result.rewrittenPreview.heroTitle,
                          heroSubtitle: result.rewrittenPreview.heroSubtitle,
                          heroQuote: result.rewrittenPreview.heroQuote,
                          typingLines: result.rewrittenPreview.typingLines,
                          aboutIntro: result.rewrittenPreview.aboutIntro,
                          footerTagline: result.rewrittenPreview.footerTagline,
                        })
                      }
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 whitespace-nowrap shrink-0"
                    >
                      Apply All
                    </button>
                  </div>
                )}
              </div>

              {/* Preview Canvas */}
              {previewMode === "compare" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Current Snapshot */}
                  <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-xs font-semibold text-slate-900">
                        Current README Copy
                      </span>
                      <span className="text-xs text-slate-500">Live Workspace</span>
                    </div>
                    <div className="space-y-3 text-xs">
                      <div>
                        <div className="text-slate-500 font-medium mb-0.5">Hero Title</div>
                        <div className="font-semibold text-slate-900">{config.heroTitle}</div>
                      </div>
                      <div>
                        <div className="text-slate-500 font-medium mb-0.5">Tagline</div>
                        <div className="text-slate-700">{config.heroSubtitle}</div>
                      </div>
                      <div>
                        <div className="text-slate-500 font-medium mb-0.5">Typing Lines</div>
                        <ul className="space-y-0.5 font-mono text-[11px] text-slate-700">
                          {(config.typingLines || []).map((line, i) => (
                            <li key={i}>· {line}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="text-slate-500 font-medium mb-0.5">About Me</div>
                        <p className="text-slate-700 leading-relaxed">{config.aboutIntro}</p>
                      </div>
                      <div>
                        <div className="text-slate-500 font-medium mb-0.5">Quote</div>
                        <p className="italic text-slate-600">{config.heroQuote}</p>
                      </div>
                      <div>
                        <div className="text-slate-500 font-medium mb-0.5">Footer Sign-off</div>
                        <div className="text-slate-700">{config.footerTagline}</div>
                      </div>
                    </div>
                  </div>

                  {/* AI Draft Snapshot */}
                  <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-xs font-semibold text-slate-900">
                        AI Proposed Copy
                      </span>
                      <span className="text-xs text-blue-600 font-medium">
                        {generatedFor || audience}
                      </span>
                    </div>
                    {result ? (
                      <div className="space-y-3 text-xs">
                        <div>
                          <div className="text-slate-500 font-medium mb-0.5">Hero Title</div>
                          <div className="font-semibold text-slate-900">
                            {result.rewrittenPreview.heroTitle}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-500 font-medium mb-0.5">Tagline</div>
                          <div className="text-slate-700">
                            {result.rewrittenPreview.heroSubtitle}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-500 font-medium mb-0.5">Typing Lines</div>
                          <ul className="space-y-0.5 font-mono text-[11px] text-slate-700">
                            {result.rewrittenPreview.typingLines.map((line, i) => (
                              <li key={i}>· {line}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <div className="text-slate-500 font-medium mb-0.5">About Me</div>
                          <p className="text-slate-700 leading-relaxed">
                            {result.rewrittenPreview.aboutIntro}
                          </p>
                        </div>
                        <div>
                          <div className="text-slate-500 font-medium mb-0.5">Quote</div>
                          <p className="italic text-slate-600">
                            {result.rewrittenPreview.heroQuote}
                          </p>
                        </div>
                        <div>
                          <div className="text-slate-500 font-medium mb-0.5">Footer Sign-off</div>
                          <div className="text-slate-700">
                            {result.rewrittenPreview.footerTagline}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Generate an AI Preview to compare the tailored draft line-by-line against your current README copy.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  className={`rounded-lg border overflow-hidden transition-colors ${
                    isDark
                      ? "bg-[#0d1117] border-[#30363d] text-[#e6edf3]"
                      : "bg-white border-[#d0d7de] text-[#1f2328]"
                  }`}
                >
                  <div
                    className={`flex items-center justify-between px-4 py-2.5 border-b text-xs font-mono ${
                      isDark
                        ? "bg-[#161b22] border-[#30363d] text-[#8b949e]"
                        : "bg-[#f6f8fa] border-[#d0d7de] text-[#656d76]"
                    }`}
                  >
                    <span>
                      {config.username || "ddmdesign7"}/{config.repoName || config.username || "ddmdesign7"} / README.md
                    </span>
                    <span>
                      {result ? `AI Preview · ${generatedFor || audience}` : "Current Render"}
                    </span>
                  </div>

                  <div className="p-6 space-y-5">
                    {config.widgets.showCapsuleHeader && (
                      <div className="w-full overflow-hidden rounded">
                        <SmartImage
                          src={`/api/widgets/capsule?color=${encodeURIComponent(
                            config.widgets.bannerGradient
                          )}&section=header&height=${
                            (config.widgets.bannerTitle || "").trim() ? 230 : 110
                          }&text=${encodeURIComponent(
                            (config.widgets.bannerTitle || "").trim()
                          )}&desc=${encodeURIComponent(
                            (config.widgets.bannerSubtitle || "").trim()
                          )}`}
                          alt="Header Wave Banner"
                          className="w-full h-auto block"
                          darkSurface={isDark}
                        />
                      </div>
                    )}

                    <div className="flex justify-center">
                      <SmartImage
                        src={typingPreviewUrl(
                          result ? result.rewrittenPreview.typingLines : config.typingLines
                        )}
                        alt="Typing SVG preview"
                        className="max-w-full h-auto"
                        darkSurface={isDark}
                        fallbackTitle={(
                          result ? result.rewrittenPreview.typingLines : config.typingLines
                        ).join(" · ")}
                      />
                    </div>

                    <div className="text-center space-y-2.5">
                      <h2
                        className={`text-xl sm:text-2xl font-bold tracking-tight pb-2 border-b ${
                          isDark
                            ? "border-[#21262d] text-[#e6edf3]"
                            : "border-[#d8dee4] text-[#1f2328]"
                        }`}
                        style={{ textWrap: "balance" }}
                      >
                        {result ? result.rewrittenPreview.heroTitle : config.heroTitle}
                      </h2>
                      <p
                        className={`text-sm font-medium max-w-2xl mx-auto leading-relaxed ${
                          isDark ? "text-[#c9d1d9]" : "text-[#1f2328]"
                        }`}
                      >
                        {result ? result.rewrittenPreview.heroSubtitle : config.heroSubtitle}
                      </p>

                      {enabledSkills.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-1.5 pt-1">
                          {enabledSkills.slice(0, 6).map((skill) => (
                            <SmartImage
                              key={`ai-prev-${skill.id}`}
                              src={skill.badgeUrl}
                              alt={skill.name}
                              className="h-7 w-auto"
                              darkSurface={isDark}
                              compact
                              fallbackTitle={skill.name}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    <div
                      className={`pt-4 border-t space-y-3 ${
                        isDark ? "border-[#21262d]" : "border-[#d8dee4]"
                      }`}
                    >
                      <h3 className="text-base font-semibold">About Me</h3>
                      <p
                        className={`text-sm leading-relaxed ${
                          isDark ? "text-[#e6edf3]" : "text-[#1f2328]"
                        }`}
                      >
                        {result ? result.rewrittenPreview.aboutIntro : config.aboutIntro}
                      </p>
                      <blockquote
                        className={`p-3 rounded-md border text-xs italic ${
                          isDark
                            ? "bg-[#161b22] border-[#30363d] text-[#c9d1d9]"
                            : "bg-[#f6f8fa] border-[#d0d7de] text-[#57606a]"
                        }`}
                      >
                        &ldquo;{result ? result.rewrittenPreview.heroQuote : config.heroQuote}&rdquo;
                      </blockquote>
                    </div>

                    <div
                      className={`pt-4 border-t flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs ${
                        isDark
                          ? "border-[#21262d] text-[#8b949e]"
                          : "border-[#d8dee4] text-[#656d76]"
                      }`}
                    >
                      <span>
                        {result ? result.rewrittenPreview.footerTagline : config.footerTagline}
                      </span>
                      <button
                        type="button"
                        onClick={() => onNavigateView("preview")}
                        className={`inline-flex items-center gap-1 font-medium whitespace-nowrap shrink-0 ${
                          isDark
                            ? "text-[#58a6ff] hover:underline"
                            : "text-[#0969da] hover:underline"
                        }`}
                      >
                        Open Full README Preview
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
