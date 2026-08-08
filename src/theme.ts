export type Role = 'admin' | 'student' | 'staff';
export type ThemeMode = 'light' | 'dark';

// ---------------------------------------------------------------------------
// 1. RAW BRAND COLORS
// These are the only hex values you should ever need to touch to re-brand
// the app. Everything else below is derived from these.
// ---------------------------------------------------------------------------

// Brown family — used for every login-page button in Light Mode, and for
// primary actions in Light Mode generally.
const brown = {
  base: '#8C5A3C',   // primary brown
  darkVariant: '#6B4429',  // dark brown variant (pressed / border / gradient end)
  lightVariant: '#A9754F', // light brown variant (secondary actions)
};

// Teal family — the default accent used for primary actions in Dark Mode.
const teal = {
  base: '#00ADB5',
  darkVariant: '#0097A2',
  lightVariant: '#3FC6CC',
};

const blue = {
  base: '#6D94C5',
  darkVariant: '#4F739F',
  lightVariant: '#9BB8DA',
};

// Dark bluish family — used for every login-page button in Dark Mode only.
const darkBlue = {
  base: '#2C4A6E',
  darkVariant: '#1C3350',
  lightVariant: '#3F638F',
};

const semantic = {
  danger: '#ef4444',
};

// ---------------------------------------------------------------------------
// 2. DESIGN TOKEN STRUCTURE
// This is the single source of truth for color across the app. Components
// should consume these tokens via `useTheme()` (see ThemeContext.tsx) rather
// than hardcoding hex values.
// ---------------------------------------------------------------------------

export interface ButtonTokens {
  /** Default / resting background color. */
  background: string;
  /** Gradient end / pressed / hover variant. */
  backgroundAlt: string;
  /** Foreground (label + icon) color drawn on top of `background`. */
  text: string;
  /** Border color, used for outlined or "ghost" variants. */
  border: string;
}

export interface ThemeTokens {
  // ---- Text -----------------------------------------------------------
  primaryText: string;
  secondaryText: string;
  mutedText: string;

  // ---- Backgrounds ------------------------------------------------------
  /** Full-screen background (behind everything). */
  screenBackground: string;
  /** Elevated surfaces such as GlassCard / modal cards. */
  cardBackground: string;
  /** Secondary "box" surfaces — inputs, chips, nested containers. */
  boxBackground: string;

  // ---- Components --------------------------------------------------------
  /** Buttons that live in the floating bottom navigation row. */
  bottomRowButton: ButtonTokens;
  /** Primary call-to-action buttons app-wide, incl. all Login buttons. */
  primaryButton: ButtonTokens;
  /** Secondary / less prominent action buttons. */
  secondaryButton: ButtonTokens;
  /** Default hairline border color for cards, inputs, dividers. */
  border: string;
  /** Slightly stronger border, used for toggles / focus rings. */
  softBorder: string;

  // ---- Semantic / status accents (pills, badges, toasts) -----------------
  success: string;
  info: string;
  warning: string;
  danger: string;

  /** Full-screen overlay used behind modals / lock screens. */
  overlay: string;
}

// Login buttons (Sign In, Student/Staff/Admin quick access) always pull from
// a single, theme-specific token set here so every login button on the page
// stays in sync: brown in Light Mode, dark bluish in Dark Mode.
const loginButtonTokensLight: ButtonTokens = {
  background: brown.base,
  backgroundAlt: brown.darkVariant,
  text: '#FFFFFF',
  border: brown.darkVariant,
};

const loginButtonTokensDark: ButtonTokens = {
  background: darkBlue.base,
  backgroundAlt: darkBlue.darkVariant,
  text: '#FFFFFF',
  border: darkBlue.darkVariant,
};

export const lightTheme: ThemeTokens = {
  primaryText: '#1A1410',
  secondaryText: blue.base,
  mutedText: '#5B5347',

  screenBackground: '#F5EFE6',
  cardBackground: '#CBDCEB',
  boxBackground: '#E8DFCA',

  bottomRowButton: {
    background: brown.base,
    backgroundAlt: brown.darkVariant,
    text: '#FFFFFF',
    border: brown.darkVariant,
  },
  primaryButton: loginButtonTokensLight,
  secondaryButton: {
    background: brown.lightVariant,
    backgroundAlt: brown.base,
    text: '#FFFFFF',
    border: brown.base,
  },
  border: 'rgba(0, 0, 0, 0.10)',
  softBorder: 'rgba(140, 90, 60, 0.18)',

  success: brown.base,
  info: blue.base,
  warning: '#C08552',
  danger: semantic.danger,

  overlay: 'rgba(245, 239, 230, 0.92)',
};

