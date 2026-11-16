import { EMOT_ICONS } from "../data/presets";
import { ProfileConfig, WakaCommitSlot, WakaStatsConfig } from "../types/readme";

const DIVIDER_URL =
  "https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif";

export function computeYearProgress(now = new Date()): {
  percent: string;
  bar: string;
  dateLabel: string;
} {
  const year = now.getFullYear();
  const start = new Date(year, 0, 1).getTime();
  const end = new Date(year + 1, 0, 1).getTime();
  const ratio = Math.min(1, Math.max(0, (now.getTime() - start) / (end - start)));
  const totalSlots = 30;
  const filled = Math.round(ratio * totalSlots);
  const bar = "█".repeat(filled) + "▁".repeat(Math.max(0, totalSlots - filled));
  const percent = (ratio * 100).toFixed(2);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dateLabel = `${String(now.getDate()).padStart(2, "0")}-${months[now.getMonth()]}-${year}`;
  return { percent, bar, dateLabel };
}

export function buildTypingSvgUrl(lines: string[], colorHex: string): string {
  const cleanLines = (lines || [])
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => encodeURIComponent(l).replace(/%20/g, "+"))
    .join(";");
  const color = (colorHex || "9B8CFF").replace("#", "");
  return `https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=19&duration=3000&pause=900&color=${color}&center=true&vCenter=true&width=720&lines=${cleanLines || "Developer"}`;
}

export function buildTelemetryBadgeUrls(config: ProfileConfig): Array<{ label: string; url: string }> {
  const t = config.telemetryBadges;
  if (!t) return [];
  const badges: Array<{ label: string; url: string }> = [];
  if ((t.codeTime || "").trim()) {
    badges.push({
      label: "Code Time",
      url: `https://img.shields.io/badge/Code%20Time-${encodeURIComponent(
        t.codeTime.trim()
      )}-blue?style=flat`,
    });
  }
  if ((t.aiCodeTime || "").trim()) {
    badges.push({
      label: "AI Code Time",
      url: `https://img.shields.io/badge/AI%20Code%20Time-${encodeURIComponent(
        t.aiCodeTime.trim()
      )}-blue?style=flat`,
    });
  }
  if ((t.linesOfCode || "").trim()) {
    badges.push({
      label: "Lines of Code",
      url: `https://img.shields.io/badge/From%20Hello%20World%20I've%20Written-${encodeURIComponent(
        t.linesOfCode.trim()
      )}-blue?style=flat`,
    });
  }
  return badges;
}

export function buildQuickCloneCommands(config: ProfileConfig): string[] {
  const username = (config.username || "ddmdesign7").trim();
  const seen = new Set<string>();
  const cmds: string[] = [];

  for (const proj of config.projects || []) {
    const url = (proj.url || "").trim();
    let cloneUrl = "";
    if (/^https:\/\/github\.com\/[^/]+\/[^/]+/i.test(url)) {
      const clean = url.replace(/\.git$/i, "").replace(/\/+$/, "");
      cloneUrl = `${clean}.git`;
    } else if (proj.name.trim()) {
      cloneUrl = `https://github.com/${username}/${proj.name.trim()}.git`;
    }
    if (cloneUrl && !seen.has(cloneUrl)) {
      seen.add(cloneUrl);
      cmds.push(`git clone ${cloneUrl}`);
    }
    if (cmds.length >= 3) break;
  }

  return cmds;
}

function formatWakaSlotRows(slots: WakaCommitSlot[]): string[] {
  const total = slots.reduce((sum, s) => sum + Math.max(0, Number(s.commits) || 0), 0) || 1;
  const barWidth = 25;
  return slots.map((slot) => {
    const count = Math.max(0, Number(slot.commits) || 0);
    const ratio = count / total;
    const filled = Math.round(ratio * barWidth);
    const bar = "█".repeat(filled) + "░".repeat(Math.max(0, barWidth - filled));
    const pct = (ratio * 100).toFixed(2).padStart(5, "0");
    const labelCol = slot.label.padEnd(23, " ");
    const commitCol = `${count} commits`.padEnd(18, " ");
    return `${labelCol} ${commitCol} ${bar}   ${pct} %`;
  });
}

