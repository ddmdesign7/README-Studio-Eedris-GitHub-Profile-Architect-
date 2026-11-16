import React, { Component, useEffect, useMemo, useState } from "react";
import { Eye, Layers, RotateCcw } from "lucide-react";
import { COSMIC_PROJECT_PRESET, EEDRIS_PROFILE_PRESET } from "./data/presets";
import { ProfileConfig } from "./types/readme";
import { generateReadmeMarkdown } from "./utils/markdownGenerator";
import { BuilderSidebar, BuilderTab } from "./components/BuilderSidebar";
import { ReadmePreview } from "./components/ReadmePreview";
import { MarkdownCodeView } from "./components/MarkdownCodeView";
import { ReferenceComparison } from "./components/ReferenceComparison";
import { AiPreview } from "./components/AiPreview";
import { ResponsiveNav, WorkspaceView } from "./components/ResponsiveNav";

const STORAGE_KEY = "readme-studio-config-v8";

function mergeWithDefaults(raw: unknown): ProfileConfig {
  if (!raw || typeof raw !== "object") {
    return EEDRIS_PROFILE_PRESET;
  }
  const obj = raw as Partial<ProfileConfig>;
  const base =
    obj.id === COSMIC_PROJECT_PRESET.id ? COSMIC_PROJECT_PRESET : EEDRIS_PROFILE_PRESET;

  return {
    ...base,
    ...obj,
    typingLines: Array.isArray(obj.typingLines) ? obj.typingLines : base.typingLines,
    aboutBullets: Array.isArray(obj.aboutBullets) ? obj.aboutBullets : base.aboutBullets,
    pillarsMatrix: Array.isArray(obj.pillarsMatrix) ? obj.pillarsMatrix : base.pillarsMatrix,
    creativeSkills: Array.isArray(obj.creativeSkills) ? obj.creativeSkills : base.creativeSkills,
    skills: Array.isArray(obj.skills) ? obj.skills : base.skills,
    digitalWorlds: Array.isArray(obj.digitalWorlds) ? obj.digitalWorlds : base.digitalWorlds,
    exploringItems: Array.isArray(obj.exploringItems) ? obj.exploringItems : base.exploringItems,
    projects: Array.isArray(obj.projects) ? obj.projects : base.projects,
    evolutionTable: Array.isArray(obj.evolutionTable)
      ? obj.evolutionTable
      : base.evolutionTable,
    principles: Array.isArray(obj.principles) ? obj.principles : base.principles,
    focusMatrix: Array.isArray(obj.focusMatrix) ? obj.focusMatrix : base.focusMatrix,
    telemetryBadges: {
      ...base.telemetryBadges,
      ...(obj.telemetryBadges || {}),
    },
    wakaStats: {
      ...base.wakaStats,
      ...(obj.wakaStats || {}),
      timeOfDay: Array.isArray(obj.wakaStats?.timeOfDay)
        ? obj.wakaStats.timeOfDay
        : base.wakaStats.timeOfDay,
      weekdays: Array.isArray(obj.wakaStats?.weekdays)
        ? obj.wakaStats.weekdays
        : base.wakaStats.weekdays,
    },
    socials: {
      ...base.socials,
      ...(obj.socials || {}),
    },
    widgets: {
      ...base.widgets,
      ...(obj.widgets || {}),
    },
  };
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class StudioErrorBoundary extends Component<
  { children: React.ReactNode; onReset: () => void },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error?.message || "Unexpected rendering error." };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <h1 className="text-base font-semibold text-slate-900">
              Workspace State Recovery
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => {
                this.props.onReset();
                this.setState({ hasError: false, message: "" });
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset to Eedris Default
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [config, setConfig] = useState<ProfileConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return mergeWithDefaults(JSON.parse(saved));
      }
    } catch {
      // Ignore storage parse error and fall back to default preset
    }
    return EEDRIS_PROFILE_PRESET;
  });

  const [view, setView] = useState<WorkspaceView>("split");
  const [activeBuilderTab, setActiveBuilderTab] = useState<BuilderTab>("identity");
  const [mobileSplitPane, setMobileSplitPane] = useState<"editor" | "preview">("editor");
  const [menuOpen, setMenuOpen] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {
      // Ignore storage quota errors
    }
  }, [config]);

  const markdown = useMemo(() => generateReadmeMarkdown(config), [config]);

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "README.md";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleCopyMarkdown = async () => {
    await navigator.clipboard.writeText(markdown);
    setCopiedMarkdown(true);
    setTimeout(() => setCopiedMarkdown(false), 1800);
  };

  const handleReset = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
    setConfig(EEDRIS_PROFILE_PRESET);
  };

  return (
    <StudioErrorBoundary onReset={handleReset}>
      <div className="min-h-screen lg:h-screen flex flex-col bg-slate-50 text-slate-900">
        <ResponsiveNav
          view={view}
          onSelectView={(nextView) => {
            setView(nextView);
            setMenuOpen(false);
          }}
          activeBuilderTab={activeBuilderTab}
          onSelectBuilderTab={(tab) => {
            setActiveBuilderTab(tab);
            setMobileSplitPane("editor");
          }}
          menuOpen={menuOpen}
          onToggleMenu={setMenuOpen}
          onDownload={handleDownload}
          onCopyMarkdown={handleCopyMarkdown}
          copiedMarkdown={copiedMarkdown}
          onReset={handleReset}
        />

        {/* Mobile / Tablet Builder Sub-Switch (< lg) */}
        {view === "split" && (
          <div className="lg:hidden flex items-center justify-between gap-3 px-4 py-2 bg-white border-b border-slate-200">
            <span className="text-xs font-medium text-slate-500">
              Builder Workspace
            </span>
            <div
              className="flex items-center p-0.5 bg-slate-100 rounded-md border border-slate-200"
              role="group"
              aria-label="Mobile builder pane"
            >
              <button
                type="button"
                onClick={() => setMobileSplitPane("editor")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  mobileSplitPane === "editor"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Editor
              </button>
              <button
                type="button"
                onClick={() => setMobileSplitPane("preview")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  mobileSplitPane === "preview"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Preview
              </button>
            </div>
          </div>
        )}

        {/* Main Workspace */}
        <main className="flex-1 min-h-0 flex flex-col lg:flex-row">
          {view === "split" && (
            <>
              <div
                className={`w-full lg:w-[400px] xl:w-[430px] shrink-0 lg:h-full overflow-hidden ${
                  mobileSplitPane === "editor" ? "flex-1 lg:flex-none" : "hidden lg:block"
                }`}
              >
                <BuilderSidebar
                  config={config}
                  onChange={setConfig}
                  onReset={handleReset}
                  activeTab={activeBuilderTab}
                  onTabChange={setActiveBuilderTab}
                />
              </div>
              <div
                className={`flex-1 min-w-0 lg:h-full overflow-hidden ${
                  mobileSplitPane === "preview" ? "block" : "hidden lg:block"
                }`}
              >
                <ReadmePreview config={config} markdown={markdown} />
              </div>
            </>
          )}

          {view === "preview" && (
            <div className="flex-1 min-w-0 h-full overflow-hidden">
              <ReadmePreview config={config} markdown={markdown} />
            </div>
          )}

          {view === "ai-preview" && (
            <div className="flex-1 min-w-0 h-full overflow-hidden">
              <AiPreview
                config={config}
                markdown={markdown}
                onApplyChanges={(patch) => setConfig((prev) => ({ ...prev, ...patch }))}
                onNavigateView={(nextView) => setView(nextView)}
              />
            </div>
          )}

          {view === "markdown" && (
            <div className="flex-1 min-w-0 h-full overflow-hidden">
              <MarkdownCodeView
                markdown={markdown}
                filename="README.md"
                onDownload={handleDownload}
              />
            </div>
          )}

          {view === "reference" && (
            <div className="flex-1 min-w-0 h-full overflow-hidden">
              <ReferenceComparison
                username={config.username || "ddmdesign7"}
                onImportReferenceProject={(project) => {
                  setConfig((prev) => ({
                    ...prev,
                    projects: prev.projects.some(
                      (p) => p.name.toLowerCase() === project.name.toLowerCase()
                    )
                      ? prev.projects
                      : [...prev.projects, project],
                  }));
                }}
              />
            </div>
          )}
        </main>
      </div>
    </StudioErrorBoundary>
  );
}
