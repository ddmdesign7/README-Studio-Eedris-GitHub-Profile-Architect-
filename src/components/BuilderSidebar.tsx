import React, { useState } from "react";
import {
  DownloadCloud,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import {
  FocusRow,
  GitHubProfileData,
  ProfileConfig,
  StatsRankIcon,
  StatsTheme,
  TechSkill,
  TopLangsLayout,
  WakaGraphLayout,
} from "../types/readme";
import { PRESETS } from "../data/presets";
import { fetchJson } from "../utils/apiClient";

export type BuilderTab = "identity" | "content" | "stack" | "widgets";

interface BuilderSidebarProps {
  config: ProfileConfig;
  onChange: (next: ProfileConfig) => void;
  onReset: () => void;
  activeTab?: BuilderTab;
  onTabChange?: (tab: BuilderTab) => void;
}

type EditorTab = BuilderTab;

const THEME_OPTIONS: Array<{
  value: StatsTheme;
  label: string;
  bgHex: string;
  accentHex: string;
}> = [
  { value: "tokyonight", label: "Tokyo Night", bgHex: "#1a1b27", accentHex: "#70a5fd" },
  { value: "radical", label: "Radical", bgHex: "#141321", accentHex: "#fe428e" },
  { value: "dark", label: "Dark", bgHex: "#151515", accentHex: "#79ff97" },
  { value: "gruvbox", label: "Gruvbox", bgHex: "#282828", accentHex: "#fabd2f" },
  { value: "github_dark", label: "GitHub Dark", bgHex: "#0d1117", accentHex: "#58a6ff" },
  { value: "dracula", label: "Dracula", bgHex: "#282a36", accentHex: "#ff79c6" },
  { value: "onedark", label: "One Dark", bgHex: "#282c34", accentHex: "#e4bf7a" },
  { value: "synthwave", label: "Synthwave", bgHex: "#2b213a", accentHex: "#e5289e" },
  { value: "cobalt", label: "Cobalt", bgHex: "#193549", accentHex: "#e683d9" },
];

const BANNER_GRADIENTS = [
  { label: "Midnight Violet Cyan (DDMGURU)", value: "0:080612,45:30205F,100:087E9B" },
  { label: "Cosmic Deep Purple (DDMGURU)", value: "0:090014,40:32106B,100:087E9B" },
  { label: "Deep Cobalt (zayennn)", value: "0:1408d0,50:0860d0,100:08c4d0" },
  { label: "Cosmic Indigo (eaz-v2)", value: "0:4f46e5,50:6366f1,100:06b6d4" },
  { label: "Radical Crimson", value: "0:fe428e,50:a9fef7,100:141321" },
  { label: "Slate Sapphire", value: "0:0f172a,50:1e3a8a,100:2563eb" },
  { label: "Emerald Teal", value: "0:064e3b,50:0d9488,100:14b8a6" },
];

const TYPING_COLORS = [
  { label: "Midnight Lavender (DDMGURU)", value: "9B8CFF" },
  { label: "Cosmic Violet (DDMGURU)", value: "9B7BFF" },
  { label: "Indigo Glow (eaz-v2)", value: "6366F1" },
  { label: "Sky Cyan", value: "36BCF7" },
  { label: "Radical Pink", value: "FE428E" },
  { label: "Emerald Mint", value: "10B981" },
];

export const BuilderSidebar: React.FC<BuilderSidebarProps> = ({
  config,
  onChange,
  onReset,
  activeTab: controlledTab,
  onTabChange,
}) => {
  const [internalTab, setInternalTab] = useState<EditorTab>("identity");
  const activeTab = controlledTab ?? internalTab;
  const setActiveTab = (tab: EditorTab) => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalTab(tab);
    }
  };
  const [newTypingLine, setNewTypingLine] = useState("");
  const [customSkillName, setCustomSkillName] = useState("");
  const [customSkillCategory, setCustomSkillCategory] =
    useState<TechSkill["category"]>("Backend Development");

  // GitHub fetch state
  const [ghLoading, setGhLoading] = useState(false);
  const [ghError, setGhError] = useState<string | null>(null);
  const [ghData, setGhData] = useState<GitHubProfileData | null>(null);

  // AI tailor state
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccess, setAiSuccess] = useState<string | null>(null);

  const updateField = <K extends keyof ProfileConfig>(key: K, value: ProfileConfig[K]) => {
    onChange({ ...config, [key]: value });
  };

  const updateWidget = <K extends keyof ProfileConfig["widgets"]>(
    key: K,
    value: ProfileConfig["widgets"][K]
  ) => {
    onChange({
      ...config,
      widgets: { ...config.widgets, [key]: value },
    });
  };

  const handleFetchGitHub = async () => {
    const target = config.username.trim();
    if (!target) return;
    setGhLoading(true);
    setGhError(null);
    try {
      const data = await fetchJson<GitHubProfileData>(
        `/api/github/profile?username=${encodeURIComponent(target)}`
      );
      setGhData(data);
    } catch (err) {
      setGhError(err instanceof Error ? err.message : "Failed to load GitHub data.");
    } finally {
      setGhLoading(false);
    }
  };

  const handleImportRepo = (repo: GitHubProfileData["repos"][number]) => {
    const exists = config.projects.some(
      (p) => p.name.toLowerCase() === repo.name.toLowerCase()
    );
    if (exists) return;
    updateField("projects", [
      ...config.projects,
      {
        id: `repo-${Date.now()}`,
        name: repo.name,
        summary: repo.description || `Open-source repository by ${config.username}.`,
        stack: repo.language || "GitHub",
        language: repo.language || "TypeScript",
        visibility: "Public",
        stars: repo.stars,
        homepage: repo.homepage || "",
        url: repo.htmlUrl,
      },
    ]);
  };

  const handleAiTailor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiError(null);
    setAiSuccess(null);

    try {
      const data = await fetchJson<{ tailored: Record<string, unknown> }>("/api/ai/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: aiPrompt.trim(), profile: config }),
      });
      const t = data.tailored as {
        heroTitle?: string;
        typingLines?: string[];
        aboutIntro?: string;
        aboutBullets?: Array<{ label: string; text: string }>;
        projects?: Array<{ name: string; summary: string; stack: string; url?: string }>;
        focusMatrix?: Array<{
          area: string;
          technology: string;
          status: FocusRow["status"];
          progress: number;
        }>;
        footerTagline?: string;
      };
      onChange({
        ...config,
        heroTitle: t.heroTitle || config.heroTitle,
        typingLines: Array.isArray(t.typingLines) ? t.typingLines : config.typingLines,
        aboutIntro: t.aboutIntro || config.aboutIntro,
        aboutBullets: Array.isArray(t.aboutBullets)
          ? t.aboutBullets.map((b: { label: string; text: string }, idx: number) => ({
              id: config.aboutBullets[idx]?.id || `b-${idx}`,
              emoji: config.aboutBullets[idx]?.emoji || "🔹",
              label: b.label,
              text: b.text,
            }))
          : config.aboutBullets,
        projects: Array.isArray(t.projects)
          ? t.projects.map(
              (p: { name: string; summary: string; stack: string; url?: string }, idx: number) => ({
                id: config.projects[idx]?.id || `p-${idx}`,
                name: p.name,
                summary: p.summary,
                stack: p.stack,
                language: config.projects[idx]?.language || "TypeScript",
                visibility: config.projects[idx]?.visibility || "Public",
                url: p.url || config.projects[idx]?.url || config.socials.github,
              })
            )
          : config.projects,
        focusMatrix: Array.isArray(t.focusMatrix)
          ? t.focusMatrix.map(
              (
                f: { area: string; technology: string; status: FocusRow["status"]; progress: number },
                idx: number
              ) => ({
                id: config.focusMatrix[idx]?.id || `f-${idx}`,
                area: f.area,
                technology: f.technology,
                badgeColor: config.focusMatrix[idx]?.badgeColor || "2563EB",
                logo: config.focusMatrix[idx]?.logo || "github",
                status:
                  f.status === "Mastering" || f.status === "Learning" || f.status === "Exploring"
                    ? f.status
                    : "Learning",
                progress: Math.min(100, Math.max(5, Number(f.progress) || 70)),
              })
            )
          : config.focusMatrix,
        footerTagline: t.footerTagline || config.footerTagline,
      });
      setAiSuccess("README sections updated.");
      setAiPrompt("");
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Tailoring request failed.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleAddSkill = () => {
    const clean = customSkillName.trim();
    if (!clean) return;
    const slug = clean.toLowerCase().replace(/[^a-z0-9]/g, "");
    const newSkill: TechSkill = {
      id: `custom-${Date.now()}`,
      name: clean,
      category: customSkillCategory,
      badgeUrl: `https://img.shields.io/badge/${encodeURIComponent(
        clean
      )}-1E293B?style=for-the-badge&logo=${encodeURIComponent(slug)}&logoColor=white`,
      enabled: true,
    };
    updateField("skills", [...config.skills, newSkill]);
    setCustomSkillName("");
  };

  return (
    <aside className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Preset & Reset Toolbar */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-2 bg-slate-50/70">
        <div className="flex items-center gap-1 p-0.5 bg-slate-200/70 rounded-md overflow-x-auto">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onChange(preset)}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                config.id === preset.id
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {preset.presetLabel}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onReset}
          title="Reset to Eedris default"
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 rounded hover:bg-slate-200/60 transition-colors whitespace-nowrap shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
      </div>

      {/* Section Segmented Tabs */}
      <div className="grid grid-cols-4 border-b border-slate-200 bg-white text-xs font-medium">
        {(
          [
            { id: "identity", label: "Identity" },
            { id: "content", label: "About & Work" },
            { id: "stack", label: "Stack & Focus" },
            { id: "widgets", label: "Stats & Theme" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`py-2.5 px-2 text-center border-b-2 transition-colors whitespace-nowrap truncate ${
              activeTab === tab.id
                ? "border-blue-600 text-blue-600 font-semibold"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Scrollable Editor Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {activeTab === "identity" && (
          <>
            {/* GitHub Sync Box */}
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="gh-username"
                  className="text-xs font-semibold text-slate-800"
                >
                  GitHub Username Sync
                </label>
                <span className="text-xs text-slate-500 font-mono">
                  api.github.com
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  id="gh-username"
                  type="text"
                  value={config.username}
                  onChange={(e) => updateField("username", e.target.value)}
                  placeholder="ddmdesign7"
                  className="flex-1 min-w-0 px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-mono"
                />
                <button
                  type="button"
                  onClick={handleFetchGitHub}
                  disabled={ghLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
                >
                  <DownloadCloud className="w-3.5 h-3.5" />
                  {ghLoading ? "Syncing..." : "Fetch Repos"}
                </button>
              </div>
              {ghError && <p className="text-xs text-rose-600">{ghError}</p>}
              {ghData && (
                <div className="pt-1 space-y-2 border-t border-slate-200">
                  <div className="flex items-center justify-between text-xs text-slate-600 tabular-nums">
                    <span className="font-medium text-slate-900">
                      {ghData.name} (@{ghData.login})
                    </span>
                    <span>{ghData.publicRepos} public repos</span>
                  </div>
                  {ghData.repos.length > 0 && (
                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {ghData.repos.slice(0, 5).map((repo) => (
                        <div
                          key={repo.name}
                          className="flex items-center justify-between gap-2 px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                        >
                          <span className="font-mono truncate text-slate-800">
                            {repo.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleImportRepo(repo)}
                            className="text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap shrink-0"
                          >
                            + Add Project
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                  Display Name
                </label>
                <input
                  type="text"
                  value={config.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                  Target Repo
                </label>
                <input
                  type="text"
                  value={config.repoName}
                  onChange={(e) => updateField("repoName", e.target.value)}
                  className="w-full px-3 py-1.5 text-sm font-mono border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">
                Hero Title
              </label>
              <input
                type="text"
                value={config.heroTitle || ""}
                onChange={(e) => updateField("heroTitle", e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">
                Hero Subtitle (Cosmic Tagline)
              </label>
              <textarea
                rows={2}
                value={config.heroSubtitle || ""}
                onChange={(e) => updateField("heroSubtitle", e.target.value)}
                placeholder="DDMGURU | Dynamic Digital Manifestor..."
                className="w-full px-3 py-1.5 text-xs leading-relaxed border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">
                Signature Quote (Blockquote)
              </label>
              <input
                type="text"
                value={config.heroQuote || ""}
                onChange={(e) => updateField("heroQuote", e.target.value)}
                placeholder="Design with purpose. Build with passion. Innovate without limits."
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">
                Status Badge Label
              </label>
              <input
                type="text"
                value={config.statusBadge || ""}
                onChange={(e) => updateField("statusBadge", e.target.value)}
                placeholder="Active Builder"
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>

            {/* Typing SVG Lines */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700">
                Animated Typing Taglines
              </label>
              <div className="space-y-1.5">
                {(config.typingLines || []).map((line, idx) => (
                  <div key={idx} className="flex gap-1.5">
                    <input
                      type="text"
                      value={line}
                      onChange={(e) => {
                        const next = [...(config.typingLines || [])];
                        next[idx] = e.target.value;
                        updateField("typingLines", next);
                      }}
                      className="flex-1 min-w-0 px-2.5 py-1 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateField(
                          "typingLines",
                          (config.typingLines || []).filter((_, i) => i !== idx)
                        )
                      }
                      aria-label="Remove tagline"
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newTypingLine}
                  onChange={(e) => setNewTypingLine(e.target.value)}
                  placeholder="Add rotating role..."
                  className="flex-1 min-w-0 px-2.5 py-1 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newTypingLine.trim()) return;
                    updateField("typingLines", [...(config.typingLines || []), newTypingLine.trim()]);
                    setNewTypingLine("");
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-md hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </button>
              </div>
            </div>

            {/* Social Links */}
            <div className="space-y-2.5 pt-2 border-t border-slate-200">
              <div className="text-xs font-semibold text-slate-800">Connect With Me</div>
              <div className="space-y-2">
                <input
                  type="email"
                  value={config.socials.email}
                  onChange={(e) =>
                    updateField("socials", { ...config.socials, email: e.target.value })
                  }
                  placeholder="Email (admin@ddmguru.com)"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
                />
                <input
                  type="url"
                  value={config.socials.portfolio}
                  onChange={(e) =>
                    updateField("socials", { ...config.socials, portfolio: e.target.value })
                  }
                  placeholder="Cosmic Portfolio URL"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
                />
                <input
                  type="url"
                  value={config.socials.itzddm || ""}
                  onChange={(e) =>
                    updateField("socials", { ...config.socials, itzddm: e.target.value })
                  }
                  placeholder="ItzDDM Creative Portfolio URL"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
                />
                <input
                  type="url"
                  value={config.socials.tiktok || ""}
                  onChange={(e) =>
                    updateField("socials", { ...config.socials, tiktok: e.target.value })
                  }
                  placeholder="TikTok URL (https://www.tiktok.com/@ddmguru)"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
                />
                <input
                  type="url"
                  value={config.socials.linkedin}
                  onChange={(e) =>
                    updateField("socials", { ...config.socials, linkedin: e.target.value })
                  }
                  placeholder="LinkedIn URL"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
                />
                <input
                  type="url"
                  value={config.socials.github}
                  onChange={(e) =>
                    updateField("socials", { ...config.socials, github: e.target.value })
                  }
                  placeholder="GitHub Profile URL"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>
          </>
        )}

        {activeTab === "content" && (
          <>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-800">
                About Me Narrative
              </label>
              <textarea
                rows={3}
                value={config.aboutIntro}
                onChange={(e) => updateField("aboutIntro", e.target.value)}
                className="w-full px-3 py-2 text-xs leading-relaxed border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>

            {/* About Bullets */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800">Highlights</span>
                <button
                  type="button"
                  onClick={() =>
                    updateField("aboutBullets", [
                      ...config.aboutBullets,
                      {
                        id: `b-${Date.now()}`,
                        emoji: "🔹",
                        label: "Focus",
                        text: "New workflow highlight",
                      },
                    ])
                  }
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Highlight
                </button>
              </div>
              {config.aboutBullets.map((b, idx) => (
                <div
                  key={b.id}
                  className="p-2.5 border border-slate-200 rounded-md space-y-1.5 bg-slate-50/50"
                >
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={b.emoji}
                      onChange={(e) => {
                        const next = [...config.aboutBullets];
                        next[idx] = { ...b, emoji: e.target.value };
                        updateField("aboutBullets", next);
                      }}
                      className="w-10 px-1.5 py-1 text-xs text-center bg-white border border-slate-300 rounded"
                    />
                    <input
                      type="text"
                      value={b.label}
                      onChange={(e) => {
                        const next = [...config.aboutBullets];
                        next[idx] = { ...b, label: e.target.value };
                        updateField("aboutBullets", next);
                      }}
                      className="flex-1 min-w-0 px-2 py-1 text-xs font-medium bg-white border border-slate-300 rounded"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateField(
                          "aboutBullets",
                          config.aboutBullets.filter((item) => item.id !== b.id)
                        )
                      }
                      aria-label="Remove highlight"
                      className="p-1 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={b.text}
                    onChange={(e) => {
                      const next = [...config.aboutBullets];
                      next[idx] = { ...b, text: e.target.value };
                      updateField("aboutBullets", next);
                    }}
                    className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded"
                  />
                </div>
              ))}
            </div>

            {/* Featured Projects */}
            <div className="space-y-2.5 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800">
                  Featured Projects
                </span>
                <button
                  type="button"
                  onClick={() =>
                    updateField("projects", [
                      ...config.projects,
                      {
                        id: `proj-${Date.now()}`,
                        name: "new-automation-repo",
                        summary: "🚀 Describe project impact and integration scope.",
                        stack: "Node.js · Python",
                        language: "TypeScript",
                        visibility: "Public",
                        url: config.socials.github,
                      },
                    ])
                  }
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Project
                </button>
              </div>
              {config.projects.map((proj, idx) => (
                <div
                  key={proj.id}
                  className="p-2.5 border border-slate-200 rounded-md space-y-1.5 bg-slate-50/50"
                >
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={proj.name}
                      onChange={(e) => {
                        const next = [...config.projects];
                        next[idx] = { ...proj, name: e.target.value };
                        updateField("projects", next);
                      }}
                      placeholder="Repo / Project name"
                      className="flex-1 min-w-0 px-2 py-1 text-xs font-semibold font-mono bg-white border border-slate-300 rounded"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateField(
                          "projects",
                          config.projects.filter((item) => item.id !== proj.id)
                        )
                      }
                      aria-label="Remove project"
                      className="p-1 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={proj.summary}
                    onChange={(e) => {
                      const next = [...config.projects];
                      next[idx] = { ...proj, summary: e.target.value };
                      updateField("projects", next);
                    }}
                    className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded"
                  />
                  <div className="grid grid-cols-3 gap-1.5">
                    <input
                      type="text"
                      value={proj.language}
                      onChange={(e) => {
                        const next = [...config.projects];
                        next[idx] = { ...proj, language: e.target.value };
                        updateField("projects", next);
                      }}
                      placeholder="Language"
                      className="px-2 py-1 text-xs bg-white border border-slate-300 rounded"
                    />
                    <input
                      type="text"
                      value={proj.stack}
                      onChange={(e) => {
                        const next = [...config.projects];
                        next[idx] = { ...proj, stack: e.target.value };
                        updateField("projects", next);
                      }}
                      placeholder="Tech stack"
                      className="px-2 py-1 text-xs bg-white border border-slate-300 rounded"
                    />
                    <input
                      type="url"
                      value={proj.url}
                      onChange={(e) => {
                        const next = [...config.projects];
                        next[idx] = { ...proj, url: e.target.value };
                        updateField("projects", next);
                      }}
                      placeholder="Repo URL"
                      className="px-2 py-1 text-xs bg-white border border-slate-300 rounded"
                    />
                  </div>
                  <input
                    type="url"
                    value={proj.homepage || ""}
                    onChange={(e) => {
                      const next = [...config.projects];
                      next[idx] = { ...proj, homepage: e.target.value };
                      updateField("projects", next);
                    }}
                    placeholder="Live Demo URL (optional)"
                    className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded"
                  />
                </div>
              ))}
            </div>

            {/* Ecosystem & Evolution Table */}
            <div className="space-y-2.5 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800">
                  Platform Ecosystem &amp; Evolution
                </span>
                <button
                  type="button"
                  onClick={() =>
                    updateField("evolutionTable", [
                      ...(config.evolutionTable || []),
                      {
                        id: `evo-${Date.now()}`,
                        version: "New Module",
                        url: "https://ddmguru.com",
                        focus: "Automated revenue workflow",
                      },
                    ])
                  }
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Row
                </button>
              </div>
              {(config.evolutionTable || []).map((row, idx) => (
                <div
                  key={row.id}
                  className="p-2.5 border border-slate-200 rounded-md space-y-1.5 bg-slate-50/50"
                >
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={row.version}
                      onChange={(e) => {
                        const next = [...(config.evolutionTable || [])];
                        next[idx] = { ...row, version: e.target.value };
                        updateField("evolutionTable", next);
                      }}
                      placeholder="Platform / Version"
                      className="w-1/2 px-2 py-1 text-xs font-medium bg-white border border-slate-300 rounded"
                    />
                    <input
                      type="url"
                      value={row.url}
                      onChange={(e) => {
                        const next = [...(config.evolutionTable || [])];
                        next[idx] = { ...row, url: e.target.value };
                        updateField("evolutionTable", next);
                      }}
                      placeholder="https://..."
                      className="flex-1 min-w-0 px-2 py-1 text-xs bg-white border border-slate-300 rounded"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateField(
                          "evolutionTable",
                          (config.evolutionTable || []).filter((r) => r.id !== row.id)
                        )
                      }
                      aria-label="Remove evolution row"
                      className="p-1 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={row.focus}
                    onChange={(e) => {
                      const next = [...(config.evolutionTable || [])];
                      next[idx] = { ...row, focus: e.target.value };
                      updateField("evolutionTable", next);
                    }}
                    placeholder="Focus & capabilities"
                    className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded"
                  />
                </div>
              ))}
            </div>

            {/* Key Design Principles */}
            <div className="space-y-2.5 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800">
                  Key Design Principles
                </span>
                <button
                  type="button"
                  onClick={() =>
                    updateField("principles", [
                      ...(config.principles || []),
                      {
                        id: `pr-${Date.now()}`,
                        title: `${(config.principles || []).length + 1}. Predictable Scale`,
                        description: "Design workflows with observability and zero lock-in.",
                      },
                    ])
                  }
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Principle
                </button>
              </div>
              {(config.principles || []).map((pr, idx) => (
                <div
                  key={pr.id}
                  className="p-2.5 border border-slate-200 rounded-md space-y-1.5 bg-slate-50/50"
                >
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={pr.title}
                      onChange={(e) => {
                        const next = [...(config.principles || [])];
                        next[idx] = { ...pr, title: e.target.value };
                        updateField("principles", next);
                      }}
                      placeholder="Principle title"
                      className="flex-1 min-w-0 px-2 py-1 text-xs font-medium bg-white border border-slate-300 rounded"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateField(
                          "principles",
                          (config.principles || []).filter((item) => item.id !== pr.id)
                        )
                      }
                      aria-label="Remove principle"
                      className="p-1 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={pr.description}
                    onChange={(e) => {
                      const next = [...(config.principles || [])];
                      next[idx] = { ...pr, description: e.target.value };
                      updateField("principles", next);
                    }}
                    placeholder="Principle description"
                    className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded"
                  />
                </div>
              ))}
            </div>

            {/* What I Bring Together (3-Column Pillars Matrix) */}
            <div className="space-y-2.5 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800">
                  What I Bring Together (3-Col Matrix)
                </span>
                <button
                  type="button"
                  onClick={() =>
                    updateField("pillarsMatrix", [
                      ...(config.pillarsMatrix || []),
                      {
                        id: `pillar-${Date.now()}`,
                        creative: "Visual systems & UX",
                        building: "Interactive web interfaces",
                        business: "Workflow automation",
                      },
                    ])
                  }
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Row
                </button>
              </div>
              {(config.pillarsMatrix || []).map((row, idx) => (
                <div
                  key={row.id}
                  className="p-2 border border-slate-200 rounded-md space-y-1.5 bg-slate-50/50"
                >
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={row.creative}
                      onChange={(e) => {
                        const next = [...(config.pillarsMatrix || [])];
                        next[idx] = { ...row, creative: e.target.value };
                        updateField("pillarsMatrix", next);
                      }}
                      placeholder="Creative thinking"
                      className="flex-1 min-w-0 px-2 py-1 text-xs bg-white border border-slate-300 rounded"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateField(
                          "pillarsMatrix",
                          (config.pillarsMatrix || []).filter((r) => r.id !== row.id)
                        )
                      }
                      aria-label="Remove pillar row"
                      className="p-1 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      value={row.building}
                      onChange={(e) => {
                        const next = [...(config.pillarsMatrix || [])];
                        next[idx] = { ...row, building: e.target.value };
                        updateField("pillarsMatrix", next);
                      }}
                      placeholder="Digital building"
                      className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded"
                    />
                    <input
                      type="text"
                      value={row.business}
                      onChange={(e) => {
                        const next = [...(config.pillarsMatrix || [])];
                        next[idx] = { ...row, business: e.target.value };
                        updateField("pillarsMatrix", next);
                      }}
                      placeholder="Business-minded innovation"
                      className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Creative Identity & Design Skills Table */}
            <div className="space-y-2.5 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800">
                  Creative Identity &amp; Design Skills
                </span>
                <button
                  type="button"
                  onClick={() =>
                    updateField("creativeSkills", [
                      ...(config.creativeSkills || []),
                      {
                        id: `cs-${Date.now()}`,
                        area: "Creative Strategy",
                        focus: "Visual storytelling & interactive design",
                      },
                    ])
                  }
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Row
                </button>
              </div>
              {(config.creativeSkills || []).map((row, idx) => (
                <div
                  key={row.id}
                  className="flex items-center gap-1.5 p-2 border border-slate-200 rounded-md bg-slate-50/50"
                >
                  <input
                    type="text"
                    value={row.area}
                    onChange={(e) => {
                      const next = [...(config.creativeSkills || [])];
                      next[idx] = { ...row, area: e.target.value };
                      updateField("creativeSkills", next);
                    }}
                    placeholder="Creative Area"
                    className="w-1/3 px-2 py-1 text-xs font-medium bg-white border border-slate-300 rounded"
                  />
                  <input
                    type="text"
                    value={row.focus}
                    onChange={(e) => {
                      const next = [...(config.creativeSkills || [])];
                      next[idx] = { ...row, focus: e.target.value };
                      updateField("creativeSkills", next);
                    }}
                    placeholder="Focus"
                    className="flex-1 min-w-0 px-2 py-1 text-xs bg-white border border-slate-300 rounded"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      updateField(
                        "creativeSkills",
                        (config.creativeSkills || []).filter((r) => r.id !== row.id)
                      )
                    }
                    aria-label="Remove creative skill"
                    className="p-1 text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Explore My Digital Worlds CTAs */}
            <div className="space-y-2.5 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800">
                  Explore My Digital Worlds (CTAs)
                </span>
                <button
                  type="button"
                  onClick={() =>
                    updateField("digitalWorlds", [
                      ...(config.digitalWorlds || []),
                      {
                        id: `dw-${Date.now()}`,
                        label: "VISIT-DIGITAL WORLD",
                        url: "https://ddmguru.com",
                        color: "4F46E5",
                        logo: "rocket",
                      },
                    ])
                  }
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add CTA
                </button>
              </div>
              {(config.digitalWorlds || []).map((dw, idx) => (
                <div
                  key={dw.id}
                  className="p-2 border border-slate-200 rounded-md space-y-1.5 bg-slate-50/50"
                >
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={dw.label}
                      onChange={(e) => {
                        const next = [...(config.digitalWorlds || [])];
                        next[idx] = { ...dw, label: e.target.value };
                        updateField("digitalWorlds", next);
                      }}
                      placeholder="Badge Label"
                      className="flex-1 min-w-0 px-2 py-1 text-xs font-medium bg-white border border-slate-300 rounded"
                    />
                    <input
                      type="text"
                      value={dw.color}
                      onChange={(e) => {
                        const next = [...(config.digitalWorlds || [])];
                        next[idx] = { ...dw, color: e.target.value.replace("#", "") };
                        updateField("digitalWorlds", next);
                      }}
                      placeholder="6D28D9"
                      className="w-20 px-2 py-1 text-xs font-mono bg-white border border-slate-300 rounded"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateField(
                          "digitalWorlds",
                          (config.digitalWorlds || []).filter((item) => item.id !== dw.id)
                        )
                      }
                      aria-label="Remove digital world CTA"
                      className="p-1 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input
                    type="url"
                    value={dw.url}
                    onChange={(e) => {
                      const next = [...(config.digitalWorlds || [])];
                      next[idx] = { ...dw, url: e.target.value };
                      updateField("digitalWorlds", next);
                    }}
                    placeholder="https://..."
                    className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded"
                  />
                </div>
              ))}
            </div>

            {/* What I'm Exploring */}
            <div className="space-y-1.5 pt-2 border-t border-slate-200">
              <label className="block text-xs font-semibold text-slate-800">
                What I&apos;m Exploring (one item per line)
              </label>
              <textarea
                rows={4}
                value={(config.exploringItems || []).join("\n")}
                onChange={(e) =>
                  updateField(
                    "exploringItems",
                    e.target.value.split("\n").map((s) => s.trimStart())
                  )
                }
                placeholder="AI-powered digital experiences"
                className="w-full px-2.5 py-1.5 text-xs leading-relaxed border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
              />
            </div>

            {/* Getting Started Quickstart Snippet */}
            <div className="space-y-1.5 pt-2 border-t border-slate-200">
              <label className="block text-xs font-semibold text-slate-800">
                Getting Started Bash Snippet (Optional)
              </label>
              <textarea
                rows={4}
                value={config.gettingStartedSnippet || ""}
                onChange={(e) => updateField("gettingStartedSnippet", e.target.value)}
                placeholder="git clone https://github.com/ddmdesign7/ddmguru.git"
                className="w-full px-2.5 py-1.5 text-xs font-mono leading-relaxed border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
              />
            </div>

            {/* Contribution Overview */}
            <div className="space-y-1.5 pt-2 border-t border-slate-200">
              <label className="block text-xs font-semibold text-slate-800">
                Contribution Overview Line
              </label>
              <textarea
                rows={2}
                value={config.contributionOverview || ""}
                onChange={(e) => updateField("contributionOverview", e.target.value)}
                placeholder="Contributed to ddmdesign7/FINORA-FINANCE-ADVISORY and 41 other repositories"
                className="w-full px-2.5 py-1.5 text-xs leading-relaxed border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
              />
            </div>
          </>
        )}

        {activeTab === "stack" && (
          <>
            <div className="space-y-2.5">
              <div className="text-xs font-semibold text-slate-800">
                Skills &amp; Shields.io Badges
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {config.skills.map((skill) => (
                  <label
                    key={skill.id}
                    className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-md border text-xs cursor-pointer transition-colors ${
                      skill.enabled
                        ? "border-blue-600 bg-blue-50/60 text-slate-900 font-medium"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span className="truncate">{skill.name}</span>
                    <input
                      type="checkbox"
                      checked={skill.enabled}
                      onChange={(e) => {
                        updateField(
                          "skills",
                          config.skills.map((s) =>
                            s.id === skill.id ? { ...s, enabled: e.target.checked } : s
                          )
                        );
                      }}
                      className="accent-blue-600 shrink-0"
                    />
                  </label>
                ))}
              </div>

              {/* Add Custom Badge */}
              <div className="pt-2 space-y-1.5">
                <div className="text-xs font-medium text-slate-600">Add Custom Tool</div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={customSkillName}
                    onChange={(e) => setCustomSkillName(e.target.value)}
                    placeholder="e.g. PostgreSQL"
                    className="flex-1 min-w-0 px-2.5 py-1 text-xs border border-slate-300 rounded-md"
                  />
                  <select
                    value={customSkillCategory}
                    onChange={(e) =>
                      setCustomSkillCategory(e.target.value as TechSkill["category"])
                    }
                    className="px-2 py-1 text-xs border border-slate-300 rounded-md bg-white"
                  >
                    <option value="Frontend Development">Frontend</option>
                    <option value="Backend Development">Backend</option>
                    <option value="Databases, DevOps & CRM">DevOps &amp; CRM</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="px-2.5 py-1 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 whitespace-nowrap shrink-0"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* SkillIcons.dev Visual Strips */}
            <div className="space-y-2 pt-3 border-t border-slate-200">
              <div className="text-xs font-semibold text-slate-800">
                SkillIcons.dev Icon Strips
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-600">
                  Development Icons (comma-separated slugs)
                </label>
                <input
                  type="text"
                  value={config.skillIconsDev || ""}
                  onChange={(e) => updateField("skillIconsDev", e.target.value)}
                  placeholder="html,css,js,react,python,nodejs,php,laravel,docker,git,github,vscode"
                  className="w-full px-2.5 py-1 text-xs font-mono border border-slate-300 rounded-md"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-600">
                  Creative &amp; Design Icons
                </label>
                <input
                  type="text"
                  value={config.skillIconsDesign || ""}
                  onChange={(e) => updateField("skillIconsDesign", e.target.value)}
                  placeholder="figma,ps,ai"
                  className="w-full px-2.5 py-1 text-xs font-mono border border-slate-300 rounded-md"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-600">
                  Toolkit Footnote (Optional)
                </label>
                <input
                  type="text"
                  value={config.skillIconsNote || ""}
                  onChange={(e) => updateField("skillIconsNote", e.target.value)}
                  placeholder="Tools shown reflect my current interests and working toolkit..."
                  className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-md"
                />
              </div>
            </div>

            {/* Focus Matrix */}
            <div className="space-y-2.5 pt-3 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800">
                  Current Focus &amp; Mastery Table
                </span>
                <button
                  type="button"
                  onClick={() =>
                    updateField("focusMatrix", [
                      ...config.focusMatrix,
                      {
                        id: `focus-${Date.now()}`,
                        area: "Integrations",
                        technology: "Webhooks",
                        badgeColor: "0F172A",
                        logo: "webhook",
                        status: "Learning",
                        progress: 70,
                      },
                    ])
                  }
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Row
                </button>
              </div>
              {config.focusMatrix.map((row, idx) => (
                <div
                  key={row.id}
                  className="p-2.5 border border-slate-200 rounded-md space-y-1.5 bg-slate-50/50"
                >
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={row.area}
                      onChange={(e) => {
                        const next = [...config.focusMatrix];
                        next[idx] = { ...row, area: e.target.value };
                        updateField("focusMatrix", next);
                      }}
                      placeholder="Area"
                      className="w-1/3 px-2 py-1 text-xs font-medium bg-white border border-slate-300 rounded"
                    />
                    <input
                      type="text"
                      value={row.technology}
                      onChange={(e) => {
                        const next = [...config.focusMatrix];
                        next[idx] = { ...row, technology: e.target.value };
                        updateField("focusMatrix", next);
                      }}
                      placeholder="Technology"
                      className="flex-1 min-w-0 px-2 py-1 text-xs bg-white border border-slate-300 rounded"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateField(
                          "focusMatrix",
                          config.focusMatrix.filter((r) => r.id !== row.id)
                        )
                      }
                      aria-label="Remove focus row"
                      className="p-1 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={row.status}
                      onChange={(e) => {
                        const next = [...config.focusMatrix];
                        next[idx] = {
                          ...row,
                          status: e.target.value as FocusRow["status"],
                        };
                        updateField("focusMatrix", next);
                      }}
                      className="px-2 py-1 text-xs bg-white border border-slate-300 rounded"
                    >
                      <option value="Mastering">Mastering</option>
                      <option value="Learning">Learning</option>
                      <option value="Exploring">Exploring</option>
                    </select>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      step={5}
                      value={row.progress}
                      onChange={(e) => {
                        const next = [...config.focusMatrix];
                        next[idx] = { ...row, progress: Number(e.target.value) };
                        updateField("focusMatrix", next);
                      }}
                      className="flex-1 accent-blue-600"
                    />
                    <span className="text-xs font-mono tabular-nums text-slate-700 w-9 text-right">
                      {row.progress}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === "widgets" && (
          <>
            {/* AI Tailor Card */}
            <form
              onSubmit={handleAiTailor}
              className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
                  Tailor Copy with AI
                </span>
                <span className="text-xs text-slate-500">Server-side</span>
              </div>
              <textarea
                rows={2}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g. Emphasize zero-fee billing, 80+ CRM webhooks, and predictive churn scoring for SaaS founders..."
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
              />
              <button
                type="submit"
                disabled={aiLoading || !aiPrompt.trim()}
                className="w-full py-1.5 px-3 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {aiLoading ? "Tailoring Sections..." : "Tailor README Sections"}
              </button>
              {aiError && <p className="text-xs text-rose-600">{aiError}</p>}
              {aiSuccess && <p className="text-xs text-emerald-700">{aiSuccess}</p>}
            </form>

            {/* Theme & Banner Controls */}
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="stats-theme-select"
                    className="block text-xs font-semibold text-slate-900"
                  >
                    GitHub Readme Stats Theme
                  </label>
                  <code className="text-[11px] font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                    theme={config.widgets.theme}
                  </code>
                </div>
                <select
                  id="stats-theme-select"
                  value={config.widgets.theme}
                  onChange={(e) => updateWidget("theme", e.target.value as StatsTheme)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md font-medium"
                >
                  {THEME_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label} ({t.value})
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-3 gap-1.5">
                  {THEME_OPTIONS.slice(0, 6).map((t) => {
                    const active = config.widgets.theme === t.value;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => updateWidget("theme", t.value)}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] border transition-colors text-left truncate ${
                          active
                            ? "border-blue-600 bg-blue-50/80 text-slate-900 font-semibold"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/15"
                          style={{ backgroundColor: t.accentHex }}
                        />
                        <span className="truncate">{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                  Wave Banner Palette
                </label>
                <select
                  value={config.widgets.bannerGradient}
                  onChange={(e) => updateWidget("bannerGradient", e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                >
                  {BANNER_GRADIENTS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-600">
                    Banner Title
                  </label>
                  <input
                    type="text"
                    value={config.widgets.bannerTitle || ""}
                    onChange={(e) => updateWidget("bannerTitle", e.target.value)}
                    placeholder="DDMGURU | ItzDDM"
                    className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-600">
                    Banner Subtitle
                  </label>
                  <input
                    type="text"
                    value={config.widgets.bannerSubtitle || ""}
                    onChange={(e) => updateWidget("bannerSubtitle", e.target.value)}
                    placeholder="Creativity • Technology • Innovation"
                    className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-700">
                  Typing SVG Accent Color
                </label>
                <select
                  value={config.widgets.typingColor || "9B8CFF"}
                  onChange={(e) => updateWidget("typingColor", e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                >
                  {TYPING_COLORS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* WakaTime & Telemetry Badges */}
            <div className="space-y-2.5 pt-2 border-t border-slate-200">
              <div className="text-xs font-semibold text-slate-800">
                Code Telemetry Badges (Shields.io)
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-600">
                    Code Time
                  </label>
                  <input
                    type="text"
                    value={config.telemetryBadges?.codeTime || ""}
                    onChange={(e) =>
                      updateField("telemetryBadges", {
                        ...config.telemetryBadges,
                        codeTime: e.target.value,
                      })
                    }
                    placeholder="208 hrs 4 mins"
                    className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-600">
                    AI Code Time
                  </label>
                  <input
                    type="text"
                    value={config.telemetryBadges?.aiCodeTime || ""}
                    onChange={(e) =>
                      updateField("telemetryBadges", {
                        ...config.telemetryBadges,
                        aiCodeTime: e.target.value,
                      })
                    }
                    placeholder="2 hrs 31 mins"
                    className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-600">
                  Lines Written (&quot;From Hello World I&apos;ve Written&quot;)
                </label>
                <input
                  type="text"
                  value={config.telemetryBadges?.linesOfCode || ""}
                  onChange={(e) =>
                    updateField("telemetryBadges", {
                      ...config.telemetryBadges,
                      linesOfCode: e.target.value,
                    })
                  }
                  placeholder="9.86 million lines of code"
                  className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded"
                />
              </div>
            </div>

            {/* WakaTime Commit Rhythm & Time Zone */}
            <div className="space-y-2.5 pt-2 border-t border-slate-200">
              <div className="text-xs font-semibold text-slate-800">
                WakaTime Commit Rhythm &amp; Weekly Activity
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={config.wakaStats?.personaTitle || ""}
                  onChange={(e) =>
                    updateField("wakaStats", {
                      ...config.wakaStats,
                      personaTitle: e.target.value,
                    })
                  }
                  placeholder="I'm a Night 🦉"
                  className="px-2 py-1 text-xs bg-white border border-slate-300 rounded"
                />
                <input
                  type="text"
                  value={config.wakaStats?.timeZone || ""}
                  onChange={(e) =>
                    updateField("wakaStats", {
                      ...config.wakaStats,
                      timeZone: e.target.value,
                    })
                  }
                  placeholder="Africa/Nigeria"
                  className="px-2 py-1 text-xs font-mono bg-white border border-slate-300 rounded"
                />
              </div>
              <input
                type="text"
                value={config.wakaStats?.productiveDayTitle || ""}
                onChange={(e) =>
                  updateField("wakaStats", {
                    ...config.wakaStats,
                    productiveDayTitle: e.target.value,
                  })
                }
                placeholder="📅 I'm Most Productive on Tuesday"
                className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded"
              />
              <div className="space-y-1.5">
                <input
                  type="text"
                  value={config.wakaStats?.weeklyLanguages || ""}
                  onChange={(e) =>
                    updateField("wakaStats", {
                      ...config.wakaStats,
                      weeklyLanguages: e.target.value,
                    })
                  }
                  placeholder="Weekly languages..."
                  className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded"
                />
                <input
                  type="text"
                  value={config.wakaStats?.weeklyProjects || ""}
                  onChange={(e) =>
                    updateField("wakaStats", {
                      ...config.wakaStats,
                      weeklyProjects: e.target.value,
                    })
                  }
                  placeholder="Weekly projects..."
                  className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded"
                />
              </div>
            </div>

            {/* Dedicated GitHub Statistics Widgets Section */}
            <div className="space-y-2.5 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900">
                  GitHub Statistics Widgets
                </span>
                <span className="text-[11px] font-mono text-slate-500">Live + Markdown</span>
              </div>

              {/* 1. GitHub Stats Card */}
              <div className="rounded-md border border-slate-200 bg-slate-50/50 p-2.5 space-y-2">
                <label className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <span>GitHub Stats Card</span>
                  <input
                    type="checkbox"
                    checked={Boolean(config.widgets.showStatsCard)}
                    onChange={(e) => updateWidget("showStatsCard", e.target.checked)}
                    className="accent-blue-600 shrink-0"
                  />
                </label>
                {config.widgets.showStatsCard && (
                  <div className="space-y-2 pt-1 border-t border-slate-200/80 text-[11px] text-slate-700">
                    <div className="grid grid-cols-2 gap-1.5">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.widgets.statsShowIcons ?? true}
                          onChange={(e) => updateWidget("statsShowIcons", e.target.checked)}
                          className="accent-blue-600"
                        />
                        Show Icons
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.widgets.statsIncludeAllCommits ?? true}
                          onChange={(e) =>
                            updateWidget("statsIncludeAllCommits", e.target.checked)
                          }
                          className="accent-blue-600"
                        />
                        All Commits
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.widgets.statsCountPrivate ?? true}
                          onChange={(e) => updateWidget("statsCountPrivate", e.target.checked)}
                          className="accent-blue-600"
                        />
                        Count Private
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.widgets.statsHideBorder ?? true}
                          onChange={(e) => updateWidget("statsHideBorder", e.target.checked)}
                          className="accent-blue-600"
                        />
                        Hide Border
                      </label>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-slate-600">Rank Icon</span>
                      <select
                        value={config.widgets.statsRankIcon || "github"}
                        onChange={(e) =>
                          updateWidget("statsRankIcon", e.target.value as StatsRankIcon)
                        }
                        className="px-2 py-1 text-xs bg-white border border-slate-300 rounded"
                      >
                        <option value="github">GitHub Logo</option>
                        <option value="default">Letter Grade</option>
                        <option value="percentile">Percentile</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Top Languages Card */}
              <div className="rounded-md border border-slate-200 bg-slate-50/50 p-2.5 space-y-2">
                <label className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <span>Top Languages Card</span>
                  <input
                    type="checkbox"
                    checked={Boolean(config.widgets.showTopLangs)}
                    onChange={(e) => updateWidget("showTopLangs", e.target.checked)}
                    className="accent-blue-600 shrink-0"
                  />
                </label>
                {config.widgets.showTopLangs && (
                  <div className="space-y-2 pt-1.5 border-t border-slate-200/80">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-medium text-slate-600">
                          Layout Style
                        </label>
                        <select
                          value={config.widgets.topLangsLayout || "compact"}
                          onChange={(e) =>
                            updateWidget("topLangsLayout", e.target.value as TopLangsLayout)
                          }
                          className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded"
                        >
                          <option value="compact">Compact Bar</option>
                          <option value="normal">Normal List</option>
                          <option value="donut">Donut Ring</option>
                          <option value="pie">Pie Chart</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[11px] font-medium text-slate-600">
                          Languages ({config.widgets.topLangsCount || 8})
                        </label>
                        <input
                          type="range"
                          min={2}
                          max={12}
                          value={config.widgets.topLangsCount || 8}
                          onChange={(e) =>
                            updateWidget("topLangsCount", Number(e.target.value))
                          }
                          className="w-full accent-blue-600 mt-1.5"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] font-medium text-slate-600">
                        Exclude Repositories (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={config.widgets.topLangsExclude || ""}
                        onChange={(e) => updateWidget("topLangsExclude", e.target.value)}
                        placeholder="e.g. demo-repo, test-fork"
                        className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded font-mono"
                      />
                    </div>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-700">
                      <input
                        type="checkbox"
                        checked={config.widgets.topLangsHideBorder ?? true}
                        onChange={(e) => updateWidget("topLangsHideBorder", e.target.checked)}
                        className="accent-blue-600"
                      />
                      Hide Border
                    </label>
                  </div>
                )}
              </div>

              {/* 3. GitHub Streak Tracker */}
              <div className="rounded-md border border-slate-200 bg-slate-50/50 p-2.5 space-y-2">
                <label className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <span>GitHub Streak Tracker</span>
                  <input
                    type="checkbox"
                    checked={Boolean(config.widgets.showStreakStats)}
                    onChange={(e) => updateWidget("showStreakStats", e.target.checked)}
                    className="accent-blue-600 shrink-0"
                  />
                </label>
                {config.widgets.showStreakStats && (
                  <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-200/80 text-[11px] text-slate-700">
                    <select
                      value={config.widgets.streakMode || "daily"}
                      onChange={(e) =>
                        updateWidget("streakMode", e.target.value as "daily" | "weekly")
                      }
                      className="px-2 py-1 text-xs bg-white border border-slate-300 rounded"
                    >
                      <option value="daily">Daily Streak</option>
                      <option value="weekly">Weekly Streak</option>
                    </select>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.widgets.streakHideBorder ?? true}
                        onChange={(e) => updateWidget("streakHideBorder", e.target.checked)}
                        className="accent-blue-600"
                      />
                      Hide Border
                    </label>
                  </div>
                )}
              </div>

              {/* 4. GitHub Trophies */}
              <div className="rounded-md border border-slate-200 bg-slate-50/50 p-2.5 space-y-2">
                <label className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <span>GitHub Trophies</span>
                  <input
                    type="checkbox"
                    checked={Boolean(config.widgets.showTrophies)}
                    onChange={(e) => updateWidget("showTrophies", e.target.checked)}
                    className="accent-blue-600 shrink-0"
                  />
                </label>
                {config.widgets.showTrophies && (
                  <div className="space-y-2 pt-1.5 border-t border-slate-200/80 text-[11px] text-slate-700">
                    <div className="grid grid-cols-2 gap-2">
                      <label className="space-y-1 block">
                        <span className="text-slate-600">Rows</span>
                        <select
                          value={config.widgets.trophyRows || 2}
                          onChange={(e) =>
                            updateWidget("trophyRows", Number(e.target.value))
                          }
                          className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded"
                        >
                          <option value={1}>1 Row</option>
                          <option value={2}>2 Rows</option>
                          <option value={3}>3 Rows</option>
                        </select>
                      </label>
                      <label className="space-y-1 block">
                        <span className="text-slate-600">Columns</span>
                        <select
                          value={config.widgets.trophyColumns || 2}
                          onChange={(e) =>
                            updateWidget("trophyColumns", Number(e.target.value))
                          }
                          className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded"
                        >
                          <option value={2}>2 Columns</option>
                          <option value={3}>3 Columns</option>
                          <option value={4}>4 Columns</option>
                        </select>
                      </label>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.widgets.trophyNoFrame ?? true}
                          onChange={(e) => updateWidget("trophyNoFrame", e.target.checked)}
                          className="accent-blue-600"
                        />
                        No Frame
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.widgets.trophyNoBg ?? true}
                          onChange={(e) => updateWidget("trophyNoBg", e.target.checked)}
                          className="accent-blue-600"
                        />
                        Transparent Bg
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* 5. Coding Activity Graph */}
              <div className="rounded-md border border-slate-200 bg-slate-50/50 p-2.5 space-y-2">
                <label className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <span>Coding Activity Graph</span>
                  <input
                    type="checkbox"
                    checked={Boolean(config.widgets.showActivityGraph)}
                    onChange={(e) => updateWidget("showActivityGraph", e.target.checked)}
                    className="accent-blue-600 shrink-0"
                  />
                </label>
                {config.widgets.showActivityGraph && (
                  <div className="flex items-center gap-4 pt-1.5 border-t border-slate-200/80 text-[11px] text-slate-700">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.widgets.activityArea ?? true}
                        onChange={(e) => updateWidget("activityArea", e.target.checked)}
                        className="accent-blue-600"
                      />
                      Area Fill
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.widgets.activityHideBorder ?? true}
                        onChange={(e) =>
                          updateWidget("activityHideBorder", e.target.checked)
                        }
                        className="accent-blue-600"
                      />
                      Hide Border
                    </label>
                  </div>
                )}
              </div>

              {/* 6. WakaTime Visual Graph Card */}
              <div className="rounded-md border border-slate-200 bg-slate-50/50 p-2.5 space-y-2">
                <label className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <span>WakaTime Graph Card</span>
                  <input
                    type="checkbox"
                    checked={Boolean(config.widgets.showWakaGraph)}
                    onChange={(e) => updateWidget("showWakaGraph", e.target.checked)}
                    className="accent-blue-600 shrink-0"
                  />
                </label>
                {config.widgets.showWakaGraph && (
                  <div className="space-y-2 pt-1.5 border-t border-slate-200/80 text-[11px] text-slate-700">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="block font-medium text-slate-600">
                          WakaTime Username
                        </label>
                        <input
                          type="text"
                          value={config.widgets.wakaUsername || ""}
                          onChange={(e) => updateWidget("wakaUsername", e.target.value)}
                          placeholder={config.username || "ddmdesign7"}
                          className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block font-medium text-slate-600">Layout</label>
                        <select
                          value={config.widgets.wakaLayout || "compact"}
                          onChange={(e) =>
                            updateWidget("wakaLayout", e.target.value as WakaGraphLayout)
                          }
                          className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded"
                        >
                          <option value="compact">Compact</option>
                          <option value="default">Default Bars</option>
                        </select>
                      </div>
                    </div>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.widgets.wakaHideBorder ?? true}
                        onChange={(e) => updateWidget("wakaHideBorder", e.target.checked)}
                        className="accent-blue-600"
                      />
                      Hide Border
                    </label>
                  </div>
                )}
              </div>
              {/* 7. Contribution Snake Animation */}
              <div className="rounded-md border border-slate-200 bg-slate-50/50 p-2.5">
                <label className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <span>Contribution Snake Animation</span>
                  <input
                    type="checkbox"
                    checked={Boolean(config.widgets.showSnakeAnimation)}
                    onChange={(e) => updateWidget("showSnakeAnimation", e.target.checked)}
                    className="accent-blue-600 shrink-0"
                  />
                </label>
              </div>
            </div>

            {/* Layout & Section Modules */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <div className="text-xs font-semibold text-slate-800">
                Layout &amp; Section Modules
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {(
                  [
                    ["showAnimatedEmojis", "Animated Fluent & zayennn Emojis"],
                    ["showCapsuleHeader", "Waving Header Banner (capsule-render)"],
                    ["showTypingSvg", "Animated Role Taglines (typing-svg)"],
                    ["showHeroBadges", "Centered Hero Stack & Status Badges"],
                    ["showTelemetryBadges", "Code Time & Lines Written Badges"],
                    ["showDividers", "Gradient Section Dividers"],
                    ["showPillarsMatrix", "What I Bring Together (3-Column Matrix)"],
                    ["showCreativeIdentity", "Creative Identity & Design Skills Table"],
                    ["showSkillIcons", "SkillIcons.dev Tech & Design Strips"],
                    ["showDigitalWorlds", "Explore My Digital Worlds CTAs"],
                    ["showExploring", "What I'm Exploring Bullets"],
                    ["showEvolutionTable", "Platform Ecosystem & Evolution Table"],
                    ["showThreeColStack", "3-Column Technology Stack Table"],
                    ["showPinnedGrid", "2-Column Pinned Project Cards"],
                    ["showQuickClone", "Quick Clone CLI Commands Block"],
                    ["showFocusMatrix", "Current Focus & Mastery Table"],
                    ["showPrinciples", "Key Design Principles Section"],
                    ["showWakaStats", "WakaTime Commit Rhythm (ASCII Block)"],
                    ["showContributionOverview", "Contribution Overview Summary"],
                    ["showYearProgress", "Year Progress Bar"],
                    ["showProfileViews", "Profile Views Counter"],
                    ["showCapsuleFooter", "Waving Footer Banner"],
                  ] as const
                ).map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded border border-slate-200 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    <span>{label}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(config.widgets[key])}
                      onChange={(e) => updateWidget(key, e.target.checked)}
                      className="accent-blue-600 shrink-0"
                    />
                  </label>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
};