export function formatWakaAsciiBlock(waka?: WakaStatsConfig): string {
  if (!waka) return "";
  const blocks: string[] = [];

  if ((waka.personaTitle || "").trim() && (waka.timeOfDay || []).length > 0) {
    blocks.push(waka.personaTitle.trim());
    blocks.push("");
    blocks.push(...formatWakaSlotRows(waka.timeOfDay));
  }

  if ((waka.productiveDayTitle || "").trim() && (waka.weekdays || []).length > 0) {
    if (blocks.length > 0) blocks.push("");
    blocks.push(waka.productiveDayTitle.trim());
    blocks.push("");
    blocks.push(...formatWakaSlotRows(waka.weekdays));
  }

  blocks.push("");
  blocks.push("📊 This Week I Spent My Time On");
  blocks.push("");
  blocks.push(`🕑︎ Time Zone: ${waka.timeZone || "Africa/Nigeria"}`);
  blocks.push("");
  blocks.push(`💬 Programming Languages: ${waka.weeklyLanguages || "No Activity Tracked This Week"}`);
  blocks.push(`🔥 Editors: ${waka.weeklyEditors || "No Activity Tracked This Week"}`);
  blocks.push(`🐱💻 Projects: ${waka.weeklyProjects || "No Activity Tracked This Week"}`);
  blocks.push(`💻 Operating System: ${waka.weeklyOs || "No Activity Tracked This Week"}`);

  return blocks.join("\n");
}

function iconTag(url: string, fallbackEmoji: string, size: number, enabled: boolean): string {
  if (!enabled) return fallbackEmoji;
  return `<img src="${url}" width="${size}" alt="" />`;
}

