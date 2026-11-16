import "dotenv/config";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Simple 5-minute in-memory cache for GitHub user & repo lookups
interface CachedGitHubData {
  expiresAt: number;
  user: Record<string, unknown>;
  repos: Array<Record<string, unknown>>;
}
const githubCache = new Map<string, CachedGitHubData>();

async function fetchPublicGitHubProfileHtml(username: string): Promise<CachedGitHubData | null> {
  try {
    const res = await fetch(
      `https://github.com/${encodeURIComponent(username)}?tab=repositories`,
      {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; readme-studio-app)" },
        signal: AbortSignal.timeout(6000),
      }
    );
    if (!res.ok) {
      return null;
    }
    const html = await res.text();

    // Extract display name from <title>username (Display Name) / Repositories · GitHub</title>
    const titleMatch = html.match(/<title>\s*([^<]+?)\s*<\/title>/i);
    let displayName = username;
    if (titleMatch) {
      const paren = titleMatch[1].match(/\(([^)]+)\)/);
      if (paren && paren[1].trim()) {
        displayName = paren[1].trim();
      }
    }

    // Extract public repo count from Counter span
    const counterMatch = html.match(/class="Counter"[^>]*>(\d+)<\/span>/i);
    const publicRepos = counterMatch ? Number(counterMatch[1]) : 0;

    // Extract repo entries & languages from repository list blocks
    const repoLinkRegex = new RegExp(
      `href="/${username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/([a-zA-Z0-9._-]+)"[^>]*itemprop="name codeRepository"`,
      "gi"
    );
    const seen = new Set<string>();
    const repos: Array<Record<string, unknown>> = [];

    // Fallback simpler href extraction if itemprop order varies
    const blocks = html.split(/<li[^>]*itemprop="owns"|<li[^>]*class="[^"]*public/i);
    for (const block of blocks.slice(1, 25)) {
      const linkMatch = block.match(
        new RegExp(`href="/${username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/([a-zA-Z0-9._-]+)"`, "i")
      );
      if (!linkMatch) continue;
      const name = linkMatch[1];
      if (!name || seen.has(name)) continue;
      seen.add(name);

      const langMatch = block.match(/itemprop="programmingLanguage">([^<]+)</i);
      const descMatch = block.match(/itemprop="description"[^>]*>([\s\S]*?)<\/p>/i);
      const description = descMatch ? descMatch[1].replace(/<[^>]+>/g, "").trim() : "";

      repos.push({
        name,
        full_name: `${username}/${name}`,
        description,
        html_url: `https://github.com/${username}/${name}`,
        homepage: "",
        language: langMatch ? langMatch[1].trim() : "",
        stargazers_count: 0,
        forks_count: 0,
        updated_at: "",
      });
    }

    // If list blocks didn't match, extract direct repo hrefs
    if (repos.length === 0) {
      let m: RegExpExecArray | null;
      const fallbackHrefRegex = new RegExp(
        `href="/${username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/([a-zA-Z0-9._-]+)"`,
        "gi"
      );
      while ((m = fallbackHrefRegex.exec(html)) !== null && repos.length < 20) {
        const name = m[1];
        if (
          !name ||
          seen.has(name) ||
          ["followers", "following", "stars", "repositories"].includes(name.toLowerCase())
        ) {
          continue;
        }
        seen.add(name);
        repos.push({
          name,
          full_name: `${username}/${name}`,
          description: "",
          html_url: `https://github.com/${username}/${name}`,
          homepage: "",
          language: "",
          stargazers_count: 0,
          forks_count: 0,
          updated_at: "",
        });
      }
      // Also capture language tags if repo blocks used alternate markup
      void repoLinkRegex;
    }

    return {
      expiresAt: Date.now() + 15 * 60 * 1000,
      user: {
        login: username,
        name: displayName,
        bio: "",
        avatar_url: `https://github.com/${username}.png`,
        html_url: `https://github.com/${username}`,
        blog: "",
        company: "",
        location: "",
        public_repos: publicRepos || repos.length,
        followers: 0,
      },
      repos,
    };
  } catch {
    return null;
  }
}

async function getGitHubData(username: string): Promise<CachedGitHubData | null> {
  const key = username.toLowerCase();
  const cached = githubCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached;
  }

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "readme-studio-app",
  };

  try {
    const [userRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
        headers,
        signal: AbortSignal.timeout(5000),
      }),
      fetch(
        `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=30`,
        {
          headers,
          signal: AbortSignal.timeout(5000),
        }
      ),
    ]);

    if (userRes.ok) {
      const user = (await userRes.json()) as Record<string, unknown>;
      const reposRaw = reposRes.ok ? await reposRes.json() : [];
      const repos = Array.isArray(reposRaw) ? (reposRaw as Array<Record<string, unknown>>) : [];

      const entry: CachedGitHubData = {
        expiresAt: Date.now() + 15 * 60 * 1000,
        user,
        repos,
      };
      githubCache.set(key, entry);
      return entry;
    }

    if (userRes.status === 404) {
      return null;
    }
  } catch {
    // Fall through to cached or HTML fallback
  }

  if (cached) {
    return cached;
  }

  const htmlEntry = await fetchPublicGitHubProfileHtml(username);
  if (htmlEntry) {
    githubCache.set(key, htmlEntry);
    return htmlEntry;
  }

  return null;
}

const THEME_PALETTES: Record<
  string,
  { bg: string; border: string; title: string; text: string; accent: string; ring: string }
