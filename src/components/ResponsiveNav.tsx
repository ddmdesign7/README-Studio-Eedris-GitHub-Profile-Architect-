import React, { useEffect } from "react";
import {
  Check,
  Code2,
  Copy,
  Download,
  Eye,
  GitBranch,
  Layers,
  Menu,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { BuilderTab } from "./BuilderSidebar";

export type WorkspaceView = "split" | "preview" | "ai-preview" | "markdown" | "reference";

interface ResponsiveNavProps {
  view: WorkspaceView;
  onSelectView: (view: WorkspaceView) => void;
  activeBuilderTab: BuilderTab;
  onSelectBuilderTab: (tab: BuilderTab) => void;
  menuOpen: boolean;
  onToggleMenu: (open: boolean) => void;
  onDownload: () => void;
  onCopyMarkdown: () => void;
  copiedMarkdown: boolean;
  onReset: () => void;
}

const NAV_ITEMS: Array<{
  id: WorkspaceView;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: "split",
    label: "Builder",
    description: "Edit profile fields & layout modules",
    icon: Layers,
  },
  {
    id: "preview",
    label: "Live Preview",
    description: "GitHub Dark & Light rendered canvas",
    icon: Eye,
  },
  {
    id: "ai-preview",
    label: "AI Preview",
    description: "Audience lens critique & live rewrite",
    icon: Sparkles,
  },
  {
    id: "markdown",
    label: "Raw Markdown",
    description: "Inspect & copy generated README.md",
    icon: Code2,
  },
  {
    id: "reference",
    label: "Repo Reference",
    description: "Compare against GitHub reference repos",
    icon: GitBranch,
  },
];

const BUILDER_SECTIONS: Array<{ id: BuilderTab; label: string }> = [
  { id: "identity", label: "Identity" },
  { id: "content", label: "About & Work" },
  { id: "stack", label: "Stack & Focus" },
  { id: "widgets", label: "Stats & Theme" },
];

export const ResponsiveNav: React.FC<ResponsiveNavProps> = ({
  view,
  onSelectView,
  activeBuilderTab,
  onSelectBuilderTab,
  menuOpen,
  onToggleMenu,
  onDownload,
  onCopyMarkdown,
  copiedMarkdown,
  onReset,
}) => {
  useEffect(() => {
    if (!menuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onToggleMenu(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen, onToggleMenu]);

  return (
    <>
      {/* Sticky Top Bar: Strict 3-Zone Contract on Desktop, Ergonomic Touch Header on Mobile */}
      <header className="sticky top-0 z-30 h-14 shrink-0 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 md:px-6 flex items-center justify-between gap-4 md:gap-8">
        {/* Zone 1: Menu Trigger (mobile/tablet) + Single-line Brand Wordmark */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onToggleMenu(!menuOpen)}
            aria-expanded={menuOpen}
            aria-controls="responsive-nav-drawer"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            className="md:hidden inline-flex items-center justify-center min-h-[44px] min-w-[44px] -ml-2 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              onSelectView("split");
              onToggleMenu(false);
            }}
            className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            README Studio
          </a>
        </div>

        {/* Zone 2: Desktop Single-Line Navigation Links */}
        <nav
          aria-label="Primary workspace navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium overflow-x-auto"
        >
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectView(item.id)}
              className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-xs ${
                view === item.id
                  ? "border-blue-600 text-slate-900 font-semibold"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="sm:hidden">Export</span>
            <span className="hidden sm:inline">Download README.md</span>
          </button>
        </div>
      </header>

      {/* Mobile Slide-Over Responsive Navigation Drawer */}
      <div
        id="responsive-nav-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Workspace navigation menu"
        className={`md:hidden fixed inset-0 z-40 transition-opacity duration-200 ${
          menuOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div
          onClick={() => onToggleMenu(false)}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
          aria-hidden="true"
        />

        {/* Drawer Panel */}
        <aside
          className={`relative w-[84vw] max-w-[320px] h-full bg-white border-r border-slate-200 flex flex-col shadow-xl transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            menuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="h-14 px-4 border-b border-slate-200 flex items-center justify-between shrink-0">
            <span className="text-sm font-bold tracking-tight text-slate-900">
              README Studio
            </span>
            <button
              type="button"
              onClick={() => onToggleMenu(false)}
              aria-label="Close menu"
              className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] -mr-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Workspace Destinations */}
            <nav aria-label="Mobile workspace navigation" className="space-y-1">
              <div className="px-2 pb-1 text-xs font-semibold text-slate-500">
                Workspaces
              </div>
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = view === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectView(item.id);
                      onToggleMenu(false);
                    }}
                    className={`w-full min-h-[48px] px-3 py-2.5 rounded-lg flex items-center gap-3 text-left transition-colors ${
                      active
                        ? "bg-blue-50 text-blue-700"
                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        active ? "text-blue-600" : "text-slate-500"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold leading-tight">
                        {item.label}
                      </div>
                      <div
                        className={`text-xs truncate ${
                          active ? "text-blue-600/80" : "text-slate-500"
                        }`}
                      >
                        {item.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </nav>

            {/* Direct Builder Section Jump */}
            <div className="pt-4 border-t border-slate-200 space-y-2">
              <div className="px-2 text-xs font-semibold text-slate-500">
                Builder Sections
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {BUILDER_SECTIONS.map((sec) => {
                  const isCurrent = view === "split" && activeBuilderTab === sec.id;
                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => {
                        onSelectBuilderTab(sec.id);
                        onSelectView("split");
                        onToggleMenu(false);
                      }}
                      className={`min-h-[44px] px-3 py-2 rounded-md border text-xs font-medium text-left transition-colors ${
                        isCurrent
                          ? "border-blue-600 bg-blue-50/70 text-blue-700 font-semibold"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {sec.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Drawer Footer Actions */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2 shrink-0">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onCopyMarkdown}
                className="min-h-[44px] px-3 py-2 inline-flex items-center justify-center gap-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 whitespace-nowrap"
              >
                {copiedMarkdown ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy MD
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  onReset();
                  onToggleMenu(false);
                }}
                className="min-h-[44px] px-3 py-2 inline-flex items-center justify-center gap-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                onDownload();
                onToggleMenu(false);
              }}
              className="w-full min-h-[44px] px-4 py-2 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <Download className="w-3.5 h-3.5" />
              Download README.md
            </button>
          </div>
        </aside>
      </div>
    </>
  );
};