export function generateReadmeMarkdown(config: ProfileConfig): string {
  const username = (config.username || "ddmdesign7").trim();
  const theme = config.widgets.theme;
  const anim = config.widgets.showAnimatedEmojis;
  const { percent, bar, dateLabel } = computeYearProgress();
  const enabledSkills = (config.skills || []).filter((s) => s.enabled);

  const frontendSkills = enabledSkills.filter((s) => s.category === "Frontend Development");
  const backendSkills = enabledSkills.filter((s) => s.category === "Backend Development");
  const devopsSkills = enabledSkills.filter((s) => s.category === "Databases, DevOps & CRM");

  const lines: string[] = [];

  if (config.widgets.showCapsuleHeader) {
    const hasTitle = Boolean((config.widgets.bannerTitle || "").trim());
    const height = hasTitle ? 230 : 110;
    const textParam = hasTitle
      ? `&text=${encodeURIComponent(config.widgets.bannerTitle.trim())}&fontSize=46&fontColor=FFFFFF&fontAlignY=38`
      : "";
    const descParam =
      hasTitle && (config.widgets.bannerSubtitle || "").trim()
        ? `&desc=${encodeURIComponent(config.widgets.bannerSubtitle.trim())}&descAlignY=60&descSize=15`
        : "";
    lines.push(`<div align="center">`);
    lines.push(
      `  <img width="100%" src="https://capsule-render.vercel.app/api?type=waving&height=${height}&color=${encodeURIComponent(
        config.widgets.bannerGradient
      )}&section=header${textParam}${descParam}" alt="Header Wave Banner" />`
    );
    lines.push(`</div>\n`);
  }

  if (config.widgets.showTypingSvg && (config.typingLines || []).length > 0) {
    const portfolioUrl = (config.socials?.portfolio || "").trim();
    lines.push(`<p align="center">`);
    lines.push(`  <a href="${portfolioUrl || "https://git.io/typing-svg"}">`);
    lines.push(
      `    <img src="${buildTypingSvgUrl(config.typingLines, config.widgets.typingColor)}" alt="Typing SVG" />`
    );
    lines.push(`  </a>`);
    lines.push(`</p>\n`);
  }

  if (config.widgets.showDividers) {
    lines.push(`<div align="center">`);
    lines.push(`  <img src="${DIVIDER_URL}" width="100%" alt="Divider" />`);
    lines.push(`</div>\n`);
  }

  // Hero Title flanked by Rocket.png and Star.png (eaz-cosmic-portfolio-v2 style)
  const leftHeroIcon = iconTag(EMOT_ICONS.rocketPng, "🚀", 35, anim);
  const rightHeroIcon = iconTag(EMOT_ICONS.star, "✨", 35, anim);
  lines.push(`<h1 align="center">`);
  lines.push(`  ${leftHeroIcon} ${config.heroTitle} ${rightHeroIcon}`);
  lines.push(`</h1>\n`);

  if ((config.heroSubtitle || "").trim()) {
    lines.push(`<p align="center">`);
    lines.push(`  <b>${config.heroSubtitle.trim()}</b>`);
    lines.push(`</p>\n`);
  }

  // Centered Hero Badge Row (eaz-cosmic-portfolio-v2 style)
  if (config.widgets.showHeroBadges && enabledSkills.length > 0) {
    lines.push(`<div align="center">`);
    for (const s of enabledSkills.slice(0, 6)) {
      lines.push(`  <img src="${s.badgeUrl}" alt="${s.name}" />`);
    }
    if ((config.statusBadge || "").trim()) {
      lines.push(
        `  <img src="https://img.shields.io/badge/Status-${encodeURIComponent(
          config.statusBadge.trim()
        )}-8B5CF6?style=for-the-badge" alt="Status" />`
      );
    }
    lines.push(`</div>\n`);
  }

  // WakaTime Telemetry Badges (Code Time, AI Code Time, Lines of Code)
  const telemetryUrls = buildTelemetryBadgeUrls(config);
  if (config.widgets.showTelemetryBadges && telemetryUrls.length > 0) {
    lines.push(`<p align="center">`);
    for (const badge of telemetryUrls) {
      lines.push(`  <img src="${badge.url}" alt="${badge.label}" />`);
    }
    lines.push(`</p>\n<br />\n`);
  } else {
    lines.push(`<br />\n`);
  }

  // Two-column 60% / 40% layout mirroring zayennn/README.md
  lines.push(`<table style="border-color: transparent;" cellspacing="0" width="100%">`);
  lines.push(`  <tr>`);
  lines.push(`    <td valign="top" width="60%">\n`);

  // Left column: Overview / About Me
  lines.push(`### ${iconTag(EMOT_ICONS.rocket, "🚀", 30, anim)} **About Me & Overview**\n`);
  if ((config.aboutIntro || "").trim()) {
    lines.push(`${config.aboutIntro.trim()}\n`);
  }
  for (const bullet of config.aboutBullets || []) {
    const bulletIcon = bullet.iconUrl
      ? iconTag(bullet.iconUrl, bullet.emoji, 20, anim)
      : bullet.emoji;
    lines.push(`- ${bulletIcon} **${bullet.label}:** ${bullet.text}`);
  }
  if ((config.heroQuote || "").trim()) {
    lines.push(`\n> *"${config.heroQuote.trim()}"*`);
  }
  lines.push(`\n<br />\n`);

  // Left column: What I Bring Together (3-column matrix)
  if (config.widgets.showPillarsMatrix && (config.pillarsMatrix || []).length > 0) {
    lines.push(`### ✧ **What I Bring Together**\n`);
    lines.push(`| Creative thinking | Digital building | Business-minded innovation |`);
    lines.push(`| :--- | :--- | :--- |`);
    for (const row of config.pillarsMatrix) {
      lines.push(`| ${row.creative} | ${row.building} | ${row.business} |`);
    }
    lines.push(`\n<br />\n`);
  }

  // Left column: Creative Identity & Design Skills Table
  if (config.widgets.showCreativeIdentity && (config.creativeSkills || []).length > 0) {
    lines.push(`### 🎨 **Creative Identity & Design Skills**\n`);
    lines.push(`| Creative Area | Focus |`);
    lines.push(`| :--- | :--- |`);
    for (const row of config.creativeSkills) {
      lines.push(`| **${row.area}** | ${row.focus} |`);
    }
    lines.push(`\n<br />\n`);
  }

  // Left column: Tech Stack & Skills
  if (!config.widgets.showThreeColStack) {
    lines.push(`### ${iconTag(EMOT_ICONS.gear, "⚙️", 25, anim)} **Tech Stack & Skills**\n`);
    if (config.widgets.showSkillIcons) {
      if ((config.skillIconsDev || "").trim()) {
        const devCount = Math.min(
          10,
          Math.max(1, config.skillIconsDev.split(",").filter((s) => s.trim()).length)
        );
        lines.push(`#### 💻 **Development & Workflow**`);
        lines.push(`<p align="left">`);
        lines.push(
          `  <img src="https://skillicons.dev/icons?i=${encodeURIComponent(
            config.skillIconsDev.trim()
          ).replace(/%2C/gi, ",")}&perline=${devCount}" alt="Development technology icons" />`
        );
        lines.push(`</p>\n`);
      }
      if ((config.skillIconsDesign || "").trim()) {
        const designCount = Math.min(
          10,
          Math.max(1, config.skillIconsDesign.split(",").filter((s) => s.trim()).length)
        );
        lines.push(`#### 🎨 **Creative Tools**`);
        lines.push(`<p align="left">`);
        lines.push(
          `  <img src="https://skillicons.dev/icons?i=${encodeURIComponent(
            config.skillIconsDesign.trim()
          ).replace(/%2C/gi, ",")}&perline=${designCount}" alt="Creative design tools" />`
        );
        lines.push(`</p>\n`);
      }
      if ((config.skillIconsNote || "").trim()) {
        lines.push(`<sub>${config.skillIconsNote.trim()}</sub>\n`);
      }
    }
    if (frontendSkills.length > 0) {
      lines.push(`#### ${iconTag(EMOT_ICONS.palette, "🎨", 20, anim)} **Frontend Development**`);
      lines.push(`<p align="left">`);
      for (const s of frontendSkills) {
        lines.push(`  <img src="${s.badgeUrl}" alt="${s.name}" />`);
      }
      lines.push(`</p>\n`);
    }
    if (backendSkills.length > 0) {
      lines.push(`#### ⚙️ **Backend Development**`);
      lines.push(`<p align="left">`);
      for (const s of backendSkills) {
        lines.push(`  <img src="${s.badgeUrl}" alt="${s.name}" />`);
      }
      lines.push(`</p>\n`);
    }
    if (devopsSkills.length > 0) {
      lines.push(
        `#### ${iconTag(EMOT_ICONS.dividers, "🗂️", 20, anim)} **Databases, DevOps & CRM Tools**`
      );
      lines.push(`<p align="left">`);
      for (const s of devopsSkills) {
        lines.push(`  <img src="${s.badgeUrl}" alt="${s.name}" />`);
      }
      lines.push(`</p>\n`);
    }
  }

  // Left column: Current Focus & Mastery Matrix
  if (config.widgets.showFocusMatrix && (config.focusMatrix || []).length > 0) {
    lines.push(`### 🚧 **Current Focus & Learning**\n`);
    lines.push(`| Area | Technology | Status | Progress |`);
    lines.push(`| :--- | :--- | :--- | :--- |`);
    for (const row of config.focusMatrix) {
      const statusBadge =
        row.status === "Mastering"
          ? "🟢 **Mastering**"
          : row.status === "Learning"
            ? "🟡 **Learning**"
            : "🔵 **Exploring**";
      const techBadge = `![${row.technology}](https://img.shields.io/badge/${encodeURIComponent(
        row.technology
      )}-${row.badgeColor}?style=flat-square&logo=${encodeURIComponent(row.logo)}&logoColor=white)`;
      const progBadge = `![${row.progress}%](https://img.shields.io/badge/${row.progress}%25-${row.badgeColor}?style=flat-square)`;
      lines.push(`| **${row.area}** | ${techBadge} | ${statusBadge} | ${progBadge} |`);
    }
    lines.push(``);
  }

  lines.push(`    </td>`);
  lines.push(`    <td valign="top" width="40%">\n`);

  // Right column: GitHub Analytics
  lines.push(`<div align="right">\n`);
  lines.push(`### ${iconTag(EMOT_ICONS.bullseye, "🎯", 28, anim)} **GitHub Analytics**\n`);

  const w = config.widgets;

  if (w.showStatsCard) {
    const rankIconParam =
      w.statsRankIcon && w.statsRankIcon !== "default"
        ? `&rank_icon=${encodeURIComponent(w.statsRankIcon)}`
        : "";
    lines.push(
      `  <img width="100%" src="https://github-readme-stats.vercel.app/api?username=${encodeURIComponent(
        username
      )}&show_icons=${w.statsShowIcons ?? true}&theme=${theme}&hide_border=${
        w.statsHideBorder ?? true
      }&include_all_commits=${w.statsIncludeAllCommits ?? true}&count_private=${
        w.statsCountPrivate ?? true
      }${rankIconParam}" alt="${username} GitHub Stats" />\n`
    );
  }

  if (w.showTopLangs) {
    const excludeParam = (w.topLangsExclude || "").trim()
      ? `&exclude_repo=${encodeURIComponent(w.topLangsExclude.trim())}`
      : "";
    lines.push(
      `  <img width="100%" src="https://github-readme-stats.vercel.app/api/top-langs/?username=${encodeURIComponent(
        username
      )}&layout=${w.topLangsLayout || "compact"}&langs_count=${
        w.topLangsCount || 8
      }${excludeParam}&theme=${theme}&hide_border=${
        w.topLangsHideBorder ?? true
      }" alt="${username} Top Languages" />\n`
    );
  }

  if (w.showStreakStats) {
    const modeParam = w.streakMode === "weekly" ? "&mode=weekly" : "";
    lines.push(
      `  <img width="100%" src="https://streak-stats.demolab.com?user=${encodeURIComponent(
        username
      )}&theme=${theme}&hide_border=${w.streakHideBorder ?? true}${modeParam}" alt="${username} GitHub Streak" />\n`
    );
  }

  if (w.showTrophies) {
    lines.push(`### ${iconTag(EMOT_ICONS.trophy, "🏆", 26, anim)} **GitHub Trophies**\n`);
    lines.push(
      `  <img width="100%" src="https://github-profile-trophy.vercel.app/?username=${encodeURIComponent(
        username
      )}&theme=${theme}&no-frame=${w.trophyNoFrame ?? true}&no-bg=${
        w.trophyNoBg ?? true
      }&row=${w.trophyRows || 2}&column=${
        w.trophyColumns || 2
      }&margin-w=5&margin-h=5" alt="${username} GitHub Trophies" />\n`
    );
  }

  // Right column: Connect With Me
  lines.push(`### 🌐 **Connect With Me**\n`);
  lines.push(`<div align="center">`);
  if ((config.socials?.github || "").trim()) {
    lines.push(
      `  <a href="${config.socials.github}" target="_blank"><img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub" /></a>`
    );
  }
  if ((config.socials?.portfolio || "").trim()) {
    lines.push(
      `  <a href="${config.socials.portfolio}" target="_blank"><img src="https://img.shields.io/badge/Portfolio-8B5CF6?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Portfolio" /></a>`
    );
  }
  if ((config.socials?.itzddm || "").trim()) {
    lines.push(
      `  <a href="${config.socials.itzddm}" target="_blank"><img src="https://img.shields.io/badge/ItzDDM-0891B2?style=for-the-badge&logo=figma&logoColor=white" alt="ItzDDM" /></a>`
    );
  }
  if ((config.socials?.tiktok || "").trim()) {
    lines.push(
      `  <a href="${config.socials.tiktok}" target="_blank"><img src="https://img.shields.io/badge/TikTok-000000?style=for-the-badge&logo=tiktok&logoColor=white" alt="TikTok" /></a>`
    );
  }
  if ((config.socials?.linkedin || "").trim()) {
    lines.push(
      `  <a href="${config.socials.linkedin}" target="_blank"><img src="https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn" /></a>`
    );
  }
  if ((config.socials?.email || "").trim()) {
    lines.push(
      `  <a href="mailto:${config.socials.email}"><img src="https://img.shields.io/badge/Email-EA4335?style=for-the-badge&logo=gmail&logoColor=white" alt="Email" /></a>`
    );
  }
  lines.push(`</div>\n`);

  if ((config.socials?.email || "").trim()) {
    lines.push(
      `<p align="center"><sub>Email: <a href="mailto:${config.socials.email}">${config.socials.email}</a></sub></p>\n`
    );
  }

  lines.push(`</div>`);
  lines.push(`    </td>`);
  lines.push(`  </tr>`);
  lines.push(`</table>\n`);

  // 3-Column Technology Stack Matrix (eaz-cosmic-portfolio-v2 style)
  if (config.widgets.showThreeColStack && enabledSkills.length > 0) {
    lines.push(`\n## 🛠️ Technology Stack\n`);
    lines.push(`<table width="100%">`);
    lines.push(`  <tr>`);
    const groups = [
      { title: "Frontend", items: frontendSkills },
      { title: "Backend", items: backendSkills },
      { title: "DevOps & CRM", items: devopsSkills },
    ];
    for (const g of groups) {
      lines.push(`    <td align="center" valign="top" width="33%">`);
      lines.push(`      <b>${g.title}</b><br /><br />`);
      for (const s of g.items) {
        lines.push(`      <img src="${s.badgeUrl}" alt="${s.name}" />`);
      }
      lines.push(`    </td>`);
    }
    lines.push(`  </tr>`);
    lines.push(`</table>\n`);
  }

  // Ecosystem & Evolution Table (eaz-cosmic-portfolio-v2 style)
  if (config.widgets.showEvolutionTable && (config.evolutionTable || []).length > 0) {
    lines.push(`\n## 🎨 Platform Ecosystem & Evolution\n`);
    lines.push(`| Platform / Version | URL | Focus |`);
    lines.push(`| :--- | :--- | :--- |`);
    for (const row of config.evolutionTable) {
      const cleanUrl = row.url.replace(/^https?:\/\//, "");
      lines.push(`| **${row.version}** | [${cleanUrl}](${row.url}) | ${row.focus} |`);
    }
    lines.push(``);
  }

  // Pinned Repositories / Featured Work 3x2 Grid
  if ((config.projects || []).length > 0) {
    if (config.widgets.showDividers) {
      lines.push(`<div align="center">`);
      lines.push(`  <img src="${DIVIDER_URL}" width="100%" alt="Divider" />`);
      lines.push(`</div>\n`);
    }

    lines.push(
      `\n### ${iconTag(EMOT_ICONS.bullseye, "📌", 26, anim)} **Pinned Repositories & Featured Work**\n`
    );

    if (config.widgets.showPinnedGrid) {
      lines.push(`<table width="100%">`);
      for (let i = 0; i < config.projects.length; i += 2) {
        const left = config.projects[i];
        const right = config.projects[i + 1];
        lines.push(`  <tr>`);
        [left, right].forEach((proj) => {
          if (!proj) {
            lines.push(`    <td width="50%"></td>`);
            return;
          }
          const titleLink = proj.url
            ? `<a href="${proj.url}"><strong>${proj.name}</strong></a>`
            : `<strong>${proj.name}</strong>`;
          const liveDemoLink = proj.homepage
            ? ` · <a href="${proj.homepage}">🌐 Live Demo</a>`
            : "";
          const starsLabel =
            typeof proj.stars === "number" && proj.stars > 0 ? ` · ⭐ ${proj.stars}` : "";
          lines.push(`    <td valign="top" width="50%">`);
          lines.push(
            `      <p>${titleLink} · <code>${proj.visibility || "Public"}</code>${liveDemoLink}</p>`
          );
          lines.push(`      <p>${proj.summary}</p>`);
          lines.push(
            `      <p><sub>${proj.language || "TypeScript"}${starsLabel}${
              proj.stack ? ` · ${proj.stack}` : ""
            }</sub></p>`
          );
          lines.push(`    </td>`);
        });
        lines.push(`  </tr>`);
      }
      lines.push(`</table>\n`);
    } else {
      for (const proj of config.projects) {
        const title = proj.url ? `[**${proj.name}**](${proj.url})` : `**${proj.name}**`;
        const demo = proj.homepage ? ` · [Live Demo](${proj.homepage})` : "";
        lines.push(
          `- ${title} (${proj.visibility || "Public"})${demo} — ${proj.summary} _(${
            proj.language
          }${proj.stack ? ` · ${proj.stack}` : ""})_`
        );
      }
      lines.push(``);
    }
  }

  // Quick Clone Featured Repositories (CLI convenience block)
  const quickCloneCmds = buildQuickCloneCommands(config);
  if (config.widgets.showQuickClone && quickCloneCmds.length > 0) {
    lines.push(`\n### ⚡ **Quick Clone Featured Repositories**\n`);
    lines.push("```bash");
    lines.push(...quickCloneCmds);
    lines.push("```\n");
  }

  // Key Design Principles (eaz-cosmic-portfolio-v2 style)
  if (config.widgets.showPrinciples && (config.principles || []).length > 0) {
    lines.push(`\n## 🎯 Key Design Principles\n`);
    for (const pr of config.principles) {
      lines.push(`### **${pr.title}**`);
      lines.push(`${pr.description}\n`);
    }
  }

  if ((config.gettingStartedSnippet || "").trim()) {
    lines.push(`\n## 🚀 Getting Started\n`);
    lines.push("```bash");
    lines.push(config.gettingStartedSnippet.trim());
    lines.push("```\n");
  }

  // Explore My Digital Worlds CTA Badges
  if (w.showDigitalWorlds && (config.digitalWorlds || []).length > 0) {
    lines.push(`\n## 🌌 Explore My Digital Worlds\n`);
    lines.push(`<div align="center">`);
    for (const dw of config.digitalWorlds) {
      const slug = encodeURIComponent(dw.label.trim().replace(/\s+/g, "%20")).replace(/%2520/g, "%20");
      lines.push(
        `  <a href="${dw.url}" target="_blank"><img src="https://img.shields.io/badge/${slug}-${dw.color}?style=for-the-badge&logo=${encodeURIComponent(
          dw.logo || "rocket"
        )}&logoColor=white" alt="${dw.label}" /></a>`
      );
    }
    lines.push(`</div>\n`);
  }

  // What I'm Exploring
  if (w.showExploring && (config.exploringItems || []).length > 0) {
    lines.push(`\n## 💡 What I'm Exploring\n`);
    for (const item of config.exploringItems) {
      if (item.trim()) {
        lines.push(`- ${item.trim()}`);
      }
    }
    lines.push(``);
  }

  if (config.widgets.showDividers) {
    lines.push(`<div align="center">`);
    lines.push(`  <img src="${DIVIDER_URL}" width="100%" alt="Divider" />`);
    lines.push(`</div>\n`);
  }

  // Contribution Snake Animation
  if (w.showSnakeAnimation) {
    lines.push(`\n## 🐍 My Contribution Journey\n`);
    lines.push(`<div align="center">`);
    lines.push(
      `  <img src="https://raw.githubusercontent.com/${encodeURIComponent(
        username
      )}/${encodeURIComponent(
        username
      )}/output/github-contribution-grid-snake.svg" alt="GitHub contribution snake animation" />`
    );
    lines.push(`</div>\n`);
  }

  // Coding Activity Graph, WakaTime Visual Graph, WakaTime Commit Rhythm & Contribution Overview
  if (w.showActivityGraph) {
    const activityTheme =
      theme === "radical" ? "react-dark" : theme === "dark" ? "github-compact" : theme;
    lines.push(`\n### ${iconTag(EMOT_ICONS.chart, "📈", 26, anim)} **Coding Activity**\n`);
    lines.push(`<div align="center">`);
    lines.push(
      `  <img width="100%" src="https://github-readme-activity-graph.vercel.app/graph?username=${encodeURIComponent(
        username
      )}&theme=${activityTheme}&area=${
        w.activityArea ?? true
      }&hide_border=${w.activityHideBorder ?? true}" alt="${username} Coding Activity" />`
    );
    lines.push(`</div>\n`);
  }

  if (w.showWakaGraph && (w.wakaUsername || username).trim()) {
    const wakaUser = (w.wakaUsername || username).trim();
    lines.push(`\n### ⏱️ **WakaTime Coding Metrics**\n`);
    lines.push(`<div align="center">`);
    lines.push(
      `  <img width="100%" src="https://github-readme-stats.vercel.app/api/wakatime?username=${encodeURIComponent(
        wakaUser
      )}&layout=${w.wakaLayout || "compact"}&theme=${theme}&hide_border=${
        w.wakaHideBorder ?? true
      }" alt="${wakaUser} WakaTime Stats" />`
    );
    lines.push(`</div>\n`);
  }

  if (w.showWakaStats && config.wakaStats) {
    const wakaAscii = formatWakaAsciiBlock(config.wakaStats);
    if (wakaAscii.trim()) {
      lines.push(`\n<!--START_SECTION:waka-->\n`);
      lines.push("```text");
      lines.push(wakaAscii);
      lines.push("```");
      lines.push(`\n<!--END_SECTION:waka-->\n`);
    }
  }

  if (config.widgets.showContributionOverview && (config.contributionOverview || "").trim()) {
    lines.push(`\n> 📦 **Overview:** ${config.contributionOverview.trim()}\n`);
  }

  if (config.widgets.showYearProgress) {
    lines.push(
      `\n⏳ **Year Progress:** \`{ ${bar} }\` **${percent}%** as on ⏰ ${dateLabel}\n`
    );
  }

  if (config.widgets.showDividers) {
    lines.push(`<div align="center">`);
    lines.push(`  <img src="${DIVIDER_URL}" width="100%" alt="Divider" />`);
    lines.push(`</div>\n`);
  }

  // Footer
  lines.push(`<div align="center">\n`);
  lines.push(
    `  <h3>${iconTag(EMOT_ICONS.party, "🎉", 34, anim)} <strong>Thanks for Visiting!</strong></h3>\n`
  );
  lines.push(
    `  <h4>${iconTag(EMOT_ICONS.dizzy, "💫", 24, anim)} ${config.footerTagline} ${iconTag(
      EMOT_ICONS.dizzy,
      "💫",
      24,
      anim
    )}</h4>\n`
  );

  if (config.widgets.showProfileViews) {
    lines.push(
      `  <img src="https://komarev.com/ghpvc/?username=${encodeURIComponent(
        username
      )}&label=${encodeURIComponent("👁️ Profile Views")}&color=FF6B6B&style=for-the-badge" alt="Profile Views" />\n`
    );
  }

  lines.push(
    `  <p>Made with ${iconTag(EMOT_ICONS.heart, "❤️", 15, anim)} and ${iconTag(
      EMOT_ICONS.coffee,
      "☕",
      15,
      anim
    )}</p>`
  );
  lines.push(`</div>\n`);

  if (config.widgets.showCapsuleFooter) {
    lines.push(`<div align="center">`);
    lines.push(
      `  <img width="100%" src="https://capsule-render.vercel.app/api?color=${encodeURIComponent(
        config.widgets.bannerGradient
      )}&height=95&section=footer&fontSize=30&type=waving&fontColor=fefefe" alt="Footer Wave Banner" />`
    );
    lines.push(`</div>`);
  }

  return lines.join("\n");
}