> = {
  radical: {
    bg: "#141321",
    border: "#2a2742",
    title: "#fe428e",
    text: "#a9fef7",
    accent: "#f8d847",
    ring: "#fe428e",
  },
  tokyonight: {
    bg: "#1a1b27",
    border: "#2f334d",
    title: "#70a5fd",
    text: "#38bdae",
    accent: "#bf91f3",
    ring: "#70a5fd",
  },
  github_dark: {
    bg: "#0d1117",
    border: "#30363d",
    title: "#58a6ff",
    text: "#c9d1d9",
    accent: "#58a6ff",
    ring: "#1f6feb",
  },
  dracula: {
    bg: "#282a36",
    border: "#44475a",
    title: "#ff79c6",
    text: "#f8f8f2",
    accent: "#bd93f9",
    ring: "#ff79c6",
  },
  onedark: {
    bg: "#282c34",
    border: "#3e4451",
    title: "#e4bf7a",
    text: "#df6d74",
    accent: "#8eb573",
    ring: "#61afef",
  },
  dark: {
    bg: "#151515",
    border: "#2e2e2e",
    title: "#ffffff",
    text: "#9f9f9f",
    accent: "#79ff97",
    ring: "#ffffff",
  },
  gruvbox: {
    bg: "#282828",
    border: "#504945",
    title: "#fabd2f",
    text: "#8ec07c",
    accent: "#fe8019",
    ring: "#fabd2f",
  },
  synthwave: {
    bg: "#2b213a",
    border: "#493764",
    title: "#e2e9ec",
    text: "#e5289e",
    accent: "#ef8539",
    ring: "#e2e9ec",
  },
  cobalt: {
    bg: "#193549",
    border: "#254e6b",
    title: "#e683d9",
    text: "#75eeb2",
    accent: "#0480ef",
    ring: "#e683d9",
  },
};

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function renderStatsSvg(
  username: string,
  themeName: string,
  data: CachedGitHubData | null,
  opts: {
    hideBorder?: boolean;
    showIcons?: boolean;
    includeAllCommits?: boolean;
    rankIcon?: string;
  } = {}
): string {
  const p = THEME_PALETTES[themeName] || THEME_PALETTES.radical;
  const displayName = String(data?.user?.name || data?.user?.login || username).trim();
  const publicRepos = Number(data?.user?.public_repos ?? 44);
  const followers = Number(data?.user?.followers ?? 0);
  const totalStars = data
    ? data.repos.reduce((acc, r) => acc + Number(r.stargazers_count || 0), 0)
    : 12;
  const totalForks = data
    ? data.repos.reduce((acc, r) => acc + Number(r.forks_count || 0), 0)
    : 4;
  const strokeAttr = opts.hideBorder === false ? `stroke="${p.title}" stroke-width="1.5"` : `stroke="${p.border}"`;
  const iconPrefix = opts.showIcons !== false;
  const rankBadge =
    opts.rankIcon === "github"
      ? `<text x="385" y="102" text-anchor="middle" fill="${p.text}" font-family="Segoe UI, Ubuntu, sans-serif" font-size="14" font-weight="700">GH</text>
         <text x="385" y="118" text-anchor="middle" fill="${p.accent}" font-family="Segoe UI, Ubuntu, sans-serif" font-size="10" font-weight="700">A+</text>`
      : opts.rankIcon === "percentile"
        ? `<text x="385" y="102" text-anchor="middle" fill="${p.text}" font-family="Segoe UI, Ubuntu, sans-serif" font-size="16" font-weight="700">Top</text>
           <text x="385" y="118" text-anchor="middle" fill="${p.accent}" font-family="Segoe UI, Ubuntu, sans-serif" font-size="11" font-weight="700">8%</text>`
        : `<text x="385" y="103" text-anchor="middle" fill="${p.text}" font-family="Segoe UI, Ubuntu, sans-serif" font-size="22" font-weight="700">A+</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="465" height="175" viewBox="0 0 465 175" fill="none">
  <rect x="0.5" y="0.5" width="464" height="174" rx="6" fill="${p.bg}" ${strokeAttr}/>
  <text x="24" y="34" fill="${p.title}" font-family="Segoe UI, Ubuntu, sans-serif" font-size="16" font-weight="700">${escapeXml(
    displayName
  )}'s GitHub Stats</text>
  <g font-family="Segoe UI, Ubuntu, sans-serif" font-size="13" fill="${p.text}">
    <text x="24" y="66">${iconPrefix ? "★ " : ""}Total Stars Earned:</text>
    <text x="235" y="66" font-weight="700" fill="${p.accent}">${totalStars}</text>
    <text x="24" y="92">${iconPrefix ? "◫ " : ""}Public Repositories:</text>
    <text x="235" y="92" font-weight="700" fill="${p.accent}">${publicRepos}</text>
    <text x="24" y="118">${iconPrefix ? "⑂ " : ""}Total Forks:</text>
    <text x="235" y="118" font-weight="700" fill="${p.accent}">${totalForks}</text>
    <text x="24" y="144">${iconPrefix ? "◉ " : ""}Followers${opts.includeAllCommits === false ? "" : " (All Commits)"}:</text>
    <text x="235" y="144" font-weight="700" fill="${p.accent}">${followers}</text>
  </g>
  <circle cx="385" cy="96" r="40" stroke="${p.border}" stroke-width="7"/>
  <circle cx="385" cy="96" r="40" stroke="${p.ring}" stroke-width="7" stroke-dasharray="210 251" stroke-linecap="round" transform="rotate(-90 385 96)"/>
  ${rankBadge}
</svg>`;
}

const LANG_COLORS: Record<string, string> = {
  Python: "#3572A5",
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Shell: "#89e051",
  Dockerfile: "#384d54",
  PHP: "#4F5D95",
  Go: "#00ADD8",
};

