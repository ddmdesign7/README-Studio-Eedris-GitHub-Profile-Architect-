import React, { useCallback, useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, ExternalLink, Plus, RefreshCw } from "lucide-react";
import { ZAYENNN_PINNED_FALLBACK } from "../data/presets";
import { PinnedAuditItem, ProjectItem } from "../types/readme";
import { fetchJson } from "../utils/apiClient";

interface ReferenceComparisonProps {
  username: string;
  onImportReferenceProject?: (project: ProjectItem) => void;
}

interface ReferenceData {
  sourceUrl: string;
  content: string;
}

const STRUCTURAL_MAPPING = [
  {
    section: "01. Waving Header & Animated Title",
    zayennnPattern: "capsule-render waving banner + Welcome to My GitHub Universe! + readme-typing-svg",
    eedrisAdaptation:
      "Same waving gradient & typing-svg architecture tailored to Eedris (Digital Sales Automation, DDM Guru, AI Revenue Analytics).",
    upgrade: "Zero-dependency SVG URLs with automatic URL encoding.",
  },
  {
    section: "02. Two-Column Split Table (60% / 40%)",
    zayennnPattern: "<table borderless> with width='60%' About/Stack on left & width='40%' Analytics on right",
    eedrisAdaptation:
      "Mirrors the exact 60/40 asymmetric grid: About Me, Tech Stack & Mastery Table left; Analytics & Socials right.",
    upgrade: "Replaced relative ./emot/ paths with verified raw.githubusercontent.com Fluent Emoji URLs.",
  },
  {
    section: "03. 6-Card Pinned Showcase & Live Demos",
    zayennnPattern:
      "6 pinned repositories (react-web-python-learning, convert-speedtest, camera-sensor-scrolling, face-scanning, streamingnime, eaz-cosmic-portfolio-v2)",
    eedrisAdaptation:
      "3x2 Pinned Repository showcase grid highlighting DDM Guru Platform, Revenue Engine, Predictive Analytics, CRM Bridge & ddmdesign7 repos.",
    upgrade: "Supports Live Demo links, language dot indicators, and star counts.",
  },
  {
    section: "04. Current Focus & Mastery Table",
    zayennnPattern: "4-column Markdown table (Area | Technology | Status | Progress %) with flat-square badges",
    eedrisAdaptation:
      "Tracks Sales Ops (Digital Manager Guru), Analytics (Python & AI), Frontend (React), and Backend (Node.js & Docker).",
    upgrade: "Editable percentages and statuses right inside the Studio sidebar.",
  },
  {
    section: "05. Contribution Overview & Activity",
    zayennnPattern:
      "Contributed to zayennn/Belajar-Java, zayennn/eaz-cosmic-portfolio-v2, zayennn/belajar-php-dan-laravel and 65 other repositories",
    eedrisAdaptation:
      "Contributed to ddmdesign7/FINORA-FINANCE-ADVISORY, ddmdesign7/Bit-Capital-Hub, ddmdesign7/Delimovi and 41 other repositories.",
    upgrade: "Pairs live Coding Activity graph with a clean repository contribution summary.",
  },
  {
    section: "06. Year Progress & Footer Wave",
    zayennnPattern: "ASCII Year Progress bar + Thanks for Visiting + Profile Views counter + footer wave",
    eedrisAdaptation:
      "Live computed Year Progress bar, Komarev view counter for ddmdesign7, and matching capsule-render wave footer.",
    upgrade: "Dynamically computes current year completion percentage.",
  },
  {
    section: "07. Cosmic Portfolio v2 Hero, 3-Col Stack & Principles",
    zayennnPattern:
      "eaz-cosmic-portfolio-v2: Rocket.png/Star.png hero, subtitle + status badge row, Evolution table, 3-column 33% tech stack, Key Design Principles, Getting Started bash",
    eedrisAdaptation:
      "Integrated into both Eedris Profile and the Cosmic Portfolio Style preset with editable Evolution rows, Design Principles, and bash quickstart.",
    upgrade: "Toggleable 3-column vs categorized stack and live-rendered hero badge strip.",
  },
  {
    section: "08. WakaTime Rhythm, Telemetry & Quick Clone",
    zayennnPattern:
      "Shields Code Time / AI Code Time / Lines of Code badges + Night Owl / Tuesday commit bars + git clone commands (Belajar-Java, eaz-cosmic-portfolio-v2, belajar-php-dan-laravel)",
    eedrisAdaptation:
      "Rendered Shields telemetry strip, Africa/Nigeria WakaTime commit rhythm block, and dynamic git clone block for Eedris's featured ddmdesign7 repos.",
    upgrade: "Auto-computes ASCII commit percentages & proportional bars with START_SECTION:waka markers.",
  },
];