export const darkTheme: ThemeTokens = {
  primaryText: '#FFFFFF',
  secondaryText: teal.base,
  mutedText: '#9E9E9E',

  screenBackground: '#121212',
  cardBackground: '#1E1E1E',
  boxBackground: '#1E1E1E',

  bottomRowButton: {
    background: teal.base,
    backgroundAlt: teal.darkVariant,
    text: '#FFFFFF',
    border: teal.darkVariant,
  },
  // Login buttons use a dark bluish token set in Dark Mode (brown is used in
  // Light Mode instead) — see loginButtonTokensLight / loginButtonTokensDark.
  primaryButton: loginButtonTokensDark,
  secondaryButton: {
    background: teal.lightVariant,
    backgroundAlt: teal.base,
    text: '#FFFFFF',
    border: teal.base,
  },
  border: 'rgba(255, 255, 255, 0.08)',
  softBorder: 'rgba(255, 255, 255, 0.12)',

  success: teal.base,
  info: '#38bdf8',
  warning: '#facc15',
  danger: semantic.danger,

  overlay: 'rgba(18, 18, 18, 0.88)',
};

export const themes: Record<ThemeMode, ThemeTokens> = {
  light: lightTheme,
  dark: darkTheme,
};

// ---------------------------------------------------------------------------
// 3. LEGACY FLAT PALETTE (backward-compatible shim)
// A large part of the codebase still does `import { palette } from
// '../theme'` and reads flat keys like `palette.text` / `palette.muted`.
// Rather than rewrite every call site, we derive an identically-shaped
// object from the token structure above so there is still only ONE place
// (lightTheme / darkTheme) that ever needs to be edited.
//
// IMPORTANT: this flat object is only reactive when read through the
// `useThemePalette()` hook exported from `context/ThemeContext.tsx`, which
// re-selects the correct object on every render based on the active mode.
// A module-level `import { palette }` gives you a fixed snapshot and will
// NOT update when the user toggles the theme — that mismatch was the root
// cause of the "colors don't update" bug. New code should prefer
// `useTheme()` / `useThemePalette()` over the raw `palette` export below.
// ---------------------------------------------------------------------------

export interface LegacyPalette {
  background: string;
  surface: string;
  elevated: string;
  border: string;
  borderSoft: string;
  text: string;
  muted: string;
  softMuted: string;
  accent: string;
  emerald: string;
  indigo: string;
  violet: string;
  amber: string;
  red: string;
  warning: string;
  sky: string;
}

function toLegacyPalette(t: ThemeTokens): LegacyPalette {
  return {
    background: t.screenBackground,
    surface: t.boxBackground,
    elevated: t.cardBackground,
    border: t.border,
    borderSoft: t.softBorder,
    text: t.primaryText,
    muted: t.mutedText,
    softMuted: t.secondaryText,
    accent: t.secondaryButton.background,
    emerald: t.success,
    indigo: t.info,
    violet: t.secondaryButton.background,
    amber: t.warning,
    red: t.danger,
    warning: t.warning,
    sky: t.info,
  };
}

export const legacyPalettes: Record<ThemeMode, LegacyPalette> = {
  light: toLegacyPalette(lightTheme),
  dark: toLegacyPalette(darkTheme),
};

/**
 * @deprecated Mutable singleton kept only so legacy modules that still do
 * `import { palette } from './theme'` continue to compile and render a
 * reasonable default. Prefer `useThemePalette()` from ThemeContext, which
 * returns the correct, reactive object for the theme mode active on the
 * current render.
 */
export const palette: LegacyPalette = { ...legacyPalettes.dark };

export function applyTheme(mode: ThemeMode) {
  Object.assign(palette, legacyPalettes[mode]);
}

applyTheme('dark');

export const roles: { id: Role; label: string; helper: string }[] = [
  { id: 'admin', label: 'Admin', helper: 'Governance + ledgers' },
  { id: 'student', label: 'Student', helper: 'Fast service + voting' },
  { id: 'staff', label: 'Staff', helper: 'Ops + daily execution' },
];



export const adminTabs = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
  { id: 'students', label: 'Students', icon: 'users' },
  { id: 'mint-tokens', label: 'Mint Tokens', icon: 'plus-circle' },
  { id: 'mess-changes', label: 'Mess Changes', icon: 'repeat' },
  { id: 'complaints', label: 'Complaints', icon: 'message-square' },
  { id: 'feedback-report', label: 'Feedback', icon: 'bar-chart-2' },
  { id: 'rebates', label: 'Rebates', icon: 'credit-card' },
  { id: 'create-staff', label: 'Create Staff', icon: 'user-plus' },
] as const;

export const studentTabs = [
  { id: 'qr-scanner', label: 'Scanner', icon: 'camera' },
  { id: 'request-rebate', label: 'Rebate', icon: 'credit-card' },
  { id: 'mess-change', label: 'Mess Change', icon: 'repeat' },
  { id: 'file-complaint', label: 'Complaint', icon: 'file-text' },
  { id: 'file-feedback', label: 'Feedback', icon: 'star' },
  { id: 'profile', label: 'Profile', icon: 'user' },
] as const;

export const staffTabs = [
  { id: 'dashboard', label: 'Mess QR', icon: 'grid' },
] as const;