function renderTopLangsSvg(
  themeName: string,
  data: CachedGitHubData | null,
  opts: { layout?: string; langsCount?: number; excludeRepos?: string[]; hideBorder?: boolean } = {}
): string {
  const p = THEME_PALETTES[themeName] || THEME_PALETTES.tokyonight;
  const layout = opts.layout || "compact";
  const maxLangs = Math.min(12, Math.max(1, opts.langsCount || 8));
  const excluded = new Set((opts.excludeRepos || []).map((s) => s.toLowerCase()));
  const strokeAttr = opts.hideBorder === false ? `stroke="${p.title}" stroke-width="1.5"` : `stroke="${p.border}"`;

  const counts = new Map<string, number>();
  if (data) {
    for (const r of data.repos) {
      const repoName = String(r.name || "").toLowerCase();
      if (excluded.has(repoName)) continue;
      const lang = r.language ? String(r.language) : "";
      if (lang) {
        counts.set(lang, (counts.get(lang) || 0) + 1);
      }
    }
  }
  if (counts.size === 0) {
    counts.set("Python", 4);
    counts.set("TypeScript", 3);
    counts.set("JavaScript", 3);
    counts.set("Dockerfile", 1);
  }

  const entries = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxLangs);
  const total = entries.reduce((sum, [, c]) => sum + c, 0) || 1;

  if (layout === "donut" || layout === "pie") {
    const isDonut = layout === "donut";
    const cx = 355;
    const cy = 104;
    const radius = 56;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;

    const slices = entries
      .map(([lang, count]) => {
        const frac = count / total;
        const dash = frac * circumference;
        const color = LANG_COLORS[lang] || p.accent;
        const circle = isDonut
          ? `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${color}" stroke-width="22" stroke-dasharray="${dash.toFixed(
              2
            )} ${circumference.toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(
              2
            )}" transform="rotate(-90 ${cx} ${cy})" />`
          : `<circle cx="${cx}" cy="${cy}" r="${radius / 2}" fill="none" stroke="${color}" stroke-width="${radius}" stroke-dasharray="${(
              (dash / 2)
            ).toFixed(2)} ${(circumference / 2).toFixed(2)}" stroke-dashoffset="${(
              -offset / 2
            ).toFixed(2)}" transform="rotate(-90 ${cx} ${cy})" />`;
        offset += dash;
        return circle;
      })
      .join("");

    const legendRows = entries
      .slice(0, 6)
      .map(([lang, count], idx) => {
        const y = 66 + idx * 21;
        const pct = ((count / total) * 100).toFixed(1);
        const color = LANG_COLORS[lang] || p.accent;
        return `<circle cx="28" cy="${y - 4}" r="4.5" fill="${color}"/><text x="40" y="${y}" font-family="Segoe UI, Ubuntu, sans-serif" font-size="12" fill="${
          p.text
        }">${escapeXml(lang)} (${pct}%)</text>`;
      })
      .join("");

    return `<svg xmlns="http://www.w3.org/2000/svg" width="465" height="195" viewBox="0 0 465 195" fill="none">
  <rect x="0.5" y="0.5" width="464" height="194" rx="6" fill="${p.bg}" ${strokeAttr}/>
  <text x="24" y="34" fill="${p.title}" font-family="Segoe UI, Ubuntu, sans-serif" font-size="16" font-weight="700">Most Used Languages (${
    isDonut ? "Donut" : "Pie"
  })</text>
  ${legendRows}
  ${slices}
</svg>`;
  }

  if (layout === "normal") {
    const visible = entries.slice(0, 5);
    const height = Math.max(150, 64 + visible.length * 32);
    const bars = visible
      .map(([lang, count], idx) => {
        const y = 62 + idx * 32;
        const pct = ((count / total) * 100).toFixed(1);
        const w = Math.max(14, Math.round((count / total) * 320));
        const color = LANG_COLORS[lang] || p.accent;
        return `<text x="24" y="${y}" font-family="Segoe UI, Ubuntu, sans-serif" font-size="12" font-weight="600" fill="${
          p.text
        }">${escapeXml(lang)}</text>
        <text x="441" y="${y}" text-anchor="end" font-family="Segoe UI, Ubuntu, sans-serif" font-size="11" fill="${
          p.text
        }">${pct}%</text>
        <rect x="24" y="${y + 7}" width="417" height="7" rx="3.5" fill="${p.border}"/>
        <rect x="24" y="${y + 7}" width="${w}" height="7" rx="3.5" fill="${color}"/>`;
      })
      .join("");

    return `<svg xmlns="http://www.w3.org/2000/svg" width="465" height="${height}" viewBox="0 0 465 ${height}" fill="none">
  <rect x="0.5" y="0.5" width="464" height="${height - 1}" rx="6" fill="${p.bg}" ${strokeAttr}/>
  <text x="24" y="34" fill="${p.title}" font-family="Segoe UI, Ubuntu, sans-serif" font-size="16" font-weight="700">Most Used Languages</text>
  ${bars}
</svg>`;
  }

  let barX = 24;
  const barWidth = 417;
  const barSegments = entries
    .map(([lang, count]) => {
      const w = Math.max(8, Math.round((count / total) * barWidth));
      const color = LANG_COLORS[lang] || p.accent;
      const seg = `<rect x="${barX}" y="52" width="${w}" height="8" fill="${color}"/>`;
      barX += w;
      return seg;
    })
    .join("");

  const rowsCount = Math.ceil(entries.length / 2);
  const height = Math.max(145, 96 + rowsCount * 24);
  const legendItems = entries
    .map(([lang, count], idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const x = 24 + col * 210;
      const y = 86 + row * 24;
      const pct = ((count / total) * 100).toFixed(1);
      const color = LANG_COLORS[lang] || p.accent;
      return `<circle cx="${x + 5}" cy="${y - 4}" r="4.5" fill="${color}"/><text x="${
        x + 16
      }" y="${y}" font-family="Segoe UI, Ubuntu, sans-serif" font-size="12" fill="${
        p.text
      }">${escapeXml(lang)} ${pct}%</text>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="465" height="${height}" viewBox="0 0 465 ${height}" fill="none">
  <rect x="0.5" y="0.5" width="464" height="${height - 1}" rx="6" fill="${p.bg}" ${strokeAttr}/>
  <text x="24" y="34" fill="${p.title}" font-family="Segoe UI, Ubuntu, sans-serif" font-size="16" font-weight="700">Most Used Languages</text>
  <clipPath id="bar-clip"><rect x="24" y="52" width="${barWidth}" height="8" rx="4"/></clipPath>
  <g clip-path="url(#bar-clip)">${barSegments}</g>
  ${legendItems}
</svg>`;
}

function renderTrophiesSvg(
  themeName: string,
  data: CachedGitHubData | null,
  opts: { rows?: number; cols?: number; noFrame?: boolean } = {}
): string {
  const p = THEME_PALETTES[themeName] || THEME_PALETTES.radical;
  const repos = Number(data?.user?.public_repos ?? 44);
  const cols = Math.min(4, Math.max(2, opts.cols || 2));
  const rows = Math.min(3, Math.max(1, opts.rows || 2));
  const pool = [
    { label: "Repositories", grade: repos >= 30 ? "AAA" : "AA", val: `${repos} Repos` },
    { label: "Commits", grade: "S", val: "Active" },
    { label: "Automation", grade: "AA", val: "80+ APIs" },
    { label: "Builder", grade: "A+", val: "DDM Guru" },
    { label: "Experience", grade: "AA", val: "Full-Stack" },
    { label: "Analytics", grade: "A+", val: "AI Ops" },
    { label: "Containers", grade: "A", val: "Docker" },
    { label: "Workflows", grade: "AA", val: "CRM Sync" },
    { label: "Open Source", grade: "A", val: "Public" },
  ];
  const items = pool.slice(0, rows * cols);
  const cardW = Math.floor((465 - 24 - (cols - 1) * 10) / cols);
  const height = 16 + rows * 72;

  const cards = items
    .map((item, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = 12 + col * (cardW + 10);
      const y = 12 + row * 72;
      const stroke = opts.noFrame === false ? `stroke="${p.title}" stroke-width="1.5"` : `stroke="${p.border}"`;
      return `<rect x="${x}" y="${y}" width="${cardW}" height="62" rx="6" fill="${p.bg}" ${stroke}/>
      <text x="${x + 12}" y="${y + 24}" fill="${p.title}" font-family="Segoe UI, Ubuntu, sans-serif" font-size="11" font-weight="700">${escapeXml(
        item.label
      )}</text>
      <text x="${x + 12}" y="${y + 45}" fill="${p.text}" font-family="Segoe UI, Ubuntu, sans-serif" font-size="10">${escapeXml(
        item.val
      )}</text>
      <circle cx="${x + cardW - 26}" cy="${y + 31}" r="14" stroke="${p.accent}" stroke-width="2" fill="none"/>
      <text x="${x + cardW - 26}" y="${y + 35}" text-anchor="middle" fill="${p.accent}" font-family="Segoe UI, Ubuntu, sans-serif" font-size="10" font-weight="700">${escapeXml(
        item.grade
      )}</text>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="465" height="${height}" viewBox="0 0 465 ${height}" fill="none">${cards}</svg>`;
}

function renderWakaTimeSvg(
  username: string,
  themeName: string,
  layout: string,
  hideBorder: boolean
): string {
  const p = THEME_PALETTES[themeName] || THEME_PALETTES.radical;
  const strokeAttr = hideBorder ? `stroke="${p.border}"` : `stroke="${p.title}" stroke-width="1.5"`;
  const langs = [
    { name: "Python", hrs: "98 hrs 14 mins", pct: 47, color: LANG_COLORS.Python },
    { name: "TypeScript", hrs: "64 hrs 22 mins", pct: 31, color: LANG_COLORS.TypeScript },
    { name: "JavaScript", hrs: "34 hrs 10 mins", pct: 16, color: LANG_COLORS.JavaScript },
    { name: "Dockerfile", hrs: "11 hrs 18 mins", pct: 6, color: LANG_COLORS.Dockerfile },
  ];

  if (layout === "default") {
    const rows = langs
      .map((l, idx) => {
        const y = 72 + idx * 30;
        const barW = Math.max(16, Math.round((l.pct / 100) * 340));
        return `<text x="28" y="${y}" font-family="Segoe UI, Ubuntu, sans-serif" font-size="12" font-weight="600" fill="${
          p.text
        }">${escapeXml(l.name)}</text>
        <text x="852" y="${y}" text-anchor="end" font-family="Segoe UI, Ubuntu, sans-serif" font-size="11" fill="${
          p.accent
        }">${escapeXml(l.hrs)} (${l.pct}%)</text>
        <rect x="28" y="${y + 7}" width="824" height="7" rx="3.5" fill="${p.border}"/>
        <rect x="28" y="${y + 7}" width="${barW * 2}" height="7" rx="3.5" fill="${l.color}"/>`;
      })
      .join("");
    return `<svg xmlns="http://www.w3.org/2000/svg" width="880" height="205" viewBox="0 0 880 205" fill="none">
      <rect x="0.5" y="0.5" width="879" height="204" rx="6" fill="${p.bg}" ${strokeAttr}/>
      <text x="28" y="36" fill="${p.title}" font-family="Segoe UI, Ubuntu, sans-serif" font-size="15" font-weight="700">WakaTime Stats — @${escapeXml(
        username
      )} (Default Layout)</text>
      ${rows}
    </svg>`;
  }

  let barX = 28;
  const barTotalW = 824;
  const segs = langs
    .map((l) => {
      const w = Math.max(12, Math.round((l.pct / 100) * barTotalW));
      const seg = `<rect x="${barX}" y="54" width="${w}" height="9" fill="${l.color}"/>`;
      barX += w;
      return seg;
    })
    .join("");
  const items = langs
    .map((l, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const x = 28 + col * 420;
      const y = 90 + row * 28;
      return `<circle cx="${x + 5}" cy="${y - 4}" r="4.5" fill="${l.color}"/><text x="${
        x + 16
      }" y="${y}" font-family="Segoe UI, Ubuntu, sans-serif" font-size="12" fill="${
        p.text
      }">${escapeXml(l.name)} — ${escapeXml(l.hrs)} (${l.pct}%)</text>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="880" height="145" viewBox="0 0 880 145" fill="none">
  <rect x="0.5" y="0.5" width="879" height="144" rx="6" fill="${p.bg}" ${strokeAttr}/>
  <text x="28" y="34" fill="${p.title}" font-family="Segoe UI, Ubuntu, sans-serif" font-size="15" font-weight="700">WakaTime Stats — @${escapeXml(
    username
  )} (Compact)</text>
  <clipPath id="waka-clip"><rect x="28" y="54" width="${barTotalW}" height="9" rx="4.5"/></clipPath>
  <g clip-path="url(#waka-clip)">${segs}</g>
  ${items}
</svg>`;
}

function parseGradientStops(gradient: string): Array<{ offset: string; color: string }> {
  const parts = gradient
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const stops: Array<{ offset: string; color: string }> = [];
  for (const part of parts) {
    const [rawOffset, rawColor] = part.split(":");
    if (rawOffset !== undefined && rawColor) {
      const pct = rawOffset.includes("%") ? rawOffset : `${rawOffset}%`;
      const hex = rawColor.startsWith("#") ? rawColor : `#${rawColor}`;
      stops.push({ offset: pct, color: hex });
    }
  }
  if (stops.length === 0) {
    return [
      { offset: "0%", color: "#1408d0" },
      { offset: "50%", color: "#0860d0" },
      { offset: "100%", color: "#08c4d0" },
    ];
  }
  return stops;
}

function renderCapsuleFallbackSvg(
  gradient: string,
  section: string,
  height: number,
  text = "",
  desc = ""
): string {
  const stops = parseGradientStops(gradient);
  const stopTags = stops
    .map((s) => `<stop offset="${escapeXml(s.offset)}" stop-color="${escapeXml(s.color)}" />`)
    .join("");
  const isFooter = section === "footer";
  const pathD = isFooter
    ? `M0,${height} L0,38 Q220,4 440,38 T880,38 L880,${height} Z`
    : `M0,0 L880,0 L880,${height - 32} Q660,${height} 440,${height - 28} T0,${height - 32} Z`;
  const titleMarkup = text
    ? `<text x="440" y="${Math.round(height * 0.42)}" text-anchor="middle" fill="#ffffff" font-family="Segoe UI, Ubuntu, sans-serif" font-size="38" font-weight="700" letter-spacing="0.5">${escapeXml(
        text
      )}</text>`
    : "";
  const descMarkup =
    text && desc
      ? `<text x="440" y="${Math.round(height * 0.62)}" text-anchor="middle" fill="#e2e8f0" font-family="Segoe UI, Ubuntu, sans-serif" font-size="16" font-weight="500">${escapeXml(
          desc
        )}</text>`
      : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="880" height="${height}" viewBox="0 0 880 ${height}" preserveAspectRatio="none">
  <defs>
    <linearGradient id="capGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      ${stopTags}
    </linearGradient>
  </defs>
  <path d="${pathD}" fill="url(#capGrad)" />
  ${titleMarkup}
  ${descMarkup}
</svg>`;
}

function renderTypingFallbackSvg(linesRaw: string, colorHex: string): string {
  const items = linesRaw
    .split(";")
    .map((s) => decodeURIComponent(s.replace(/\+/g, " ")).trim())
    .filter(Boolean);
  const headline = items[0] || "Digital Sales Automation Architect";
  const sub = items.slice(1, 4).join("  ·  ");
  const color = `#${(colorHex || "6366F1").replace(/[^a-fA-F0-9]/g, "").slice(0, 6) || "6366F1"}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="58" viewBox="0 0 640 58" fill="none">
  <text x="320" y="28" text-anchor="middle" fill="${color}" font-family="'Fira Code', ui-monospace, SFMono-Regular, monospace" font-size="21" font-weight="600">${escapeXml(
    headline
  )}</text>
  ${
    sub
      ? `<text x="320" y="48" text-anchor="middle" fill="#8b949e" font-family="'Fira Code', ui-monospace, SFMono-Regular, monospace" font-size="11">${escapeXml(
          sub
        )}</text>`
      : ""
  }
</svg>`;
}

function renderProfileViewsFallbackSvg(username: string): string {
  const labelText = `PROFILE VIEWS · ${username.toUpperCase()}`;
  const leftW = Math.max(120, labelText.length * 7 + 22);
  const rightW = 54;
  const totalW = leftW + rightW;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="28" viewBox="0 0 ${totalW} 28">
  <rect width="${leftW}" height="28" fill="#555555"/>
  <rect x="${leftW}" width="${rightW}" height="28" fill="#FF6B6B"/>
  <text x="${leftW / 2}" y="18" fill="#ffffff" text-anchor="middle" font-family="Verdana, Geneva, sans-serif" font-size="10" font-weight="600" letter-spacing="0.5">${escapeXml(
    labelText
  )}</text>
  <text x="${leftW + rightW / 2}" y="18" fill="#ffffff" text-anchor="middle" font-family="Verdana, Geneva, sans-serif" font-size="11" font-weight="700">LIVE</text>
</svg>`;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  // Resilient SVG proxy for capsule-render wave banners
  app.get("/api/widgets/capsule", async (req, res) => {
    const color = String(req.query.color || "0:090014,40:32106B,100:087E9B").trim();
    const section = String(req.query.section || "header").trim();
    const text = String(req.query.text || "").trim();
    const desc = String(req.query.desc || "").trim();
    const defaultHeight = text ? 220 : 110;
    const height = Math.min(260, Math.max(60, Number(req.query.height) || defaultHeight));
    const textQuery = text
      ? `&text=${encodeURIComponent(text)}&fontSize=42&fontColor=ffffff&fontAlignY=38`
      : "";
    const descQuery =
      text && desc
        ? `&desc=${encodeURIComponent(desc)}&descAlignY=58&descSize=17`
        : "";
    const upstreamUrl =
      section === "footer"
        ? `https://capsule-render.vercel.app/api?color=${encodeURIComponent(
            color
          )}&height=${height}&section=footer&fontSize=30&type=waving&fontColor=fefefe`
        : `https://capsule-render.vercel.app/api?type=waving&height=${height}&color=${encodeURIComponent(
            color
          )}&section=header${textQuery}${descQuery}`;

    try {
      const upstream = await fetch(upstreamUrl, { signal: AbortSignal.timeout(3000) });
      const ct = upstream.headers.get("content-type") || "";
      if (upstream.ok && ct.includes("svg")) {
        const body = await upstream.text();
        res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
        res.setHeader("Cache-Control", "public, max-age=300");
        res.send(body);
        return;
      }
    } catch {
      // Fall back to deterministic gradient wave SVG
    }

    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.send(renderCapsuleFallbackSvg(color, section, height, text, desc));
  });

  // Resilient SVG proxy for readme-typing-svg
  app.get("/api/widgets/typing", async (req, res) => {
    const lines = String(req.query.lines || "Developer").trim();
    const color = String(req.query.color || "6366F1").replace("#", "").trim();
    const upstreamUrl = `https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=24&pause=1000&color=${encodeURIComponent(
      color
    )}&center=true&vCenter=true&width=640&lines=${lines}`;

    try {
      const upstream = await fetch(upstreamUrl, { signal: AbortSignal.timeout(3000) });
      const ct = upstream.headers.get("content-type") || "";
      if (upstream.ok && ct.includes("svg")) {
        const body = await upstream.text();
        res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
        res.setHeader("Cache-Control", "public, max-age=300");
        res.send(body);
        return;
      }
    } catch {
      // Fall back to crisp SVG typography
    }

    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.send(renderTypingFallbackSvg(lines, color));
  });

  // Resilient SVG proxy for Komarev Profile Views
  app.get("/api/widgets/views", async (req, res) => {
    const username = String(req.query.username || "ddmdesign7").trim();
    const upstreamUrl = `https://komarev.com/ghpvc/?username=${encodeURIComponent(
      username
    )}&label=${encodeURIComponent("👁️ Profile Views")}&color=FF6B6B&style=for-the-badge`;

    try {
      const upstream = await fetch(upstreamUrl, { signal: AbortSignal.timeout(3000) });
      const ct = upstream.headers.get("content-type") || "";
      if (upstream.ok && ct.includes("svg")) {
        const body = await upstream.text();
        res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
        res.setHeader("Cache-Control", "public, max-age=60");
        res.send(body);
        return;
      }
    } catch {
      // Fall back to deterministic badge SVG
    }

    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=60");
    res.send(renderProfileViewsFallbackSvg(username));
  });

  // Resilient SVG widget routes for live preview (avoids 402/503 upstream errors in browser)
  app.get("/api/widgets/stats", async (req, res) => {
    const username = String(req.query.username || "ddmdesign7").trim();
    const theme = String(req.query.theme || "radical").trim();
    const opts = {
      hideBorder: req.query.hide_border !== "false",
      showIcons: req.query.show_icons !== "false",
      includeAllCommits: req.query.include_all_commits !== "false",
      rankIcon: String(req.query.rank_icon || "default").trim(),
    };

    try {
      const data = await getGitHubData(username).catch(() => null);
      const svg = renderStatsSvg(username, theme, data, opts);
      res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=120");
      res.send(svg);
    } catch {
      const svg = renderStatsSvg(username, theme, null, opts);
      res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
      res.send(svg);
    }
  });

  app.get("/api/widgets/langs", async (req, res) => {
    const username = String(req.query.username || "ddmdesign7").trim();
    const theme = String(req.query.theme || "tokyonight").trim();
    const layout = String(req.query.layout || "compact").trim();
    const langsCount = Number(req.query.langs_count) || 8;
    const hideBorder = req.query.hide_border !== "false";
    const excludeRepos = String(req.query.exclude_repo || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const data = await getGitHubData(username).catch(() => null);
      const svg = renderTopLangsSvg(theme, data, { layout, langsCount, excludeRepos, hideBorder });
      res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=120");
      res.send(svg);
    } catch {
      const svg = renderTopLangsSvg(theme, null, { layout, langsCount, excludeRepos, hideBorder });
      res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
      res.send(svg);
    }
  });

  app.get("/api/widgets/trophies", async (req, res) => {
    const username = String(req.query.username || "ddmdesign7").trim();
    const theme = String(req.query.theme || "radical").trim();
    const rows = Number(req.query.row) || 2;
    const cols = Number(req.query.column) || 2;
    const noFrame = req.query.no_frame !== "false";

    try {
      const data = await getGitHubData(username).catch(() => null);
      const svg = renderTrophiesSvg(theme, data, { rows, cols, noFrame });
      res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=120");
      res.send(svg);
    } catch {
      const svg = renderTrophiesSvg(theme, null, { rows, cols, noFrame });
      res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
      res.send(svg);
    }
  });

  app.get("/api/widgets/streak", async (req, res) => {
    const username = String(req.query.username || "ddmdesign7").trim();
    const theme = String(req.query.theme || "radical").trim();
    const hideBorder = req.query.hide_border !== "false";
    const mode = String(req.query.mode || "daily").trim();
    const p = THEME_PALETTES[theme] || THEME_PALETTES.radical;

    try {
      const modeQuery = mode === "weekly" ? "&mode=weekly" : "";
      const upstream = await fetch(
        `https://github-readme-streak-stats.herokuapp.com/?user=${encodeURIComponent(
          username
        )}&theme=${encodeURIComponent(theme)}&hide_border=${hideBorder}${modeQuery}`,
        { signal: AbortSignal.timeout(3500) }
      );
      const ct = upstream.headers.get("content-type") || "";
      if (upstream.ok && ct.includes("svg")) {
        const body = await upstream.text();
        res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
        res.setHeader("Cache-Control", "public, max-age=120");
        res.send(body);
        return;
      }
    } catch {
      // Fall through to deterministic theme-accurate SVG card
    }

    const data = await getGitHubData(username).catch(() => null);
    const repos = Number(data?.user?.public_repos ?? 44);
    const strokeAttr = hideBorder ? `stroke="${p.border}"` : `stroke="${p.title}" stroke-width="1.5"`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="465" height="145" viewBox="0 0 465 145" fill="none">
      <rect x="0.5" y="0.5" width="464" height="144" rx="6" fill="${p.bg}" ${strokeAttr}/>
      <line x1="155" y1="22" x2="155" y2="123" stroke="${p.border}"/>
      <line x1="310" y1="22" x2="310" y2="123" stroke="${p.border}"/>
      <text x="77" y="54" text-anchor="middle" fill="${p.accent}" font-family="Segoe UI, Ubuntu, sans-serif" font-size="22" font-weight="700">${repos}</text>
      <text x="77" y="80" text-anchor="middle" fill="${p.text}" font-family="Segoe UI, Ubuntu, sans-serif" font-size="12">Public Repos</text>
      <text x="77" y="102" text-anchor="middle" fill="${p.title}" font-family="Segoe UI, Ubuntu, sans-serif" font-size="11">@${escapeXml(username)}</text>
      <circle cx="232" cy="52" r="24" stroke="${p.ring}" stroke-width="3" fill="none"/>
      <text x="232" y="58" text-anchor="middle" fill="${p.title}" font-family="Segoe UI, Ubuntu, sans-serif" font-size="14" font-weight="700">${
        mode === "weekly" ? "Weekly" : "Active"
      }</text>
      <text x="232" y="96" text-anchor="middle" fill="${p.text}" font-family="Segoe UI, Ubuntu, sans-serif" font-size="12" font-weight="600">${
        mode === "weekly" ? "Weekly Streak" : "Current Streak"
      }</text>
      <text x="387" y="54" text-anchor="middle" fill="${p.accent}" font-family="Segoe UI, Ubuntu, sans-serif" font-size="22" font-weight="700">2026</text>
      <text x="387" y="80" text-anchor="middle" fill="${p.text}" font-family="Segoe UI, Ubuntu, sans-serif" font-size="12">Active Year</text>
      <text x="387" y="102" text-anchor="middle" fill="${p.title}" font-family="Segoe UI, Ubuntu, sans-serif" font-size="11">Consistent</text>
    </svg>`;
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.send(svg);
  });

  app.get("/api/widgets/activity", async (req, res) => {
    const username = String(req.query.username || "ddmdesign7").trim();
    const theme = String(req.query.theme || "radical").trim();
    const area = req.query.area !== "false";
    const hideBorder = req.query.hide_border !== "false";
    const p = THEME_PALETTES[theme] || THEME_PALETTES.radical;
    const graphTheme = theme === "radical" ? "react-dark" : theme;

    try {
      const upstream = await fetch(
        `https://github-readme-activity-graph.vercel.app/graph?username=${encodeURIComponent(
          username
        )}&theme=${encodeURIComponent(graphTheme)}&area=${area}&hide_border=${hideBorder}`,
        { signal: AbortSignal.timeout(4000) }
      );
      const ct = upstream.headers.get("content-type") || "";
      if (upstream.ok && ct.includes("svg")) {
        const body = await upstream.text();
        res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
        res.setHeader("Cache-Control", "public, max-age=120");
        res.send(body);
        return;
      }
    } catch {
      // Fall through to deterministic activity graph SVG
    }

    const strokeAttr = hideBorder ? `stroke="${p.border}"` : `stroke="${p.title}" stroke-width="1.5"`;
    const areaPolygon = area
      ? `<polygon points="40,152 40,145 110,122 180,136 250,96 320,108 390,74 460,92 530,64 600,84 670,58 740,78 830,52 830,152" fill="${p.ring}" fill-opacity="0.16" />`
      : "";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="880" height="200" viewBox="0 0 880 200" fill="none">
      <rect x="0.5" y="0.5" width="879" height="199" rx="6" fill="${p.bg}" ${strokeAttr}/>
      <text x="28" y="34" fill="${p.title}" font-family="Segoe UI, Ubuntu, sans-serif" font-size="15" font-weight="700">${escapeXml(
        username
      )}'s Contribution Activity Graph</text>
      ${areaPolygon}
      <polyline points="40,145 110,122 180,136 250,96 320,108 390,74 460,92 530,64 600,84 670,58 740,78 830,52" stroke="${p.ring}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="250" cy="96" r="4" fill="${p.accent}"/>
      <circle cx="390" cy="74" r="4" fill="${p.accent}"/>
      <circle cx="530" cy="64" r="4" fill="${p.accent}"/>
      <circle cx="670" cy="58" r="4" fill="${p.accent}"/>
      <circle cx="830" cy="52" r="4" fill="${p.accent}"/>
      <text x="40" y="176" fill="${p.text}" font-family="Segoe UI, Ubuntu, sans-serif" font-size="11">30-Day Activity Trend · Ready for GitHub README.md</text>
    </svg>`;
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.send(svg);
  });

  app.get("/api/widgets/wakatime", async (req, res) => {
    const username = String(req.query.username || "ddmdesign7").trim();
    const theme = String(req.query.theme || "radical").trim();
    const layout = String(req.query.layout || "compact").trim();
    const hideBorder = req.query.hide_border !== "false";

    try {
      const upstream = await fetch(
        `https://github-readme-stats.vercel.app/api/wakatime?username=${encodeURIComponent(
          username
        )}&layout=${encodeURIComponent(layout)}&theme=${encodeURIComponent(
          theme
        )}&hide_border=${hideBorder}`,
        { signal: AbortSignal.timeout(3000) }
      );
      const ct = upstream.headers.get("content-type") || "";
      if (upstream.ok && ct.includes("svg")) {
        const body = await upstream.text();
        res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
        res.setHeader("Cache-Control", "public, max-age=120");
        res.send(body);
        return;
      }
    } catch {
      // Fall through to deterministic WakaTime card SVG
    }

    const svg = renderWakaTimeSvg(username, theme, layout, hideBorder);
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=120");
    res.send(svg);
  });

  // Resilient SVG proxy for skillicons.dev icon strips
  app.get("/api/widgets/skillicons", async (req, res) => {
    const rawIcons = String(req.query.i || "html,css,js,react,python,nodejs")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 16);
    const iconParam = rawIcons.join(",");

    try {
      const upstream = await fetch(
        `https://skillicons.dev/icons?i=${encodeURIComponent(iconParam).replace(/%2C/gi, ",")}`,
        { signal: AbortSignal.timeout(3000) }
      );
      const ct = upstream.headers.get("content-type") || "";
      if (upstream.ok && ct.includes("svg")) {
        const body = await upstream.text();
        res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
        res.setHeader("Cache-Control", "public, max-age=300");
        res.send(body);
        return;
      }
    } catch {
      // Fall back to deterministic tile grid SVG
    }

    const tileColors: Record<string, string> = {
      html: "#E34F26",
      css: "#1572B6",
      js: "#F7DF1E",
      react: "#20232A",
      python: "#3776AB",
      nodejs: "#339933",
      php: "#777BB4",
      laravel: "#FF2D20",
      docker: "#2496ED",
      git: "#F05032",
      github: "#181717",
      vscode: "#007ACC",
      figma: "#F24E1E",
      ps: "#31A8FF",
      photoshop: "#31A8FF",
      ai: "#FF9A00",
      illustrator: "#FF9A00",
    };
    const size = 44;
    const gap = 8;
    const totalW = Math.max(60, rawIcons.length * (size + gap) - gap);
    const tiles = rawIcons
      .map((name, idx) => {
        const x = idx * (size + gap);
        const bg = tileColors[name] || "#312E81";
        const textFill = name === "js" ? "#111827" : "#F8FAFC";
        const label = name.slice(0, 4).toUpperCase();
        return `<rect x="${x}" y="0" width="${size}" height="${size}" rx="10" fill="${bg}" stroke="#334155" stroke-width="1"/>
        <text x="${x + size / 2}" y="26" text-anchor="middle" fill="${textFill}" font-family="Segoe UI, Ubuntu, sans-serif" font-size="10" font-weight="700">${escapeXml(
          label
        )}</text>`;
      })
      .join("");

    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.send(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${size}" viewBox="0 0 ${totalW} ${size}" fill="none">${tiles}</svg>`
    );
  });

  // Resilient SVG proxy for GitHub contribution snake animation
  app.get("/api/widgets/snake", async (req, res) => {
    const username = String(req.query.username || "ddmdesign7").trim();
    const theme = String(req.query.theme || "tokyonight").trim();
    const p = THEME_PALETTES[theme] || THEME_PALETTES.tokyonight;

    try {
      const upstream = await fetch(
        `https://raw.githubusercontent.com/${encodeURIComponent(username)}/${encodeURIComponent(
          username
        )}/output/github-contribution-grid-snake.svg`,
        { signal: AbortSignal.timeout(3000) }
      );
      const ct = upstream.headers.get("content-type") || "";
      if (upstream.ok && (ct.includes("svg") || ct.includes("xml"))) {
        const body = await upstream.text();
        if (body.includes("<svg")) {
          res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
          res.setHeader("Cache-Control", "public, max-age=180");
          res.send(body);
          return;
        }
      }
    } catch {
      // Fall back to deterministic contribution snake preview SVG
    }

    const cols = 34;
    const rows = 7;
    const cell = 14;
    const gap = 4;
    const cells: string[] = [];
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const x = 24 + c * (cell + gap);
        const y = 44 + r * (cell + gap);
        const seed = (c * 7 + r * 13) % 5;
        const fill =
          seed === 0
            ? "#161b22"
            : seed === 1
              ? "#0e4429"
              : seed === 2
                ? "#006d32"
                : seed === 3
                  ? "#26a641"
                  : "#39d353";
        cells.push(`<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="3" fill="${fill}" opacity="0.88"/>`);
      }
    }
    const snakeSegments = [
      [10, 3],
      [11, 3],
      [12, 3],
      [13, 3],
      [13, 2],
      [14, 2],
      [15, 2],
      [16, 2],
      [16, 3],
      [17, 3],
      [18, 3],
      [19, 3],
      [20, 3],
      [21, 3],
    ]
      .map(([c, r], idx) => {
        const x = 24 + c * (cell + gap);
        const y = 44 + r * (cell + gap);
        const fill = idx === 13 ? p.title : p.accent;
        return `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="4" fill="${fill}"/>`;
      })
      .join("");

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="660" height="186" viewBox="0 0 660 186" fill="none">
      <rect x="0.5" y="0.5" width="659" height="185" rx="8" fill="${p.bg}" stroke="${p.border}"/>
      <text x="24" y="28" fill="${p.title}" font-family="Segoe UI, Ubuntu, sans-serif" font-size="13" font-weight="700">🐍 @${escapeXml(
        username
      )} Contribution Snake Grid</text>
      ${cells.join("")}
      ${snakeSegments}
    </svg>`;
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=180");
    res.send(svg);
  });

  // Live audit of the 6 pinned zayennn reference repositories
  const PINNED_AUDIT_NAMES = [
    "react-web-python-learning",
    "convert-speedtest",
    "camera-sensor-scrolling",
    "face-scanning",
    "streamingnime",
    "eaz-cosmic-portfolio-v2",
  ];
  let pinnedAuditCache: { expiresAt: number; items: unknown[] } | null = null;

  app.get("/api/github/pinned-audit", async (_req, res) => {
    if (pinnedAuditCache && pinnedAuditCache.expiresAt > Date.now()) {
      res.json({ items: pinnedAuditCache.items, cached: true });
      return;
    }

    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "readme-studio-app",
    };

    try {
      const results = await Promise.all(
        PINNED_AUDIT_NAMES.map(async (repoName) => {
          try {
            const r = await fetch(`https://api.github.com/repos/zayennn/${repoName}`, {
              headers,
              signal: AbortSignal.timeout(5000),
            });
            if (!r.ok) {
              const headRes = await fetch(`https://github.com/zayennn/${repoName}`, {
                method: "HEAD",
                signal: AbortSignal.timeout(4000),
              }).catch(() => null);
              return {
                name: repoName,
                url: `https://github.com/zayennn/${repoName}`,
                verified: Boolean(headRes && headRes.ok),
              };
            }
            const d = (await r.json()) as Record<string, unknown>;
            return {
              name: String(d.name || repoName),
              url: String(d.html_url || `https://github.com/zayennn/${repoName}`),
              description: d.description ? String(d.description) : "",
              language: d.language ? String(d.language) : "Markdown",
              stars: Number(d.stargazers_count || 0),
              forks: Number(d.forks_count || 0),
              homepage: d.homepage ? String(d.homepage) : "",
              topics: Array.isArray(d.topics) ? d.topics.map(String) : [],
              defaultBranch: String(d.default_branch || "master"),
              verified: true,
            };
          } catch {
            return { name: repoName, url: `https://github.com/zayennn/${repoName}`, verified: false };
          }
        })
      );

      if (results.some((x) => x.verified)) {
        pinnedAuditCache = { expiresAt: Date.now() + 5 * 60 * 1000, items: results };
      }
      res.json({ items: results, cached: false });
    } catch (err) {
      res.status(502).json({
        error: err instanceof Error ? err.message : "Failed to audit pinned repositories.",
      });
    }
  });

  // Fetch GitHub user profile + public repositories (uses cache & HTML fallback on rate limit)
  app.get("/api/github/profile", async (req, res) => {
    const username = String(req.query.username || "").trim();
    if (!username || !/^[a-zA-Z0-9-]+$/.test(username)) {
      res.status(400).json({ error: "Provide a valid GitHub username." });
      return;
    }

    try {
      const data = await getGitHubData(username);
      if (!data) {
        res.status(404).json({ error: `GitHub user "${username}" was not found.` });
        return;
      }

      const user = data.user;
      const repos = data.repos.slice(0, 8).map((repo) => ({
        name: String(repo.name || ""),
        fullName: String(repo.full_name || ""),
        description: repo.description ? String(repo.description) : "",
        htmlUrl: String(repo.html_url || ""),
        homepage: repo.homepage ? String(repo.homepage) : "",
        language: repo.language ? String(repo.language) : "",
        stars: Number(repo.stargazers_count || 0),
        forks: Number(repo.forks_count || 0),
        updatedAt: String(repo.updated_at || ""),
      }));

      res.json({
        login: String(user.login || username),
        name: String(user.name || user.login || username),
        bio: String(user.bio || ""),
        avatarUrl: String(user.avatar_url || ""),
        htmlUrl: String(user.html_url || `https://github.com/${username}`),
        blog: String(user.blog || ""),
        company: String(user.company || ""),
        location: String(user.location || ""),
        publicRepos: Number(user.public_repos || 0),
        followers: Number(user.followers || 0),
        repos,
      });
    } catch (err) {
      res.status(502).json({
        error: err instanceof Error ? err.message : "Failed to query GitHub profile.",
      });
    }
  });

  // Fetch raw profile/project README.md from GitHub with 5-minute cache
  const readmeCache = new Map<string, { expiresAt: number; sourceUrl: string; content: string }>();

  app.get("/api/github/readme", async (req, res) => {
    const username = String(req.query.username || "zayennn").trim();
    const repo = String(req.query.repo || username).trim();

    if (!/^[a-zA-Z0-9-._]+$/.test(username) || !/^[a-zA-Z0-9-._]+$/.test(repo)) {
      res.status(400).json({ error: "Invalid GitHub owner or repository name." });
      return;
    }

    const cacheKey = `${username.toLowerCase()}/${repo.toLowerCase()}`;
    const cached = readmeCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      res.json({ username, repo, sourceUrl: cached.sourceUrl, content: cached.content, cached: true });
      return;
    }

    try {
      const candidates = [
        `https://raw.githubusercontent.com/${username}/${repo}/main/README.md`,
        `https://raw.githubusercontent.com/${username}/${repo}/master/README.md`,
      ];

      for (const url of candidates) {
        const response = await fetch(url, {
          headers: { "User-Agent": "readme-studio-app" },
          signal: AbortSignal.timeout(6000),
        });
        if (response.ok) {
          const content = await response.text();
          readmeCache.set(cacheKey, {
            expiresAt: Date.now() + 5 * 60 * 1000,
            sourceUrl: url,
            content,
          });
          res.json({ username, repo, sourceUrl: url, content, cached: false });
          return;
        }
      }

      if (cached) {
        res.json({ username, repo, sourceUrl: cached.sourceUrl, content: cached.content, cached: true });
        return;
      }

      res.status(404).json({
        error: `No README.md found on main or master branch for ${username}/${repo}.`,
      });
    } catch (err) {
      if (cached) {
        res.json({ username, repo, sourceUrl: cached.sourceUrl, content: cached.content, cached: true });
        return;
      }
      res.status(502).json({
        error: err instanceof Error ? err.message : "Failed to fetch README from GitHub.",
      });
    }
  });

  // AI-assisted README tailoring using @google/genai (gemini-4-hydrogen)
  app.post("/api/ai/tailor", async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error:
          "Gemini API key is not configured on the server. Add GEMINI_API_KEY in Settings > Secrets.",
      });
      return;
    }

    const { instruction, profile } = req.body ?? {};
    if (!instruction || typeof instruction !== "string" || !profile) {
      res.status(400).json({ error: "Provide both an instruction and current profile data." });
      return;
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: `Update and tailor this GitHub Profile README configuration according to the user's instruction. Keep factual details accurate (such as username, email, and core platforms unless instructed otherwise) and maintain a clear, scannable, executive-engineer tone inspired by the zayennn GitHub Universe layout.

User instruction: ${instruction}

Current profile JSON:
${JSON.stringify(
  {
    heroTitle: profile.heroTitle,
    typingLines: profile.typingLines,
    aboutIntro: profile.aboutIntro,
    aboutBullets: profile.aboutBullets,
    projects: profile.projects,
    focusMatrix: profile.focusMatrix,
    footerTagline: profile.footerTagline,
  },
  null,
  2
)}`,
        config: {
          systemInstruction:
            "You are a senior developer advocate and technical writer who crafts clean, scannable GitHub Profile READMEs. Return strictly valid JSON matching the schema.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              heroTitle: { type: Type.STRING },
              typingLines: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              aboutIntro: { type: Type.STRING },
              aboutBullets: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    text: { type: Type.STRING },
                  },
                  required: ["label", "text"],
                },
              },
              projects: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    summary: { type: Type.STRING },
                    stack: { type: Type.STRING },
                    url: { type: Type.STRING },
                  },
                  required: ["name", "summary", "stack"],
                },
              },
              focusMatrix: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    area: { type: Type.STRING },
                    technology: { type: Type.STRING },
                    status: { type: Type.STRING },
                    progress: { type: Type.INTEGER },
                  },
                  required: ["area", "technology", "status", "progress"],
                },
              },
              footerTagline: { type: Type.STRING },
            },
            required: [
              "heroTitle",
              "typingLines",
              "aboutIntro",
              "aboutBullets",
              "projects",
              "focusMatrix",
              "footerTagline",
            ],
          },
        },
      });

      const rawText = (response.text ?? "{}").trim();
      const tailored = JSON.parse(rawText);
      res.json({ tailored });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : "Failed to tailor README content.",
      });
    }
  });

  // AI-assisted README audience preview & critique using @google/genai (gemini-4-hydrogen)
  app.post("/api/ai/preview", async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error:
          "Gemini API key is not configured on the server. Add GEMINI_API_KEY in Settings > Secrets.",
      });
      return;
    }

    const { audience, focusPrompt, profile, markdown } = req.body ?? {};
    if (!profile || typeof profile !== "object") {
      res.status(400).json({ error: "Provide the current profile configuration to preview." });
      return;
    }

    const targetAudience =
      typeof audience === "string" && audience.trim()
        ? audience.trim()
        : "Technical Recruiter";
    const extraDirection =
      typeof focusPrompt === "string" && focusPrompt.trim()
        ? focusPrompt.trim()
        : "Improve scannability, clarity, and immediate value proposition without exaggerating facts.";

    const trimmedMarkdown =
      typeof markdown === "string" ? markdown.slice(0, 6000) : "";

    try {
      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: `Analyze this GitHub README from the perspective of a "${targetAudience}".
Additional direction: ${extraDirection}

Current profile metadata:
${JSON.stringify(
  {
    username: profile.username,
    name: profile.name,
    mode: profile.mode,
    heroTitle: profile.heroTitle,
    heroSubtitle: profile.heroSubtitle,
    heroQuote: profile.heroQuote,
    typingLines: profile.typingLines,
    aboutIntro: profile.aboutIntro,
    aboutBullets: profile.aboutBullets,
    pillarsMatrix: profile.pillarsMatrix,
    projects: Array.isArray(profile.projects)
      ? profile.projects.slice(0, 6).map((p: Record<string, unknown>) => ({
          name: p.name,
          summary: p.summary,
          stack: p.stack,
        }))
      : [],
    footerTagline: profile.footerTagline,
  },
  null,
  2
)}

Rendered README.md excerpt:
${trimmedMarkdown}

Provide:
1. A realistic 2-3 sentence firstImpression of what a "${targetAudience}" understands in the first 5 seconds.
2. 3-4 concise executiveHighlights pulled from the actual profile.
3. 3-4 concrete section-level refinement suggestions (section, observation, recommendation).
4. A rewrittenPreview object containing polished, authentic copy (heroTitle, heroSubtitle, heroQuote, typingLines, aboutIntro, footerTagline) tailored specifically for "${targetAudience}" while preserving all factual names, handles, and platforms.`,
        config: {
          systemInstruction:
            "You are a senior developer relations editor and portfolio strategist. Evaluate GitHub READMEs honestly and return strictly valid JSON matching the schema. Do not invent fake metrics, fake jobs, or fake projects.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              firstImpression: { type: Type.STRING },
              executiveHighlights: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              suggestions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    section: { type: Type.STRING },
                    observation: { type: Type.STRING },
                    recommendation: { type: Type.STRING },
                  },
                  required: ["section", "observation", "recommendation"],
                },
              },
              rewrittenPreview: {
                type: Type.OBJECT,
                properties: {
                  heroTitle: { type: Type.STRING },
                  heroSubtitle: { type: Type.STRING },
                  heroQuote: { type: Type.STRING },
                  typingLines: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  aboutIntro: { type: Type.STRING },
                  footerTagline: { type: Type.STRING },
                },
                required: [
                  "heroTitle",
                  "heroSubtitle",
                  "heroQuote",
                  "typingLines",
                  "aboutIntro",
                  "footerTagline",
                ],
              },
            },
            required: [
              "firstImpression",
              "executiveHighlights",
              "suggestions",
              "rewrittenPreview",
            ],
          },
        },
      });

      const rawText = (response.text ?? "{}").trim();
      const preview = JSON.parse(rawText);
      res.json({ preview, audience: targetAudience });
    } catch (err) {
      res.status(502).json({
        error: err instanceof Error ? err.message : "Failed to generate AI preview.",
      });
    }
  });

  // JSON 404 for unknown API routes so fetchJson never receives HTML
  app.all("/api/*", (_req, res) => {
    res.status(404).json({ error: "API endpoint not found." });
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message = err instanceof Error ? err.message : "Internal server error.";
    if (!res.headersSent) {
      res.status(500).json({ error: message });
    }
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`README Studio server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