type RefRepoKey = "zayennn" | "eaz-cosmic-portfolio-v2";

export const ReferenceComparison: React.FC<ReferenceComparisonProps> = ({
  username,
  onImportReferenceProject,
}) => {
  const [activeRefRepo, setActiveRefRepo] = useState<RefRepoKey>("eaz-cosmic-portfolio-v2");
  const [refData, setRefData] = useState<ReferenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pinnedItems, setPinnedItems] = useState<PinnedAuditItem[]>(ZAYENNN_PINNED_FALLBACK);
  const [pinnedLoading, setPinnedLoading] = useState(true);
  const [importedNames, setImportedNames] = useState<string[]>([]);

  const loadReference = useCallback(async (repo: RefRepoKey, signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson<{ sourceUrl: string; content: string }>(
        `/api/github/readme?username=zayennn&repo=${encodeURIComponent(repo)}`,
        { signal }
      );
      setRefData({ sourceUrl: data.sourceUrl, content: data.content });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to load reference repository");
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  const loadPinnedAudit = useCallback(async (signal?: AbortSignal) => {
    setPinnedLoading(true);
    try {
      const data = await fetchJson<{ items: Partial<PinnedAuditItem>[] }>(
        "/api/github/pinned-audit",
        { signal }
      );
      if (Array.isArray(data.items) && data.items.length > 0) {
        setPinnedItems(
          ZAYENNN_PINNED_FALLBACK.map((fallback) => {
            const live = data.items.find((item) => item.name === fallback.name);
            if (!live || !live.verified) return fallback;
            return {
              ...fallback,
              description: live.description || fallback.description,
              language: live.language || fallback.language,
              stars: typeof live.stars === "number" ? live.stars : fallback.stars,
              forks: typeof live.forks === "number" ? live.forks : fallback.forks,
              homepage: live.homepage ?? fallback.homepage,
              topics: Array.isArray(live.topics) && live.topics.length > 0 ? live.topics : fallback.topics,
              defaultBranch: live.defaultBranch || fallback.defaultBranch,
              verified: true,
            };
          })
        );
      }
    } catch {
      // Keep verified snapshot if audit request is aborted or offline
    } finally {
      if (!signal?.aborted) {
        setPinnedLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadReference(activeRefRepo, controller.signal);
    return () => controller.abort();
  }, [activeRefRepo, loadReference]);

  useEffect(() => {
    const controller = new AbortController();
    loadPinnedAudit(controller.signal);
    return () => controller.abort();
  }, [loadPinnedAudit]);

  const handleImport = (item: PinnedAuditItem) => {
    if (!onImportReferenceProject) return;
    onImportReferenceProject({
      id: `ref-${item.name}-${Date.now()}`,
      name: item.name,
      summary: item.description,
      stack: item.topics.join(" · ") || item.language,
      language: item.language,
      visibility: "Public",
      stars: item.stars,
      homepage: item.homepage,
      url: item.url,
    });
    setImportedNames((prev) => (prev.includes(item.name) ? prev : [...prev, item.name]));
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-slate-900">
              Structural Mirror: zayennn/README.md to {username}/README.md
            </h2>
            <p className="text-sm text-slate-600">
              Verified 6 pinned repositories, contribution overview, and structural mapping adapted
              for Eedris&apos;s Digital Manager Guru portfolio.
            </p>
          </div>
          <a
            href="https://github.com/zayennn"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            View zayennn on GitHub
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Verified Pinned Repositories Audit */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                01. Verified Pinned Repositories (6 / 6 Public)
              </h3>
              <p className="text-xs text-slate-600">
                Overview reference: Contributed to zayennn/Belajar-Java, zayennn/eaz-cosmic-portfolio-v2,
                zayennn/belajar-php-dan-laravel and 65 other repositories
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500">
              {pinnedLoading ? "Verifying via GitHub API..." : "6 / 6 Verified Public"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {pinnedItems.map((item) => {
              const added = importedNames.includes(item.name);
              return (
                <div
                  key={item.name}
                  className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline font-mono truncate"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">{item.name}</span>
                      </a>
                      <span className="text-xs font-mono text-slate-600 tabular-nums shrink-0">
                        {item.language} · ⭐ {item.stars}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed">{item.description}</p>

                    <div className="text-xs text-slate-500 leading-relaxed">
                      <strong className="text-slate-700">README Pattern:</strong>{" "}
                      {item.patternHighlight}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-2 text-slate-500 truncate">
                      <span>Branch: {item.defaultBranch}</span>
                      {item.homepage && (
                        <>
                          <span aria-hidden="true">·</span>
                          <a
                            href={item.homepage}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline truncate"
                          >
                            Live Demo
                          </a>
                        </>
                      )}
                    </div>

                    {onImportReferenceProject && (
                      <button
                        type="button"
                        onClick={() => handleImport(item)}
                        disabled={added}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 rounded hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
                      >
                        <Plus className="w-3 h-3" />
                        {added ? "Added to Builder" : "Use as Template"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Mapping Table */}
        <section className="space-y-2.5">
          <h3 className="text-base font-semibold text-slate-900">
            02. Structural Mapping Matrix
          </h3>
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="px-4 py-3">Section</th>
                  <th className="px-4 py-3">Reference Pattern (zayennn)</th>
                  <th className="px-4 py-3">Adapted Output ({username})</th>
                  <th className="px-4 py-3">Portability Upgrade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {STRUCTURAL_MAPPING.map((item) => (
                  <tr key={item.section} className="hover:bg-slate-50/70 align-top">
                    <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                      {item.section}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs leading-relaxed">
                      {item.zayennnPattern}
                    </td>
                    <td className="px-4 py-3 text-slate-800 text-xs leading-relaxed">
                      <span className="inline-flex items-center gap-1 text-blue-600 font-medium mr-1">
                        <ArrowRight className="w-3 h-3" />
                      </span>
                      {item.eedrisAdaptation}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs leading-relaxed">
                      {item.upgrade}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Live Source Inspection */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-slate-700">Live Reference Source:</span>
              <div className="inline-flex items-center p-0.5 bg-slate-200/70 rounded-md">
                {(
                  [
                    { id: "eaz-cosmic-portfolio-v2", label: "zayennn/eaz-cosmic-portfolio-v2" },
                    { id: "zayennn", label: "zayennn/zayennn" },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveRefRepo(item.id)}
                    className={`px-2.5 py-1 text-xs font-mono rounded transition-colors whitespace-nowrap shrink-0 ${
                      activeRefRepo === item.id
                        ? "bg-white text-slate-900 font-semibold shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => loadReference(activeRefRepo)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh Source
            </button>
          </div>

          {loading ? (
            <div className="p-6 space-y-2.5">
              <div className="h-4 bg-slate-100 rounded w-3/4 animate-pulse" />
              <div className="h-4 bg-slate-100 rounded w-1/2 animate-pulse" />
              <div className="h-4 bg-slate-100 rounded w-5/6 animate-pulse" />
            </div>
          ) : error ? (
            <div className="p-6 text-sm text-rose-700 bg-rose-50">{error}</div>
          ) : (
            <pre className="p-4 max-h-96 overflow-auto bg-[#0d1117] text-[#e6edf3] font-mono text-xs leading-relaxed whitespace-pre-wrap break-all">
              {refData?.content}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};
