import React, { useState } from "react";
import { BookMarked, Check, Copy, ExternalLink, Moon, Sun } from "lucide-react";
import { EMOT_ICONS } from "../data/presets";
import { ProfileConfig } from "../types/readme";
import {
  buildQuickCloneCommands,
  buildTelemetryBadgeUrls,
  buildTypingSvgUrl,
  computeYearProgress,
  formatWakaAsciiBlock,
} from "../utils/markdownGenerator";
import { SmartImage } from "./SmartImage";

interface ReadmePreviewProps {
  config: ProfileConfig;
  markdown: string;
}

const DIVIDER_URL =
  "https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif";

const LANGUAGE_DOT_COLORS: Record<string, string> = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Python: "#3572A5",
  PHP: "#4F5D95",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Go: "#00ADD8",
  Rust: "#dea584",
};

export const ReadmePreview: React.FC<ReadmePreviewProps> = ({ config, markdown }) => {
  const [githubCanvas, setGithubCanvas] = useState<"dark" | "light">("dark");
  const [copied, setCopied] = useState(false);

  const isDark = githubCanvas === "dark";
  const anim = config.widgets.showAnimatedEmojis;
  const username = (config.username || "ddmdesign7").trim();
  const theme = config.widgets.theme;
  const { percent, bar, dateLabel } = computeYearProgress();
  const telemetryBadges = buildTelemetryBadgeUrls(config);
  const quickCloneCmds = buildQuickCloneCommands(config);
  const wakaAscii = formatWakaAsciiBlock(config.wakaStats);

  const typingLinesParam = (config.typingLines || [])
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => encodeURIComponent(l).replace(/%20/g, "+"))
    .join(";");
  const typingColorHex = (config.widgets.typingColor || "6366F1").replace("#", "");

  const enabledSkills = (config.skills || []).filter((s) => s.enabled);
  const frontendSkills = enabledSkills.filter((s) => s.category === "Frontend Development");
  const backendSkills = enabledSkills.filter((s) => s.category === "Backend Development");
  const devopsSkills = enabledSkills.filter((s) => s.category === "Databases, DevOps & CRM");

  const skillGroups: Array<{
    title: string;
    iconUrl?: string;
    fallbackEmoji: string;
    items: typeof enabledSkills;
  }> = [
    {
      title: "Frontend Development",
      iconUrl: EMOT_ICONS.palette,
      fallbackEmoji: "🎨",
      items: frontendSkills,
    },
    {
      title: "Backend Development",
      fallbackEmoji: "⚙️",
      items: backendSkills,
    },
    {
      title: "Databases, DevOps & CRM Tools",
      iconUrl: EMOT_ICONS.dividers,
      fallbackEmoji: "🗂️",
      items: devopsSkills,
    },
  ].filter((g) => g.items.length > 0);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const renderSectionIcon = (url: string | undefined, fallback: string, size = 24) => {
    if (!anim || !url) {
      return <span aria-hidden="true">{fallback}</span>;
    }
    return (
      <span
        style={{ width: size, height: size }}
        className="inline-flex items-center justify-center shrink-0"
      >
        <SmartImage
          src={url}
          alt=""
          className="w-full h-full object-contain"
          darkSurface={isDark}
          compact
          fallbackTitle={fallback}
        />
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Preview Frame Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 sm:px-5 py-3 bg-white border-b border-slate-200">
        <div className="flex items-center gap-2 text-xs text-slate-600 font-mono min-w-0">
          <span className="font-semibold text-slate-900 truncate">
            {username}/{config.repoName || username}
          </span>
          <span aria-hidden="true">/</span>
          <span className="text-slate-500 shrink-0">README.md</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          <div
            className="flex items-center p-0.5 bg-slate-100 rounded-md border border-slate-200"
            role="group"
            aria-label="GitHub surface theme"
          >
            <button
              type="button"
              onClick={() => setGithubCanvas("dark")}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                isDark
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              GitHub Dark
            </button>
            <button
              type="button"
              onClick={() => setGithubCanvas("light")}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                !isDark
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              GitHub Light
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy Markdown
              </>
            )}
          </button>
        </div>
      </div>

      {/* Simulated GitHub README Canvas */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 bg-slate-100">
        <div
          className={`max-w-[980px] mx-auto rounded-lg border transition-colors ${
            isDark
              ? "bg-[#0d1117] border-[#30363d] text-[#e6edf3]"
              : "bg-white border-[#d0d7de] text-[#1f2328]"
          }`}
        >
          {/* GitHub File Bar */}
          <div
            className={`flex items-center justify-between px-4 py-2.5 border-b text-xs font-mono ${
              isDark
                ? "bg-[#161b22] border-[#30363d] text-[#8b949e]"
                : "bg-[#f6f8fa] border-[#d0d7de] text-[#656d76]"
            }`}
          >
            <span>README.md</span>
            <span>{config.mode === "profile" ? "Profile Repository" : "Project Repository"}</span>
          </div>

          {/* README Body */}
          <div className="p-6 lg:p-8 space-y-6">
            {/* Waving Capsule Header */}
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
                  fallbackTitle={config.widgets.bannerTitle || "Capsule Render Wave Header"}
                  fallbackSubtitle={
                    config.widgets.bannerSubtitle || `Gradient: ${config.widgets.bannerGradient}`
                  }
                />
              </div>
            )}

            {/* Animated Typing SVG (eaz-cosmic-portfolio-v2 top position) */}
            {config.widgets.showTypingSvg && (config.typingLines || []).length > 0 && (
              <div className="flex justify-center">
                <SmartImage
                  src={`/api/widgets/typing?color=${encodeURIComponent(
                    typingColorHex
                  )}&lines=${typingLinesParam || "Developer"}`}
                  alt="Animated Role Taglines"
                  className="max-w-full h-auto"
                  darkSurface={isDark}
                  fallbackTitle={(config.typingLines || []).join(" · ")}
                  fallbackSubtitle={buildTypingSvgUrl(config.typingLines, config.widgets.typingColor)}
                />
              </div>
            )}

            {config.widgets.showDividers && (
              <div className="w-full py-1">
                <SmartImage
                  src={DIVIDER_URL}
                  alt="Section Divider"
                  className="w-full h-1.5 object-cover rounded-full opacity-90"
                  darkSurface={isDark}
                  compact
                />
              </div>
            )}

            {/* Hero Title, Subtitle & Centered Badges */}
            <div className="text-center space-y-3">
              <h1
                className={`text-2xl lg:text-[26px] font-bold tracking-tight pb-2 border-b flex items-center justify-center gap-2.5 flex-wrap ${
                  isDark ? "border-[#21262d] text-[#e6edf3]" : "border-[#d8dee4] text-[#1f2328]"
                }`}
                style={{ textWrap: "balance" }}
              >
                {renderSectionIcon(EMOT_ICONS.rocketPng, "🚀", 32)}
                <span>{config.heroTitle}</span>
                {renderSectionIcon(EMOT_ICONS.star, "✨", 32)}
              </h1>

              {(config.heroSubtitle || "").trim() && (
                <p
                  className={`text-sm font-medium max-w-2xl mx-auto leading-relaxed ${
                    isDark ? "text-[#c9d1d9]" : "text-[#1f2328]"
                  }`}
                >
                  {config.heroSubtitle}
                </p>
              )}

              {config.widgets.showHeroBadges && enabledSkills.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1.5 pt-1">
                  {enabledSkills.slice(0, 6).map((skill) => (
                    <SmartImage
                      key={`hero-${skill.id}`}
                      src={skill.badgeUrl}
                      alt={skill.name}
                      className="h-7 w-auto"
                      darkSurface={isDark}
                      compact
                      fallbackTitle={skill.name}
                    />
                  ))}
                  {(config.statusBadge || "").trim() && (
                    <SmartImage
                      src={`https://img.shields.io/badge/Status-${encodeURIComponent(
                        config.statusBadge.trim()
                      )}-8B5CF6?style=for-the-badge`}
                      alt="Status"
                      className="h-7 w-auto"
                      darkSurface={isDark}
                      compact
                      fallbackTitle={`Status: ${config.statusBadge}`}
                    />
                  )}
                </div>
              )}

              {config.widgets.showTelemetryBadges && telemetryBadges.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1.5 pt-1">
                  {telemetryBadges.map((b) => (
                    <SmartImage
                      key={b.label}
                      src={b.url}
                      alt={b.label}
                      className="h-5 w-auto"
                      darkSurface={isDark}
                      compact
                      fallbackTitle={b.label}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* 60% / 40% Two-Column Layout mirroring zayennn */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left 60% Column (7/12) */}
              <div className="lg:col-span-7 space-y-6 min-w-0">
                {/* About Me */}
                <section className="space-y-3">
                  <h2
                    className={`text-lg font-semibold pb-1.5 border-b flex items-center gap-2 ${
                      isDark ? "border-[#21262d]" : "border-[#d8dee4]"
                    }`}
                  >
                    {renderSectionIcon(EMOT_ICONS.rocket, "🚀", 28)}
                    <span>About Me</span>
                  </h2>
                  {config.aboutIntro.trim() && (
                    <p
                      className={`text-sm leading-relaxed ${
                        isDark ? "text-[#e6edf3]" : "text-[#1f2328]"
                      }`}
                    >
                      {config.aboutIntro}
                    </p>
                  )}
                  <ul className="space-y-2 text-sm">
                    {config.aboutBullets.map((b) => (
                      <li key={b.id} className="flex items-start gap-2.5 leading-relaxed">
                        <span className="shrink-0 mt-0.5">
                          {renderSectionIcon(b.iconUrl, b.emoji, 18)}
                        </span>
                        <span>
                          <strong className="font-semibold">{b.label}:</strong> {b.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {(config.heroQuote || "").trim() && (
                    <blockquote
                      className={`mt-3 pl-3.5 py-1.5 border-l-4 text-xs italic ${
                        isDark
                          ? "border-[#58a6ff]/60 text-[#c9d1d9]"
                          : "border-[#0969da]/60 text-[#57606a]"
                      }`}
                    >
                      &ldquo;{config.heroQuote.trim()}&rdquo;
                    </blockquote>
                  )}
                </section>

                {/* What I Bring Together (3-Column Pillars Matrix) */}
                {config.widgets.showPillarsMatrix && (config.pillarsMatrix || []).length > 0 && (
                  <section className="space-y-3">
                    <h2
                      className={`text-lg font-semibold pb-1.5 border-b ${
                        isDark ? "border-[#21262d]" : "border-[#d8dee4]"
                      }`}
                    >
                      ✧ What I Bring Together
                    </h2>
                    <div className="overflow-x-auto">
                      <table
                        className={`w-full text-xs border-collapse border ${
                          isDark ? "border-[#30363d]" : "border-[#d0d7de]"
                        }`}
                      >
                        <thead>
                          <tr className={isDark ? "bg-[#161b22]" : "bg-[#f6f8fa]"}>
                            <th
                              className={`text-left px-3 py-2 border font-semibold ${
                                isDark ? "border-[#30363d]" : "border-[#d0d7de]"
                              }`}
                            >
                              Creative thinking
                            </th>
                            <th
                              className={`text-left px-3 py-2 border font-semibold ${
                                isDark ? "border-[#30363d]" : "border-[#d0d7de]"
                              }`}
                            >
                              Digital building
                            </th>
                            <th
                              className={`text-left px-3 py-2 border font-semibold ${
                                isDark ? "border-[#30363d]" : "border-[#d0d7de]"
                              }`}
                            >
                              Business-minded innovation
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {(config.pillarsMatrix || []).map((row) => (
                            <tr
                              key={row.id}
                              className={
                                isDark ? "even:bg-[#161b22]/50" : "even:bg-[#f6f8fa]/60"
                              }
                            >
                              <td
                                className={`px-3 py-2 border ${
                                  isDark ? "border-[#30363d]" : "border-[#d0d7de]"
                                }`}
                              >
                                {row.creative}
                              </td>
                              <td
                                className={`px-3 py-2 border ${
                                  isDark ? "border-[#30363d]" : "border-[#d0d7de]"
                                }`}
                              >
                                {row.building}
                              </td>
                              <td
                                className={`px-3 py-2 border ${
                                  isDark ? "border-[#30363d]" : "border-[#d0d7de]"
                                }`}
                              >
                                {row.business}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}

                {/* Creative Identity & Design Skills */}
                {config.widgets.showCreativeIdentity && (config.creativeSkills || []).length > 0 && (
                  <section className="space-y-3">
                    <h2
                      className={`text-lg font-semibold pb-1.5 border-b ${
                        isDark ? "border-[#21262d]" : "border-[#d8dee4]"
                      }`}
                    >
                      🎨 Creative Identity &amp; Design Skills
                    </h2>
                    <div className="overflow-x-auto">
                      <table
                        className={`w-full text-xs border-collapse border ${
                          isDark ? "border-[#30363d]" : "border-[#d0d7de]"
                        }`}
                      >
                        <thead>
                          <tr className={isDark ? "bg-[#161b22]" : "bg-[#f6f8fa]"}>
                            <th
                              className={`text-left px-3 py-2 border font-semibold ${
                                isDark ? "border-[#30363d]" : "border-[#d0d7de]"
                              }`}
                            >
                              Creative Area
                            </th>
                            <th
                              className={`text-left px-3 py-2 border font-semibold ${
                                isDark ? "border-[#30363d]" : "border-[#d0d7de]"
                              }`}
                            >
                              Focus
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {(config.creativeSkills || []).map((row) => (
                            <tr
                              key={row.id}
                              className={
                                isDark ? "even:bg-[#161b22]/50" : "even:bg-[#f6f8fa]/60"
                              }
                            >
                              <td
                                className={`px-3 py-2 border font-semibold whitespace-nowrap ${
                                  isDark ? "border-[#30363d]" : "border-[#d0d7de]"
                                }`}
                              >
                                {row.area}
                              </td>
                              <td
                                className={`px-3 py-2 border ${
                                  isDark ? "border-[#30363d]" : "border-[#d0d7de]"
                                }`}
                              >
                                {row.focus}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}

                {/* Tech Stack & Skills (Left Column when 3-Col Table is disabled) */}
                {!config.widgets.showThreeColStack &&
                  (skillGroups.length > 0 ||
                    (config.widgets.showSkillIcons &&
                      Boolean((config.skillIconsDev || "").trim() || (config.skillIconsDesign || "").trim()))) && (
                  <section className="space-y-3">
                    <h2
                      className={`text-lg font-semibold pb-1.5 border-b flex items-center gap-2 ${
                        isDark ? "border-[#21262d]" : "border-[#d8dee4]"
                      }`}
                    >
                      {renderSectionIcon(EMOT_ICONS.gear, "⚙️", 24)}
                      <span>Tech Stack &amp; Skills</span>
                    </h2>
                    {config.widgets.showSkillIcons && (
                      <div className="space-y-2.5">
                        {(config.skillIconsDev || "").trim() && (
                          <div className="space-y-1.5">
                            <div
                              className={`text-xs font-semibold ${
                                isDark ? "text-[#c9d1d9]" : "text-[#1f2328]"
                              }`}
                            >
                              💻 Development Technologies
                            </div>
                            <SmartImage
                              src={`/api/widgets/skillicons?i=${encodeURIComponent(
                                config.skillIconsDev.trim()
                              )}`}
                              alt="Development technology icons"
                              className="max-w-full h-auto"
                              darkSurface={isDark}
                              compact
                              fallbackTitle={config.skillIconsDev}
                            />
                          </div>
                        )}
                        {(config.skillIconsDesign || "").trim() && (
                          <div className="space-y-1.5">
                            <div
                              className={`text-xs font-semibold ${
                                isDark ? "text-[#c9d1d9]" : "text-[#1f2328]"
                              }`}
                            >
                              🎨 Creative &amp; Design Tools
                            </div>
                            <SmartImage
                              src={`/api/widgets/skillicons?i=${encodeURIComponent(
                                config.skillIconsDesign.trim()
                              )}`}
                              alt="Creative design tools"
                              className="max-w-full h-auto"
                              darkSurface={isDark}
                              compact
                              fallbackTitle={config.skillIconsDesign}
                            />
                          </div>
                        )}
                        {(config.skillIconsNote || "").trim() && (
                          <p
                            className={`text-[11px] leading-relaxed ${
                              isDark ? "text-[#8b949e]" : "text-[#656d76]"
                            }`}
                          >
                            {config.skillIconsNote.trim()}
                          </p>
                        )}
                      </div>
                    )}
                    <div className="space-y-3.5">
                      {skillGroups.map((group) => (
                        <div key={group.title} className="space-y-1.5">
                          <div
                            className={`text-xs font-semibold flex items-center gap-1.5 ${
                              isDark ? "text-[#c9d1d9]" : "text-[#1f2328]"
                            }`}
                          >
                            {renderSectionIcon(group.iconUrl, group.fallbackEmoji, 16)}
                            <span>{group.title}</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {group.items.map((skill) => (
                              <SmartImage
                                key={skill.id}
                                src={skill.badgeUrl}
                                alt={skill.name}
                                className="h-7 w-auto"
                                darkSurface={isDark}
                                compact
                                fallbackTitle={skill.name}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Current Focus & Learning Matrix */}
                {config.widgets.showFocusMatrix && config.focusMatrix.length > 0 && (
                  <section className="space-y-3">
                    <h2
                      className={`text-lg font-semibold pb-1.5 border-b ${
                        isDark ? "border-[#21262d]" : "border-[#d8dee4]"
                      }`}
                    >
                      🚧 Current Focus &amp; Learning
                    </h2>
                    <div className="overflow-x-auto">
                      <table
                        className={`w-full text-xs border-collapse border ${
                          isDark ? "border-[#30363d]" : "border-[#d0d7de]"
                        }`}
                      >
                        <thead>
                          <tr className={isDark ? "bg-[#161b22]" : "bg-[#f6f8fa]"}>
                            <th
                              className={`text-left px-3 py-2 border font-semibold ${
                                isDark ? "border-[#30363d]" : "border-[#d0d7de]"
                              }`}
                            >
                              Area
                            </th>
                            <th
                              className={`text-left px-3 py-2 border font-semibold ${
                                isDark ? "border-[#30363d]" : "border-[#d0d7de]"
                              }`}
                            >
                              Technology
                            </th>
                            <th
                              className={`text-left px-3 py-2 border font-semibold ${
                                isDark ? "border-[#30363d]" : "border-[#d0d7de]"
                              }`}
                            >
                              Status
                            </th>
                            <th
                              className={`text-left px-3 py-2 border font-semibold ${
                                isDark ? "border-[#30363d]" : "border-[#d0d7de]"
                              }`}
                            >
                              Progress
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {config.focusMatrix.map((row) => (
                            <tr
                              key={row.id}
                              className={
                                isDark ? "even:bg-[#161b22]/50" : "even:bg-[#f6f8fa]/60"
                              }
                            >
                              <td
                                className={`px-3 py-2 border font-semibold ${
                                  isDark ? "border-[#30363d]" : "border-[#d0d7de]"
                                }`}
                              >
                                {row.area}
                              </td>
                              <td
                                className={`px-3 py-2 border ${
                                  isDark ? "border-[#30363d]" : "border-[#d0d7de]"
                                }`}
                              >
                                <SmartImage
                                  src={`https://img.shields.io/badge/${encodeURIComponent(
                                    row.technology
                                  )}-${row.badgeColor}?style=flat-square&logo=${encodeURIComponent(
                                    row.logo
                                  )}&logoColor=white`}
                                  alt={row.technology}
                                  className="h-5 w-auto"
                                  darkSurface={isDark}
                                  compact
                                  fallbackTitle={row.technology}
                                />
                              </td>
                              <td
                                className={`px-3 py-2 border font-medium whitespace-nowrap ${
                                  isDark ? "border-[#30363d]" : "border-[#d0d7de]"
                                }`}
                              >
                                {row.status === "Mastering"
                                  ? "🟢 Mastering"
                                  : row.status === "Learning"
                                    ? "🟡 Learning"
                                    : "🔵 Exploring"}
                              </td>
                              <td
                                className={`px-3 py-2 border tabular-nums font-mono ${
                                  isDark ? "border-[#30363d]" : "border-[#d0d7de]"
                                }`}
                              >
                                <SmartImage
                                  src={`https://img.shields.io/badge/${row.progress}%25-${row.badgeColor}?style=flat-square`}
                                  alt={`${row.progress}%`}
                                  className="h-5 w-auto"
                                  darkSurface={isDark}
                                  compact
                                  fallbackTitle={`${row.progress}%`}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}
              </div>

              {/* Right 40% Column (5/12) */}
              <div className="lg:col-span-5 space-y-5 min-w-0">
                <section className="space-y-3">
                  <h2
                    className={`text-lg font-semibold pb-1.5 border-b flex items-center gap-2 lg:justify-end ${
                      isDark ? "border-[#21262d]" : "border-[#d8dee4]"
                    }`}
                  >
                    {renderSectionIcon(EMOT_ICONS.bullseye, "🎯", 26)}
                    <span>GitHub Analytics</span>
                  </h2>

                  <div className="space-y-3">
                    {config.widgets.showStatsCard && (
                      <SmartImage
                        src={`/api/widgets/stats?username=${encodeURIComponent(
                          username
                        )}&theme=${encodeURIComponent(theme)}&show_icons=${
                          config.widgets.statsShowIcons ?? true
                        }&include_all_commits=${
                          config.widgets.statsIncludeAllCommits ?? true
                        }&hide_border=${config.widgets.statsHideBorder ?? true}&rank_icon=${encodeURIComponent(
                          config.widgets.statsRankIcon || "default"
                        )}`}
                        alt={`${username} GitHub Stats`}
                        className="w-full h-auto rounded"
                        darkSurface={isDark}
                        fallbackTitle={`${username} — GitHub Stats (${theme})`}
                        fallbackSubtitle="github-readme-stats.vercel.app"
                      />
                    )}

                    {config.widgets.showTopLangs && (
                      <SmartImage
                        src={`/api/widgets/langs?username=${encodeURIComponent(
                          username
                        )}&theme=${encodeURIComponent(theme)}&layout=${encodeURIComponent(
                          config.widgets.topLangsLayout || "compact"
                        )}&langs_count=${config.widgets.topLangsCount || 8}&exclude_repo=${encodeURIComponent(
                          config.widgets.topLangsExclude || ""
                        )}&hide_border=${config.widgets.topLangsHideBorder ?? true}`}
                        alt={`${username} Top Languages`}
                        className="w-full h-auto rounded"
                        darkSurface={isDark}
                        fallbackTitle={`${username} — Top Languages (${config.widgets.topLangsLayout || "compact"})`}
                        fallbackSubtitle="Python · JavaScript · TypeScript · Node.js"
                      />
                    )}

                    {config.widgets.showStreakStats && (
                      <SmartImage
                        src={`/api/widgets/streak?username=${encodeURIComponent(
                          username
                        )}&theme=${encodeURIComponent(theme)}&hide_border=${
                          config.widgets.streakHideBorder ?? true
                        }&mode=${encodeURIComponent(config.widgets.streakMode || "daily")}`}
                        alt={`${username} GitHub Streak`}
                        className="w-full h-auto rounded"
                        darkSurface={isDark}
                        fallbackTitle={`${username} — GitHub Streak (${theme})`}
                        fallbackSubtitle="github-readme-streak-stats.herokuapp.com"
                      />
                    )}
                  </div>
                </section>

                {config.widgets.showTrophies && (
                  <section className="space-y-2.5">
                    <h2
                      className={`text-lg font-semibold pb-1.5 border-b flex items-center gap-2 lg:justify-end ${
                        isDark ? "border-[#21262d]" : "border-[#d8dee4]"
                      }`}
                    >
                      {renderSectionIcon(EMOT_ICONS.trophy, "🏆", 24)}
                      <span>GitHub Trophies</span>
                    </h2>
                    <SmartImage
                      src={`/api/widgets/trophies?username=${encodeURIComponent(
                        username
                      )}&theme=${encodeURIComponent(theme)}&row=${
                        config.widgets.trophyRows || 2
                      }&column=${config.widgets.trophyColumns || 2}&no_frame=${
                        config.widgets.trophyNoFrame ?? true
                      }`}
                      alt={`${username} GitHub Trophies`}
                      className="w-full h-auto rounded"
                      darkSurface={isDark}
                      fallbackTitle={`${username} — GitHub Trophies (${theme})`}
                      fallbackSubtitle="github-profile-trophy.vercel.app"
                    />
                  </section>
                )}

                {/* Connect With Me */}
                <section className="space-y-3">
                  <h2
                    className={`text-lg font-semibold pb-1.5 border-b lg:text-right ${
                      isDark ? "border-[#21262d]" : "border-[#d8dee4]"
                    }`}
                  >
                    🌐 Connect With Me
                  </h2>
                  <div className="flex flex-wrap justify-center gap-2 pt-1">
                    {config.socials.github.trim() && (
                      <a href={config.socials.github} target="_blank" rel="noreferrer">
                        <SmartImage
                          src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white"
                          alt="GitHub"
                          className="h-7 w-auto"
                          darkSurface={isDark}
                          compact
                        />
                      </a>
                    )}
                    {config.socials.portfolio.trim() && (
                      <a href={config.socials.portfolio} target="_blank" rel="noreferrer">
                        <SmartImage
                          src="https://img.shields.io/badge/Portfolio-8B5CF6?style=for-the-badge&logo=googlechrome&logoColor=white"
                          alt="Portfolio"
                          className="h-7 w-auto"
                          darkSurface={isDark}
                          compact
                        />
                      </a>
                    )}
                    {(config.socials.itzddm || "").trim() && (
                      <a href={config.socials.itzddm} target="_blank" rel="noreferrer">
                        <SmartImage
                          src="https://img.shields.io/badge/ItzDDM-0891B2?style=for-the-badge&logo=figma&logoColor=white"
                          alt="ItzDDM"
                          className="h-7 w-auto"
                          darkSurface={isDark}
                          compact
                        />
                      </a>
                    )}
                    {(config.socials.tiktok || "").trim() && (
                      <a href={config.socials.tiktok} target="_blank" rel="noreferrer">
                        <SmartImage
                          src="https://img.shields.io/badge/TikTok-000000?style=for-the-badge&logo=tiktok&logoColor=white"
                          alt="TikTok"
                          className="h-7 w-auto"
                          darkSurface={isDark}
                          compact
                        />
                      </a>
                    )}
                    {config.socials.linkedin.trim() && (
                      <a href={config.socials.linkedin} target="_blank" rel="noreferrer">
                        <SmartImage
                          src="https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white"
                          alt="LinkedIn"
                          className="h-7 w-auto"
                          darkSurface={isDark}
                          compact
                        />
                      </a>
                    )}
                    {config.socials.email.trim() && (
                      <a href={`mailto:${config.socials.email}`}>
                        <SmartImage
                          src="https://img.shields.io/badge/Email-EA4335?style=for-the-badge&logo=gmail&logoColor=white"
                          alt="Email"
                          className="h-7 w-auto"
                          darkSurface={isDark}
                          compact
                        />
                      </a>
                    )}
                  </div>
                  {config.socials.email.trim() && (
                    <p
                      className={`text-center text-xs ${
                        isDark ? "text-[#8b949e]" : "text-[#656d76]"
                      }`}
                    >
                      Email:{" "}
                      <a
                        href={`mailto:${config.socials.email}`}
                        className={
                          isDark ? "text-[#58a6ff] hover:underline" : "text-[#0969da] hover:underline"
                        }
                      >
                        {config.socials.email}
                      </a>
                    </p>
                  )}
                </section>
              </div>
            </div>

            {/* 3-Column Technology Stack Matrix (eaz-cosmic-portfolio-v2 style) */}
            {config.widgets.showThreeColStack && enabledSkills.length > 0 && (
              <section className="space-y-3">
                <h2
                  className={`text-lg font-semibold pb-1.5 border-b ${
                    isDark ? "border-[#21262d]" : "border-[#d8dee4]"
                  }`}
                >
                  🛠️ Technology Stack
                </h2>
                <div
                  className={`grid grid-cols-1 md:grid-cols-3 rounded-md border divide-y md:divide-y-0 md:divide-x ${
                    isDark
                      ? "border-[#30363d] divide-[#30363d]"
                      : "border-[#d0d7de] divide-[#d0d7de]"
                  }`}
                >
                  {[
                    { title: "Frontend", items: frontendSkills },
                    { title: "Backend", items: backendSkills },
                    { title: "DevOps & CRM", items: devopsSkills },
                  ].map((col) => (
                    <div key={col.title} className="p-4 text-center space-y-3">
                      <div className="text-xs font-semibold uppercase tracking-wide">
                        {col.title}
                      </div>
                      <div className="flex flex-wrap justify-center gap-1.5">
                        {col.items.map((skill) => (
                          <SmartImage
                            key={`3col-${skill.id}`}
                            src={skill.badgeUrl}
                            alt={skill.name}
                            className="h-7 w-auto"
                            darkSurface={isDark}
                            compact
                            fallbackTitle={skill.name}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Platform Ecosystem & Evolution Table (eaz-cosmic-portfolio-v2 style) */}
            {config.widgets.showEvolutionTable && (config.evolutionTable || []).length > 0 && (
              <section className="space-y-3">
                <h2
                  className={`text-lg font-semibold pb-1.5 border-b ${
                    isDark ? "border-[#21262d]" : "border-[#d8dee4]"
                  }`}
                >
                  🎨 Platform Ecosystem &amp; Evolution
                </h2>
                <div className="overflow-x-auto">
                  <table
                    className={`w-full text-xs border-collapse border ${
                      isDark ? "border-[#30363d]" : "border-[#d0d7de]"
                    }`}
                  >
                    <thead>
                      <tr className={isDark ? "bg-[#161b22]" : "bg-[#f6f8fa]"}>
                        <th
                          className={`text-left px-3 py-2 border font-semibold ${
                            isDark ? "border-[#30363d]" : "border-[#d0d7de]"
                          }`}
                        >
                          Platform / Version
                        </th>
                        <th
                          className={`text-left px-3 py-2 border font-semibold ${
                            isDark ? "border-[#30363d]" : "border-[#d0d7de]"
                          }`}
                        >
                          URL
                        </th>
                        <th
                          className={`text-left px-3 py-2 border font-semibold ${
                            isDark ? "border-[#30363d]" : "border-[#d0d7de]"
                          }`}
                        >
                          Focus
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(config.evolutionTable || []).map((row) => (
                        <tr
                          key={row.id}
                          className={isDark ? "even:bg-[#161b22]/50" : "even:bg-[#f6f8fa]/60"}
                        >
                          <td
                            className={`px-3 py-2 border font-semibold whitespace-nowrap ${
                              isDark ? "border-[#30363d]" : "border-[#d0d7de]"
                            }`}
                          >
                            {row.version}
                          </td>
                          <td
                            className={`px-3 py-2 border font-mono ${
                              isDark ? "border-[#30363d]" : "border-[#d0d7de]"
                            }`}
                          >
                            <a
                              href={row.url}
                              target="_blank"
                              rel="noreferrer"
                              className={
                                isDark
                                  ? "text-[#58a6ff] hover:underline"
                                  : "text-[#0969da] hover:underline"
                              }
                            >
                              {row.url.replace(/^https?:\/\//, "")}
                            </a>
                          </td>
                          <td
                            className={`px-3 py-2 border ${
                              isDark ? "border-[#30363d]" : "border-[#d0d7de]"
                            }`}
                          >
                            {row.focus}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Pinned Repositories / Featured Work */}
            {config.projects.length > 0 && (
              <>
                {config.widgets.showDividers && (
                  <div className="w-full py-1">
                    <SmartImage
                      src={DIVIDER_URL}
                      alt="Section Divider"
                      className="w-full h-1.5 object-cover rounded-full opacity-90"
                      darkSurface={isDark}
                      compact
                    />
                  </div>
                )}

                <section className="space-y-3">
                  <h2
                    className={`text-lg font-semibold pb-1.5 border-b flex items-center gap-2 ${
                      isDark ? "border-[#21262d]" : "border-[#d8dee4]"
                    }`}
                  >
                    {renderSectionIcon(EMOT_ICONS.bullseye, "📌", 24)}
                    <span>Pinned Repositories &amp; Featured Work</span>
                  </h2>

                  <div
                    className={
                      config.widgets.showPinnedGrid
                        ? "grid grid-cols-1 md:grid-cols-2 gap-4"
                        : "space-y-2.5"
                    }
                  >
                    {config.projects.map((proj) => {
                      const dotColor = LANGUAGE_DOT_COLORS[proj.language] || "#58a6ff";
                      return (
                        <div
                          key={proj.id}
                          className={`rounded-md border p-4 flex flex-col justify-between gap-3 ${
                            isDark
                              ? "bg-[#0d1117] border-[#30363d]"
                              : "bg-white border-[#d0d7de]"
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <a
                                href={proj.url || "#"}
                                target="_blank"
                                rel="noreferrer"
                                className={`inline-flex items-center gap-1.5 text-sm font-semibold hover:underline min-w-0 truncate ${
                                  isDark ? "text-[#58a6ff]" : "text-[#0969da]"
                                }`}
                              >
                                <BookMarked className="w-3.5 h-3.5 shrink-0 opacity-75" />
                                <span className="truncate">{proj.name}</span>
                                <ExternalLink className="w-3 h-3 shrink-0 opacity-60" />
                              </a>
                              <span
                                className={`text-[11px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${
                                  isDark
                                    ? "border-[#30363d] text-[#8b949e]"
                                    : "border-[#d0d7de] text-[#656d76]"
                                }`}
                              >
                                {proj.visibility || "Public"}
                              </span>
                            </div>

                            <p
                              className={`text-xs leading-relaxed ${
                                isDark ? "text-[#8b949e]" : "text-[#656d76]"
                              }`}
                            >
                              {proj.summary}
                            </p>
                          </div>

                          <div
                            className={`flex flex-wrap items-center justify-between gap-2 text-xs ${
                              isDark ? "text-[#8b949e]" : "text-[#656d76]"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="inline-flex items-center gap-1.5 shrink-0">
                                <span
                                  className="w-2.5 h-2.5 rounded-full inline-block"
                                  style={{ backgroundColor: dotColor }}
                                />
                                {proj.language || "TypeScript"}
                              </span>
                              {typeof proj.stars === "number" && proj.stars > 0 && (
                                <span className="tabular-nums shrink-0">⭐ {proj.stars}</span>
                              )}
                              {proj.stack && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="truncate">{proj.stack}</span>
                                </>
                              )}
                            </div>
                            {proj.homepage && (
                              <a
                                href={proj.homepage}
                                target="_blank"
                                rel="noreferrer"
                                className={`inline-flex items-center gap-1 font-medium hover:underline shrink-0 ${
                                  isDark ? "text-[#58a6ff]" : "text-[#0969da]"
                                }`}
                              >
                                🌐 Live Demo
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </>
            )}

            {/* Quick Clone Featured Repositories */}
            {config.widgets.showQuickClone && quickCloneCmds.length > 0 && (
              <section className="space-y-2.5">
                <h2
                  className={`text-lg font-semibold pb-1.5 border-b ${
                    isDark ? "border-[#21262d]" : "border-[#d8dee4]"
                  }`}
                >
                  ⚡ Quick Clone Featured Repositories
                </h2>
                <pre
                  className={`p-3.5 rounded-md border font-mono text-xs overflow-x-auto leading-relaxed ${
                    isDark
                      ? "bg-[#161b22] border-[#30363d] text-[#e6edf3]"
                      : "bg-[#f6f8fa] border-[#d0d7de] text-[#1f2328]"
                  }`}
                >
                  <code>{quickCloneCmds.join("\n")}</code>
                </pre>
              </section>
            )}

            {/* Key Design Principles (eaz-cosmic-portfolio-v2 style) */}
            {config.widgets.showPrinciples && (config.principles || []).length > 0 && (
              <section className="space-y-3">
                <h2
                  className={`text-lg font-semibold pb-1.5 border-b ${
                    isDark ? "border-[#21262d]" : "border-[#d8dee4]"
                  }`}
                >
                  🎯 Key Design Principles
                </h2>
                <div className="space-y-3">
                  {(config.principles || []).map((pr) => (
                    <div key={pr.id} className="space-y-1">
                      <h3 className="text-sm font-semibold">{pr.title}</h3>
                      <p
                        className={`text-xs leading-relaxed ${
                          isDark ? "text-[#c9d1d9]" : "text-[#1f2328]"
                        }`}
                      >
                        {pr.description}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Getting Started Quickstart Block */}
            {(config.gettingStartedSnippet || "").trim() && (
              <section className="space-y-2.5">
                <h2
                  className={`text-lg font-semibold pb-1.5 border-b ${
                    isDark ? "border-[#21262d]" : "border-[#d8dee4]"
                  }`}
                >
                  🚀 Getting Started
                </h2>
                <pre
                  className={`p-3.5 rounded-md border font-mono text-xs overflow-x-auto leading-relaxed ${
                    isDark
                      ? "bg-[#161b22] border-[#30363d] text-[#e6edf3]"
                      : "bg-[#f6f8fa] border-[#d0d7de] text-[#1f2328]"
                  }`}
                >
                  <code>{config.gettingStartedSnippet.trim()}</code>
                </pre>
              </section>
            )}

            {/* Explore My Digital Worlds */}
            {config.widgets.showDigitalWorlds && (config.digitalWorlds || []).length > 0 && (
              <section className="space-y-3">
                <h2
                  className={`text-lg font-semibold pb-1.5 border-b ${
                    isDark ? "border-[#21262d]" : "border-[#d8dee4]"
                  }`}
                >
                  🌌 Explore My Digital Worlds
                </h2>
                <div className="flex flex-wrap justify-center gap-3 pt-1">
                  {(config.digitalWorlds || []).map((dw) => {
                    const slug = encodeURIComponent(dw.label.trim().replace(/\s+/g, "%20")).replace(
                      /%2520/g,
                      "%20"
                    );
                    return (
                      <a key={dw.id} href={dw.url} target="_blank" rel="noreferrer">
                        <SmartImage
                          src={`https://img.shields.io/badge/${slug}-${dw.color}?style=for-the-badge&logo=${encodeURIComponent(
                            dw.logo || "rocket"
                          )}&logoColor=white`}
                          alt={dw.label}
                          className="h-8 w-auto"
                          darkSurface={isDark}
                          compact
                          fallbackTitle={dw.label}
                        />
                      </a>
                    );
                  })}
                </div>
              </section>
            )}

            {/* What I'm Exploring */}
            {config.widgets.showExploring && (config.exploringItems || []).length > 0 && (
              <section className="space-y-2.5">
                <h2
                  className={`text-lg font-semibold pb-1.5 border-b ${
                    isDark ? "border-[#21262d]" : "border-[#d8dee4]"
                  }`}
                >
                  💡 What I&apos;m Exploring
                </h2>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 text-sm list-disc pl-5">
                  {(config.exploringItems || []).map((item, idx) => (
                    <li key={`${idx}-${item}`} className="leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {config.widgets.showDividers && (
              <div className="w-full py-1">
                <SmartImage
                  src={DIVIDER_URL}
                  alt="Section Divider"
                  className="w-full h-1.5 object-cover rounded-full opacity-90"
                  darkSurface={isDark}
                  compact
                />
              </div>
            )}

            {/* Contribution Snake Animation */}
            {config.widgets.showSnakeAnimation && (
              <section className="space-y-3">
                <h2
                  className={`text-lg font-semibold pb-1.5 border-b ${
                    isDark ? "border-[#21262d]" : "border-[#d8dee4]"
                  }`}
                >
                  🐍 My Contribution Journey
                </h2>
                <div className="flex justify-center">
                  <SmartImage
                    src={`/api/widgets/snake?username=${encodeURIComponent(
                      username
                    )}&theme=${encodeURIComponent(theme)}`}
                    alt="GitHub contribution snake animation"
                    className="max-w-full h-auto rounded"
                    darkSurface={isDark}
                    fallbackTitle={`${username} — Contribution Snake`}
                    fallbackSubtitle="github-contribution-grid-snake.svg"
                  />
                </div>
              </section>
            )}

            {/* Coding Activity Graph */}
            {config.widgets.showActivityGraph && (
              <section className="space-y-3">
                <h2
                  className={`text-lg font-semibold pb-1.5 border-b flex items-center gap-2 ${
                    isDark ? "border-[#21262d]" : "border-[#d8dee4]"
                  }`}
                >
                  {renderSectionIcon(EMOT_ICONS.chart, "📈", 24)}
                  <span>Coding Activity</span>
                </h2>
                <SmartImage
                  src={`/api/widgets/activity?username=${encodeURIComponent(
                    username
                  )}&theme=${encodeURIComponent(theme)}&area=${
                    config.widgets.activityArea ?? true
                  }&hide_border=${config.widgets.activityHideBorder ?? true}`}
                  alt={`${username} Coding Activity`}
                  className="w-full h-auto rounded"
                  darkSurface={isDark}
                  fallbackTitle={`${username} — Coding Activity Graph`}
                  fallbackSubtitle="github-readme-activity-graph.vercel.app"
                />
              </section>
            )}

            {/* WakaTime Visual Graph Card */}
            {config.widgets.showWakaGraph && (config.widgets.wakaUsername || username).trim() && (
              <section className="space-y-3">
                <h2
                  className={`text-lg font-semibold pb-1.5 border-b flex items-center gap-2 ${
                    isDark ? "border-[#21262d]" : "border-[#d8dee4]"
                  }`}
                >
                  <span>⏱️ WakaTime Coding Metrics</span>
                </h2>
                <SmartImage
                  src={`/api/widgets/wakatime?username=${encodeURIComponent(
                    (config.widgets.wakaUsername || username).trim()
                  )}&layout=${encodeURIComponent(
                    config.widgets.wakaLayout || "compact"
                  )}&theme=${encodeURIComponent(theme)}&hide_border=${
                    config.widgets.wakaHideBorder ?? true
                  }`}
                  alt={`${config.widgets.wakaUsername || username} WakaTime Stats`}
                  className="w-full h-auto rounded"
                  darkSurface={isDark}
                  fallbackTitle={`${config.widgets.wakaUsername || username} — WakaTime Coding Metrics`}
                  fallbackSubtitle="github-readme-stats.vercel.app/api/wakatime"
                />
              </section>
            )}

            {/* WakaTime Commit Rhythm & Weekly Dev Time */}
            {config.widgets.showWakaStats && wakaAscii.trim() && (
              <section className="space-y-2.5">
                <pre
                  className={`p-4 rounded-md border font-mono text-xs overflow-x-auto leading-relaxed tabular-nums ${
                    isDark
                      ? "bg-[#161b22] border-[#30363d] text-[#e6edf3]"
                      : "bg-[#f6f8fa] border-[#d0d7de] text-[#1f2328]"
                  }`}
                >
                  <code>{wakaAscii}</code>
                </pre>
              </section>
            )}

            {/* Contribution Overview */}
            {config.widgets.showContributionOverview && config.contributionOverview.trim() && (
              <div
                className={`text-xs py-2.5 px-3.5 rounded border ${
                  isDark
                    ? "bg-[#161b22] border-[#30363d] text-[#c9d1d9]"
                    : "bg-[#f6f8fa] border-[#d0d7de] text-[#1f2328]"
                }`}
              >
                📦 <strong>Overview:</strong> {config.contributionOverview}
              </div>
            )}

            {/* Year Progress Bar */}
            {config.widgets.showYearProgress && (
              <div
                className={`text-sm font-mono py-2 px-3 rounded border tabular-nums ${
                  isDark
                    ? "bg-[#161b22] border-[#30363d] text-[#e6edf3]"
                    : "bg-[#f6f8fa] border-[#d0d7de] text-[#1f2328]"
                }`}
              >
                ⏳ <strong>Year Progress:</strong>{" "}
                <span className="text-blue-400">{`{ ${bar} }`}</span>{" "}
                <strong>{percent}%</strong> as on ⏰ {dateLabel}
              </div>
            )}

            {/* Footer */}
            <div className="text-center space-y-3 pt-2">
              <h3 className="text-base font-semibold flex items-center justify-center gap-2">
                {renderSectionIcon(EMOT_ICONS.party, "🎉", 30)}
                <span>Thanks for Visiting!</span>
              </h3>
              <p className="text-sm font-medium flex items-center justify-center gap-2 flex-wrap">
                {renderSectionIcon(EMOT_ICONS.dizzy, "💫", 22)}
                <span>{config.footerTagline}</span>
                {renderSectionIcon(EMOT_ICONS.dizzy, "💫", 22)}
              </p>

              {config.widgets.showProfileViews && (
                <div className="flex justify-center pt-1">
                  <SmartImage
                    src={`/api/widgets/views?username=${encodeURIComponent(username)}`}
                    alt="Profile Views"
                    className="h-7 w-auto"
                    darkSurface={isDark}
                    compact
                    fallbackTitle={`Profile Views · ${username}`}
                  />
                </div>
              )}

              <p
                className={`text-xs flex items-center justify-center gap-1.5 ${
                  isDark ? "text-[#8b949e]" : "text-[#656d76]"
                }`}
              >
                <span>Made with</span>
                {renderSectionIcon(EMOT_ICONS.heart, "❤️", 14)}
                <span>and</span>
                {renderSectionIcon(EMOT_ICONS.coffee, "☕", 14)}
              </p>
            </div>

            {config.widgets.showCapsuleFooter && (
              <div className="w-full overflow-hidden rounded pt-2">
                <SmartImage
                  src={`/api/widgets/capsule?color=${encodeURIComponent(
                    config.widgets.bannerGradient
                  )}&section=footer&height=95`}
                  alt="Footer Wave Banner"
                  className="w-full h-auto block"
                  darkSurface={isDark}
                  fallbackTitle="Capsule Render Footer Wave"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
