export type StatsTheme =
  | "tokyonight"
  | "radical"
  | "dark"
  | "gruvbox"
  | "github_dark"
  | "dracula"
  | "onedark"
  | "synthwave"
  | "cobalt";

export interface AboutBullet {
  id: string;
  emoji: string;
  iconUrl?: string;
  label: string;
  text: string;
}

export interface TechSkill {
  id: string;
  name: string;
  category: "Frontend Development" | "Backend Development" | "Databases, DevOps & CRM";
  badgeUrl: string;
  enabled: boolean;
}

export interface ProjectItem {
  id: string;
  name: string;
  summary: string;
  stack: string;
  language: string;
  visibility?: "Public" | "Private";
  stars?: number;
  homepage?: string;
  url: string;
}

export interface FocusRow {
  id: string;
  area: string;
  technology: string;
  badgeColor: string;
  logo: string;
  status: "Mastering" | "Learning" | "Exploring";
  progress: number;
}

export interface EvolutionRow {
  id: string;
  version: string;
  url: string;
  focus: string;
}

export interface PrincipleItem {
  id: string;
  title: string;
  description: string;
}

export interface TelemetryBadges {
  codeTime: string;
  aiCodeTime: string;
  linesOfCode: string;
}

export interface WakaCommitSlot {
  id: string;
  label: string;
  commits: number;
}

export interface WakaStatsConfig {
  personaTitle: string;
  productiveDayTitle: string;
  timeZone: string;
  timeOfDay: WakaCommitSlot[];
  weekdays: WakaCommitSlot[];
  weeklyLanguages: string;
  weeklyEditors: string;
  weeklyProjects: string;
  weeklyOs: string;
}

export interface CreativeSkillRow {
  id: string;
  area: string;
  focus: string;
}

export interface PillarRow {
  id: string;
  creative: string;
  building: string;
  business: string;
}

export interface DigitalWorldLink {
  id: string;
  label: string;
  url: string;
  color: string;
  logo: string;
}

export interface SocialLinks {
  linkedin: string;
  portfolio: string;
  itzddm?: string;
  tiktok?: string;
  email: string;
  github: string;
}

export type TopLangsLayout = "compact" | "normal" | "donut" | "pie";
export type WakaGraphLayout = "compact" | "default";
export type StatsRankIcon = "default" | "github" | "percentile";

export interface WidgetSettings {
  theme: StatsTheme;
  bannerGradient: string;
  bannerTitle: string;
  bannerSubtitle: string;
  typingColor: string;
  showAnimatedEmojis: boolean;
  showCapsuleHeader: boolean;
  showTypingSvg: boolean;
  showHeroBadges: boolean;
  showTelemetryBadges: boolean;
  showDividers: boolean;
  showCreativeIdentity: boolean;
  showPillarsMatrix: boolean;
  showSkillIcons: boolean;
  showDigitalWorlds: boolean;
  showEvolutionTable: boolean;
  showThreeColStack: boolean;
  showPinnedGrid: boolean;
  showQuickClone: boolean;
  showFocusMatrix: boolean;
  showPrinciples: boolean;
  showExploring: boolean;
  showStatsCard: boolean;
  statsShowIcons: boolean;
  statsIncludeAllCommits: boolean;
  statsCountPrivate: boolean;
  statsHideBorder: boolean;
  statsRankIcon: StatsRankIcon;
  showTopLangs: boolean;
  topLangsLayout: TopLangsLayout;
  topLangsCount: number;
  topLangsExclude: string;
  topLangsHideBorder?: boolean;
  showStreakStats: boolean;
  streakHideBorder: boolean;
  streakMode: "daily" | "weekly";
  showTrophies: boolean;
  trophyRows: number;
  trophyColumns: number;
  trophyNoFrame: boolean;
  trophyNoBg: boolean;
  showSnakeAnimation: boolean;
  showActivityGraph: boolean;
  activityArea: boolean;
  activityHideBorder: boolean;
  showWakaGraph: boolean;
  wakaUsername: string;
  wakaLayout: WakaGraphLayout;
  wakaHideBorder: boolean;
  showWakaStats: boolean;
  showContributionOverview: boolean;
  showYearProgress: boolean;
  showProfileViews: boolean;
  showCapsuleFooter: boolean;
}

export interface ProfileConfig {
  id: string;
  presetLabel: string;
  mode: "profile" | "project";
  name: string;
  username: string;
  repoName: string;
  heroTitle: string;
  heroSubtitle: string;
  heroQuote: string;
  statusBadge: string;
  typingLines: string[];
  telemetryBadges: TelemetryBadges;
  aboutIntro: string;
  aboutBullets: AboutBullet[];
  creativeSkills: CreativeSkillRow[];
  pillarsMatrix: PillarRow[];
  skills: TechSkill[];
  skillIconsDev: string;
  skillIconsDesign: string;
  skillIconsNote: string;
  digitalWorlds: DigitalWorldLink[];
  exploringItems: string[];
  projects: ProjectItem[];
  evolutionTable: EvolutionRow[];
  principles: PrincipleItem[];
  focusMatrix: FocusRow[];
  wakaStats: WakaStatsConfig;
  contributionOverview: string;
  gettingStartedSnippet: string;
  socials: SocialLinks;
  footerTagline: string;
  widgets: WidgetSettings;
}

export interface GitHubRepo {
  name: string;
  fullName: string;
  description: string;
  htmlUrl: string;
  homepage: string;
  language: string;
  stars: number;
  forks: number;
  updatedAt: string;
}

export interface GitHubProfileData {
  login: string;
  name: string;
  bio: string;
  avatarUrl: string;
  htmlUrl: string;
  blog: string;
  company: string;
  location: string;
  publicRepos: number;
  followers: number;
  repos: GitHubRepo[];
}

export interface PinnedAuditItem {
  name: string;
  url: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  homepage: string;
  topics: string[];
  defaultBranch: string;
  verified: boolean;
  patternHighlight: string;
}
